import { PrismaClient, Prisma } from '@prisma/client'
import type { CreateVentaInput, VentaSyncPayload } from './ventas.schema'
import type { JwtPayload } from '@joyaspos/shared-types'

// Treat the received local datetime as a wall-clock value so MySQL DATETIME
// stores exactly the digits that came in (El Salvador local time), regardless
// of the Node.js process timezone. Strings that already carry Z/offset are
// passed through so legacy UTC entries don't shift again.
function toDateTime(s: string): Date {
  return new Date(/Z$|[+-]\d{2}:\d{2}$/.test(s) ? s : s + 'Z')
}

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export async function registrarVenta(
  prisma: PrismaClient,
  body: CreateVentaInput,
  user: JwtPayload
) {
  return prisma.$transaction(async (tx: TxClient) => {
    const productoIds = body.items.map((i) => i.producto_id)

    const productos = await tx.producto.findMany({
      where: { id: { in: productoIds } },
      select: { id: true, nombre: true },
    })
    const nombreMap = new Map(productos.map((p) => [p.id, p.nombre]))

    const montoTotal = body.items.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario,
      0
    )

    const venta = await tx.venta.create({
      data: {
        nombre_cliente: body.nombre_cliente ?? 'Clientes Varios',
        monto_total: new Prisma.Decimal(montoTotal.toFixed(2)),
        fecha_hora: body.fecha_hora ? toDateTime(body.fecha_hora) : new Date(),
        usuario_id: user.sub,
      },
    })

    const detalles = await Promise.all(
      body.items.map((item) => {
        const nombreProducto = nombreMap.get(item.producto_id) ?? ''
        const detalle = item.detalle_adicional
          ? `${nombreProducto} ${item.detalle_adicional}`.trim()
          : nombreProducto

        return tx.ventaDetalle.create({
          data: {
            venta_id: venta.id,
            producto_id: item.producto_id,
            detalle,
            cantidad: new Prisma.Decimal(item.cantidad),
            precio_unitario: new Prisma.Decimal(item.precio_unitario.toFixed(2)),
            total: new Prisma.Decimal(
              (item.cantidad * item.precio_unitario).toFixed(2)
            ),
          },
        })
      })
    )

    for (const item of body.items) {
      await tx.producto.update({
        where: { id: item.producto_id },
        data: { existencia: { decrement: item.cantidad } },
      })
    }

    return { venta, detalles }
  })
}

type SyncResult =
  | { local_id: number; remote_id: number; ok: true }
  | { local_id: number; ok: false; error: string }

export async function syncVentas(
  prisma: PrismaClient,
  ventas: VentaSyncPayload[],
  user: JwtPayload
): Promise<SyncResult[]> {
  const results: SyncResult[] = []

  for (const payload of ventas) {
    try {
      const { venta } = await registrarVenta(prisma, payload, user)
      results.push({ local_id: payload.local_id, remote_id: venta.id, ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      results.push({ local_id: payload.local_id, ok: false, error: message })
    }
  }

  return results
}
