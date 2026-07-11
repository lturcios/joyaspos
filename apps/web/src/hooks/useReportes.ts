import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
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
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useQuery({
    queryKey: queryKeys.reportes.dashboard(sucursalId),
    queryFn: async () => {
      const params: Record<string, unknown> = {}
      if (sucursalId !== null && sucursalId !== undefined) params.sucursal_id = sucursalId
      const { data } = await api.get<ReporteDashboard>('/reportes/dashboard', { params })
      return data
    },
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 5,
  })
}

export function useReporteVentas(params: PeriodoParams) {
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useQuery({
    queryKey: queryKeys.reportes.ventas(params, sucursalId),
    queryFn: async () => {
      const reqParams: Record<string, unknown> = { ...params }
      if (sucursalId !== null && sucursalId !== undefined) reqParams.sucursal_id = sucursalId
      const { data } = await api.get<ReporteVentas>('/reportes/ventas', { params: reqParams })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteProductosTop(params: PeriodoParams & { limit?: number }) {
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useQuery({
    queryKey: queryKeys.reportes.productosTop(params, sucursalId),
    queryFn: async () => {
      const reqParams: Record<string, unknown> = { ...params }
      if (sucursalId !== null && sucursalId !== undefined) reqParams.sucursal_id = sucursalId
      const { data } = await api.get<ReporteProductoTop[]>('/reportes/productos-top', { params: reqParams })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteInventario(params: PeriodoParams) {
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useQuery({
    queryKey: queryKeys.reportes.inventario(params, sucursalId),
    queryFn: async () => {
      const reqParams: Record<string, unknown> = { ...params }
      if (sucursalId !== null && sucursalId !== undefined) reqParams.sucursal_id = sucursalId
      const { data } = await api.get<ReporteMovimientoProducto[]>('/reportes/inventario', {
        params: reqParams,
      })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteRentabilidad(params: PeriodoParams) {
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useQuery({
    queryKey: queryKeys.reportes.rentabilidad(params, sucursalId),
    queryFn: async () => {
      const reqParams: Record<string, unknown> = { ...params }
      if (sucursalId !== null && sucursalId !== undefined) reqParams.sucursal_id = sucursalId
      const { data } = await api.get<ReporteRentabilidad>('/reportes/rentabilidad', { params: reqParams })
      return data
    },
    enabled: Boolean(params.desde && params.hasta),
  })
}

export function useReporteCompras(params: PeriodoParams) {
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useQuery({
    queryKey: queryKeys.reportes.compras(params, sucursalId),
    queryFn: async () => {
      const reqParams: Record<string, unknown> = { ...params }
      if (sucursalId !== null && sucursalId !== undefined) reqParams.sucursal_id = sucursalId
      const { data } = await api.get<ReporteCompras>('/reportes/compras', { params: reqParams })
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
