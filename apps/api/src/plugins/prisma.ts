import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })

  await prisma.$connect()

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect()
  })
})

export { prismaPlugin }

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}
