import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type { Proveedor, CreateProveedorRequest, UpdateProveedorRequest } from '@joyaspos/shared-types'

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
