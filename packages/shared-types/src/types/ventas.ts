// Item individual dentro de una venta (request)
export interface VentaItemRequest {
  producto_id: number
  cantidad: number          // > 0
  precio_unitario: number   // > 0
  detalle_adicional?: string | null
}

// Body para POST /ventas
export interface CreateVentaRequest {
  nombre_cliente?: string | null
  fecha_hora?: string       // ISO 8601; si no se envía, la API usa NOW()
  items: VentaItemRequest[]
}

// Item devuelto en respuesta de venta
export interface VentaDetalleItem {
  id: number
  producto_id: number
  detalle: string           // "{nombre_producto} {detalle_adicional}".trim()
  cantidad: number
  precio_unitario: number
  total: number
}

// Venta completa (response POST /ventas y GET /ventas/:id)
export interface Venta {
  id: number
  nombre_cliente: string
  monto_total: number
  fecha_hora: string        // ISO 8601
  usuario_id: number
  vendedor?: string         // username del vendedor (en listados)
  items?: VentaDetalleItem[]
}

// Item en el listado de ventas (GET /ventas — sin detalle)
export interface VentaResumen {
  id: number
  nombre_cliente: string
  monto_total: number
  fecha_hora: string
  vendedor: string
}

// --- SYNC BATCH (offline → online) ---

// Payload de una venta pendiente enviada por la app
export interface VentaSyncPayload extends CreateVentaRequest {
  local_id: number          // ID local en Room (para mapeo de respuesta)
}

// Body para POST /ventas/sync
export interface SyncVentasRequest {
  ventas: VentaSyncPayload[]
}

// Resultado por venta en el sync
export interface SyncResultItem {
  local_id: number
  remote_id: number
}

// Response de POST /ventas/sync
export interface SyncVentasResponse {
  sincronizadas: SyncResultItem[]
  errores: Array<{ local_id: number; mensaje: string }>
}

// Query params para GET /ventas
export interface VentasPeriodoQuery {
  desde: string   // YYYY-MM-DD
  hasta: string   // YYYY-MM-DD
}
