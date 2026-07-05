import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import { env } from '../config/env'

export const corsPlugin = fp(async (fastify) => {
  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim())
  await fastify.register(cors, {
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
})
