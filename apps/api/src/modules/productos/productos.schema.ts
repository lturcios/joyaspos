import { z } from 'zod'

export const createProductoSchema = z.object({
  nombre: z.string().min(1, 'El nombre no puede estar vacío').max(150),
  unidad_medida: z
    .string()
    .min(1, 'La unidad de medida no puede estar vacía')
    .max(30),
  existencia: z.number().nonnegative().default(0),
})

export const updateProductoSchema = z
  .object({
    nombre: z.string().min(1).max(150).optional(),
    unidad_medida: z.string().min(1).max(30).optional(),
  })
  .refine(
    (data) => data.nombre !== undefined || data.unidad_medida !== undefined,
    { message: 'Se debe proveer al menos un campo para actualizar' }
  )

export const ingresoExistenciaSchema = z.object({
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
})

export type CreateProductoInput = z.infer<typeof createProductoSchema>
export type UpdateProductoInput = z.infer<typeof updateProductoSchema>
export type IngresoExistenciaInput = z.infer<typeof ingresoExistenciaSchema>
