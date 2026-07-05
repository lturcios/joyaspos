import { z } from 'zod'

export const createProveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre del proveedor es requerido').max(150),
  contacto: z.string().max(100).optional(),
  telefono: z.string().max(20).optional(),
  direccion: z.string().max(255).optional(),
})

export const updateProveedorSchema = createProveedorSchema.partial().refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'Se debe proveer al menos un campo para actualizar' }
)

export type CreateProveedorInput = z.infer<typeof createProveedorSchema>
export type UpdateProveedorInput = z.infer<typeof updateProveedorSchema>
