import { FastifyPluginAsync } from 'fastify'
import {
  crearVentaHandler,
  syncVentasHandler,
  listarVentasHandler,
  detalleVentaHandler,
} from './ventas.handler'

export const ventasRoutes: FastifyPluginAsync = async (fastify) => {
  // /sync MUST be registered before /:id — otherwise Fastify parses "sync" as a numeric id
  fastify.post('/sync', { preHandler: [fastify.requireAuth] }, syncVentasHandler)
  fastify.post('/', { preHandler: [fastify.requireAuth] }, crearVentaHandler)
  fastify.get('/', { preHandler: [fastify.requireAuth] }, listarVentasHandler)
  fastify.get('/:id', { preHandler: [fastify.requireAuth] }, detalleVentaHandler)
}
