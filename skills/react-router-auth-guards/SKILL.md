---
name: react-router-auth-guards
description: |
  Configura React Router v6 con rutas protegidas para el panel web de JoyasPOS:
  PrivateRoute (redirige a /login si no autenticado), AdminRoute (redirige si rol
  no es admin), layout anidado con sidebar para rutas protegidas, y definición
  completa de todas las rutas del panel (/dashboard, /ventas, /compras, /reportes/*,
  /productos, /existencias, /usuarios, /proveedores). Usar al configurar el router
  por primera vez, al agregar una ruta nueva, al depurar redirects inesperados, o
  al revisar qué rutas requieren qué nivel de acceso.
  Depende de SKILL-21 (react-project-structure) y SKILL-30 (zustand-auth-store).
---

# SKILL-22 — React Router + Auth Guards (apps/web)

## Stack
React Router v6 · Zustand auth store

---

## 1. Guards de rutas

### `src/router/PrivateRoute.tsx`
```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

/**
 * Protege rutas que requieren estar autenticado.
 * Si no hay token: redirige a /login guardando la ruta de origen
 * para poder volver tras el login.
 */
export function PrivateRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
```

### `src/router/AdminRoute.tsx`
```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

/**
 * Protege rutas que requieren rol 'admin'.
 * Si el usuario es vendedor: redirige al dashboard.
 * Si no está autenticado: PrivateRoute lo habrá capturado antes.
 */
export function AdminRoute() {
  const rol = useAuthStore((s) => s.user?.rol)

  if (rol !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
```

---

## 2. Layout con sidebar responsivo

> **Responsividad obligatoria (DOD 4.6):** en pantallas < 1024px (tablet/móvil)
> el sidebar se oculta y se reemplaza por un botón hamburguesa que abre un
> drawer (`Sheet` de shadcn/ui). En desktop (≥ 1024px) el sidebar es fijo y
> siempre visible. Esta skill requiere el componente `sheet` de shadcn/ui
> instalado (`pnpm dlx shadcn-ui@latest add sheet`).

### `src/components/layout/AppLayout.tsx`
```tsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Sheet, SheetContent } from '@/components/ui/sheet'

/**
 * Shell principal de la app.
 * Desktop (≥1024px): sidebar fijo a la izquierda, siempre visible.
 * Mobile/Tablet (<1024px): sidebar oculto; se abre como drawer (Sheet)
 * desde el botón hamburguesa del Header.
 */
export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar fijo — solo desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Sidebar como drawer — solo mobile/tablet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

### `src/components/layout/Header.tsx`
```tsx
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

interface HeaderProps {
  onMenuClick: () => void
}

/**
 * Topbar — el botón hamburguesa SOLO es visible en mobile/tablet (<1024px);
 * en desktop el sidebar ya está fijo y visible, así que el botón no aplica.
 */
export function Header({ onMenuClick }: HeaderProps) {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Marca visible también en mobile, donde el sidebar está oculto */}
        <span className="font-serif text-lg font-semibold text-primary lg:hidden">
          JoyasPOS
        </span>
      </div>

      <span className="hidden text-sm text-muted-foreground sm:block">
        {user?.nombre_completo}
      </span>
    </header>
  )
}
```

### `src/components/layout/Sidebar.tsx`
```tsx
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard, ShoppingCart, Package, Truck,
  BarChart3, Boxes, Users, LogOut,
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
]

interface SidebarProps {
  /** Se llama al hacer clic en un link — usado para cerrar el drawer en mobile */
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const { user, logout } = useAuthStore()
  const isAdmin = user?.rol === 'admin'

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo — tipografía de marca (Playfair Display) */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <span className="font-serif text-lg font-semibold text-sidebar-primary">
          JoyasPOS
        </span>
      </div>

      {/* Navegación */}
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

      {/* Info del usuario + logout */}
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs font-medium text-sidebar-foreground">{user?.nombre_completo}</p>
        <p className="text-xs capitalize text-sidebar-foreground/60">{user?.rol}</p>
        <button
          onClick={logout}
          className="mt-2 flex min-h-[36px] items-center gap-2 text-xs text-sidebar-foreground/70 hover:text-destructive hover:underline"
        >
          <LogOut className="h-3 w-3" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
```

---

## 3. Definición completa del router

### `src/router/index.tsx`
```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PrivateRoute } from './PrivateRoute'
import { AdminRoute } from './AdminRoute'

// Pages — lazy imports para code splitting
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const LoginPage = lazy(() => import('@/pages/login/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const VentasPage = lazy(() => import('@/pages/ventas/VentasPage'))
const ProductosPage = lazy(() => import('@/pages/productos/ProductosPage'))
const ProveedoresPage = lazy(() => import('@/pages/proveedores/ProveedoresPage'))
const ComprasPage = lazy(() => import('@/pages/compras/ComprasPage'))
const NuevaCompraPage = lazy(() => import('@/pages/compras/NuevaCompraPage'))
const ReportesLayout = lazy(() => import('@/pages/reportes/ReportesLayout'))
const ReporteVentasPage = lazy(() => import('@/pages/reportes/ventas/ReporteVentasPage'))
const ReporteProductosTopPage = lazy(() => import('@/pages/reportes/productos-top/ReporteProductosTopPage'))
const ReporteInventarioPage = lazy(() => import('@/pages/reportes/inventario/ReporteInventarioPage'))
const ReporteRentabilidadPage = lazy(() => import('@/pages/reportes/rentabilidad/ReporteRentabilidadPage'))
const ReporteComprasPage = lazy(() => import('@/pages/reportes/compras/ReporteComprasPage'))
const ExistenciasPage = lazy(() => import('@/pages/existencias/ExistenciasPage'))
const UsuariosPage = lazy(() => import('@/pages/usuarios/UsuariosPage'))

const withSuspense = (Component: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter([
  // ── Ruta pública ────────────────────────────────────────────────────────────
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },

  // ── Rutas privadas (requieren autenticación) ────────────────────────────────
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [

          // Redirigir raíz al dashboard
          { index: true, element: <Navigate to="/dashboard" replace /> },

          // Dashboard — todos los autenticados
          { path: 'dashboard', element: withSuspense(DashboardPage) },

          // Ventas — todos los autenticados (vendedor ve solo las suyas)
          { path: 'ventas', element: withSuspense(VentasPage) },

          // ── Rutas solo para admin ──────────────────────────────────────────
          {
            element: <AdminRoute />,
            children: [
              { path: 'productos', element: withSuspense(ProductosPage) },
              { path: 'proveedores', element: withSuspense(ProveedoresPage) },
              { path: 'compras', element: withSuspense(ComprasPage) },
              { path: 'compras/nueva', element: withSuspense(NuevaCompraPage) },
              { path: 'existencias', element: withSuspense(ExistenciasPage) },
              { path: 'usuarios', element: withSuspense(UsuariosPage) },

              // Sub-rutas de reportes con layout propio
              {
                path: 'reportes',
                element: withSuspense(ReportesLayout),
                children: [
                  { index: true, element: <Navigate to="ventas" replace /> },
                  { path: 'ventas', element: withSuspense(ReporteVentasPage) },
                  { path: 'productos-top', element: withSuspense(ReporteProductosTopPage) },
                  { path: 'inventario', element: withSuspense(ReporteInventarioPage) },
                  { path: 'rentabilidad', element: withSuspense(ReporteRentabilidadPage) },
                  { path: 'compras', element: withSuspense(ReporteComprasPage) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // Catch-all — redirigir al dashboard
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
```

---

## 4. Redirigir al origen tras login

```tsx
// src/pages/login/LoginPage.tsx — fragmento
import { useNavigate, useLocation } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname ?? '/dashboard'

  const handleLoginSuccess = () => {
    navigate(from, { replace: true })
  }
  // ...
}
```

---

## 5. Reglas

1. **`<Navigate replace />`** siempre en redirects para no contaminar el historial.
2. **Lazy + Suspense** en todas las páginas — mejora el tiempo de carga inicial.
3. **`index: true`** en la ruta raíz dentro de AppLayout para el redirect a /dashboard.
4. **AdminRoute siempre anidado dentro de PrivateRoute** — no poner rutas admin fuera del guard de autenticación.
5. **El sidebar filtra items** por rol usando `user?.rol === 'admin'` — los links no visibles no son una protección real; los guards de ruta son la protección real.
6. **Requiere el componente `sheet` de shadcn/ui** — instalar con `pnpm dlx shadcn-ui@latest add sheet` antes de implementar `AppLayout`.
7. **Breakpoint de colapso: `lg` (1024px)** — por debajo, sidebar oculto + drawer; por encima, sidebar fijo. No usar `md` (768px) porque corta mal en tablets en orientación vertical.
8. **El drawer (`Sheet`) cierra automáticamente al navegar** — `onNavigate` en `Sidebar` debe llamarse desde cada `NavLink`; sin esto, el usuario navega pero el drawer queda abierto tapando el contenido.
9. **Probar SIEMPRE en 3 anchos:** 375px (móvil), 768px (tablet), 1440px (desktop) — ver DOD.md sección 4.6.
