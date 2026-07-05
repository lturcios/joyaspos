import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { validate } from '../../shared/validate'
import { idParamSchema } from '../../shared/schemas'
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  changePasswordSchema,
} from './usuarios.schema'

export async function listUsuariosHandler(request: FastifyRequest, reply: FastifyReply) {
  const usuarios = await request.server.prisma.usuario.findMany({
    select: {
      id: true,
      username: true,
      nombre_completo: true,
      rol: true,
      activo: true,
      created_at: true,
    },
    orderBy: { username: 'asc' },
  })
  return reply.send(usuarios)
}

export async function createUsuarioHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createUsuarioSchema, request.body, reply)
  if (!body) return

  const password_hash = await bcrypt.hash(body.password, 12)

  try {
    const usuario = await request.server.prisma.usuario.create({
      data: {
        username: body.username,
        password_hash,
        nombre_completo: body.nombre_completo,
        rol: body.rol,
      },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        rol: true,
        activo: true,
        created_at: true,
      },
    })
    return reply.status(201).send(usuario)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `El username "${body.username}" ya está en uso`,
      })
    }
    throw error
  }
}

export async function updateUsuarioHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return
  const body = validate(updateUsuarioSchema, request.body, reply)
  if (!body) return

  const existe = await request.server.prisma.usuario.findFirst({
    where: { id: params.id },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Usuario con id ${params.id} no encontrado`,
    })
  }

  const usuario = await request.server.prisma.usuario.update({
    where: { id: params.id },
    data: body,
    select: {
      id: true,
      username: true,
      nombre_completo: true,
      rol: true,
      activo: true,
    },
  })
  return reply.send(usuario)
}

export async function deleteUsuarioHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const existe = await request.server.prisma.usuario.findFirst({
    where: { id: params.id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Usuario con id ${params.id} no encontrado`,
    })
  }

  await request.server.prisma.usuario.update({
    where: { id: params.id },
    data: { activo: false },
  })
  return reply.send({ message: 'Usuario desactivado correctamente' })
}

export async function changePasswordHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return
  const body = validate(changePasswordSchema, request.body, reply)
  if (!body) return

  const existe = await request.server.prisma.usuario.findFirst({
    where: { id: params.id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Usuario con id ${params.id} no encontrado`,
    })
  }

  const password_hash = await bcrypt.hash(body.password, 12)
  await request.server.prisma.usuario.update({
    where: { id: params.id },
    data: { password_hash },
  })
  return reply.send({ message: 'Contraseña actualizada correctamente' })
}
