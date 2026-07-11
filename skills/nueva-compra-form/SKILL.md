---
name: nueva-compra-form
description: |
  Implementa el formulario de nueva compra/abastecimiento en el panel web de
  JoyasPOS: selector de proveedor del catálogo O nombre libre (exclusión mutua),
  tabla de ítems dinámica (agregar/eliminar filas, selector de producto, cantidad,
  costo unitario, subtotal calculado), monto total en tiempo real, notas opcionales,
  dialog de confirmación antes de guardar, y manejo de POST /compras con invalidación
  de existencias y reportes. Usar al implementar NuevaCompraPage, al depurar por
  qué el monto total no se actualiza, o al revisar la lógica de exclusión mutua
  entre proveedor del catálogo y nombre libre. Depende de SKILL-21, SKILL-23
  (useCompras, useProveedores), SKILL-24 (React Hook Form + Zod) y SKILL-28 (compras schema).
---

> **⚠️ MULTITENANCY — LEER PRIMERO `skills/multitenancy-empresa-sucursal/SKILL.md`.**
> Esta skill fue escrita antes del requisito multiempresa/multisucursal. La skill
> de multitenancy define deltas OBLIGATORIOS que modifican el código de esta skill
> (campos `empresa_id`/`sucursal_id`, JWT extendido, scoping por sucursal en todos
> los queries, selector de sucursal, aislamiento de datos locales). Donde ambas
> se contradigan, gana la skill de multitenancy.


# SKILL-29 — Formulario Nueva Compra (apps/web)

---

## 1. Schema Zod del formulario

```typescript
// Ya definido en src/lib/schemas.ts (SKILL-24) — recordatorio:
// El schema de nueva compra está en SKILL-06 (api) y validado en el cliente
// con el mismo contrato de @joyaspos/shared-types → CreateCompraRequest

// Schema local del formulario (más amigable que el del API)
import { z } from 'zod'

export const nuevaCompraFormSchema = z.object({
  // Proveedor — uno de los dos debe estar presente
  proveedor_id: z.number().int().positive().nullable().optional(),
  proveedor_nombre_libre: z.string().max(150).optional(),

  notas: z.string().max(2000).optional(),

  items: z.array(
    z.object({
      producto_id: z.number().int().positive({ message: 'Selecciona un producto' }),
      cantidad: z.coerce
        .number({ invalid_type_error: 'Ingresa una cantidad válida' })
        .positive('La cantidad debe ser mayor a 0'),
      costo_unitario: z.coerce
        .number({ invalid_type_error: 'Ingresa un costo válido' })
        .positive('El costo debe ser mayor a 0'),
    })
  ).min(1, 'Agrega al menos un ítem a la compra'),
}).refine(
  (data) => data.proveedor_id || (data.proveedor_nombre_libre?.trim().length ?? 0) > 0,
  { message: 'Selecciona un proveedor o ingresa un nombre', path: ['proveedor_id'] }
)

export type NuevaCompraFormValues = z.infer<typeof nuevaCompraFormSchema>
```

---

## 2. NuevaCompraPage completa

```tsx
// src/pages/compras/NuevaCompraPage.tsx
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, AlertCircle } from 'lucide-react'

import { nuevaCompraFormSchema, type NuevaCompraFormValues } from '@/lib/schemas'
import { useProveedores } from '@/hooks/useProveedores'
import { useProductos } from '@/hooks/useProductos'
import { useCreateCompra } from '@/hooks/useCompras'
import { formatCurrency } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NuevaCompraPage() {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [usarNombreLibre, setUsarNombreLibre] = useState(false)

  const { data: proveedores = [] } = useProveedores()
  const { data: productos = [] } = useProductos()
  const createCompra = useCreateCompra()

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NuevaCompraFormValues>({
    resolver: zodResolver(nuevaCompraFormSchema),
    defaultValues: {
      proveedor_id: undefined,
      proveedor_nombre_libre: '',
      notas: '',
      items: [{ producto_id: 0, cantidad: 1, costo_unitario: 0 }],
    },
  })

  // useFieldArray maneja la tabla de ítems dinámicamente
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  // Observar ítems para calcular el total en tiempo real
  const watchedItems = watch('items')
  const montoTotal = watchedItems.reduce((acc, item) => {
    const cantidad = Number(item.cantidad) || 0
    const costo = Number(item.costo_unitario) || 0
    return acc + cantidad * costo
  }, 0)

  // Submit — abre el dialog de confirmación
  const onSubmitConfirm = () => setConfirmOpen(true)

  // Guardar tras confirmar
  const onConfirmed = handleSubmit(async (data) => {
    setConfirmOpen(false)
    try {
      await createCompra.mutateAsync({
        proveedor_id: usarNombreLibre ? null : (data.proveedor_id ?? null),
        proveedor_nombre: usarNombreLibre ? data.proveedor_nombre_libre : null,
        notas: data.notas || null,
        items: data.items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          costo_unitario: item.costo_unitario,
        })),
      })
      toast.success('Compra registrada exitosamente')
      navigate('/compras')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al registrar la compra')
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/compras')}>← Volver</Button>
        <h1 className="text-2xl font-bold">Nueva Compra</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Columna principal ─────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Proveedor */}
          <Card>
            <CardHeader><CardTitle className="text-base">Proveedor</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle catálogo / nombre libre */}
              <div className="flex gap-2">
                <Button
                  type="button" size="sm"
                  variant={!usarNombreLibre ? 'default' : 'outline'}
                  onClick={() => setUsarNombreLibre(false)}
                >
                  Del catálogo
                </Button>
                <Button
                  type="button" size="sm"
                  variant={usarNombreLibre ? 'default' : 'outline'}
                  onClick={() => setUsarNombreLibre(true)}
                >
                  Nombre libre
                </Button>
              </div>

              {/* Selector del catálogo */}
              {!usarNombreLibre && (
                <div className="space-y-1">
                  <Label>Proveedor *</Label>
                  <Controller
                    control={control}
                    name="proveedor_id"
                    render={({ field }) => (
                      <Select
                        value={field.value?.toString() ?? ''}
                        onValueChange={(val) => field.onChange(Number(val))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un proveedor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {proveedores.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.proveedor_id && (
                    <p className="text-xs text-destructive">{errors.proveedor_id.message}</p>
                  )}
                </div>
              )}

              {/* Nombre libre */}
              {usarNombreLibre && (
                <div className="space-y-1">
                  <Label htmlFor="proveedor_nombre_libre">Nombre del proveedor *</Label>
                  <Input
                    id="proveedor_nombre_libre"
                    placeholder="Ej: Distribuidora del Norte"
                    {...register('proveedor_nombre_libre')}
                  />
                  {errors.proveedor_nombre_libre && (
                    <p className="text-xs text-destructive">
                      {errors.proveedor_nombre_libre.message}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla de ítems */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Productos comprados</CardTitle>
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={() => append({ producto_id: 0, cantidad: 1, costo_unitario: 0 })}
                >
                  <Plus className="mr-1 h-4 w-4" /> Agregar ítem
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {errors.items?.root && (
                <p className="mb-3 flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.items.root.message}
                </p>
              )}

              <div className="space-y-3">
                {/* Encabezado de tabla */}
                <div className="hidden grid-cols-[1fr_100px_120px_100px_40px] gap-2 text-xs font-medium text-muted-foreground lg:grid">
                  <span>Producto</span>
                  <span>Cantidad</span>
                  <span>Costo unitario</span>
                  <span>Subtotal</span>
                  <span />
                </div>

                {fields.map((field, index) => {
                  const item = watchedItems[index]
                  const subtotal = (Number(item?.cantidad) || 0) * (Number(item?.costo_unitario) || 0)

                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_100px_120px_100px_40px]"
                    >
                      {/* Selector de producto */}
                      <Controller
                        control={control}
                        name={`items.${index}.producto_id`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value > 0 ? String(f.value) : ''}
                            onValueChange={(val) => f.onChange(Number(val))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar producto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {productos.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />

                      {/* Cantidad */}
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Cant."
                        {...register(`items.${index}.cantidad`)}
                      />

                      {/* Costo unitario */}
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-7"
                          {...register(`items.${index}.costo_unitario`)}
                        />
                      </div>

                      {/* Subtotal calculado */}
                      <div className="flex items-center text-sm font-medium">
                        {formatCurrency(subtotal)}
                      </div>

                      {/* Eliminar ítem */}
                      <Button
                        type="button" variant="ghost" size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader><CardTitle className="text-base">Notas (opcional)</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observaciones de la compra..."
                rows={3}
                {...register('notas')}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Columna lateral — Resumen ──────────────────────────────────── */}
        <div>
          <Card className="sticky top-6">
            <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ítems</span>
                <span className="font-medium">{fields.length}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-base font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(montoTotal)}
                </span>
              </div>
              <Button
                className="w-full"
                onClick={onSubmitConfirm}
                disabled={createCompra.isPending}
              >
                {createCompra.isPending ? 'Guardando...' : 'Registrar compra'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de confirmación */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar compra</AlertDialogTitle>
            <AlertDialogDescription>
              Se registrará una compra por <strong>{formatCurrency(montoTotal)}</strong> con{' '}
              <strong>{fields.length} ítem(s)</strong>. Las existencias de los productos
              se actualizarán automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmed}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

---

## 3. Reglas

1. **Toggle catálogo / nombre libre** — cuando el usuario cambia de modo, limpiar el valor del otro campo para no enviar datos contradictorios.
2. **`useFieldArray`** para la tabla de ítems — nunca manejar el array de ítems con `useState`.
3. **Subtotal en tiempo real** con `watch('items')` — no esperar al submit para mostrarlo.
4. **Dialog de confirmación obligatorio** — el botón "Registrar" abre el dialog; el submit real ocurre al confirmar.
5. **`disabled={fields.length === 1}`** en el botón eliminar — nunca permitir una compra con cero ítems.
6. **Redirigir a `/compras`** tras éxito — no dejar al usuario en el formulario vacío.
