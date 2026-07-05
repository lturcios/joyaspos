import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type { LoginResponse, UserSession } from '@joyaspos/shared-types'

interface AuthState {
  token: string | null
  user: UserSession | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  setSession: (token: string, user: UserSession) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (username, password) => {
        try {
          const { data } = await api.post<LoginResponse>('/auth/login', { username, password })
          set({ token: data.token, user: data.user, isAuthenticated: true })
          return { success: true }
        } catch (err: unknown) { // Axios error shape
          const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
          const message = axiosErr.response?.data?.message ?? axiosErr.message ?? 'Error de conexión'
          return { success: false, error: message }
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
        queryClient.clear()
      },

      setSession: (token, user) => {
        set({ token, user, isAuthenticated: true })
      },
    }),
    {
      name: 'joyas-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
