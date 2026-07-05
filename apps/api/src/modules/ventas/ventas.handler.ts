import { FastifyRequest, FastifyReply } from 'fastify'
import { validate } from '../../shared/validate'
import { periodoQuerySchema, idParamSchema } from '../../shared/schemas'
import { createVentaSchema, syncVentasSchema } from './ventas.schema'
import { registrarVenta, syncVentas } from './ventas.service'
import type { JwtPayload } from '@joyaspos/shared-types'

export async function crearVentaHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createVentaSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const { venta, detalles } = await registrarVenta(prisma, body, user)

  return reply.status(201).send({ ...venta, detalle: detalles })
}

export async function syncVentasHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(syncVentasSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const results = await syncVentas(prisma, body.ventas, user)

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

  const prisma = request.server.prisma

  const ventas = await prisma.venta.findMany({
    where: {
      fecha_hora: {
        gte: new Date(`${query.desde}T00:00:00`),
        lte: new Date(`${query.hasta}T23:59:59`),
      },
    },
    include: { usuario: { select: { username: true } }, detalles: true },
    orderBy: { fecha_hora: 'desc' },
  })

  return reply.status(200).send(
    ventas.map((v) => ({
      id: v.id,
      nombre_cliente: v.nombre_cliente,
      monto_total: Number(v.monto_total),
      fecha_hora: v.fecha_hora.toISOString(),
      vendedor: v.usuario.username,
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

  const prisma = request.server.prisma

  const venta = await prisma.venta.findUnique({
    where: { id: params.id },
    include: {
      usuario: { select: { username: true } },
      detalles: true,
    },
  })

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
