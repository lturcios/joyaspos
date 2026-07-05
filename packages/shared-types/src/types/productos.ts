// Producto tal como lo devuelve GET /productos
export interface Producto {
  id: number
  nombre: string
  unidad_medida: string
  existencia: number
  activo: boolean
}

// Body para POST /productos
export interface CreateProductoRequest {
  nombre: string
  unidad_medida: string
  existencia?: number
}

// Body para PUT /productos/:id
export interface UpdateProductoRequest {
  nombre?: string
  unidad_medida?: string
}

// Body para POST /productos/:id/ingreso
export interface IngresoExistenciaRequest {
  cantidad: number    // debe ser > 0
}

// Response de ingreso exitoso
export interface IngresoExistenciaResponse {
  id: number
  nombre: string
  existencia_anterior: number
  existencia_nueva: number
}
