import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import type {
  Usuario,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  ChangePasswordRequest,
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
