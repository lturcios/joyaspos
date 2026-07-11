import { useState } from 'react'
import { useReporteProductosTop } from '@/hooks/useReportes'
import { useAuthStore } from '@/stores/authStore'
import { calcularPeriodo } from '@/lib/periodos'
import { PeriodFilter } from '@/components/shared/PeriodFilter'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Periodo = 'hoy' | 'esta_semana' | 'esta_quincena' | 'este_mes' | 'personalizado'

const fmt = (n: number) => `$${n.toFixed(2)}`

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-sm tabular-nums">{pct.toFixed(1)}%</span>
    </div>
  )
}

export default function ReporteProductosTopPage() {
  const [periodo, setPeriodo] = useState<Periodo>('este_mes')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')

  const sucursales = useAuthStore((s) => s.sucursales)
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  const sucursalLabel = sucursalId !== null
    ? (sucursales.find((s) => s.id === sucursalId)?.nombre ?? String(sucursalId))
    : 'Todas las sucursales'

  const rango = calcularPeriodo(periodo, { desde: customDesde, hasta: customHasta })
  const { data, isLoading, isError, refetch } = useReporteProductosTop(rango)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Top productos — {sucursalLabel}</h1>

      <PeriodFilter
        value={periodo}
        onChange={setPeriodo}
        desde={customDesde}
        hasta={customHasta}
        onDatesChange={(d, h) => { setCustomDesde(d); setCustomHasta(h) }}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState message="Error al cargar el reporte" onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState message="Sin datos para el período seleccionado" />
      ) : (
        <>
          {/* Tabla — md+ */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Cantidad vendida</TableHead>
                  <TableHead className="text-right">Monto total</TableHead>
                  <TableHead>% del total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p, idx) => (
                  <TableRow key={p.producto_id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-right">{p.cantidad_total}</TableCell>
                    <TableCell className="text-right">{fmt(p.monto_total)}</TableCell>
                    <TableCell><ProgressBar pct={p.porcentaje_del_total} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards — < md */}
          <div className="md:hidden space-y-2">
            {data.map((p, idx) => (
              <div key={p.producto_id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-mono text-muted-foreground w-5 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.nombre}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-muted px-2 py-1.5">
                        <p className="font-semibold">{p.cantidad_total}</p>
                        <p className="text-muted-foreground">Cantidad</p>
                      </div>
                      <div className="rounded bg-muted px-2 py-1.5">
                        <p className="font-semibold">{fmt(p.monto_total)}</p>
                        <p className="text-muted-foreground">Total</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <ProgressBar pct={p.porcentaje_del_total} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
