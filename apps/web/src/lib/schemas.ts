import { z } from 'zod'
import { Rol } from '@joyaspos/shared-types'

export const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(150),
  unidad_medida: z.string().min(1, 'La unidad de medida es requerida').max(30),
  existencia: z.number().nonnegative('La existencia no puede ser negativa'),
})

export const ingresoExistenciaSchema = z.object({
  cantidad: z.number({ message: 'Ingresa un número válido' }).positive('Debe ser mayor a 0'),
})

export const usuarioSchema = z.object({
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre_completo: z.string().min(1, 'El nombre es requerido').max(100),
  rol: z.nativeEnum(Rol),
})

export const editUsuarioSchema = z.object({
  nombre_completo: z.string().min(1).max(100),
  rol: z.nativeEnum(Rol),
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
