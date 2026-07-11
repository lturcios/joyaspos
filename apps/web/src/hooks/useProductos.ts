import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import type {
  Producto,
  CreateProductoRequest,
  UpdateProductoRequest,
  IngresoExistenciaRequest,
} from '@joyaspos/shared-types'

export function useProductos() {
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useQuery({
    queryKey: queryKeys.productos.list(sucursalId),
    queryFn: async () => {
      const params: Record<string, unknown> = {}
      if (sucursalId !== null && sucursalId !== undefined) params.sucursal_id = sucursalId
      const { data } = await api.get<Producto[]>('/productos', { params })
      return data
    },
  })
}

export function useCreateProducto() {
  const qc = useQueryClient()
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useMutation({
    mutationFn: (body: CreateProductoRequest) => {
      const payload = sucursalId !== null ? { ...body, sucursal_id: sucursalId } : body
      return api.post<Producto>('/productos', payload).then((r) => r.data)
    },
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
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: IngresoExistenciaRequest }) => {
      const payload = sucursalId !== null ? { ...body, sucursal_id: sucursalId } : body
      return api.post(`/productos/${id}/ingreso`, payload).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
      // Use prefix key to match all inventario/dashboard queries regardless of sucursalId
      qc.invalidateQueries({ queryKey: ['reportes', 'inventario'] })
      qc.invalidateQueries({ queryKey: ['reportes', 'dashboard'] })
    },
  })
}
