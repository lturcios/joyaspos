import { FastifyPluginAsync } from 'fastify'
import {
  listProveedoresHandler,
  createProveedorHandler,
  updateProveedorHandler,
  deleteProveedorHandler,
} from './proveedores.handler'

export const proveedoresRoutes: FastifyPluginAsync = async (fastify) => {
  const admin = { preHandler: [fastify.requireAdmin] }

  fastify.get('/', admin, listProveedoresHandler)
  fastify.post('/', admin, createProveedorHandler)
  fastify.put('/:id', admin, updateProveedorHandler)
  fastify.delete('/:id', admin, deleteProveedorHandler)
}
