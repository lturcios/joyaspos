import { useCompraDetalle } from '@/hooks/useCompras'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const fmt = (n: number) => `$${n.toFixed(2)}`
const fmtDate = (s: string) => s.substring(0, 16).replace('T', ' ')

interface Props {
  id: number | null
  onClose: () => void
}

export function CompraDetailSheet({ id, onClose }: Props) {
  const { data: compra, isLoading } = useCompraDetalle(id)

  if (id === null) return null

  return (
    <Dialog open={id !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de compra #{id}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <LoadingSpinner />
        ) : compra ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-muted-foreground">Proveedor</div>
              <div className="font-medium">{compra.proveedor_nombre}</div>
              <div className="text-muted-foreground">Fecha</div>
              <div>{fmtDate(compra.fecha_hora)}</div>
              <div className="text-muted-foreground">Registrado por</div>
              <div>{compra.registrado_por}</div>
              {compra.notas && (
                <>
                  <div className="text-muted-foreground">Notas</div>
                  <div>{compra.notas}</div>
                </>
              )}
              <div className="text-muted-foreground">Total</div>
              <div className="font-bold">{fmt(compra.monto_total)}</div>
            </div>

            {compra.items && compra.items.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Costo unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compra.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.nombre_producto}</TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell className="text-right">{fmt(item.costo_unitario)}</TableCell>
                        <TableCell className="text-right">{fmt(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No se encontraron datos.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
