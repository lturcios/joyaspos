---
name: api-compras-proveedores
description: |
  Implementa el módulo completo de compras y proveedores en la API de JoyasPOS:
  CRUD de proveedores con soft delete, registro de compras con transacción atómica
  (cabecera + detalle + incremento de existencias), historial filtrado por período,
  y detalle de compra. Usar al implementar estos módulos por primera vez, al agregar
  un endpoint nuevo de compras o proveedores, al depurar por qué las existencias
  no se incrementan al registrar una compra, o al revisar la lógica de proveedor
  libre vs catálogo. Depende de SKILL-04 (prisma-mysql), SKILL-05 (fastify-auth-jwt)
  y SKILL-06 (fastify-zod-validation).
---

> **⚠️ MULTITENANCY — LEER PRIMERO `skills/multitenancy-empresa-sucursal/SKILL.md`.**
> Esta skill fue escrita antes del requisito multiempresa/multisucursal. La skill
> de multitenancy define deltas OBLIGATORIOS que modifican el código de esta skill
> (campos `empresa_id`/`sucursal_id`, JWT extendido, scoping por sucursal en todos
> los queries, selector de sucursal, aislamiento de datos locales). Donde ambas
> se contradigan, gana la skill de multitenancy.


# SKILL-08 — Módulo Compras + Proveedores (apps/api)

## Endpoints implementados

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | /proveedores | admin | Listar proveedores activos |
| POST | /proveedores | admin | Crear proveedor |
| PUT | /proveedores/:id | admin | Editar proveedor |
| DELETE | /proveedores/:id | admin | Desactivar (soft) |
| POST | /compras | admin | Registrar compra |
| GET | /compras | admin | Listar por período |
| GET | /compras/:id | admin | Detalle de compra |

---

## 1. Módulo Proveedores

### `src/modules/proveedores/proveedores.handler.ts`
```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import { validate } from '../../shared/validate'
import { idParamSchema } from '../../shared/schemas'
import {
  createProveedorSchema,
  updateProveedorSchema,
  type CreateProveedorInput,
  type UpdateProveedorInput,
} from './proveedores.schema'
import { Prisma } from '@prisma/client'

// GET /proveedores
export async function listProveedoresHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const proveedores = await request.server.prisma.proveedor.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, contacto: true, telefono: true, direccion: true, activo: true },
  })
  return reply.send(proveedores)
}

// POST /proveedores
export async function createProveedorHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = validate(createProveedorSchema, request.body, reply)
  if (!body) return

  try {
    const proveedor = await request.server.prisma.proveedor.create({ data: body })
    return reply.status(201).send(proveedor)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.status(409).send({
        statusCode: 409, error: 'Conflict',
        message: 'Ya existe un proveedor con ese nombre',
      })
    }
    throw error
  }
}

// PUT /proveedores/:id
export async function updateProveedorHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return
  const body = validate(updateProveedorSchema, request.body, reply)
  if (!body) return

  const proveedor = await request.server.prisma.proveedor.findFirst({
    where: { id: params.id, activo: true },
  })
  if (!proveedor) {
    return reply.status(404).send({
      statusCode: 404, error: 'Not Found',
      message: `Proveedor con id ${params.id} no encontrado`,
    })
  }

  const actualizado = await request.server.prisma.proveedor.update({
    where: { id: params.id },
    data: body,
  })
  return reply.send(actualizado)
}

// DELETE /proveedores/:id — soft delete
export async function deleteProveedorHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const proveedor = await request.server.prisma.proveedor.findFirst({
    where: { id: params.id, activo: true },
  })
  if (!proveedor) {
    return reply.status(404).send({
      statusCode: 404, error: 'Not Found',
      message: `Proveedor con id ${params.id} no encontrado`,
    })
  }

  await request.server.prisma.proveedor.update({
    where: { id: params.id },
    data: { activo: false },
  })
  return reply.send({ message: 'Proveedor desactivado correctamente' })
}
```

### `src/modules/proveedores/proveedores.routes.ts`
```typescript
import { FastifyPluginAsync } from 'fastify'
import {
  listProveedoresHandler, createProveedorHandler,
  updateProveedorHandler, deleteProveedorHandler,
} from './proveedores.handler'

export const proveedoresRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.requireAdmin] }, listProveedoresHandler)
  fastify.post('/', { preHandler: [fastify.requireAdmin] }, createProveedorHandler)
  fastify.put('/:id', { preHandler: [fastify.requireAdmin] }, updateProveedorHandler)
  fastify.delete('/:id', { preHandler: [fastify.requireAdmin] }, deleteProveedorHandler)
}
```

---

## 2. Módulo Compras

### `src/modules/compras/compras.handler.ts`
```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import { Prisma } from '@prisma/client'
import { validate } from '../../shared/validate'
import { idParamSchema, periodoQuerySchema } from '../../shared/schemas'
import { createCompraSchema, type CreateCompraInput } from './compras.schema'
import type { JwtPayload } from '@joyaspos/shared-types'

// POST /compras
export async function createCompraHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = validate(createCompraSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  // Validar que todos los productos existen y están activos
  const productoIds = body.items.map((i) => i.producto_id)
  const productos = await prisma.producto.findMany({
    where: { id: { in: productoIds }, activo: true },
    select: { id: true },
  })

  if (productos.length !== productoIds.length) {
    const encontrados = new Set(productos.map((p) => p.id))
    const faltante = productoIds.find((id) => !encontrados.has(id))
    return reply.status(400).send({
      statusCode: 400, error: 'Bad Request',
      message: `Producto con id ${faltante} no encontrado o inactivo`,
    })
  }

  // Resolver nombre del proveedor
  let proveedorNombre = body.proveedor_nombre?.trim() ?? ''
  if (body.proveedor_id) {
    const proveedor = await prisma.proveedor.findFirst({
      where: { id: body.proveedor_id, activo: true },
      select: { nombre: true },
    })
    if (!proveedor) {
      return reply.status(400).send({
        statusCode: 400, error: 'Bad Request',
        message: `Proveedor con id ${body.proveedor_id} no encontrado`,
      })
    }
    proveedorNombre = proveedor.nombre
  }

  const fechaHora = body.fecha_hora ? new Date(body.fecha_hora) : new Date()
  const monto_total = body.items.reduce(
    (acc, i) => acc + i.cantidad * i.costo_unitario, 0
  )

  // Transacción atómica: cabecera + detalle + incremento de existencias
  const compra = await prisma.$transaction(async (tx) => {
    const nuevaCompra = await tx.compra.create({
      data: {
        proveedor_id: body.proveedor_id ?? null,
        proveedor_nombre: proveedorNombre,
        monto_total: new Prisma.Decimal(monto_total),
        fecha_hora: fechaHora,
        notas: body.notas ?? null,
        usuario_id: user.sub,
      },
    })

    await tx.compraDetalle.createMany({
      data: body.items.map((item) => ({
        compra_id: nuevaCompra.id,
        producto_id: item.producto_id,
        cantidad: new Prisma.Decimal(item.cantidad),
        costo_unitario: new Prisma.Decimal(item.costo_unitario),
        total: new Prisma.Decimal(item.cantidad * item.costo_unitario),
      })),
    })

    // Incrementar existencias por cada ítem comprado
    for (const item of body.items) {
      await tx.producto.update({
        where: { id: item.producto_id },
        data: { existencia: { increment: item.cantidad } },
      })
    }

    return nuevaCompra
  })

  // Devolver la compra con su detalle
  const detalle = await prisma.compraDetalle.findMany({
    where: { compra_id: compra.id },
    include: { producto: { select: { nombre: true } } },
  })

  return reply.status(201).send({
    id: compra.id,
    proveedor_nombre: compra.proveedor_nombre,
    monto_total: Number(compra.monto_total),
    fecha_hora: compra.fecha_hora.toISOString(),
    notas: compra.notas,
    registrado_por: user.username,
    items: detalle.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      nombre_producto: d.producto.nombre,
      cantidad: Number(d.cantidad),
      costo_unitario: Number(d.costo_unitario),
      total: Number(d.total),
    })),
  })
}

// GET /compras?desde=&hasta=
export async function listComprasHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const query = validate(periodoQuerySchema, request.query, reply)
  if (!query) return

  const compras = await request.server.prisma.compra.findMany({
    where: {
      fecha_hora: {
        gte: new Date(`${query.desde}T00:00:00`),
        lte: new Date(`${query.hasta}T23:59:59`),
      },
    },
    include: { usuario: { select: { username: true } } },
    orderBy: { fecha_hora: 'desc' },
  })

  return reply.send(
    compras.map((c) => ({
      id: c.id,
      proveedor_nombre: c.proveedor_nombre,
      monto_total: Number(c.monto_total),
      fecha_hora: c.fecha_hora.toISOString(),
      registrado_por: c.usuario.username,
    }))
  )
}

// GET /compras/:id
export async function getCompraHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const compra = await request.server.prisma.compra.findUnique({
    where: { id: params.id },
    include: {
      usuario: { select: { username: true } },
      detalles: {
        include: { producto: { select: { nombre: true } } },
      },
    },
  })

  if (!compra) {
    return reply.status(404).send({
      statusCode: 404, error: 'Not Found',
      message: `Compra con id ${params.id} no encontrada`,
    })
  }

  return reply.send({
    id: compra.id,
    proveedor_id: compra.proveedor_id,
    proveedor_nombre: compra.proveedor_nombre,
    monto_total: Number(compra.monto_total),
    fecha_hora: compra.fecha_hora.toISOString(),
    notas: compra.notas,
    registrado_por: compra.usuario.username,
    items: compra.detalles.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      nombre_producto: d.producto.nombre,
      cantidad: Number(d.cantidad),
      costo_unitario: Number(d.costo_unitario),
      total: Number(d.total),
    })),
  })
}
```

### `src/modules/compras/compras.routes.ts`
```typescript
import { FastifyPluginAsync } from 'fastify'
import { createCompraHandler, listComprasHandler, getCompraHandler } from './compras.handler'

export const comprasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', { preHandler: [fastify.requireAdmin] }, createCompraHandler)
  fastify.get('/', { preHandler: [fastify.requireAdmin] }, listComprasHandler)
  fastify.get('/:id', { preHandler: [fastify.requireAdmin] }, getCompraHandler)
}
```

---

## 3. Reglas de negocio críticas

1. **Incremento de existencias en la misma transacción** que el INSERT — si falla cualquier paso, toda la operación se revierte.
2. **Proveedor libre vs catálogo** — al menos uno de `proveedor_id` o `proveedor_nombre` debe estar presente (validado por Zod en SKILL-06). Si viene `proveedor_id`, se usa el nombre del catálogo.
3. **Nunca eliminar compras** — son registros contables permanentes.
4. **Soft delete en proveedores** — los históricos de compras conservan `proveedor_nombre` como texto para no perder la referencia.
5. **`costo_unitario` no se almacena en `productos`** — solo en `compra_detalle` para preservar el costo histórico al momento de la compra.

---

## 4. Prueba con curl

```bash
TOKEN="<token admin>"

# Crear proveedor
curl -X POST http://localhost:3000/proveedores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Distribuidora Central","telefono":"2222-3333"}'

# Registrar compra
curl -X POST http://localhost:3000/compras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proveedor_id": 1,
    "notas": "Pedido mensual",
    "items": [
      {"producto_id": 1, "cantidad": 20, "costo_unitario": 8.50},
      {"producto_id": 2, "cantidad": 10, "costo_unitario": 15.00}
    ]
  }'

# Historial de compras
curl "http://localhost:3000/compras?desde=2026-01-01&hasta=2026-12-31" \
  -H "Authorization: Bearer $TOKEN"
```
