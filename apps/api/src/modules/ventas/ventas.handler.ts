import { FastifyRequest, FastifyReply } from 'fastify'
import { validate } from '../../shared/validate'
import { periodoQuerySchema, idParamSchema } from '../../shared/schemas'
import { sucursalWhere } from '../../shared/tenancy'
import { createVentaSchema, syncVentasSchema } from './ventas.schema'
import { registrarVenta, syncVentas } from './ventas.service'
import type { JwtPayload } from '@joyaspos/shared-types'

export async function crearVentaHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createVentaSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const sucursalId = await request.server.resolveSucursal(request, reply, { requerida: true })
  if (sucursalId === undefined) return  // error already sent

  const { venta, detalles } = await registrarVenta(prisma, body, user, sucursalId as number)

  return reply.status(201).send({ ...venta, detalle: detalles })
}

export async function syncVentasHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(syncVentasSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const sucursalId = await request.server.resolveSucursal(request, reply, { requerida: true })
  if (sucursalId === undefined) return  // error already sent

  const results = await syncVentas(prisma, body.ventas, user, sucursalId as number)

  const sincronizadas = results
    .filter((r): r is { local_id: number; remote_id: number; ok: true } => r.ok)
    .map((r) => ({ local_id: r.local_id, remote_id: r.remote_id }))

  const errores = results
    .filter((r): r is { local_id: number; ok: false; error: string } => !r.ok)
    .map((r) => ({ local_id: r.local_id, mensaje: r.error }))

  return reply.status(200).send({ sincronizadas, errores })
}

export async function listarVentasHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = validate(periodoQuerySchema, request.query, reply)
  if (!query) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const sucursalId = await request.server.resolveSucursal(request, reply, { requerida: false })
  if (sucursalId === undefined) return  // error already sent

  // Vendors can only query their own branch and only for today
  let desde = `${query.desde}T00:00:00`
  let hasta = `${query.hasta}T23:59:59`
  if (user.rol === 'vendedor') {
    // Build local date string so "today" matches the server's business timezone,
    // not the UTC date (which may differ by up to ±1 day from local time)
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const today = `${y}-${m}-${d}`
    desde = `${today}T00:00:00`
    hasta = `${today}T23:59:59`
  }

  const ventas = await prisma.venta.findMany({
    where: {
      fecha_hora: {
        gte: new Date(desde),
        lte: new Date(hasta),
      },
      ...sucursalWhere(sucursalId, user),
    },
    include: {
      usuario: { select: { username: true } },
      sucursal: { select: { nombre: true } },
      detalles: true,
    },
    orderBy: { fecha_hora: 'desc' },
  })

  return reply.status(200).send(
    ventas.map((v) => ({
      id: v.id,
      nombre_cliente: v.nombre_cliente,
      monto_total: Number(v.monto_total),
      fecha_hora: v.fecha_hora.toISOString(),
      vendedor: v.usuario.username,
      sucursal_nombre: v.sucursal.nombre,
      items: v.detalles.map((d) => ({
        id: d.id,
        producto_id: d.producto_id,
        detalle: d.detalle,
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        total: Number(d.total),
      })),
    }))
  )
}

export async function detalleVentaHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  // Build ownership filter: vendedor → sucursal; admin → empresa
  const ownershipWhere =
    user.rol === 'vendedor'
      ? { sucursal_id: user.sucursal_id! }
      : { sucursal: { empresa_id: user.empresa_id } }

  const venta = await prisma.venta.findFirst({
    where: { id: params.id, ...ownershipWhere },
    include: {
      usuario: { select: { username: true } },
      sucursal: { select: { nombre: true } },
      detalles: true,
    },
  })

  // Return 404 regardless of the reason (indistinguishable for security)
  if (!venta) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'Venta no encontrada',
    })
  }

  return reply.status(200).send({
    id: venta.id,
    nombre_cliente: venta.nombre_cliente,
    monto_total: Number(venta.monto_total),
    fecha_hora: venta.fecha_hora.toISOString(),
    usuario_id: venta.usuario_id,
    vendedor: venta.usuario.username,
    sucursal_nombre: venta.sucursal.nombre,
    items: venta.detalles.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      detalle: d.detalle,
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      total: Number(d.total),
    })),
  })
}
