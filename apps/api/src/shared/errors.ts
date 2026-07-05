import { FastifyReply } from 'fastify'

export function sendNotFound(reply: FastifyReply, message = 'Recurso no encontrado') {
  return reply.status(404).send({ statusCode: 404, error: 'Not Found', message })
}

export function sendConflict(reply: FastifyReply, message: string) {
  return reply.status(409).send({ statusCode: 409, error: 'Conflict', message })
}

export function sendBadRequest(reply: FastifyReply, message: string) {
  return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message })
}

export function sendForbidden(reply: FastifyReply, message = 'Sin permisos para esta acción') {
  return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message })
}
