import { FastifyPluginAsync } from 'fastify'
import {
  listProductosHandler,
  createProductoHandler,
  updateProductoHandler,
  deleteProductoHandler,
  ingresoExistenciaHandler,
} from './productos.handler'

export const productosRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.requireAuth] }, listProductosHandler)
  fastify.post('/', { preHandler: [fastify.requireAdmin] }, createProductoHandler)
  fastify.put('/:id', { preHandler: [fastify.requireAdmin] }, updateProductoHandler)
  fastify.delete('/:id', { preHandler: [fastify.requireAdmin] }, deleteProductoHandler)
  fastify.post('/:id/ingreso', { preHandler: [fastify.requireAdmin] }, ingresoExistenciaHandler)
}
