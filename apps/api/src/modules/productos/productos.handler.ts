import { FastifyRequest, FastifyReply } from 'fastify'
import { Prisma } from '@prisma/client'
import { Decimal, PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { validate } from '../../shared/validate'
import { idParamSchema } from '../../shared/schemas'
import {
  createProductoSchema,
  updateProductoSchema,
  ingresoExistenciaSchema,
} from './productos.schema'

export async function listProductosHandler(request: FastifyRequest, reply: FastifyReply) {
  const productos = await request.server.prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, unidad_medida: true, existencia: true, activo: true },
    orderBy: { nombre: 'asc' },
  })
  return reply.send(
    productos.map((p) => ({ ...p, existencia: Number(p.existencia) }))
  )
}

export async function createProductoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createProductoSchema, request.body, reply)
  if (!body) return

  try {
    const producto = await request.server.prisma.producto.create({
      data: {
        nombre: body.nombre,
        unidad_medida: body.unidad_medida,
        existencia: new Decimal(body.existencia ?? 0),
      },
    })
    return reply.status(201).send({ ...producto, existencia: Number(producto.existencia) })
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Ya existe un producto con el nombre "${body.nombre}"`,
      })
    }
    throw error
  }
}

export async function updateProductoHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return
  const body = validate(updateProductoSchema, request.body, reply)
  if (!body) return

  const existe = await request.server.prisma.producto.findFirst({
    where: { id: params.id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Producto con id ${params.id} no encontrado`,
    })
  }

  try {
    const producto = await request.server.prisma.producto.update({
      where: { id: params.id },
      data: body,
    })
    return reply.send({ ...producto, existencia: Number(producto.existencia) })
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ya existe un producto con ese nombre',
      })
    }
    throw error
  }
}

export async function deleteProductoHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const existe = await request.server.prisma.producto.findFirst({
    where: { id: params.id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Producto con id ${params.id} no encontrado`,
    })
  }

  await request.server.prisma.producto.update({
    where: { id: params.id },
    data: { activo: false },
  })
  return reply.send({ message: 'Producto desactivado correctamente' })
}

export async function ingresoExistenciaHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return
  const body = validate(ingresoExistenciaSchema, request.body, reply)
  if (!body) return

  const existe = await request.server.prisma.producto.findFirst({
    where: { id: params.id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Producto con id ${params.id} no encontrado`,
    })
  }

  const producto = await request.server.prisma.producto.update({
    where: { id: params.id },
    data: { existencia: { increment: body.cantidad } },
  })
  return reply.send({
    id: producto.id,
    nombre: producto.nombre,
    existencia: Number(producto.existencia),
    message: `Existencia actualizada: +${body.cantidad} ${producto.unidad_medida}`,
  })
}
