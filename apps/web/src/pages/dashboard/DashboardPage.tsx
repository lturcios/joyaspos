import { useDashboard } from '@/hooks/useReportes'
import { useAuthStore } from '@/stores/authStore'
import { KpiCard } from '@/components/shared/KpiCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorState } from '@/components/shared/ErrorState'
import { LineChartCard } from '@/components/charts/LineChartCard'
import { BarChartCard } from '@/components/charts/BarChartCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard()
  const sucursales = useAuthStore((s) => s.sucursales)
  const sucursalId = useAuthStore((s) => s.sucursalActiva)

  const sucursalLabel = sucursalId !== null
    ? (sucursales.find((s) => s.id === sucursalId)?.nombre ?? String(sucursalId))
    : 'Todas las sucursales'

  if (isLoading) return <LoadingSpinner />
  if (isError || !data) return <ErrorState message="Error al cargar el dashboard" onRetry={refetch} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — {sucursalLabel}</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Ventas hoy"
          value={`$${data.ventas_hoy.monto.toFixed(2)}`}
          delta={data.delta_pct}
          subtitle={`${data.ventas_hoy.cantidad} transacciones`}
        />
        <KpiCard
          title="Transacciones hoy"
          value={String(data.ventas_hoy.cantidad)}
        />
        <KpiCard
          title="Ventas esta semana"
          value={`$${data.ventas_semana.monto.toFixed(2)}`}
        />
        <KpiCard
          title="Compras esta semana"
          value={`$${data.compras_semana.monto.toFixed(2)}`}
          subtitle={`${data.compras_semana.cantidad} órdenes`}
        />
      </div>

      <LineChartCard
        title="Ventas por día (semana)"
        data={data.ventas_semana.por_dia as object[]}
        xKey="fecha"
        dataKey="monto"
      />

      {data.productos_stock_bajo.length > 0 && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-4">
          <h2 className="mb-2 font-semibold text-status-danger">
            Productos con stock bajo ({data.productos_stock_bajo.length})
          </h2>
          <ul className="space-y-1">
            {data.productos_stock_bajo.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.nombre}</span>
                <span className="font-semibold text-status-danger">{p.existencia} unidades</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.top_productos_hoy.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Top productos hoy</h2>
          <BarChartCard
            title=""
            data={data.top_productos_hoy as object[]}
            xKey="nombre"
            dataKey="monto_total"
          />
          <div className="mt-2 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Monto total</TableHead>
                  <TableHead className="text-right">% del total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_productos_hoy.map((p) => (
                  <TableRow key={p.producto_id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-right">{p.cantidad_total}</TableCell>
                    <TableCell className="text-right">${p.monto_total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{p.porcentaje_del_total.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
