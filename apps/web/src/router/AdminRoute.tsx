import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function AdminRoute() {
  const rol = useAuthStore((s) => s.user?.rol)

  if (rol !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
