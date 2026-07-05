---
name: tanstack-query-axios
description: |
  Configura TanStack Query v5 con Axios para el panel web de JoyasPOS: QueryClient
  con defaults, hooks personalizados por módulo (useProductos, useVentas, useCompras,
  useProveedores, useReportes, useUsuarios), invalidación de queries tras mutaciones,
  y manejo de estados isLoading/isError/isEmpty. Usar al implementar cualquier
  pantalla que consuma datos de la API, al agregar un endpoint nuevo al panel web,
  al optimizar refetching, o al depurar por qué la UI no se actualiza tras una
  mutación. Es el patrón central de acceso a datos en el panel web.
  Depende de SKILL-21 (react-project-structure) y SKILL-30 (zustand-auth-store)
  para el interceptor de JWT en Axios.
---

# SKILL-23 — TanStack Query v5 + Axios (apps/web)

## Principio
**Nunca** hacer `axios.get()` directamente en un componente o página.
Todo acceso a la API pasa por hooks de TanStack Query en `src/hooks/`.

---

## 1. QueryClient y Axios (ver SKILL-21 para el código base)

El `queryClient` está en `src/lib/queryClient.ts` y la instancia `api` de Axios
con interceptores en `src/lib/axios.ts`. Importar siempre desde ahí.

---

## 2. Query Keys — convención del proyecto

Centralizar las keys evita inconsistencias al invalidar:

### `src/lib/queryKeys.ts`
```typescript
export const queryKeys = {
  // Productos
  productos: {
    all: ['productos'] as const,
    list: () => [...queryKeys.productos.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.productos.all, 'detail', id] as const,
  },
  // Ventas
  ventas: {
    all: ['ventas'] as const,
    list: (params: { desde: string; hasta: string }) =>
      [...queryKeys.ventas.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.ventas.all, 'detail', id] as const,
  },
  // Compras
  compras: {
    all: ['compras'] as const,
    list: (params: { desde: string; hasta: string }) =>
      [...queryKeys.compras.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.compras.all, 'detail', id] as const,
  },
  // Proveedores
  proveedores: {
    all: ['proveedores'] as const,
    list: () => [...queryKeys.proveedores.all, 'list'] as const,
  },
  // Reportes
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
  },
  // Usuarios
  usuarios: {
    all: ['usuarios'] as const,
    list: () => [...queryKeys.usuarios.all, 'list'] as const,
  },
} as const
```

---

## 3. `useProductos`

### `src/hooks/useProductos.ts`
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type {
  Producto, CreateProductoRequest, UpdateProductoRequest, IngresoExistenciaRequest,
} from '@joyaspos/shared-types'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useProductos() {
  return useQuery({
    queryKey: queryKeys.productos.list(),
    queryFn: async () => {
      const { data } = await api.get<Producto[]>('/productos')
      return data
    },
  })
}

// ── Mutaciones ────────────────────────────────────────────────────────────────

export function useCreateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateProductoRequest) =>
      api.post<Producto>('/productos', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
    },
  })
}

export function useUpdateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateProductoRequest }) =>
      api.put<Producto>(`/productos/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
    },
  })
}

export function useDesactivarProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/productos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
    },
  })
}

export function useIngresoExistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: IngresoExistenciaRequest }) =>
      api.post(`/productos/${id}/ingreso`, body).then((r) => r.data),
    onSuccess: () => {
      // Invalida productos (existencias) y reportes de inventario
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
      qc.invalidateQueries({ queryKey: ['reportes', 'inventario'] })
      qc.invalidateQueries({ queryKey: queryKeys.reportes.dashboard() })
    },
  })
}
```

---

## 4. `useVentas`

### `src/hooks/useVentas.ts`
```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type { VentaResumen, Venta } from '@joyaspos/shared-types'

export function useVentas(params: { desde: string; hasta: string }) {
  return useQuery({
    queryKey: queryKeys.ventas.list(params),
    queryFn: async () => {
      const { data } = await api.get<VentaResumen[]>('/ventas', { params })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useVentaDetalle(id: number | null) {
  return useQuery({
    queryKey: queryKeys.ventas.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await api.get<Venta>(`/ventas/${id}`)
      return data
    },
    enabled: id !== null,
  })
}
```

---

## 5. `useCompras`

### `src/hooks/useCompras.ts`
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type { Compra, CompraResumen, CreateCompraRequest } from '@joyaspos/shared-types'

export function useCompras(params: { desde: string; hasta: string }) {
  return useQuery({
    queryKey: queryKeys.compras.list(params),
    queryFn: async () => {
      const { data } = await api.get<CompraResumen[]>('/compras', { params })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useCompraDetalle(id: number | null) {
  return useQuery({
    queryKey: queryKeys.compras.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await api.get<Compra>(`/compras/${id}`)
      return data
    },
    enabled: id !== null,
  })
}

export function useCreateCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCompraRequest) =>
      api.post<Compra>('/compras', body).then((r) => r.data),
    onSuccess: () => {
      // Una compra afecta compras, existencias y reportes
      qc.invalidateQueries({ queryKey: queryKeys.compras.all })
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
      qc.invalidateQueries({ queryKey: ['reportes'] })
    },
  })
}
```

---

## 6. `useProveedores`

### `src/hooks/useProveedores.ts`
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type {
  Proveedor, CreateProveedorRequest, UpdateProveedorRequest,
} from '@joyaspos/shared-types'

export function useProveedores() {
  return useQuery({
    queryKey: queryKeys.proveedores.list(),
    queryFn: async () => {
      const { data } = await api.get<Proveedor[]>('/proveedores')
      return data
    },
  })
}

export function useCreateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateProveedorRequest) =>
      api.post<Proveedor>('/proveedores', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.proveedores.all }),
  })
}

export function useUpdateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateProveedorRequest }) =>
      api.put<Proveedor>(`/proveedores/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.proveedores.all }),
  })
}

export function useDesactivarProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/proveedores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.proveedores.all }),
  })
}
```

---

## 7. `useReportes`

### `src/hooks/useReportes.ts`
```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type {
  ReporteDashboard, ReporteVentas, ReporteProductoTop,
  ReporteMovimientoProducto, ReporteRentabilidad, ReporteCompras,
} from '@joyaspos/shared-types'

type PeriodoParams = { desde: string; hasta: string }

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.reportes.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<ReporteDashboard>('/reportes/dashboard')
      return data
    },
    staleTime: 1000 * 60,     // 1 minuto — el dashboard se refresca frecuentemente
    refetchInterval: 1000 * 60 * 5,  // Auto-refetch cada 5 min
  })
}

export function useReporteVentas(params: PeriodoParams) {
  return useQuery({
    queryKey: queryKeys.reportes.ventas(params),
    queryFn: async () => {
      const { data } = await api.get<ReporteVentas>('/reportes/ventas', { params })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteProductosTop(
  params: PeriodoParams & { limit?: number }
) {
  return useQuery({
    queryKey: queryKeys.reportes.productosTop(params),
    queryFn: async () => {
      const { data } = await api.get<ReporteProductoTop[]>(
        '/reportes/productos-top', { params }
      )
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteInventario(params: PeriodoParams) {
  return useQuery({
    queryKey: queryKeys.reportes.inventario(params),
    queryFn: async () => {
      const { data } = await api.get<ReporteMovimientoProducto[]>(
        '/reportes/inventario', { params }
      )
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteRentabilidad(params: PeriodoParams) {
  return useQuery({
    queryKey: queryKeys.reportes.rentabilidad(params),
    queryFn: async () => {
      const { data } = await api.get<ReporteRentabilidad>(
        '/reportes/rentabilidad', { params }
      )
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteCompras(params: PeriodoParams) {
  return useQuery({
    queryKey: queryKeys.reportes.compras(params),
    queryFn: async () => {
      const { data } = await api.get<ReporteCompras>('/reportes/compras', { params })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}
```

---

## 8. `useUsuarios`

### `src/hooks/useUsuarios.ts`
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type {
  Usuario, CreateUsuarioRequest, UpdateUsuarioRequest, ChangePasswordRequest,
} from '@joyaspos/shared-types'

export function useUsuarios() {
  return useQuery({
    queryKey: queryKeys.usuarios.list(),
    queryFn: async () => {
      const { data } = await api.get<Usuario[]>('/usuarios')
      return data
    },
  })
}

export function useCreateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUsuarioRequest) =>
      api.post<Usuario>('/usuarios', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.usuarios.all }),
  })
}

export function useUpdateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateUsuarioRequest }) =>
      api.put<Usuario>(`/usuarios/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.usuarios.all }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ChangePasswordRequest }) =>
      api.put(`/usuarios/${id}/password`, body),
  })
}

export function useDesactivarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/usuarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.usuarios.all }),
  })
}
```

---

## 9. Patrón de uso en páginas

```tsx
// Ejemplo en ProductosPage.tsx
export default function ProductosPage() {
  const { data: productos, isLoading, isError, refetch } = useProductos()
  const createMutation = useCreateProducto()

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState message="Error al cargar productos" onRetry={refetch} />
  if (!productos?.length) return <EmptyState message="No hay productos registrados" />

  return (
    <div>
      {/* tabla de productos */}
      <DataTable data={productos} columns={columns} />
    </div>
  )
}
```

---

## 10. Reglas

1. **Siempre `invalidateQueries` en `onSuccess`** — nunca actualizar el caché manualmente con `setQueryData` a menos que sea por rendimiento crítico.
2. **`enabled: Boolean(...)`** en queries que dependen de parámetros — evita llamadas con valores undefined.
3. **`queryKeys` como objeto centralizado** — nunca escribir strings de query keys directamente en los hooks.
4. **Una invalidación amplia es mejor que una estrecha** — `queryKeys.productos.all` invalida lista y detalles a la vez.
5. **Los hooks de reporte usan la query key con parámetros** — cada combinación de fechas tiene su caché independiente.
