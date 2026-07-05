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
    },
  })

  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Usuario o contraseña incorrectos',
    })
  }

  const token = await reply.jwtSign({
    sub: usuario.id,
    username: usuario.username,
    rol: usuario.rol,
  })

  const response: LoginResponse = {
    token,
    user: {
      id: usuario.id,
      username: usuario.username,
      nombre_completo: usuario.nombre_completo ?? usuario.username,
      rol: usuario.rol as Rol,
    },
  }

  return reply.status(200).send(response)
}
