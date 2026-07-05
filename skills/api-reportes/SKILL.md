---
name: api-reportes
description: |
  Implementa el módulo completo de reportes de la API de JoyasPOS: dashboard de KPIs
  diarios, ventas por período con desglose por día y por vendedor, productos más
  vendidos (top N), movimiento de inventario (entradas compras vs salidas ventas),
  rentabilidad estimada (precio venta vs costo compra) y compras por período.
  Usar al implementar el módulo de reportes, al optimizar queries lentas, al
  agregar un nuevo agregado o desglose a un reporte existente, o como referencia
  de los JOINs y agrupaciones necesarias para cada endpoint.
  Depende de SKILL-04 (prisma-mysql), SKILL-05 (fastify-auth-jwt) y
  SKILL-06 (fastify-zod-validation). Los índices MySQL definidos en SKILL-04
  son críticos para el rendimiento de estas queries.
---

# SKILL-09 — Módulo Reportes (apps/api)

## Todos los endpoints requieren rol `admin` y parámetros `desde` / `hasta` (YYYY-MM-DD)

---

## 1. Rutas

### `src/modules/reportes/reportes.routes.ts`
```typescript
import { FastifyPluginAsync } from 'fastify'
import {
  dashboardHandler, reporteVentasHandler, productosTopHandler,
  inventarioHandler, rentabilidadHandler, reporteComprasHandler,
} from './reportes.handler'

export const reportesRoutes: FastifyPluginAsync = async (fastify) => {
  const opts = { preHandler: [fastify.requireAdmin] }

  fastify.get('/dashboard', opts, dashboardHandler)
  fastify.get('/ventas', opts, reporteVentasHandler)
  fastify.get('/productos-top', opts, productosTopHandler)
  fastify.get('/inventario', opts, inventarioHandler)
  fastify.get('/rentabilidad', opts, rentabilidadHandler)
  fastify.get('/compras', opts, reporteComprasHandler)
}
```

---

## 2. Helper de fechas y validación

```typescript
// src/modules/reportes/reportes.util.ts
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
```

---

## 3. Handler completo

### `src/modules/reportes/reportes.handler.ts`
```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import { validate } from '../../shared/validate'
import { periodoQuerySchema } from '../../shared/schemas'
import { z } from 'zod'
import { parsePeriodo } from './reportes.util'

// ─────────────────────────────────────────────────────────────────────────────
// GET /reportes/dashboard — KPIs del día actual
// ─────────────────────────────────────────────────────────────────────────────
export async function dashboardHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const prisma = request.server.prisma

  const hoy = new Date()
  const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0))
  const finHoy = new Date(new Date().setHours(23, 59, 59, 999))

  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  const inicioAyer = new Date(ayer.setHours(0, 0, 0, 0))
  const finAyer = new Date(new Date(inicioAyer).setHours(23, 59, 59, 999))

  // Lunes de la semana actual
  const inicioSemana = new Date()
  inicioSemana.setDate(inicioSemana.getDate() - ((inicioSemana.getDay() + 6) % 7))
  inicioSemana.setHours(0, 0, 0, 0)

  const [ventasHoy, ventasAyer, ventasSemana, comprasSemana, stockBajo] =
    await Promise.all([
      // Ventas hoy
      prisma.venta.aggregate({
        where: { fecha_hora: { gte: inicioHoy, lte: finHoy } },
        _sum: { monto_total: true },
        _count: true,
      }),
      // Ventas ayer
      prisma.venta.aggregate({
        where: { fecha_hora: { gte: inicioAyer, lte: finAyer } },
        _sum: { monto_total: true },
        _count: true,
      }),
      // Ventas de la semana por día
      prisma.$queryRaw<Array<{ fecha: string; monto: number; cantidad: bigint }>>`
        SELECT DATE(fecha_hora) as fecha,
               SUM(monto_total) as monto,
               COUNT(*) as cantidad
        FROM ventas
        WHERE fecha_hora >= ${inicioSemana}
        GROUP BY DATE(fecha_hora)
        ORDER BY fecha ASC
      `,
      // Compras de la semana
      prisma.compra.aggregate({
        where: { fecha_hora: { gte: inicioSemana } },
        _sum: { monto_total: true },
        _count: true,
      }),
      // Productos con stock bajo (≤ 5)
      prisma.producto.findMany({
        where: { activo: true, existencia: { lte: 5 } },
        select: { id: true, nombre: true, existencia: true },
        orderBy: { existencia: 'asc' },
        take: 10,
      }),
    ])

  const montoHoy = Number(ventasHoy._sum.monto_total ?? 0)
  const montoAyer = Number(ventasAyer._sum.monto_total ?? 0)
  const deltaPct = montoAyer === 0
    ? (montoHoy > 0 ? 100 : 0)
    : ((montoHoy - montoAyer) / montoAyer) * 100

  return reply.send({
    ventas_hoy: { monto: montoHoy, cantidad: ventasHoy._count },
    ventas_ayer: { monto: montoAyer, cantidad: ventasAyer._count },
    delta_pct: Math.round(deltaPct * 100) / 100,
    ventas_semana: {
      monto: ventasSemana.reduce((acc, r) => acc + Number(r.monto), 0),
      por_dia: ventasSemana.map((r) => ({
        fecha: r.fecha,
        monto: Number(r.monto),
        cantidad: Number(r.cantidad),
      })),
    },
    compras_semana: {
      monto: Number(comprasSemana._sum.monto_total ?? 0),
      cantidad: comprasSemana._count,
    },
    productos_stock_bajo: stockBajo.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      existencia: Number(p.existencia),
    })),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /reportes/ventas?desde=&hasta=
// ─────────────────────────────────────────────────────────────────────────────
export async function reporteVentasHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const periodo = parsePeriodo(request.query, reply)
  if (!periodo) return

  const prisma = request.server.prisma

  const [agregado, porDia, porVendedor] = await Promise.all([
    // KPIs globales
    prisma.venta.aggregate({
      where: { fecha_hora: { gte: periodo.desde, lte: periodo.hasta } },
      _sum: { monto_total: true },
      _count: true,
    }),
    // Por día
    prisma.$queryRaw<Array<{ fecha: string; monto: number; cantidad: bigint }>>`
      SELECT DATE(fecha_hora) as fecha,
             SUM(monto_total) as monto,
             COUNT(*) as cantidad
      FROM ventas
      WHERE fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
      GROUP BY DATE(fecha_hora)
      ORDER BY fecha ASC
    `,
    // Por vendedor
    prisma.$queryRaw<Array<{
      username: string; nombre_completo: string;
      monto: number; cantidad: bigint;
    }>>`
      SELECT u.username, u.nombre_completo,
             SUM(v.monto_total) as monto,
             COUNT(*) as cantidad
      FROM ventas v
      JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
      GROUP BY v.usuario_id, u.username, u.nombre_completo
      ORDER BY monto DESC
    `,
  ])

  const totalMonto = Number(agregado._sum.monto_total ?? 0)
  const totalCantidad = agregado._count

  return reply.send({
    total_ventas: totalMonto,
    cantidad_transacciones: totalCantidad,
    ticket_promedio: totalCantidad > 0
      ? Math.round((totalMonto / totalCantidad) * 100) / 100
      : 0,
    por_dia: porDia.map((r) => ({
      fecha: r.fecha,
      monto: Number(r.monto),
      cantidad: Number(r.cantidad),
    })),
    por_vendedor: porVendedor.map((r) => {
      const monto = Number(r.monto)
      const cantidad = Number(r.cantidad)
      return {
        username: r.username,
        nombre_completo: r.nombre_completo,
        monto,
        cantidad,
        ticket_promedio: cantidad > 0 ? Math.round((monto / cantidad) * 100) / 100 : 0,
      }
    }),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /reportes/productos-top?desde=&hasta=&limit=10
// ─────────────────────────────────────────────────────────────────────────────
export async function productosTopHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const schema = periodoQuerySchema.extend({ limit: z.coerce.number().int().positive().default(10) })
  const parsed = validate(schema, request.query, reply)
  if (!parsed) return

  const desde = new Date(`${parsed.desde}T00:00:00`)
  const hasta = new Date(`${parsed.hasta}T23:59:59`)

  const resultados = await request.server.prisma.$queryRaw<Array<{
    producto_id: number; nombre: string; cantidad_total: number; monto_total: number;
  }>>`
    SELECT vd.producto_id,
           p.nombre,
           SUM(vd.cantidad) as cantidad_total,
           SUM(vd.total) as monto_total
    FROM venta_detalle vd
    JOIN ventas v ON v.id = vd.venta_id
    JOIN productos p ON p.id = vd.producto_id
    WHERE v.fecha_hora BETWEEN ${desde} AND ${hasta}
    GROUP BY vd.producto_id, p.nombre
    ORDER BY monto_total DESC
    LIMIT ${parsed.limit}
  `

  const totalGeneral = resultados.reduce((acc, r) => acc + Number(r.monto_total), 0)

  return reply.send(
    resultados.map((r) => ({
      producto_id: r.producto_id,
      nombre: r.nombre,
      cantidad_total: Number(r.cantidad_total),
      monto_total: Number(r.monto_total),
      porcentaje_del_total: totalGeneral > 0
        ? Math.round((Number(r.monto_total) / totalGeneral) * 10000) / 100
        : 0,
    }))
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /reportes/inventario?desde=&hasta=
// ─────────────────────────────────────────────────────────────────────────────
export async function inventarioHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const periodo = parsePeriodo(request.query, reply)
  if (!periodo) return

  const prisma = request.server.prisma

  // Productos activos con su existencia actual
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, existencia: true },
    orderBy: { nombre: 'asc' },
  })

  // Entradas (compras) en el período
  const entradas = await prisma.$queryRaw<Array<{ producto_id: number; entradas: number }>>`
    SELECT cd.producto_id, SUM(cd.cantidad) as entradas
    FROM compra_detalle cd
    JOIN compras c ON c.id = cd.compra_id
    WHERE c.fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
    GROUP BY cd.producto_id
  `

  // Salidas (ventas) en el período
  const salidas = await prisma.$queryRaw<Array<{ producto_id: number; salidas: number }>>`
    SELECT vd.producto_id, SUM(vd.cantidad) as salidas
    FROM venta_detalle vd
    JOIN ventas v ON v.id = vd.venta_id
    WHERE v.fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
    GROUP BY vd.producto_id
  `

  const entradasMap = new Map(entradas.map((e) => [e.producto_id, Number(e.entradas)]))
  const salidasMap = new Map(salidas.map((s) => [s.producto_id, Number(s.salidas)]))

  return reply.send(
    productos.map((p) => {
      const ent = entradasMap.get(p.id) ?? 0
      const sal = salidasMap.get(p.id) ?? 0
      return {
        producto_id: p.id,
        nombre: p.nombre,
        existencia_actual: Number(p.existencia),
        entradas: ent,
        salidas: sal,
        balance: ent - sal,
      }
    })
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /reportes/rentabilidad?desde=&hasta=
// ─────────────────────────────────────────────────────────────────────────────
export async function rentabilidadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const periodo = parsePeriodo(request.query, reply)
  if (!periodo) return

  const prisma = request.server.prisma

  // Ingresos por producto (ventas)
  const ingresos = await prisma.$queryRaw<Array<{
    producto_id: number; nombre: string; ingresos: number;
  }>>`
    SELECT vd.producto_id, p.nombre, SUM(vd.total) as ingresos
    FROM venta_detalle vd
    JOIN ventas v ON v.id = vd.venta_id
    JOIN productos p ON p.id = vd.producto_id
    WHERE v.fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
    GROUP BY vd.producto_id, p.nombre
  `

  // Costos por producto (compras en el mismo período)
  const costos = await prisma.$queryRaw<Array<{
    producto_id: number; costos: number;
  }>>`
    SELECT cd.producto_id, SUM(cd.total) as costos
    FROM compra_detalle cd
    JOIN compras c ON c.id = cd.compra_id
    WHERE c.fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
    GROUP BY cd.producto_id
  `

  const costosMap = new Map(costos.map((c) => [c.producto_id, Number(c.costos)]))

  const productos = ingresos.map((r) => {
    const ing = Number(r.ingresos)
    const cos = costosMap.get(r.producto_id) ?? 0
    const margen = ing - cos
    const margenPct = ing > 0 ? Math.round((margen / ing) * 10000) / 100 : 0
    return {
      producto_id: r.producto_id,
      nombre: r.nombre,
      ingresos: ing,
      costos: cos,
      margen,
      margen_pct: margenPct,
    }
  }).sort((a, b) => b.margen - a.margen)

  const totalIngresos = productos.reduce((acc, p) => acc + p.ingresos, 0)
  const totalCostos = productos.reduce((acc, p) => acc + p.costos, 0)
  const margenPromedioPct = totalIngresos > 0
    ? Math.round(((totalIngresos - totalCostos) / totalIngresos) * 10000) / 100
    : 0

  return reply.send({ margen_promedio_pct: margenPromedioPct, productos })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /reportes/compras?desde=&hasta=
// ─────────────────────────────────────────────────────────────────────────────
export async function reporteComprasHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const periodo = parsePeriodo(request.query, reply)
  if (!periodo) return

  const prisma = request.server.prisma

  const [agregado, porDia, porProveedor] = await Promise.all([
    prisma.compra.aggregate({
      where: { fecha_hora: { gte: periodo.desde, lte: periodo.hasta } },
      _sum: { monto_total: true },
      _count: true,
    }),
    prisma.$queryRaw<Array<{ fecha: string; monto: number; cantidad: bigint }>>`
      SELECT DATE(fecha_hora) as fecha,
             SUM(monto_total) as monto,
             COUNT(*) as cantidad
      FROM compras
      WHERE fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
      GROUP BY DATE(fecha_hora)
      ORDER BY fecha ASC
    `,
    prisma.$queryRaw<Array<{
      proveedor_nombre: string; monto_total: number; cantidad_ordenes: bigint;
    }>>`
      SELECT proveedor_nombre,
             SUM(monto_total) as monto_total,
             COUNT(*) as cantidad_ordenes
      FROM compras
      WHERE fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
      GROUP BY proveedor_nombre
      ORDER BY monto_total DESC
    `,
  ])

  return reply.send({
    total_compras: Number(agregado._sum.monto_total ?? 0),
    cantidad_ordenes: agregado._count,
    por_dia: porDia.map((r) => ({
      fecha: r.fecha,
      monto: Number(r.monto),
      cantidad: Number(r.cantidad),
    })),
    por_proveedor: porProveedor.map((r) => ({
      proveedor_nombre: r.proveedor_nombre,
      monto_total: Number(r.monto_total),
      cantidad_ordenes: Number(r.cantidad_ordenes),
    })),
  })
}
```

---

## 3. Nota sobre rentabilidad estimada

El reporte de rentabilidad es una **estimación** porque compara:
- Ingresos de ventas del período vs costos de compras del mismo período

No es un costo de ventas (COGS) exacto ya que no rastrea qué unidad específica
se compró y se vendió. Se documenta como estimado en la UI (ver SKILL-27).

---

## 4. Rendimiento

Todos los endpoints usan los índices definidos en SKILL-04:
- `idx_ventas_fecha` — filtros por `fecha_hora` en ventas
- `idx_compras_fecha` — filtros por `fecha_hora` en compras
- `idx_venta_detalle_producto` — JOINs en productos top e inventario
- `idx_compra_detalle_producto` — JOINs en inventario y rentabilidad

Objetivo: < 2 segundos con 6 meses de datos. Si una query supera este tiempo,
agregar `EXPLAIN` para identificar full table scans y ajustar índices.
