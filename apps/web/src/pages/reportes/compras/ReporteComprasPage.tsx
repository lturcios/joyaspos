import { useState } from 'react'
import { useReporteCompras } from '@/hooks/useReportes'
import { calcularPeriodo } from '@/lib/periodos'
import { KpiCard } from '@/components/shared/KpiCard'
import { PeriodFilter } from '@/components/shared/PeriodFilter'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { BarChartCard } from '@/components/charts/BarChartCard'
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

export default function ReporteComprasPage() {
  const [periodo, setPeriodo] = useState<Periodo>('esta_semana')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')

  const rango = calcularPeriodo(periodo, { desde: customDesde, hasta: customHasta })
  const { data, isLoading, isError, refetch } = useReporteCompras(rango)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reporte de compras</h1>

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard title="Total compras" value={fmt(data.total_compras)} />
            <KpiCard title="Órdenes" value={String(data.cantidad_ordenes)} />
          </div>

          <BarChartCard
            title="Compras por día"
            data={data.por_dia as object[]}
            xKey="fecha"
            dataKey="monto"
          />

          {!data.por_proveedor.length ? (
            <EmptyState message="Sin datos por proveedor" />
          ) : (
            <div>
              <h2 className="mb-2 font-semibold">Por proveedor</h2>

              {/* Tabla — md+ */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Órdenes</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.por_proveedor.map((p) => (
                      <TableRow key={p.proveedor_nombre}>
                        <TableCell className="font-medium">{p.proveedor_nombre}</TableCell>
                        <TableCell className="text-right">{p.cantidad_ordenes}</TableCell>
                        <TableCell className="text-right">{fmt(p.monto_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Cards — < md */}
              <div className="md:hidden space-y-2">
                {data.por_proveedor.map((p) => (
                  <div key={p.proveedor_nombre} className="rounded-lg border bg-card p-3">
                    <p className="font-medium truncate">{p.proveedor_nombre}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-center">
                      <div className="rounded bg-muted py-1.5">
                        <p className="font-semibold">{p.cantidad_ordenes}</p>
                        <p className="text-muted-foreground mt-0.5">Órdenes</p>
                      </div>
                      <div className="rounded bg-muted py-1.5">
                        <p className="font-semibold">{fmt(p.monto_total)}</p>
                        <p className="text-muted-foreground mt-0.5">Total</p>
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
