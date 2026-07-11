import { useState } from 'react'
import { useReporteRentabilidad } from '@/hooks/useReportes'
import { useAuthStore } from '@/stores/authStore'
import { calcularPeriodo } from '@/lib/periodos'
import { KpiCard } from '@/components/shared/KpiCard'
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
import { cn } from '@/lib/utils'

type Periodo = 'hoy' | 'esta_semana' | 'esta_quincena' | 'este_mes' | 'personalizado'

const fmt = (n: number) => `$${n.toFixed(2)}`

function margenClass(pct: number) {
  if (pct > 30) return 'text-status-success font-semibold'
  if (pct >= 10) return 'text-status-warning font-semibold'
  return 'text-status-danger font-semibold'
}

export default function ReporteRentabilidadPage() {
  const [periodo, setPeriodo] = useState<Periodo>('este_mes')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')

  const sucursales = useAuthStore((s) => s.sucursales)
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  const sucursalLabel = sucursalId !== null
    ? (sucursales.find((s) => s.id === sucursalId)?.nombre ?? String(sucursalId))
    : 'Todas las sucursales'

  const rango = calcularPeriodo(periodo, { desde: customDesde, hasta: customHasta })
  const { data, isLoading, isError, refetch } = useReporteRentabilidad(rango)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rentabilidad — {sucursalLabel}</h1>

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
      ) : data ? (
        <>
          <div className="max-w-xs">
            <KpiCard title="Margen promedio" value={`${data.margen_promedio_pct.toFixed(1)}%`} />
          </div>

          {!data.productos.length ? (
            <EmptyState message="Sin datos para el período seleccionado" />
          ) : (
            <>
              {/* Tabla — md+ */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                      <TableHead className="text-right">Costos</TableHead>
                      <TableHead className="text-right">Margen ($)</TableHead>
                      <TableHead className="text-right">Margen (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.productos.map((p) => (
                      <TableRow key={p.producto_id}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-right">{fmt(p.ingresos)}</TableCell>
                        <TableCell className="text-right">{fmt(p.costos)}</TableCell>
                        <TableCell className="text-right">{fmt(p.margen)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn(margenClass(p.margen_pct))}>
                            {p.margen_pct.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Cards — < md */}
              <div className="md:hidden space-y-2">
                {data.productos.map((p) => (
                  <div key={p.producto_id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{p.nombre}</p>
                      <span className={cn('text-sm shrink-0', margenClass(p.margen_pct))}>
                        {p.margen_pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
                      <div className="rounded bg-status-success/10 py-1.5">
                        <p className="font-semibold text-status-success">{fmt(p.ingresos)}</p>
                        <p className="text-muted-foreground mt-0.5">Ingresos</p>
                      </div>
                      <div className="rounded bg-muted py-1.5">
                        <p className="font-semibold">{fmt(p.costos)}</p>
                        <p className="text-muted-foreground mt-0.5">Costos</p>
                      </div>
                      <div className="rounded bg-muted py-1.5">
                        <p className="font-semibold">{fmt(p.margen)}</p>
                        <p className="text-muted-foreground mt-0.5">Margen</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
