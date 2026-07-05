// --- Reporte Ventas por Período (GET /reportes/ventas) ---
export interface ReporteVentasPorDia {
  fecha: string         // YYYY-MM-DD
  monto: number
  cantidad: number
}

export interface ReporteVentasPorVendedor {
  username: string
  nombre_completo: string
  monto: number
  cantidad: number
  ticket_promedio: number
}

export interface ReporteVentas {
  total_ventas: number
  cantidad_transacciones: number
  ticket_promedio: number
  por_dia: ReporteVentasPorDia[]
  por_vendedor: ReporteVentasPorVendedor[]
}

// --- Top Productos (GET /reportes/productos-top) ---
export interface ReporteProductoTop {
  producto_id: number
  nombre: string
  cantidad_total: number
  monto_total: number
  porcentaje_del_total: number
}

// --- Movimiento de Inventario (GET /reportes/inventario) ---
export interface ReporteMovimientoProducto {
  producto_id: number
  nombre: string
  existencia_actual: number
  entradas: number      // suma de compras en el período
  salidas: number       // suma de ventas en el período
  balance: number       // entradas - salidas
}

// --- Rentabilidad (GET /reportes/rentabilidad) ---
export interface ReporteRentabilidadProducto {
  producto_id: number
  nombre: string
  ingresos: number      // suma precio_unitario * cantidad de ventas
  costos: number        // suma costo_unitario * cantidad de compras
  margen: number        // ingresos - costos
  margen_pct: number    // (margen / ingresos) * 100
}

export interface ReporteRentabilidad {
  margen_promedio_pct: number
  productos: ReporteRentabilidadProducto[]
}

// --- Dashboard (GET /reportes/dashboard) ---
export interface ReporteDashboard {
  ventas_hoy: { monto: number; cantidad: number }
  ventas_ayer: { monto: number; cantidad: number }
  delta_pct: number             // ((hoy - ayer) / ayer) * 100
  ventas_semana: {
    monto: number
    por_dia: ReporteVentasPorDia[]
  }
  compras_semana: { monto: number; cantidad: number }
  productos_stock_bajo: Array<{  // existencia <= 5
    id: number
    nombre: string
    existencia: number
  }>
  top_productos_hoy: ReporteProductoTop[]
}

// --- Compras por Período (GET /reportes/compras) ---
export interface ReporteComprasPorDia {
  fecha: string
  monto: number
  cantidad: number
}

export interface ReporteComprasPorProveedor {
  proveedor_nombre: string
  monto_total: number
  cantidad_ordenes: number
}

export interface ReporteCompras {
  total_compras: number
  cantidad_ordenes: number
  por_dia: ReporteComprasPorDia[]
  por_proveedor: ReporteComprasPorProveedor[]
}

// --- Kardex de Producto (GET /reportes/kardex/:productoId) ---
export type KardexTipo = 'compra' | 'venta' | 'inventario_inicial'

export interface KardexRow {
  correlativo: number
  tipo: KardexTipo
  fecha: string           // YYYY-MM-DD, vacío para inventario_inicial
  hora: string            // HH:MM, vacío para inventario_inicial
  nombre_contraparte: string
  cantidad: number
  precio_unitario: number
  total: number
  nueva_existencia: number
}

export interface KardexResponse {
  producto_id: number
  nombre: string
  existencia_actual: number
  rows: KardexRow[]
}

// --- Query params reutilizables ---
export interface PeriodoQuery {
  desde: string   // YYYY-MM-DD
  hasta: string   // YYYY-MM-DD
}
