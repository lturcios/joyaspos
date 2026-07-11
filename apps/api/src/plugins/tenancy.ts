import fp from 'fastify-plugin'
import { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtPayload } from '@joyaspos/shared-types'

declare module 'fastify' {
  interface FastifyInstance {
    resolveSucursal: (
      request: FastifyRequest,
      reply: FastifyReply,
      opts: { requerida: boolean }
    ) => Promise<number | null | undefined>
  }
}

export const tenancyPlugin = fp(async (fastify) => {
  fastify.decorate('resolveSucursal', async (request, reply, opts) => {
    const user = request.user as JwtPayload

    // Vendors are always locked to their own branch
    if (user.rol === 'vendedor') {
      if (!user.sucursal_id) {
        reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Usuario vendedor sin sucursal asignada',
        })
        return undefined
      }
      return user.sucursal_id
    }

    // Admins may pass sucursal_id as query param or body field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw query/body not yet typed
    const raw =
      (request.query as any)?.sucursal_id ??
      (request.body as any)?.sucursal_id
    const sucursalId = raw != null ? Number(raw) : null

    if (sucursalId == null) {
      if (opts.requerida) {
        reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'sucursal_id es requerido para esta operación',
        })
        return undefined
      }
      // Consolidated view across all branches of the admin's company
      return null
    }

    // Validate that the sucursal belongs to the admin's company
    const sucursal = await fastify.prisma.sucursal.findFirst({
      where: { id: sucursalId, empresa_id: user.empresa_id, activo: true },
      select: { id: true },
    })
    if (!sucursal) {
      reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Sucursal ${sucursalId} no encontrada en tu empresa`,
      })
      return undefined
    }
    return sucursalId
  })
})
