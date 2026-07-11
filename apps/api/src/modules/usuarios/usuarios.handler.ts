import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { validate } from '../../shared/validate'
import { idParamSchema } from '../../shared/schemas'
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  changePasswordSchema,
} from './usuarios.schema'
import type { JwtPayload } from '@joyaspos/shared-types'

export async function listUsuariosHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw query param not typed
  const rawSucursalId = (request.query as any)?.sucursal_id
  const sucursalFilter = rawSucursalId != null ? { sucursal_id: Number(rawSucursalId) } : {}

  const usuarios = await prisma.usuario.findMany({
    where: { empresa_id: user.empresa_id, ...sucursalFilter },
    select: {
      id: true,
      username: true,
      nombre_completo: true,
      rol: true,
      activo: true,
      sucursal_id: true,
      sucursal: { select: { nombre: true } },
      created_at: true,
    },
    orderBy: { username: 'asc' },
  })
  return reply.send(
    usuarios.map((u) => ({
      ...u,
      sucursal_nombre: u.sucursal?.nombre ?? null,
      sucursal: undefined,
    }))
  )
}

export async function createUsuarioHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createUsuarioSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  // Validate sucursal_id requirements
  if (body.rol === 'vendedor') {
    if (!body.sucursal_id) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'sucursal_id es obligatorio para usuarios con rol vendedor',
      })
    }
    // Confirm the branch belongs to the admin's company
    const sucursal = await prisma.sucursal.findFirst({
      where: { id: body.sucursal_id, empresa_id: user.empresa_id, activo: true },
      select: { id: true },
    })
    if (!sucursal) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Sucursal con id ${body.sucursal_id} no encontrada en tu empresa`,
      })
    }
  }

  const password_hash = await bcrypt.hash(body.password, 12)

  try {
    const usuario = await prisma.usuario.create({
      data: {
        username: body.username,
        password_hash,
        nombre_completo: body.nombre_completo,
        rol: body.rol,
        empresa_id: user.empresa_id,
        sucursal_id: body.sucursal_id ?? null,
      },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        rol: true,
        activo: true,
        sucursal_id: true,
        created_at: true,
      },
    })
    return reply.status(201).send(usuario)
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
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

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  // Validate that the target user belongs to the admin's company
  const existe = await prisma.usuario.findFirst({
    where: { id: params.id, empresa_id: user.empresa_id },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Usuario con id ${params.id} no encontrado`,
    })
  }

  // If changing to vendedor and sucursal_id is provided, validate ownership
  if (body.sucursal_id != null) {
    const sucursal = await prisma.sucursal.findFirst({
      where: { id: body.sucursal_id, empresa_id: user.empresa_id, activo: true },
      select: { id: true },
    })
    if (!sucursal) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Sucursal con id ${body.sucursal_id} no encontrada en tu empresa`,
      })
    }
  }

  const usuario = await prisma.usuario.update({
    where: { id: params.id },
    data: body,
    select: {
      id: true,
      username: true,
      nombre_completo: true,
      rol: true,
      activo: true,
      sucursal_id: true,
    },
  })
  return reply.send(usuario)
}

export async function deleteUsuarioHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const existe = await prisma.usuario.findFirst({
    where: { id: params.id, empresa_id: user.empresa_id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Usuario con id ${params.id} no encontrado`,
    })
  }

  await prisma.usuario.update({
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

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const existe = await prisma.usuario.findFirst({
    where: { id: params.id, empresa_id: user.empresa_id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Usuario con id ${params.id} no encontrado`,
    })
  }

  const password_hash = await bcrypt.hash(body.password, 12)
  await prisma.usuario.update({
    where: { id: params.id },
    data: { password_hash },
  })
  return reply.send({ message: 'Contraseña actualizada correctamente' })
}
