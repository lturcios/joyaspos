import { FastifyPluginAsync } from 'fastify'
import {
  listSucursalesHandler,
  createSucursalHandler,
  updateSucursalHandler,
  deleteSucursalHandler,
} from './sucursales.handler'

export const sucursalesRoutes: FastifyPluginAsync = async (fastify) => {
  const auth  = { preHandler: [fastify.requireAuth] }
  const admin = { preHandler: [fastify.requireAdmin] }

  fastify.get('/',     auth,  listSucursalesHandler)
  fastify.post('/',    admin, createSucursalHandler)
  fastify.put('/:id',  admin, updateSucursalHandler)
  fastify.delete('/:id', admin, deleteSucursalHandler)
}
