import { FastifyPluginAsync } from 'fastify'
import { loginHandler } from './auth.handler'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/login', loginHandler)
}
