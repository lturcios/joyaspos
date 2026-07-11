import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { validate } from '../../shared/validate'
import { idParamSchema } from '../../shared/schemas'
import { createProveedorSchema, updateProveedorSchema } from './proveedores.schema'
import type { JwtPayload } from '@joyaspos/shared-types'

export async function listProveedoresHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtPayload

  const proveedores = await request.server.prisma.proveedor.findMany({
    where: { empresa_id: user.empresa_id, activo: true },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, contacto: true, telefono: true, direccion: true, activo: true },
  })
  return reply.send(proveedores)
}

export async function createProveedorHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createProveedorSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload

  try {
    const proveedor = await request.server.prisma.proveedor.create({
      data: { ...body, empresa_id: user.empresa_id },
    })
    return reply.status(201).send(proveedor)
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ya existe un proveedor con ese nombre en tu empresa',
      })
    }
    throw error
  }
}

export async function updateProveedorHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return
  const body = validate(updateProveedorSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const existe = await prisma.proveedor.findFirst({
    where: { id: params.id, empresa_id: user.empresa_id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Proveedor con id ${params.id} no encontrado`,
    })
  }

  const proveedor = await prisma.proveedor.update({
    where: { id: params.id },
    data: body,
  })
  return reply.send(proveedor)
}

export async function deleteProveedorHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const existe = await prisma.proveedor.findFirst({
    where: { id: params.id, empresa_id: user.empresa_id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Proveedor con id ${params.id} no encontrado`,
    })
  }

  await prisma.proveedor.update({
    where: { id: params.id },
    data: { activo: false },
  })
  return reply.send({ message: 'Proveedor desactivado correctamente' })
}
