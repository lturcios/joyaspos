import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { validate } from '../../shared/validate'
import { idParamSchema } from '../../shared/schemas'
import type { JwtPayload } from '@joyaspos/shared-types'

const createSucursalSchema = z.object({
  nombre: z.string().min(1).max(150),
  direccion: z.string().max(255).optional(),
  telefono: z.string().max(20).optional(),
})

const updateSucursalSchema = z
  .object({
    nombre: z.string().min(1).max(150).optional(),
    direccion: z.string().max(255).nullable().optional(),
    telefono: z.string().max(20).nullable().optional(),
    activo: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Se debe proveer al menos un campo para actualizar' }
  )

/**
 * GET /sucursales
 * Admin → all active branches of their company
 * Vendor → only their own branch
 */
export async function listSucursalesHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const where =
    user.rol === 'vendedor' && user.sucursal_id
      ? { id: user.sucursal_id, empresa_id: user.empresa_id }
      : { empresa_id: user.empresa_id, activo: true }

  const sucursales = await prisma.sucursal.findMany({
    where,
    select: { id: true, nombre: true, direccion: true, telefono: true, activo: true },
    orderBy: { nombre: 'asc' },
  })
  return reply.send(sucursales)
}

/**
 * POST /sucursales
 * empresa_id is always taken from the JWT — never from the body
 */
export async function createSucursalHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = validate(createSucursalSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload

  try {
    const sucursal = await request.server.prisma.sucursal.create({
      data: {
        empresa_id: user.empresa_id,
        nombre: body.nombre,
        direccion: body.direccion ?? null,
        telefono: body.telefono ?? null,
      },
    })
    return reply.status(201).send(sucursal)
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Ya existe una sucursal con el nombre "${body.nombre}" en tu empresa`,
      })
    }
    throw error
  }
}

/**
 * PUT /sucursales/:id
 */
export async function updateSucursalHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return
  const body = validate(updateSucursalSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const existe = await prisma.sucursal.findFirst({
    where: { id: params.id, empresa_id: user.empresa_id },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Sucursal con id ${params.id} no encontrada`,
    })
  }

  try {
    const sucursal = await prisma.sucursal.update({
      where: { id: params.id },
      data: body,
    })
    return reply.send(sucursal)
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ya existe una sucursal con ese nombre en tu empresa',
      })
    }
    throw error
  }
}

/**
 * DELETE /sucursales/:id — soft delete
 * Returns 409 if the branch has active vendors assigned to it
 */
export async function deleteSucursalHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const existe = await prisma.sucursal.findFirst({
    where: { id: params.id, empresa_id: user.empresa_id, activo: true },
  })
  if (!existe) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Sucursal con id ${params.id} no encontrada`,
    })
  }

  // Block deactivation if active vendors are still assigned
  const vendedoresActivos = await prisma.usuario.count({
    where: { sucursal_id: params.id, activo: true, rol: 'vendedor' },
  })
  if (vendedoresActivos > 0) {
    return reply.status(409).send({
      statusCode: 409,
      error: 'Conflict',
      message: `No se puede desactivar: la sucursal tiene ${vendedoresActivos} vendedor(es) activo(s) asignado(s)`,
    })
  }

  await prisma.sucursal.update({
    where: { id: params.id },
    data: { activo: false },
  })
  return reply.send({ message: 'Sucursal desactivada correctamente' })
}
