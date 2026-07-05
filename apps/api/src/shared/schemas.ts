import { z } from 'zod'

export const periodoQuerySchema = z
  .object({
    desde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato inválido, use YYYY-MM-DD'),
    hasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato inválido, use YYYY-MM-DD'),
  })
  .refine((data) => new Date(data.desde) <= new Date(data.hasta), {
    message: '"desde" no puede ser posterior a "hasta"',
    path: ['desde'],
  })

export type PeriodoQuery = z.infer<typeof periodoQuerySchema>

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type IdParam = z.infer<typeof idParamSchema>
