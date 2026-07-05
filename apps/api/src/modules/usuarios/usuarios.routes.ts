import { FastifyPluginAsync } from 'fastify'
import {
  listUsuariosHandler,
  createUsuarioHandler,
  updateUsuarioHandler,
  deleteUsuarioHandler,
  changePasswordHandler,
} from './usuarios.handler'

export const usuariosRoutes: FastifyPluginAsync = async (fastify) => {
  const admin = { preHandler: [fastify.requireAdmin] }

  fastify.get('/', admin, listUsuariosHandler)
  fastify.post('/', admin, createUsuarioHandler)
  fastify.put('/:id', admin, updateUsuarioHandler)
  fastify.delete('/:id', admin, deleteUsuarioHandler)
  fastify.put('/:id/password', admin, changePasswordHandler)
}
