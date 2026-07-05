import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCompras } from '@/hooks/useCompras'
import { calcularPeriodo } from '@/lib/periodos'
import { PeriodFilter } from '@/components/shared/PeriodFilter'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { CompraDetailSheet } from './CompraDetailSheet'
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
const fmtDate = (s: string) => s.substring(0, 16).replace('T', ' ')

export default function ComprasPage() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState<Periodo>('hoy')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const rango = calcularPeriodo(periodo, { desde: customDesde, hasta: customHasta })
  const { data: compras, isLoading, isError, refetch } = useCompras(rango)

  const total = compras?.reduce((sum, c) => sum + c.monto_total, 0) ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compras</h1>
        <Button onClick={() => navigate('/compras/nueva')}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva compra
        </Button>
      </div>

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
        <ErrorState message="Error al cargar compras" onRetry={refetch} />
      ) : !compras?.length ? (
        <EmptyState message="No hay compras en el período seleccionado" />
      ) : (
        <>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{compras.length}</strong> compras</span>
            <span>Total: <strong className="text-foreground">{fmt(total)}</strong></span>
          </div>

          {/* Tabla — md+ */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compras.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell>{fmtDate(c.fecha_hora)}</TableCell>
                    <TableCell>{c.proveedor_nombre}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(c.monto_total)}</TableCell>
                    <TableCell>{c.registrado_por}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards — < md */}
          <div className="md:hidden space-y-2">
            {compras.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                onClick={() => setSelectedId(c.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{fmtDate(c.fecha_hora)}</span>
                  <span className="font-semibold">{fmt(c.monto_total)}</span>
                </div>
                <p className="mt-1 font-medium truncate">
                  {c.proveedor_nombre || <span className="text-muted-foreground">Sin proveedor</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Por: {c.registrado_por}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <CompraDetailSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
