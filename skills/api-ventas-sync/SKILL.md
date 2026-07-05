---
name: api-ventas-sync
description: |
  Implementa el módulo completo de ventas de la API JoyasPOS: endpoint POST /ventas
  (registro online), POST /ventas/sync (sincronización batch offline→online con
  idempotencia), GET /ventas (listado por período) y GET /ventas/:id (detalle).
  Usar al implementar el módulo de ventas, al debuggear el proceso de sincronización
  offline, al revisar la lógica de descuento de existencias, o cuando se necesite
  entender cómo funciona la detección de duplicados en el sync batch.
  Es el módulo más crítico del backend: todas las ventas de la app (online y offline)
  pasan por aquí. Depende de SKILL-04 (prisma-mysql), SKILL-05 (fastify-auth-jwt)
  y SKILL-06 (fastify-zod-validation).
---

# SKILL-07 — Módulo Ventas + Sync Batch (apps/api)

## Endpoints implementados
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | /ventas | todos | Registrar venta online |
| POST | /ventas/sync | todos | Sync batch offline→online |
| GET | /ventas | todos | Listar por período |
| GET | /ventas/:id | todos | Detalle de venta |

---

## 1. Schema (ver SKILL-06 para el código completo)

El módulo usa los schemas definidos en SKILL-06:
- `createVentaSchema` — para POST /ventas
- `syncVentasSchema` — para POST /ventas/sync
- `periodoQuerySchema` — para GET /ventas
- `idParamSchema` — para GET /ventas/:id

---

## 2. Helper: lógica core de registro de una venta

Esta función encapsula la lógica de negocio reutilizada por ambos endpoints
(POST /ventas y cada item del POST /ventas/sync):

### `src/modules/ventas/ventas.service.ts`
```typescript
import { PrismaClient, Prisma } from '@prisma/client'
import type { CreateVentaInput } from './ventas.schema'

export interface RegistrarVentaParams {
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
  body: CreateVentaInput
  usuario_id: number
}

export interface VentaRegistrada {
  id: number
  nombre_cliente: string
  monto_total: number
  fecha_hora: Date
  usuario_id: number
  items: Array<{
    id: number
    producto_id: number
    detalle: string
    cantidad: number
    precio_unitario: number
    total: number
  }>
}

/**
 * Registra una venta dentro de una transacción Prisma.
 * Debe llamarse siempre dentro de prisma.$transaction().
 *
 * Proceso:
 * 1. Resolver nombre_cliente (default "Clientes Varios")
 * 2. Construir detalle = "{nombre_producto} {detalle_adicional}".trim()
 * 3. Calcular totales
 * 4. INSERT ventas + INSERT venta_detalle
 * 5. UPDATE productos: existencia -= cantidad (por ítem)
 */
export async function registrarVenta({
  tx,
  body,
  usuario_id,
}: RegistrarVentaParams): Promise<VentaRegistrada> {
  const nombre_cliente =
    body.nombre_cliente?.trim() || 'Clientes Varios'

  const fecha_hora = body.fecha_hora
    ? new Date(body.fecha_hora)
    : new Date()

  // Resolver nombres de productos en un solo query
  const productoIds = body.items.map((i) => i.producto_id)
  const productos = await tx.producto.findMany({
    where: { id: { in: productoIds }, activo: true },
    select: { id: true, nombre: true, existencia: true },
  })

  const productoMap = new Map(productos.map((p) => [p.id, p]))

  // Validar que todos los productos existen y están activos
  for (const item of body.items) {
    if (!productoMap.has(item.producto_id)) {
      throw new Error(
        `Producto con id ${item.producto_id} no encontrado o inactivo`
      )
    }
  }

  // Calcular total por ítem y total general
  const itemsConDetalle = body.items.map((item) => {
    const producto = productoMap.get(item.producto_id)!
    const detalle = [producto.nombre, item.detalle_adicional]
      .filter(Boolean)
      .join(' ')
      .trim()
    const total = Number(item.cantidad) * Number(item.precio_unitario)

    return {
      producto_id: item.producto_id,
      detalle,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      total,
    }
  })

  const monto_total = itemsConDetalle.reduce((acc, i) => acc + i.total, 0)

  // INSERT cabecera de venta
  const venta = await tx.venta.create({
    data: {
      nombre_cliente,
      monto_total: new Prisma.Decimal(monto_total),
      fecha_hora,
      usuario_id,
    },
  })

  // INSERT detalles en bloque
  await tx.ventaDetalle.createMany({
    data: itemsConDetalle.map((item) => ({
      venta_id: venta.id,
      producto_id: item.producto_id,
      detalle: item.detalle,
      cantidad: new Prisma.Decimal(item.cantidad),
      precio_unitario: new Prisma.Decimal(item.precio_unitario),
      total: new Prisma.Decimal(item.total),
    })),
  })

  // UPDATE existencias — descontar por cada ítem
  for (const item of itemsConDetalle) {
    await tx.producto.update({
      where: { id: item.producto_id },
      data: {
        existencia: { decrement: item.cantidad },
      },
    })
  }

  // Retornar venta con items para la respuesta
  const detalles = await tx.ventaDetalle.findMany({
    where: { venta_id: venta.id },
    select: {
      id: true,
      producto_id: true,
      detalle: true,
      cantidad: true,
      precio_unitario: true,
      total: true,
    },
  })

  return {
    id: venta.id,
    nombre_cliente: venta.nombre_cliente,
    monto_total: Number(venta.monto_total),
    fecha_hora: venta.fecha_hora,
    usuario_id: venta.usuario_id,
    items: detalles.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      detalle: d.detalle,
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      total: Number(d.total),
    })),
  }
}
```

---

## 3. Handler completo

### `src/modules/ventas/ventas.handler.ts`
```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import { Prisma } from '@prisma/client'
import { validate } from '../../shared/validate'
import { periodoQuerySchema, idParamSchema } from '../../shared/schemas'
import {
  createVentaSchema,
  syncVentasSchema,
  type CreateVentaInput,
  type SyncVentasInput,
} from './ventas.schema'
import { registrarVenta } from './ventas.service'
import type { JwtPayload } from '@joyaspos/shared-types'

// ──────────────────────────────────────────────
// POST /ventas — Registrar venta online
// ──────────────────────────────────────────────
export async function createVentaHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = validate(createVentaSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  try {
    const venta = await prisma.$transaction(async (tx) => {
      return registrarVenta({ tx, body, usuario_id: user.sub })
    })

    return reply.status(201).send(venta)
  } catch (error: any) {
    if (error.message?.includes('no encontrado o inactivo')) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      })
    }
    throw error
  }
}

// ──────────────────────────────────────────────
// POST /ventas/sync — Sync batch offline→online
// ──────────────────────────────────────────────
export async function syncVentasHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = validate(syncVentasSchema, request.body, reply)
  if (!body) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const sincronizadas: Array<{ local_id: number; remote_id: number }> = []
  const errores: Array<{ local_id: number; mensaje: string }> = []

  // Procesar en orden cronológico para mantener consistencia de existencias
  const ventasOrdenadas = [...body.ventas].sort((a, b) => {
    const fa = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0
    const fb = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0
    return fa - fb
  })

  for (const ventaPayload of ventasOrdenadas) {
    const { local_id, ...ventaData } = ventaPayload

    try {
      // ── IDEMPOTENCIA ────────────────────────────────────────────────
      // Detectar duplicados por: usuario_id + fecha_hora + monto_total
      // Una venta con los mismos tres valores ya fue procesada antes.
      if (ventaData.fecha_hora) {
        const fechaHora = new Date(ventaData.fecha_hora)
        const montoTotal = ventaData.items.reduce(
          (acc, i) => acc + i.cantidad * i.precio_unitario,
          0
        )

        const existente = await prisma.venta.findFirst({
          where: {
            usuario_id: user.sub,
            fecha_hora: fechaHora,
            monto_total: { equals: new Prisma.Decimal(montoTotal) },
          },
          select: { id: true },
        })

        if (existente) {
          // Ya existe — retornar remote_id sin duplicar ni lanzar error
          sincronizadas.push({ local_id, remote_id: existente.id })
          continue
        }
      }
      // ── FIN IDEMPOTENCIA ────────────────────────────────────────────

      const venta = await prisma.$transaction(async (tx) => {
        return registrarVenta({ tx, body: ventaData, usuario_id: user.sub })
      })

      sincronizadas.push({ local_id, remote_id: venta.id })
    } catch (error: any) {
      // Error parcial — continuar con la siguiente venta
      errores.push({
        local_id,
        mensaje: error.message ?? 'Error desconocido al procesar la venta',
      })
    }
  }

  return reply.status(200).send({ sincronizadas, errores })
}

// ──────────────────────────────────────────────
// GET /ventas — Listar por período
// ──────────────────────────────────────────────
export async function listVentasHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const query = validate(periodoQuerySchema, request.query, reply)
  if (!query) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  // Vendedor solo ve sus ventas; admin ve todas
  const whereBase =
    user.rol === 'admin' ? {} : { usuario_id: user.sub }

  const ventas = await prisma.venta.findMany({
    where: {
      ...whereBase,
      fecha_hora: {
        gte: new Date(`${query.desde}T00:00:00`),
        lte: new Date(`${query.hasta}T23:59:59`),
      },
    },
    include: {
      usuario: { select: { username: true } },
    },
    orderBy: { fecha_hora: 'desc' },
  })

  return reply.send(
    ventas.map((v) => ({
      id: v.id,
      nombre_cliente: v.nombre_cliente,
      monto_total: Number(v.monto_total),
      fecha_hora: v.fecha_hora.toISOString(),
      vendedor: v.usuario.username,
    }))
  )
}

// ──────────────────────────────────────────────
// GET /ventas/:id — Detalle de venta
// ──────────────────────────────────────────────
export async function getVentaHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const user = request.user as JwtPayload
  const prisma = request.server.prisma

  const venta = await prisma.venta.findFirst({
    where: {
      id: params.id,
      // Vendedor solo puede ver sus propias ventas
      ...(user.rol !== 'admin' && { usuario_id: user.sub }),
    },
    include: {
      usuario: { select: { username: true, nombre_completo: true } },
      detalles: {
        select: {
          id: true,
          producto_id: true,
          detalle: true,
          cantidad: true,
          precio_unitario: true,
          total: true,
        },
      },
    },
  })

  if (!venta) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Venta con id ${params.id} no encontrada`,
    })
  }

  return reply.send({
    id: venta.id,
    nombre_cliente: venta.nombre_cliente,
    monto_total: Number(venta.monto_total),
    fecha_hora: venta.fecha_hora.toISOString(),
    vendedor: venta.usuario.username,
    items: venta.detalles.map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      detalle: d.detalle,
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      total: Number(d.total),
    })),
  })
}
```

---

## 4. Rutas

### `src/modules/ventas/ventas.routes.ts`
```typescript
import { FastifyPluginAsync } from 'fastify'
import {
  createVentaHandler,
  syncVentasHandler,
  listVentasHandler,
  getVentaHandler,
} from './ventas.handler'

export const ventasRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /ventas — registro online
  fastify.post('/', { preHandler: [fastify.requireAuth] }, createVentaHandler)

  // POST /ventas/sync — sync batch (DEBE ir ANTES de /:id)
  fastify.post('/sync', { preHandler: [fastify.requireAuth] }, syncVentasHandler)

  // GET /ventas?desde=&hasta=
  fastify.get('/', { preHandler: [fastify.requireAuth] }, listVentasHandler)

  // GET /ventas/:id
  fastify.get('/:id', { preHandler: [fastify.requireAuth] }, getVentaHandler)
}
```

> **Importante:** la ruta `/sync` debe registrarse ANTES que `/:id` para que
> Fastify no intente parsear "sync" como un parámetro numérico.

---

## 5. Reglas de negocio críticas

1. **`nombre_cliente` vacío o null → "Clientes Varios"** — siempre.
2. **`detalle` = `"{nombre_producto} {detalle_adicional}".trim()`** — construido en el servidor, nunca en el cliente.
3. **La existencia se descuenta en la misma transacción** que se inserta la venta — si falla cualquier paso, todo se revierte.
4. **Sync batch procesa en orden cronológico** — las ventas más antiguas primero.
5. **Idempotencia del sync**: si una venta con mismo `usuario_id + fecha_hora + monto_total` ya existe, se retorna su `remote_id` sin crear un duplicado.
6. **Errores parciales en el sync no abortan el lote** — las ventas fallidas se reportan en `errores[]` y las demás continúan.
7. **El vendedor solo puede ver sus propias ventas** en GET /ventas y GET /ventas/:id.

---

## 6. Pruebas con curl

```bash
TOKEN="<token del login>"

# Registrar venta online
curl -X POST http://localhost:3000/ventas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_cliente": "Juan Pérez",
    "items": [
      { "producto_id": 1, "cantidad": 2, "precio_unitario": 25.00, "detalle_adicional": "talla M" }
    ]
  }'

# Sync batch
curl -X POST http://localhost:3000/ventas/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ventas": [
      {
        "local_id": 3,
        "nombre_cliente": "Clientes Varios",
        "fecha_hora": "2026-06-29T10:30:00.000Z",
        "items": [
          { "producto_id": 2, "cantidad": 1, "precio_unitario": 50.00 }
        ]
      }
    ]
  }'

# Listar ventas del día
curl "http://localhost:3000/ventas?desde=2026-06-29&hasta=2026-06-29" \
  -H "Authorization: Bearer $TOKEN"
```
