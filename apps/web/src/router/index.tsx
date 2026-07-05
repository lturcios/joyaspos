import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PrivateRoute } from './PrivateRoute'
import { AdminRoute } from './AdminRoute'

const LoginPage = lazy(() => import('@/pages/login/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const VentasPage = lazy(() => import('@/pages/ventas/VentasPage'))
const ProductosPage = lazy(() => import('@/pages/productos/ProductosPage'))
const ProveedoresPage = lazy(() => import('@/pages/proveedores/ProveedoresPage'))
const ComprasPage = lazy(() => import('@/pages/compras/ComprasPage'))
const NuevaCompraPage = lazy(() => import('@/pages/compras/NuevaCompraPage'))
const ReportesLayout = lazy(() => import('@/pages/reportes/ReportesLayout'))
const ReporteVentasPage = lazy(() => import('@/pages/reportes/ventas/ReporteVentasPage'))
const ReporteProductosTopPage = lazy(
  () => import('@/pages/reportes/productos-top/ReporteProductosTopPage')
)
const ReporteInventarioPage = lazy(
  () => import('@/pages/reportes/inventario/ReporteInventarioPage')
)
const ReporteRentabilidadPage = lazy(
  () => import('@/pages/reportes/rentabilidad/ReporteRentabilidadPage')
)
const ReporteComprasPage = lazy(() => import('@/pages/reportes/compras/ReporteComprasPage'))
const ExistenciasPage = lazy(() => import('@/pages/existencias/ExistenciasPage'))
const UsuariosPage = lazy(() => import('@/pages/usuarios/UsuariosPage'))

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType<object>>) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: withSuspense(LoginPage) },

  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: withSuspense(DashboardPage) },
          { path: 'ventas', element: withSuspense(VentasPage) },

          {
            element: <AdminRoute />,
            children: [
              { path: 'productos', element: withSuspense(ProductosPage) },
              { path: 'proveedores', element: withSuspense(ProveedoresPage) },
              { path: 'compras', element: withSuspense(ComprasPage) },
              { path: 'compras/nueva', element: withSuspense(NuevaCompraPage) },
              { path: 'existencias', element: withSuspense(ExistenciasPage) },
              { path: 'usuarios', element: withSuspense(UsuariosPage) },
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

  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
