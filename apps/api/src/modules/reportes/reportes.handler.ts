import { FastifyRequest, FastifyReply } from 'fastify'
import { validate } from '../../shared/validate'
import { periodoQuerySchema } from '../../shared/schemas'
import { z } from 'zod'
import { parsePeriodo } from './reportes.util'

export async function dashboardHandler(request: FastifyRequest, reply: FastifyReply) {
  const prisma = request.server.prisma

  const hoy = new Date()
  const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0))
  const finHoy = new Date(new Date().setHours(23, 59, 59, 999))

  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  const inicioAyer = new Date(ayer.setHours(0, 0, 0, 0))
  const finAyer = new Date(new Date(inicioAyer).setHours(23, 59, 59, 999))

  const inicioSemana = new Date()
  inicioSemana.setDate(inicioSemana.getDate() - ((inicioSemana.getDay() + 6) % 7))
  inicioSemana.setHours(0, 0, 0, 0)

  const [ventasHoy, ventasAyer, ventasSemana, comprasSemana, stockBajo, topHoy] = await Promise.all([
    prisma.venta.aggregate({
      where: { fecha_hora: { gte: inicioHoy, lte: finHoy } },
      _sum: { monto_total: true },
      _count: true,
    }),
    prisma.venta.aggregate({
      where: { fecha_hora: { gte: inicioAyer, lte: finAyer } },
      _sum: { monto_total: true },
      _count: true,
    }),
    prisma.$queryRaw<Array<{ fecha: string; monto: number; cantidad: bigint }>>`
      SELECT DATE(fecha_hora) as fecha,
             SUM(monto_total) as monto,
             COUNT(*) as cantidad
      FROM ventas
      WHERE fecha_hora >= ${inicioSemana}
      GROUP BY DATE(fecha_hora)
      ORDER BY fecha ASC
    `,
    prisma.compra.aggregate({
      where: { fecha_hora: { gte: inicioSemana } },
      _sum: { monto_total: true },
      _count: true,
    }),
    prisma.producto.findMany({
      where: { activo: true, existencia: { lte: 5 } },
      select: { id: true, nombre: true, existencia: true },
      orderBy: { existencia: 'asc' },
      take: 10,
    }),
    prisma.$queryRaw<
      Array<{ producto_id: number; nombre: string; cantidad_total: number; monto_total: number }>
    >`
      SELECT vd.producto_id,
             p.nombre,
             SUM(vd.cantidad) as cantidad_total,
             SUM(vd.total) as monto_total
      FROM venta_detalle vd
      JOIN ventas v ON v.id = vd.venta_id
      JOIN productos p ON p.id = vd.producto_id
      WHERE v.fecha_hora >= ${inicioHoy} AND v.fecha_hora <= ${finHoy}
      GROUP BY vd.producto_id, p.nombre
      ORDER BY monto_total DESC
      LIMIT 5
    `,
  ])

  const montoHoy = Number(ventasHoy._sum.monto_total ?? 0)
  const montoAyer = Number(ventasAyer._sum.monto_total ?? 0)
  const deltaPct =
    montoAyer === 0
      ? montoHoy > 0 ? 100 : 0
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
    top_productos_hoy: (() => {
      const totalGeneral = topHoy.reduce((acc, r) => acc + Number(r.monto_total), 0)
      return topHoy.map((r) => ({
        producto_id: r.producto_id,
        nombre: r.nombre,
        cantidad_total: Number(r.cantidad_total),
        monto_total: Number(r.monto_total),
        porcentaje_del_total:
          totalGeneral > 0
            ? Math.round((Number(r.monto_total) / totalGeneral) * 10000) / 100
            : 0,
      }))
    })(),
  })
}

export async function reporteVentasHandler(request: FastifyRequest, reply: FastifyReply) {
  const periodo = parsePeriodo(request.query, reply)
  if (!periodo) return

  const prisma = request.server.prisma

  const [agregado, porDia, porVendedor] = await Promise.all([
    prisma.venta.aggregate({
      where: { fecha_hora: { gte: periodo.desde, lte: periodo.hasta } },
      _sum: { monto_total: true },
      _count: true,
    }),
    prisma.$queryRaw<Array<{ fecha: string; monto: number; cantidad: bigint }>>`
      SELECT DATE(fecha_hora) as fecha,
             SUM(monto_total) as monto,
             COUNT(*) as cantidad
      FROM ventas
      WHERE fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
      GROUP BY DATE(fecha_hora)
      ORDER BY fecha ASC
    `,
    prisma.$queryRaw<
      Array<{ username: string; nombre_completo: string; monto: number; cantidad: bigint }>
    >`
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
    ticket_promedio:
      totalCantidad > 0 ? Math.round((totalMonto / totalCantidad) * 100) / 100 : 0,
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

export async function productosTopHandler(request: FastifyRequest, reply: FastifyReply) {
  const schema = periodoQuerySchema.extend({
    limit: z.coerce.number().int().positive().default(10),
  })
  const parsed = validate(schema, request.query, reply)
  if (!parsed) return

  const desde = new Date(`${parsed.desde}T00:00:00`)
  const hasta = new Date(`${parsed.hasta}T23:59:59`)

  const resultados = await request.server.prisma.$queryRaw<
    Array<{ producto_id: number; nombre: string; cantidad_total: number; monto_total: number }>
  >`
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
      porcentaje_del_total:
        totalGeneral > 0
          ? Math.round((Number(r.monto_total) / totalGeneral) * 10000) / 100
          : 0,
    }))
  )
}

export async function inventarioHandler(request: FastifyRequest, reply: FastifyReply) {
  const periodo = parsePeriodo(request.query, reply)
  if (!periodo) return

  const prisma = request.server.prisma

  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, existencia: true },
    orderBy: { nombre: 'asc' },
  })

  const [entradas, salidas] = await Promise.all([
    prisma.$queryRaw<Array<{ producto_id: number; entradas: number }>>`
      SELECT cd.producto_id, SUM(cd.cantidad) as entradas
      FROM compra_detalle cd
      JOIN compras c ON c.id = cd.compra_id
      WHERE c.fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
      GROUP BY cd.producto_id
    `,
    prisma.$queryRaw<Array<{ producto_id: number; salidas: number }>>`
      SELECT vd.producto_id, SUM(vd.cantidad) as salidas
      FROM venta_detalle vd
      JOIN ventas v ON v.id = vd.venta_id
      WHERE v.fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
      GROUP BY vd.producto_id
    `,
  ])

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

export async function rentabilidadHandler(request: FastifyRequest, reply: FastifyReply) {
  const periodo = parsePeriodo(request.query, reply)
  if (!periodo) return

  const prisma = request.server.prisma

  const [ingresos, costos] = await Promise.all([
    prisma.$queryRaw<Array<{ producto_id: number; nombre: string; ingresos: number }>>`
      SELECT vd.producto_id, p.nombre, SUM(vd.total) as ingresos
      FROM venta_detalle vd
      JOIN ventas v ON v.id = vd.venta_id
      JOIN productos p ON p.id = vd.producto_id
      WHERE v.fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
      GROUP BY vd.producto_id, p.nombre
    `,
    prisma.$queryRaw<Array<{ producto_id: number; costos: number }>>`
      SELECT cd.producto_id, SUM(cd.total) as costos
      FROM compra_detalle cd
      JOIN compras c ON c.id = cd.compra_id
      WHERE c.fecha_hora BETWEEN ${periodo.desde} AND ${periodo.hasta}
      GROUP BY cd.producto_id
    `,
  ])

  const costosMap = new Map(costos.map((c) => [c.producto_id, Number(c.costos)]))

  const productos = ingresos
    .map((r) => {
      const ing = Number(r.ingresos)
      const cos = costosMap.get(r.producto_id) ?? 0
      const margen = ing - cos
      return {
        producto_id: r.producto_id,
        nombre: r.nombre,
        ingresos: ing,
        costos: cos,
        margen,
        margen_pct: ing > 0 ? Math.round((margen / ing) * 10000) / 100 : 0,
      }
    })
    .sort((a, b) => b.margen - a.margen)

  const totalIngresos = productos.reduce((acc, p) => acc + p.ingresos, 0)
  const totalCostos = productos.reduce((acc, p) => acc + p.costos, 0)
  const margenPromedioPct =
    totalIngresos > 0
      ? Math.round(((totalIngresos - totalCostos) / totalIngresos) * 10000) / 100
      : 0

  return reply.send({ margen_promedio_pct: margenPromedioPct, productos })
}

type KardexTipo = 'compra' | 'venta' | 'inventario_inicial'

interface KardexRow {
  correlativo: number
  tipo: KardexTipo
  fecha: string
  hora: string
  nombre_contraparte: string
  cantidad: number
  precio_unitario: number
  total: number
  nueva_existencia: number
}

export async function kardexHandler(request: FastifyRequest, reply: FastifyReply) {
  const { productoId } = request.params as { productoId: string }
  const id = parseInt(productoId, 10)
  if (isNaN(id) || id <= 0) return reply.status(400).send({ message: 'ID de producto inválido' })

  const prisma = request.server.prisma

  const producto = await prisma.producto.findUnique({
    where: { id },
    select: { id: true, nombre: true, existencia: true, created_at: true },
  })
  if (!producto) return reply.status(404).send({ message: `Producto con id ${id} no encontrado` })

  const movimientos = await prisma.$queryRaw<
    Array<{
      tipo: string
      fecha_hora: Date
      nombre_contraparte: string
      cantidad: number
      precio_unitario: number
      total: number
    }>
  >`
    SELECT
      'venta' AS tipo,
      v.fecha_hora,
      COALESCE(v.nombre_cliente, 'Clientes Varios') AS nombre_contraparte,
      vd.cantidad,
      vd.precio_unitario,
      vd.total
    FROM venta_detalle vd
    JOIN ventas v ON v.id = vd.venta_id
    WHERE vd.producto_id = ${id}

    UNION ALL

    SELECT
      'compra' AS tipo,
      c.fecha_hora,
      COALESCE(NULLIF(TRIM(c.proveedor_nombre), ''), 'Sin Nombre de Proveedor') AS nombre_contraparte,
      cd.cantidad,
      cd.costo_unitario AS precio_unitario,
      cd.total
    FROM compra_detalle cd
    JOIN compras c ON c.id = cd.compra_id
    WHERE cd.producto_id = ${id}

    ORDER BY fecha_hora ASC
  `

  const existenciaActual = Number(producto.existencia)
  let totalEntradas = 0
  let totalSalidas = 0
  for (const m of movimientos) {
    if (m.tipo === 'compra') totalEntradas += Number(m.cantidad)
    else totalSalidas += Number(m.cantidad)
  }

  const stockInicial = Math.max(0, Math.round((existenciaActual + totalSalidas - totalEntradas) * 10000) / 10000)
  const rows: KardexRow[] = []
  let balance = stockInicial
  let correlativo = 1

  if (stockInicial > 0) {
    const createdAt = new Date(producto.created_at)
    rows.push({
      correlativo: correlativo++,
      tipo: 'inventario_inicial',
      fecha: createdAt.toISOString().slice(0, 10),
      hora: createdAt.toTimeString().slice(0, 5),
      nombre_contraparte: 'Inventario inicial',
      cantidad: stockInicial,
      precio_unitario: 0,
      total: 0,
      nueva_existencia: stockInicial,
    })
  }

  for (const m of movimientos) {
    const cantidad = Number(m.cantidad)
    const esVenta = m.tipo === 'venta'
    balance = Math.round((esVenta ? balance - cantidad : balance + cantidad) * 10000) / 10000
    const dt = new Date(m.fecha_hora)

    rows.push({
      correlativo: correlativo++,
      tipo: m.tipo as KardexTipo,
      fecha: dt.toISOString().slice(0, 10),
      hora: dt.toTimeString().slice(0, 5),
      nombre_contraparte: m.nombre_contraparte,
      cantidad,
      precio_unitario: Number(m.precio_unitario),
      total: Number(m.total),
      nueva_existencia: balance,
    })
  }

  return reply.send({
    producto_id: producto.id,
    nombre: producto.nombre,
    existencia_actual: existenciaActual,
    rows,
  })
}

export async function reporteComprasHandler(request: FastifyRequest, reply: FastifyReply) {
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
    prisma.$queryRaw<
      Array<{ proveedor_nombre: string; monto_total: number; cantidad_ordenes: bigint }>
    >`
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
