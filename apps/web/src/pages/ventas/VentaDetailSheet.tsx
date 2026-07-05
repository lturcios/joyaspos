import { useVentaDetalle } from '@/hooks/useVentas'
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

export function VentaDetailSheet({ id, onClose }: Props) {
  const { data: venta, isLoading } = useVentaDetalle(id)

  if (id === null) return null

  return (
    <Dialog open={id !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de venta #{id}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <LoadingSpinner />
        ) : venta ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-muted-foreground">Cliente</div>
              <div className="font-medium">{venta.nombre_cliente}</div>
              <div className="text-muted-foreground">Fecha</div>
              <div>{fmtDate(venta.fecha_hora)}</div>
              {venta.vendedor && (
                <>
                  <div className="text-muted-foreground">Vendedor</div>
                  <div>{venta.vendedor}</div>
                </>
              )}
              <div className="text-muted-foreground">Total</div>
              <div className="font-bold">{fmt(venta.monto_total)}</div>
            </div>

            {venta.items && venta.items.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Detalle</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venta.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.detalle}</TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell className="text-right">{fmt(item.precio_unitario)}</TableCell>
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
