import { z } from 'zod'

const rolEnum = z.enum(['admin', 'vendedor'])

export const createUsuarioSchema = z.object({
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre_completo: z.string().min(1).max(100),
  rol: rolEnum,
})

export const updateUsuarioSchema = z
  .object({
    nombre_completo: z.string().min(1).max(100).optional(),
    rol: rolEnum.optional(),
    activo: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Se debe proveer al menos un campo para actualizar' }
  )

export const changePasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
