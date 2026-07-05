import { FastifyRequest, FastifyReply } from 'fastify'
import { Prisma } from '@prisma/client'
import { validate } from '../../shared/validate'
import { idParamSchema, periodoQuerySchema } from '../../shared/schemas'
import { createCompraSchema } from './compras.schema'
import type { JwtPayload } from '@joyaspos/shared-types'

export async function createCompraHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createCompraSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const productoIds = body.items.map((i) => i.producto_id)
  const productos = await prisma.producto.findMany({
    where: { id: { in: productoIds }, activo: true },
    select: { id: true },
  })

  if (productos.length !== productoIds.length) {
    const encontrados = new Set(productos.map((p) => p.id))
    const faltante = productoIds.find((id) => !encontrados.has(id))
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: `Producto con id ${faltante} no encontrado o inactivo`,
    })
  }

  let proveedorNombre = body.proveedor_nombre?.trim() ?? ''
  if (body.proveedor_id) {
    const proveedor = await prisma.proveedor.findFirst({
      where: { id: body.proveedor_id, activo: true },
      select: { nombre: true },
    })
    if (!proveedor) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Proveedor con id ${body.proveedor_id} no encontrado`,
      })
    }
    proveedorNombre = proveedor.nombre
  }

  const fechaHora = body.fecha_hora ? new Date(body.fecha_hora) : new Date()
  const montoTotal = body.items.reduce((acc, i) => acc + i.cantidad * i.costo_unitario, 0)

  // Cabecera + detalle + incremento de existencias en una sola transacción
  const compra = await prisma.$transaction(async (tx) => {
    const nuevaCompra = await tx.compra.create({
      data: {
        proveedor_id: body.proveedor_id ?? null,
        proveedor_nombre: proveedorNombre,
        monto_total: new Prisma.Decimal(montoTotal.toFixed(2)),
        fecha_hora: fechaHora,
        notas: body.notas ?? null,
        usuario_id: user.sub,
      },
    })

    await tx.compraDetalle.createMany({
      data: body.items.map((item) => ({
        compra_id: nuevaCompra.id,
        producto_id: item.producto_id,
        cantidad: new Prisma.Decimal(item.cantidad),
        costo_unitario: new Prisma.Decimal(item.costo_unitario.toFixed(2)),
        total: new Prisma.Decimal((item.cantidad * item.costo_unitario).toFixed(2)),
      })),
    })

    for (const item of body.items) {
      await tx.producto.update({
        where: { id: item.producto_id },
        data: { existencia: { increment: item.cantidad } },
      })
    }

    return nuevaCompra
  })

  const detalle = await prisma.compraDetalle.findMany({
    where: { compra_id: compra.id },
    include: { producto: { select: { nombre: true } } },
  })

  return reply.status(201).send({
    id: compra.id,
    proveedor_nombre: compra.proveedor_nombre,
    monto_total: Number(compra.monto_total),
    fecha_hora: compra.fecha_hora.toISOString(),
    notas: compra.notas,
    registrado_por: user.username,
    items: detalle.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      nombre_producto: d.producto.nombre,
      cantidad: Number(d.cantidad),
      costo_unitario: Number(d.costo_unitario),
      total: Number(d.total),
    })),
  })
}

export async function listComprasHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = validate(periodoQuerySchema, request.query, reply)
  if (!query) return

  const compras = await request.server.prisma.compra.findMany({
    where: {
      fecha_hora: {
        gte: new Date(`${query.desde}T00:00:00`),
        lte: new Date(`${query.hasta}T23:59:59`),
      },
    },
    include: { usuario: { select: { username: true } } },
    orderBy: { fecha_hora: 'desc' },
  })

  return reply.send(
    compras.map((c) => ({
      id: c.id,
      proveedor_nombre: c.proveedor_nombre,
      monto_total: Number(c.monto_total),
      fecha_hora: c.fecha_hora.toISOString(),
      registrado_por: c.usuario.username,
    }))
  )
}

export async function getCompraHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const compra = await request.server.prisma.compra.findUnique({
    where: { id: params.id },
    include: {
      usuario: { select: { username: true } },
      detalles: { include: { producto: { select: { nombre: true } } } },
    },
  })

  if (!compra) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Compra con id ${params.id} no encontrada`,
    })
  }

  return reply.send({
    id: compra.id,
    proveedor_id: compra.proveedor_id,
    proveedor_nombre: compra.proveedor_nombre,
    monto_total: Number(compra.monto_total),
    fecha_hora: compra.fecha_hora.toISOString(),
    notas: compra.notas,
    registrado_por: compra.usuario.username,
    items: compra.detalles.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      nombre_producto: d.producto.nombre,
      cantidad: Number(d.cantidad),
      costo_unitario: Number(d.costo_unitario),
      total: Number(d.total),
    })),
  })
}
