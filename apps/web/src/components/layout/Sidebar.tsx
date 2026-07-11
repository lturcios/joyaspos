import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard, ShoppingCart, Package, Truck,
  BarChart3, Boxes, Users, LogOut, Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart, adminOnly: false },
  { to: '/productos', label: 'Productos', icon: Package, adminOnly: true },
  { to: '/proveedores', label: 'Proveedores', icon: Truck, adminOnly: true },
  { to: '/compras', label: 'Compras', icon: ShoppingCart, adminOnly: true },
  { to: '/reportes/ventas', label: 'Reportes', icon: BarChart3, adminOnly: true },
  { to: '/existencias', label: 'Existencias', icon: Boxes, adminOnly: true },
  { to: '/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
  { to: '/sucursales', label: 'Sucursales', icon: Store, adminOnly: true },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const { user, logout } = useAuthStore()
  const isAdmin = user?.rol === 'admin'

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <span className="font-serif text-lg font-semibold text-sidebar-primary">
          JoyasPOS
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs font-medium text-sidebar-foreground">{user?.nombre_completo}</p>
        <p className="text-xs capitalize text-sidebar-foreground/60">{user?.rol}</p>
        <button
          onClick={logout}
          className="mt-2 flex min-h-[36px] items-center gap-2 text-xs text-sidebar-foreground/70 hover:text-destructive hover:underline"
        >
          <LogOut className="h-3 w-3" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
