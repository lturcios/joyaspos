import { FastifyReply } from 'fastify'
import { validate } from '../../shared/validate'
import { periodoQuerySchema } from '../../shared/schemas'

export function parsePeriodo(query: unknown, reply: FastifyReply) {
  const parsed = validate(periodoQuerySchema, query, reply)
  if (!parsed) return null
  return {
    desde: new Date(`${parsed.desde}T00:00:00`),
    hasta: new Date(`${parsed.hasta}T23:59:59`),
    desdeStr: parsed.desde,
    hastaStr: parsed.hasta,
  }
}
