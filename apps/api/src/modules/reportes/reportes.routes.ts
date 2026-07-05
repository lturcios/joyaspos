import { FastifyPluginAsync } from 'fastify'
import {
  dashboardHandler,
  reporteVentasHandler,
  productosTopHandler,
  inventarioHandler,
  rentabilidadHandler,
  reporteComprasHandler,
  kardexHandler,
} from './reportes.handler'

export const reportesRoutes: FastifyPluginAsync = async (fastify) => {
  const opts = { preHandler: [fastify.requireAdmin] }

  fastify.get('/dashboard', opts, dashboardHandler)
  fastify.get('/ventas', opts, reporteVentasHandler)
  fastify.get('/productos-top', opts, productosTopHandler)
  fastify.get('/inventario', opts, inventarioHandler)
  fastify.get('/rentabilidad', opts, rentabilidadHandler)
  fastify.get('/compras', opts, reporteComprasHandler)
  fastify.get('/kardex/:productoId', opts, kardexHandler)
}
