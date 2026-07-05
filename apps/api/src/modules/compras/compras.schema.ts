import { z } from 'zod'

const compraItemSchema = z.object({
  producto_id: z.number().int().positive(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  costo_unitario: z.number().min(0, 'El costo unitario no puede ser negativo'),
})

export const createCompraSchema = z
  .object({
    proveedor_id: z.number().int().positive().nullable().optional(),
    proveedor_nombre: z.string().max(150).nullable().optional(),
    notas: z.string().max(2000).nullable().optional(),
    fecha_hora: z.string().datetime().optional(),
    items: z.array(compraItemSchema).min(1, 'La compra debe tener al menos un ítem'),
  })

export type CreateCompraInput = z.infer<typeof createCompraSchema>
