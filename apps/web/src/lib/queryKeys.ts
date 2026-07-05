export const queryKeys = {
  productos: {
    all: ['productos'] as const,
    list: () => [...queryKeys.productos.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.productos.all, 'detail', id] as const,
  },
  ventas: {
    all: ['ventas'] as const,
    list: (params: { desde: string; hasta: string }) =>
      [...queryKeys.ventas.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.ventas.all, 'detail', id] as const,
  },
  compras: {
    all: ['compras'] as const,
    list: (params: { desde: string; hasta: string }) =>
      [...queryKeys.compras.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.compras.all, 'detail', id] as const,
  },
  proveedores: {
    all: ['proveedores'] as const,
    list: () => [...queryKeys.proveedores.all, 'list'] as const,
  },
  reportes: {
    dashboard: () => ['reportes', 'dashboard'] as const,
    ventas: (params: { desde: string; hasta: string }) =>
      ['reportes', 'ventas', params] as const,
    productosTop: (params: { desde: string; hasta: string; limit?: number }) =>
      ['reportes', 'productos-top', params] as const,
    inventario: (params: { desde: string; hasta: string }) =>
      ['reportes', 'inventario', params] as const,
    rentabilidad: (params: { desde: string; hasta: string }) =>
      ['reportes', 'rentabilidad', params] as const,
    compras: (params: { desde: string; hasta: string }) =>
      ['reportes', 'compras', params] as const,
    kardex: (productoId: number) => ['reportes', 'kardex', productoId] as const,
  },
  usuarios: {
    all: ['usuarios'] as const,
    list: () => [...queryKeys.usuarios.all, 'list'] as const,
  },
} as const
