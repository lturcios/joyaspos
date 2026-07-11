import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type { LoginResponse, UserSession, Empresa, Sucursal } from '@joyaspos/shared-types'

interface AuthState {
  token: string | null
  user: UserSession | null
  isAuthenticated: boolean
  empresa: Empresa | null
  sucursales: Sucursal[]
  /**
   * sucursalActiva: null = "All branches" (consolidated view, admin only).
   * For vendors: always their own branch (not editable).
   */
  sucursalActiva: number | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  setSession: (token: string, user: UserSession) => void
  setSucursalActiva: (id: number | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      empresa: null,
      sucursales: [],
      sucursalActiva: null,

      login: async (username, password) => {
        try {
          const { data } = await api.post<LoginResponse>('/auth/login', { username, password })
          // Vendors are locked to their own branch; admins start consolidated (null)
          const sucursalActiva = data.user.rol === 'vendedor' ? data.user.sucursal_id : null
          set({
            token: data.token,
            user: data.user,
            isAuthenticated: true,
            empresa: data.empresa,
            sucursales: data.sucursales,
            sucursalActiva,
          })
          return { success: true }
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
          const message = axiosErr.response?.data?.message ?? axiosErr.message ?? 'Error de conexión'
          return { success: false, error: message }
        }
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          empresa: null,
          sucursales: [],
          sucursalActiva: null,
        })
        queryClient.clear()
      },

      setSession: (token, user) => {
        set({ token, user, isAuthenticated: true })
      },

      setSucursalActiva: (id) => {
        set({ sucursalActiva: id })
      },
    }),
    {
      name: 'joyas-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        empresa: state.empresa,
        sucursales: state.sucursales,
        sucursalActiva: state.sucursalActiva,
      }),
    }
  )
)
