// Proveedor
export interface Proveedor {
  id: number
  nombre: string
  contacto?: string
  telefono?: string
  direccion?: string
  activo: boolean
}

export interface CreateProveedorRequest {
  nombre: string
  contacto?: string
  telefono?: string
  direccion?: string
}

export interface UpdateProveedorRequest {
  nombre?: string
  contacto?: string
  telefono?: string
  direccion?: string
}

// Ítem de compra (request)
export interface CompraItemRequest {
  producto_id: number
  cantidad: number        // > 0
  costo_unitario: number  // > 0
}

// Body para POST /compras
// Regla: al menos uno de proveedor_id o proveedor_nombre debe estar presente
export interface CreateCompraRequest {
  proveedor_id?: number | null
  proveedor_nombre?: string | null
  notas?: string | null
  fecha_hora?: string     // ISO 8601; si no se envía, API usa NOW()
  items: CompraItemRequest[]
}

// Ítem devuelto en respuesta de compra
export interface CompraDetalleItem {
  id: number
  producto_id: number
  nombre_producto: string
  cantidad: number
  costo_unitario: number
  total: number
}

// Compra completa
export interface Compra {
  id: number
  proveedor_id?: number | null
  proveedor_nombre: string
  monto_total: number
  fecha_hora: string
  notas?: string | null
  registrado_por: string    // username del admin
  items?: CompraDetalleItem[]
}

// Compra en el listado (sin detalle)
export interface CompraResumen {
  id: number
  proveedor_nombre: string
  monto_total: number
  fecha_hora: string
  registrado_por: string
}
