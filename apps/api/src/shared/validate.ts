import { ZodSchema } from 'zod'
import { FastifyReply } from 'fastify'

export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown,
  reply: FastifyReply
): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: result.error.issues[0].message,
      ...(process.env.NODE_ENV !== 'production' && {
        details: result.error.flatten().fieldErrors,
      }),
    })
    return null
  }
  return result.data
}
