import { useState, useEffect } from 'react'
import { useKardex } from '@/hooks/useReportes'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { DatePicker } from '@/components/shared/DatePicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { KardexRow, KardexTipo } from '@joyaspos/shared-types'

const fmtCant = (n: number) => parseFloat(Number(n).toFixed(2)).toString()
const fmtCurrency = (n: number) => (n === 0 ? '—' : `$${n.toFixed(2)}`)

function TipoBadge({ tipo }: { tipo: KardexTipo }) {
  if (tipo === 'compra')
    return <Badge className="bg-status-success/15 text-status-success border-0">Compra</Badge>
  if (tipo === 'venta')
    return <Badge className="bg-status-danger/15 text-status-danger border-0">Venta</Badge>
  return <Badge variant="outline">Inv. inicial</Badge>
}

function CantidadCell({ row }: { row: KardexRow }) {
  return (
    <span
      className={cn(
        'font-medium',
        row.tipo === 'compra' && 'text-status-success',
        row.tipo === 'venta' && 'text-status-danger',
      )}
    >
      {row.tipo === 'venta' ? '-' : '+'}
      {fmtCant(row.cantidad)}
    </span>
  )
}

// ── Vista tabla (md+) ──────────────────────────────────────────────────────
function KardexTable({ rows }: { rows: KardexRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-center">#</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Hora</TableHead>
          <TableHead>Cliente / Proveedor</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Precio / Costo</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Existencia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.correlativo}
            className={cn(
              row.tipo === 'compra' && 'bg-status-success/5',
              row.tipo === 'venta' && 'bg-status-danger/5',
            )}
          >
            <TableCell className="text-center text-muted-foreground text-xs">
              {row.correlativo}
            </TableCell>
            <TableCell>
              <TipoBadge tipo={row.tipo} />
            </TableCell>
            <TableCell className="text-sm">{row.fecha || '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{row.hora || '—'}</TableCell>
            <TableCell className="text-sm">{row.nombre_contraparte}</TableCell>
            <TableCell className="text-right">
              <CantidadCell row={row} />
            </TableCell>
            <TableCell className="text-right text-sm">{fmtCurrency(row.precio_unitario)}</TableCell>
            <TableCell className="text-right text-sm">{fmtCurrency(row.total)}</TableCell>
            <TableCell className="text-right font-semibold">{fmtCant(row.nueva_existencia)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ── Vista cards (< md) ────────────────────────────────────────────────────
function KardexCards({ rows }: { rows: KardexRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.correlativo}
          className={cn(
            'rounded-lg border p-3 space-y-2 text-sm',
            row.tipo === 'compra' && 'border-status-success/30 bg-status-success/5',
            row.tipo === 'venta' && 'border-status-danger/30 bg-status-danger/5',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">#{row.correlativo}</span>
              <TipoBadge tipo={row.tipo} />
            </div>
            {row.fecha && (
              <span className="text-xs text-muted-foreground">
                {row.fecha} {row.hora}
              </span>
            )}
          </div>

          <p className="font-medium truncate">{row.nombre_contraparte}</p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Cantidad</span>
            <span className="text-right">
              <CantidadCell row={row} />
            </span>

            <span className="text-muted-foreground">Precio / Costo</span>
            <span className="text-right">{fmtCurrency(row.precio_unitario)}</span>

            <span className="text-muted-foreground">Total</span>
            <span className="text-right">{fmtCurrency(row.total)}</span>

            <span className="text-muted-foreground font-medium">Existencia</span>
            <span className="text-right font-semibold">{fmtCant(row.nueva_existencia)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────
interface Props {
  productoId: number | null
  nombreProducto?: string
  onClose: () => void
}

export function KardexSheet({ productoId, nombreProducto, onClose }: Props) {
  const { data, isLoading } = useKardex(productoId)
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')

  // Limpia filtros al cambiar de producto
  useEffect(() => {
    setFilterDesde('')
    setFilterHasta('')
  }, [productoId])

  const filteredRows = data?.rows.filter((row) => {
    // Inventario inicial siempre visible como contexto de apertura
    if (row.tipo === 'inventario_inicial') return true
    if (filterDesde && row.fecha < filterDesde) return false
    if (filterHasta && row.fecha > filterHasta) return false
    return true
  }) ?? []

  const hasFilter = Boolean(filterDesde || filterHasta)

  return (
    <Dialog open={productoId !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-full sm:max-w-5xl max-h-[95dvh] sm:max-h-[85vh] flex flex-col gap-0 p-4 sm:p-6">
        <DialogHeader className="pb-3">
          <DialogTitle>
            Kardex — {data?.nombre ?? nombreProducto ?? '...'}
          </DialogTitle>
        </DialogHeader>

        {/* Filtro de fechas */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Desde</span>
            <DatePicker
              value={filterDesde}
              onChange={setFilterDesde}
              max={filterHasta || undefined}
              className="flex-1 sm:flex-none sm:w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Hasta</span>
            <DatePicker
              value={filterHasta}
              onChange={setFilterHasta}
              min={filterDesde || undefined}
              className="flex-1 sm:flex-none sm:w-36"
            />
          </div>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterDesde(''); setFilterHasta('') }}
            >
              Limpiar
            </Button>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto pt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : !data ? (
            <p className="text-sm text-muted-foreground py-4">No se encontraron datos.</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {hasFilter ? 'Sin movimientos en el período seleccionado.' : 'Sin movimientos registrados.'}
            </p>
          ) : (
            <>
              {/* Tabla — pantallas medianas y grandes */}
              <div className="hidden md:block">
                <KardexTable rows={filteredRows} />
              </div>

              {/* Cards — pantallas pequeñas */}
              <div className="md:hidden">
                <KardexCards rows={filteredRows} />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
