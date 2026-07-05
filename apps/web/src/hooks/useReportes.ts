import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type {
  ReporteDashboard,
  ReporteVentas,
  ReporteProductoTop,
  ReporteMovimientoProducto,
  ReporteRentabilidad,
  ReporteCompras,
  KardexResponse,
} from '@joyaspos/shared-types'

type PeriodoParams = { desde: string; hasta: string }

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.reportes.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<ReporteDashboard>('/reportes/dashboard')
      return data
    },
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 5,
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

export function useReporteProductosTop(params: PeriodoParams & { limit?: number }) {
  return useQuery({
    queryKey: queryKeys.reportes.productosTop(params),
    queryFn: async () => {
      const { data } = await api.get<ReporteProductoTop[]>('/reportes/productos-top', { params })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteInventario(params: PeriodoParams) {
  return useQuery({
    queryKey: queryKeys.reportes.inventario(params),
    queryFn: async () => {
      const { data } = await api.get<ReporteMovimientoProducto[]>('/reportes/inventario', {
        params,
      })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteRentabilidad(params: PeriodoParams) {
  return useQuery({
    queryKey: queryKeys.reportes.rentabilidad(params),
    queryFn: async () => {
      const { data } = await api.get<ReporteRentabilidad>('/reportes/rentabilidad', { params })
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

export function useKardex(productoId: number | null) {
  return useQuery({
    queryKey: queryKeys.reportes.kardex(productoId ?? 0),
    queryFn: async () => {
      const { data } = await api.get<KardexResponse>(`/reportes/kardex/${productoId}`)
      return data
    },
    enabled: productoId !== null && productoId > 0,
  })
}
