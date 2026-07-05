import { useState } from 'react'
import { useReporteInventario } from '@/hooks/useReportes'
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
import { cn } from '@/lib/utils'

type Periodo = 'hoy' | 'esta_semana' | 'esta_quincena' | 'este_mes' | 'personalizado'

function stockClass(n: number) {
  if (n <= 5) return 'text-status-danger'
  if (n <= 15) return 'text-status-warning'
  return ''
}

export default function ReporteInventarioPage() {
  const [periodo, setPeriodo] = useState<Periodo>('este_mes')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')

  const rango = calcularPeriodo(periodo, { desde: customDesde, hasta: customHasta })
  const { data, isLoading, isError, refetch } = useReporteInventario(rango)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Movimiento de inventario</h1>

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
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Existencia actual</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Salidas</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.producto_id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn('font-semibold', stockClass(p.existencia_actual))}>
                        {p.existencia_actual}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-status-success">{p.entradas}</TableCell>
                    <TableCell className="text-right">{p.salidas}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn('font-semibold', p.balance >= 0 ? 'text-status-success' : 'text-status-danger')}>
                        {p.balance >= 0 ? '+' : ''}{p.balance}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards — < md */}
          <div className="md:hidden space-y-2">
            {data.map((p) => (
              <div key={p.producto_id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate">{p.nombre}</p>
                  <span className={cn('font-semibold text-sm shrink-0', stockClass(p.existencia_actual))}>
                    Stock: {p.existencia_actual}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="rounded bg-status-success/10 py-1.5">
                    <p className="text-status-success font-semibold">+{p.entradas}</p>
                    <p className="text-muted-foreground mt-0.5">Entradas</p>
                  </div>
                  <div className="rounded bg-muted py-1.5">
                    <p className="font-semibold">{p.salidas}</p>
                    <p className="text-muted-foreground mt-0.5">Salidas</p>
                  </div>
                  <div className={cn('rounded py-1.5', p.balance >= 0 ? 'bg-status-success/10' : 'bg-status-danger/10')}>
                    <p className={cn('font-semibold', p.balance >= 0 ? 'text-status-success' : 'text-status-danger')}>
                      {p.balance >= 0 ? '+' : ''}{p.balance}
                    </p>
                    <p className="text-muted-foreground mt-0.5">Balance</p>
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
