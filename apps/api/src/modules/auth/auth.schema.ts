import { z } from 'zod'

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'El username no puede estar vacío')
    .max(50),
  password: z
    .string()
    .min(1, 'La contraseña no puede estar vacía'),
})

export type LoginInput = z.infer<typeof loginSchema>
