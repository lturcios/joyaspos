import type { JwtPayload } from '@joyaspos/shared-types'

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (
      request: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply,
    ) => Promise<void>
    requireAdmin: (
      request: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply,
    ) => Promise<void>
  }
}

// Re-export for convenience — actual request.user typing handled by @fastify/jwt in SKILL-05
export type { JwtPayload }
