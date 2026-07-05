import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type {
  Producto,
  CreateProductoRequest,
  UpdateProductoRequest,
  IngresoExistenciaRequest,
} from '@joyaspos/shared-types'

export function useProductos() {
  return useQuery({
    queryKey: queryKeys.productos.list(),
    queryFn: async () => {
      const { data } = await api.get<Producto[]>('/productos')
      return data
    },
  })
}

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
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
      qc.invalidateQueries({ queryKey: ['reportes', 'inventario'] })
      qc.invalidateQueries({ queryKey: queryKeys.reportes.dashboard() })
    },
  })
}
