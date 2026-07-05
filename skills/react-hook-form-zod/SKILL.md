---
name: react-hook-form-zod
description: |
  Implementa formularios con React Hook Form + Zod en el panel web de JoyasPOS:
  patrón completo con zodResolver, display de errores por campo, botón deshabilitado
  durante mutaciones, reset tras éxito, y ejemplos de todos los formularios del
  proyecto (Login, Producto, Usuario, Cambio de contraseña, Ingreso de existencias).
  Usar SIEMPRE al crear o modificar cualquier formulario en el panel web — nunca
  usar useState por campo. También usar como referencia de los schemas Zod de
  validación del lado cliente y cómo integrarlos con las mutaciones de TanStack Query.
  Depende de SKILL-21 (react-project-structure) y SKILL-23 (tanstack-query-axios).
---

# SKILL-24 — React Hook Form + Zod (apps/web)

## Principio
**Nunca** manejar campos de formulario con `useState` individuales.
**Siempre** usar `useForm` con `zodResolver`.

---

## 1. Schemas de validación (cliente)

Los schemas del cliente son similares a los del SRS pero adaptados a la UX:

### `src/lib/schemas.ts`
```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(150),
  unidad_medida: z.string().min(1, 'La unidad de medida es requerida').max(30),
  existencia: z.coerce.number().nonnegative().default(0),
})

export const ingresoExistenciaSchema = z.object({
  cantidad: z.coerce
    .number({ invalid_type_error: 'Ingresa un número válido' })
    .positive('La cantidad debe ser mayor a 0'),
})

export const usuarioSchema = z.object({
  username: z
    .string().min(3, 'Mínimo 3 caracteres').max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre_completo: z.string().min(1, 'El nombre es requerido').max(100),
  rol: z.enum(['admin', 'vendedor']),
})

export const editUsuarioSchema = z.object({
  nombre_completo: z.string().min(1).max(100),
  rol: z.enum(['admin', 'vendedor']),
  activo: z.boolean(),
})

export const changePasswordSchema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string().min(6, 'Mínimo 6 caracteres'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(150),
  contacto: z.string().max(100).optional(),
  telefono: z.string().max(20).optional(),
  direccion: z.string().max(255).optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type ProductoFormValues = z.infer<typeof productoSchema>
export type IngresoExistenciaValues = z.infer<typeof ingresoExistenciaSchema>
export type UsuarioFormValues = z.infer<typeof usuarioSchema>
export type EditUsuarioFormValues = z.infer<typeof editUsuarioSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
export type ProveedorFormValues = z.infer<typeof proveedorSchema>
```

---

## 2. Componente FormField reutilizable

```tsx
// src/components/shared/FormField.tsx
import { FieldError } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: FieldError
}

export function FormField({ label, error, className, ...props }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{label}</Label>
      <Input
        {...props}
        className={cn(error && 'border-destructive', className)}
        aria-invalid={!!error}
      />
      {error && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  )
}
```

---

## 3. Formulario de Login

```tsx
// src/pages/login/LoginPage.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormValues } from '@/lib/schemas'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/shared/FormField'
import { useState } from 'react'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null)
    const result = await login(data.username, data.password)
    if (!result.success) setServerError(result.error)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">JoyasPOS</h1>

        <FormField
          id="username"
          label="Usuario"
          error={errors.username}
          {...register('username')}
        />

        <FormField
          id="password"
          label="Contraseña"
          type="password"
          error={errors.password}
          {...register('password')}
        />

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>
    </div>
  )
}
```

---

## 4. Formulario de Producto (en Dialog)

```tsx
// src/pages/productos/ProductoFormDialog.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productoSchema, type ProductoFormValues } from '@/lib/schemas'
import { useCreateProducto, useUpdateProducto } from '@/hooks/useProductos'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/shared/FormField'
import type { Producto } from '@joyaspos/shared-types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  producto?: Producto  // si viene, es edición; si no, es creación
}

export function ProductoFormDialog({ open, onClose, producto }: Props) {
  const isEditing = Boolean(producto)
  const createMutation = useCreateProducto()
  const updateMutation = useUpdateProducto()
  const isPending = createMutation.isPending || updateMutation.isPending

  const { register, handleSubmit, formState: { errors }, reset } =
    useForm<ProductoFormValues>({
      resolver: zodResolver(productoSchema),
      defaultValues: producto
        ? { nombre: producto.nombre, unidad_medida: producto.unidad_medida }
        : { existencia: 0 },
    })

  const onSubmit = async (data: ProductoFormValues) => {
    try {
      if (isEditing && producto) {
        await updateMutation.mutateAsync({ id: producto.id, body: data })
        toast.success('Producto actualizado')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Producto creado')
      }
      reset()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al guardar el producto')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            id="nombre"
            label="Nombre *"
            error={errors.nombre}
            {...register('nombre')}
          />
          <FormField
            id="unidad_medida"
            label="Unidad de medida *"
            error={errors.unidad_medida}
            {...register('unidad_medida')}
          />
          {!isEditing && (
            <FormField
              id="existencia"
              label="Existencia inicial"
              type="number"
              error={errors.existencia}
              {...register('existencia')}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 5. Reglas

1. **`zodResolver(schema)`** siempre en `useForm` — nunca validación manual con `if`.
2. **Errores de servidor** (`toast.error`) separados de errores de validación (bajo el campo).
3. **`reset()` + `onClose()`** siempre en `onSuccess` — no cerrar el dialog antes de confirmar el éxito.
4. **`disabled={isPending}`** en el botón submit — nunca permitir doble envío.
5. **`defaultValues`** precarga el formulario en modo edición — nunca campos vacíos con datos existentes.
6. **No usar `<form>` nativo en React** — usar `<form onSubmit={handleSubmit(onSubmit)}>` (React Hook Form gestiona el submit).
