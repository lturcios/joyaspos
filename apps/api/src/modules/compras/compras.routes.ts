import { FastifyPluginAsync } from 'fastify'
import { createCompraHandler, listComprasHandler, getCompraHandler } from './compras.handler'

export const comprasRoutes: FastifyPluginAsync = async (fastify) => {
  const admin = { preHandler: [fastify.requireAdmin] }

  fastify.post('/', admin, createCompraHandler)
  fastify.get('/', admin, listComprasHandler)
  fastify.get('/:id', admin, getCompraHandler)
}
