import { useState } from 'react'
import { useReporteVentas } from '@/hooks/useReportes'
import { calcularPeriodo } from '@/lib/periodos'
import { KpiCard } from '@/components/shared/KpiCard'
import { PeriodFilter } from '@/components/shared/PeriodFilter'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorState } from '@/components/shared/ErrorState'
import { LineChartCard } from '@/components/charts/LineChartCard'
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

export default function ReporteVentasPage() {
  const [periodo, setPeriodo] = useState<Periodo>('esta_semana')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')

  const rango = calcularPeriodo(periodo, { desde: customDesde, hasta: customHasta })
  const { data, isLoading, isError, refetch } = useReporteVentas(rango)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reporte de ventas</h1>

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard title="Total ventas" value={fmt(data.total_ventas)} />
            <KpiCard title="Transacciones" value={String(data.cantidad_transacciones)} />
            <KpiCard title="Ticket promedio" value={fmt(data.ticket_promedio)} />
          </div>

          <LineChartCard
            title="Ventas por día"
            data={data.por_dia as object[]}
            xKey="fecha"
            dataKey="monto"
          />

          {data.por_vendedor.length > 0 && (
            <div>
              <h2 className="mb-2 font-semibold">Por vendedor</h2>

              {/* Tabla — md+ */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Transacciones</TableHead>
                      <TableHead className="text-right">Total ventas</TableHead>
                      <TableHead className="text-right">Ticket promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.por_vendedor.map((v) => (
                      <TableRow key={v.username}>
                        <TableCell>
                          <div className="font-medium">{v.nombre_completo}</div>
                          <div className="text-xs text-muted-foreground">{v.username}</div>
                        </TableCell>
                        <TableCell className="text-right">{v.cantidad}</TableCell>
                        <TableCell className="text-right">{fmt(v.monto)}</TableCell>
                        <TableCell className="text-right">{fmt(v.ticket_promedio)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Cards — < md */}
              <div className="md:hidden space-y-2">
                {data.por_vendedor.map((v) => (
                  <div key={v.username} className="rounded-lg border bg-card p-3">
                    <p className="font-medium">{v.nombre_completo}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{v.username}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
                      <div className="rounded bg-muted py-1.5">
                        <p className="font-semibold">{v.cantidad}</p>
                        <p className="text-muted-foreground mt-0.5">Transac.</p>
                      </div>
                      <div className="rounded bg-muted py-1.5">
                        <p className="font-semibold">{fmt(v.monto)}</p>
                        <p className="text-muted-foreground mt-0.5">Total</p>
                      </div>
                      <div className="rounded bg-muted py-1.5">
                        <p className="font-semibold">{fmt(v.ticket_promedio)}</p>
                        <p className="text-muted-foreground mt-0.5">Ticket</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
