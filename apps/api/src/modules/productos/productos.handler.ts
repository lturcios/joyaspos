import { FastifyRequest, FastifyReply } from 'fastify'
import { Decimal, PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { validate } from '../../shared/validate'
import { idParamSchema } from '../../shared/schemas'
import { sucursalWhere } from '../../shared/tenancy'
import {
  createProductoSchema,
  updateProductoSchema,
  ingresoExistenciaSchema,
} from './productos.schema'
import type { JwtPayload } from '@joyaspos/shared-types'

export async function listProductosHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtPayload
  const sucursalId = await request.server.resolveSucursal(request, reply, { requerida: false })
  if (sucursalId === undefined) return  // error already sent

  const productos = await request.server.prisma.producto.findMany({
    where: { activo: true, ...sucursalWhere(sucursalId, user) },
    select: {
      id: true,
      nombre: true,
      unidad_medida: true,
      existencia: true,
      activo: true,
      sucursal: { select: { nombre: true } },
    },
    orderBy: { nombre: 'asc' },
  })
  return reply.send(
    productos.map((p) => ({
      ...p,
      existencia: Number(p.existencia),
      sucursal_nombre: p.sucursal.nombre,
      sucursal: undefined,
    }))
  )
}

export async function createProductoHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createProductoSchema, request.body, reply)
  if (!body) return

  const sucursalId = await request.server.resolveSucursal(request, reply, { requerida: true })
  if (sucursalId === undefined) return  // error already sent
  // resolveSucursal with requerida:true never returns null
  const resolvedId = sucursalId as number

  try {
    const producto = await request.server.prisma.producto.create({
      data: {
        sucursal_id: resolvedId,
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
        message: `Ya existe un producto con el nombre "${body.nombre}" en esta sucursal`,
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

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  // Validate ownership: vendedor → must own the branch; admin → must own the company
  const existe = await prisma.producto.findFirst({
    where: {
      id: params.id,
      activo: true,
      ...(user.rol === 'vendedor'
        ? { sucursal_id: user.sucursal_id! }
        : { sucursal: { empresa_id: user.empresa_id } }),
    },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Producto con id ${params.id} no encontrado`,
    })
  }

  try {
    const producto = await prisma.producto.update({
      where: { id: params.id },
      data: body,
    })
    return reply.send({ ...producto, existencia: Number(producto.existencia) })
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ya existe un producto con ese nombre en esta sucursal',
      })
    }
    throw error
  }
}

export async function deleteProductoHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const existe = await prisma.producto.findFirst({
    where: {
      id: params.id,
      activo: true,
      ...(user.rol === 'vendedor'
        ? { sucursal_id: user.sucursal_id! }
        : { sucursal: { empresa_id: user.empresa_id } }),
    },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Producto con id ${params.id} no encontrado`,
    })
  }

  await prisma.producto.update({
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

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const existe = await prisma.producto.findFirst({
    where: {
      id: params.id,
      activo: true,
      ...(user.rol === 'vendedor'
        ? { sucursal_id: user.sucursal_id! }
        : { sucursal: { empresa_id: user.empresa_id } }),
    },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Producto con id ${params.id} no encontrado`,
    })
  }

  const producto = await prisma.producto.update({
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
