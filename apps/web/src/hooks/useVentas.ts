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
