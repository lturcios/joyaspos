import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { validate } from '../../shared/validate'
import { idParamSchema } from '../../shared/schemas'
import { createProveedorSchema, updateProveedorSchema } from './proveedores.schema'

export async function listProveedoresHandler(request: FastifyRequest, reply: FastifyReply) {
  const proveedores = await request.server.prisma.proveedor.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, contacto: true, telefono: true, direccion: true, activo: true },
  })
  return reply.send(proveedores)
}

export async function createProveedorHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createProveedorSchema, request.body, reply)
  if (!body) return

  try {
    const proveedor = await request.server.prisma.proveedor.create({ data: body })
    return reply.status(201).send(proveedor)
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ya existe un proveedor con ese nombre',
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

  const existe = await request.server.prisma.proveedor.findFirst({
    where: { id: params.id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Proveedor con id ${params.id} no encontrado`,
    })
  }

  const proveedor = await request.server.prisma.proveedor.update({
    where: { id: params.id },
    data: body,
  })
  return reply.send(proveedor)
}

export async function deleteProveedorHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const existe = await request.server.prisma.proveedor.findFirst({
    where: { id: params.id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Proveedor con id ${params.id} no encontrado`,
    })
  }

  await request.server.prisma.proveedor.update({
    where: { id: params.id },
    data: { activo: false },
  })
  return reply.send({ message: 'Proveedor desactivado correctamente' })
}
