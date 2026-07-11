export const queryKeys = {
  productos: {
    all: ['productos'] as const,
    list: (sucursalId?: number | null) => ['productos', 'list', { sucursalId }] as const,
    detail: (id: number) => ['productos', 'detail', id] as const,
  },
  ventas: {
    all: ['ventas'] as const,
    list: (params: { desde: string; hasta: string }, sucursalId?: number | null) =>
      ['ventas', 'list', params, { sucursalId }] as const,
    detail: (id: number) => ['ventas', 'detail', id] as const,
  },
  compras: {
    all: ['compras'] as const,
    list: (params: { desde: string; hasta: string }, sucursalId?: number | null) =>
      ['compras', 'list', params, { sucursalId }] as const,
    detail: (id: number) => ['compras', 'detail', id] as const,
  },
  proveedores: {
    all: ['proveedores'] as const,
    list: () => ['proveedores', 'list'] as const,
  },
  reportes: {
    // Use prefix ['reportes', 'dashboard'] in invalidateQueries to match all sucursal variants
    dashboard: (sucursalId?: number | null) => ['reportes', 'dashboard', { sucursalId }] as const,
    ventas: (params: { desde: string; hasta: string }, sucursalId?: number | null) =>
      ['reportes', 'ventas', params, { sucursalId }] as const,
    productosTop: (params: { desde: string; hasta: string; limit?: number }, sucursalId?: number | null) =>
      ['reportes', 'productos-top', params, { sucursalId }] as const,
    inventario: (params: { desde: string; hasta: string }, sucursalId?: number | null) =>
      ['reportes', 'inventario', params, { sucursalId }] as const,
    rentabilidad: (params: { desde: string; hasta: string }, sucursalId?: number | null) =>
      ['reportes', 'rentabilidad', params, { sucursalId }] as const,
    compras: (params: { desde: string; hasta: string }, sucursalId?: number | null) =>
      ['reportes', 'compras', params, { sucursalId }] as const,
    kardex: (productoId: number) => ['reportes', 'kardex', productoId] as const,
  },
  usuarios: {
    all: ['usuarios'] as const,
    list: (sucursalId?: number | null) => ['usuarios', 'list', { sucursalId }] as const,
  },
  sucursales: {
    all: ['sucursales'] as const,
    list: () => ['sucursales', 'list'] as const,
  },
} as const
