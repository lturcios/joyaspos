import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { validate } from '../../shared/validate'
import { loginSchema } from './auth.schema'
import { Rol, type LoginResponse } from '@joyaspos/shared-types'

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(loginSchema, request.body, reply)
  if (!body) return

  const { username, password } = body
  const prisma = request.server.prisma

  const usuario = await prisma.usuario.findFirst({
    where: { username, activo: true },
    select: {
      id: true,
      username: true,
      password_hash: true,
      nombre_completo: true,
      rol: true,
      empresa_id: true,
      sucursal_id: true,
      sucursal: { select: { nombre: true } },
      empresa: { select: { id: true, nombre: true, activo: true } },
    },
  })

  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Usuario o contraseña incorrectos',
    })
  }

  // Build JWT with tenant context
  const token = await reply.jwtSign({
    sub: usuario.id,
    username: usuario.username,
    rol: usuario.rol,
    empresa_id: usuario.empresa_id,
    sucursal_id: usuario.sucursal_id ?? null,
  })

  // Fetch branches visible to this user:
  //   - admin → all active branches of the company
  //   - vendedor → only their own branch
  const sucursales = await prisma.sucursal.findMany({
    where:
      usuario.rol === 'vendedor' && usuario.sucursal_id
        ? { id: usuario.sucursal_id, activo: true }
        : { empresa_id: usuario.empresa_id, activo: true },
    select: {
      id: true,
      empresa_id: true,
      nombre: true,
      direccion: true,
      telefono: true,
      activo: true,
    },
    orderBy: { nombre: 'asc' },
  })

  const response: LoginResponse = {
    token,
    user: {
      id: usuario.id,
      username: usuario.username,
      nombre_completo: usuario.nombre_completo ?? usuario.username,
      rol: usuario.rol as Rol,
      empresa_id: usuario.empresa_id,
      sucursal_id: usuario.sucursal_id ?? null,
      sucursal_nombre: usuario.sucursal?.nombre ?? null,
    },
    empresa: {
      id: usuario.empresa.id,
      nombre: usuario.empresa.nombre,
      activo: usuario.empresa.activo,
    },
    sucursales,
  }

  return reply.status(200).send(response)
}
