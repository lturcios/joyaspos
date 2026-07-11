import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type { Sucursal, CreateSucursalRequest, UpdateSucursalRequest } from '@joyaspos/shared-types'

export function useSucursales() {
  return useQuery({
    queryKey: queryKeys.sucursales.list(),
    queryFn: async () => {
      const { data } = await api.get<Sucursal[]>('/sucursales')
      return data
    },
  })
}

export function useCreateSucursal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSucursalRequest) =>
      api.post<Sucursal>('/sucursales', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sucursales.all }),
  })
}

export function useUpdateSucursal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateSucursalRequest }) =>
      api.put<Sucursal>(`/sucursales/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sucursales.all }),
  })
}

export function useDesactivarSucursal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/sucursales/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sucursales.all }),
  })
}
