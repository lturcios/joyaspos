import { useState } from 'react'
import { useVentas } from '@/hooks/useVentas'
import { useAuthStore } from '@/stores/authStore'
import { calcularPeriodo } from '@/lib/periodos'
import { PeriodFilter } from '@/components/shared/PeriodFilter'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { VentaDetailSheet } from './VentaDetailSheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { VentaResumen } from '@joyaspos/shared-types'

type VentaResumenWithSucursal = VentaResumen & { sucursal_nombre?: string }

type Periodo = 'hoy' | 'esta_semana' | 'esta_quincena' | 'este_mes' | 'personalizado'

const fmt = (n: number) => `$${n.toFixed(2)}`
const fmtDate = (s: string) => s.substring(0, 16).replace('T', ' ')

export default function VentasPage() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  const mostrarSucursal = sucursalId === null

  const rango = calcularPeriodo(periodo, { desde: customDesde, hasta: customHasta })
  const { data, isLoading, isError, refetch } = useVentas(rango)
  const ventas = data as VentaResumenWithSucursal[] | undefined

  const total = ventas?.reduce((sum, v) => sum + v.monto_total, 0) ?? 0

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ventas</h1>

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
        <ErrorState message="Error al cargar ventas" onRetry={refetch} />
      ) : !ventas?.length ? (
        <EmptyState message="No hay ventas en el período seleccionado" />
      ) : (
        <>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{ventas.length}</strong> ventas</span>
            <span>Total: <strong className="text-foreground">{fmt(total)}</strong></span>
          </div>

          {/* Table — md+ */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  {mostrarSucursal && <TableHead>Sucursal</TableHead>}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(v.id)}
                  >
                    <TableCell>{fmtDate(v.fecha_hora)}</TableCell>
                    <TableCell>{v.nombre_cliente}</TableCell>
                    <TableCell>{v.vendedor ?? '—'}</TableCell>
                    {mostrarSucursal && <TableCell>{v.sucursal_nombre ?? '—'}</TableCell>}
                    <TableCell className="text-right font-medium">{fmt(v.monto_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards — < md */}
          <div className="md:hidden space-y-2">
            {ventas.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                onClick={() => setSelectedId(v.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{fmtDate(v.fecha_hora)}</span>
                  <span className="font-semibold">{fmt(v.monto_total)}</span>
                </div>
                <p className="mt-1 font-medium truncate">{v.nombre_cliente}</p>
                {v.vendedor && (
                  <p className="text-xs text-muted-foreground mt-0.5">Vendedor: {v.vendedor}</p>
                )}
                {mostrarSucursal && v.sucursal_nombre && (
                  <p className="text-xs text-muted-foreground mt-0.5">Sucursal: {v.sucursal_nombre}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <VentaDetailSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
