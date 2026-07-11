import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import type { Compra, CompraResumen, CreateCompraRequest } from '@joyaspos/shared-types'

export function useCompras(params: { desde: string; hasta: string }) {
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useQuery({
    queryKey: queryKeys.compras.list(params, sucursalId),
    queryFn: async () => {
      const reqParams: Record<string, unknown> = { ...params }
      if (sucursalId !== null && sucursalId !== undefined) reqParams.sucursal_id = sucursalId
      const { data } = await api.get<CompraResumen[]>('/compras', { params: reqParams })
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
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useMutation({
    mutationFn: (body: CreateCompraRequest) => {
      const payload = sucursalId !== null ? { ...body, sucursal_id: sucursalId } : body
      return api.post<Compra>('/compras', payload).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.compras.all })
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
      qc.invalidateQueries({ queryKey: ['reportes'] })
    },
  })
}
