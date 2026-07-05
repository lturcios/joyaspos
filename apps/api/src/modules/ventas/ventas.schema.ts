import { z } from 'zod'

export const ventaItemSchema = z.object({
  producto_id: z.number().int().positive(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().positive('El precio debe ser mayor a 0'),
  detalle_adicional: z.string().max(200).nullable().optional(),
})

export const createVentaSchema = z.object({
  nombre_cliente: z.string().max(100).nullable().optional(),
  fecha_hora: z
    .string()
    .datetime({ local: true, message: 'Formato de fecha inválido, use ISO 8601' })
    .optional(),
  items: z.array(ventaItemSchema).min(1, 'La venta debe tener al menos un ítem'),
})

export const ventaSyncPayloadSchema = createVentaSchema.extend({
  local_id: z.number().int().positive(),
})

export const syncVentasSchema = z.object({
  ventas: z
    .array(ventaSyncPayloadSchema)
    .min(1, 'El array de ventas no puede estar vacío')
    .max(20, 'Máximo 20 ventas por lote de sincronización'),
})

export type CreateVentaInput = z.infer<typeof createVentaSchema>
export type VentaSyncPayload = z.infer<typeof ventaSyncPayloadSchema>
export type SyncVentasInput = z.infer<typeof syncVentasSchema>
