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
      qc.invalidateQueries({ queryKey: queryKeys.compras.all })
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
      qc.invalidateQueries({ queryKey: ['reportes'] })
    },
  })
}
