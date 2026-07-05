---
name: prisma-mysql
description: |
  Define y gestiona el schema completo de Prisma para JoyasPOS con MySQL 8,
  incluyendo todas las tablas, relaciones FK, índices de rendimiento y el flujo
  de migraciones. Usar al crear el schema inicial, al agregar o modificar tablas
  (productos, ventas, compras, proveedores, usuarios), al ejecutar migraciones en
  desarrollo o producción, o al necesitar consultar la estructura de datos correcta
  antes de escribir queries Prisma. También usar como referencia cuando se necesite
  escribir transacciones atómicas con prisma.$transaction().
  Depende de SKILL-03 (fastify-project-structure).
---

# SKILL-04 — Prisma + MySQL (apps/api)

## Stack
Prisma 5 · MySQL 8 · VPS Oracle Linux · utf8mb4

---

## 1. Instalación

```bash
# Desde la raíz del monorepo
pnpm --filter api add @prisma/client
pnpm --filter api add -D prisma

# Inicializar Prisma (solo la primera vez)
pnpm --filter api exec prisma init --datasource-provider mysql
```

Esto crea `apps/api/prisma/schema.prisma` y agrega `DATABASE_URL` en `.env`.

---

## 2. Schema completo

### `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// USUARIOS
// ─────────────────────────────────────────────
model Usuario {
  id             Int       @id @default(autoincrement())
  username       String    @unique @db.VarChar(50)
  password_hash  String    @db.VarChar(255)
  nombre_completo String?  @db.VarChar(100)
  rol            Rol       @default(vendedor)
  activo         Boolean   @default(true)
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  ventas         Venta[]
  compras        Compra[]

  @@map("usuarios")
}

enum Rol {
  admin
  vendedor
}

// ─────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────
model Producto {
  id             Int       @id @default(autoincrement())
  nombre         String    @unique @db.VarChar(150)
  unidad_medida  String    @db.VarChar(30)
  existencia     Decimal   @default(0) @db.Decimal(10, 2)
  activo         Boolean   @default(true)
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  venta_detalles VentaDetalle[]
  compra_detalles CompraDetalle[]

  @@map("productos")
}

// ─────────────────────────────────────────────
// VENTAS (cabecera)
// ─────────────────────────────────────────────
model Venta {
  id             Int       @id @default(autoincrement())
  nombre_cliente String    @default("Clientes Varios") @db.VarChar(100)
  monto_total    Decimal   @db.Decimal(10, 2)
  fecha_hora     DateTime
  usuario_id     Int
  created_at     DateTime  @default(now())

  usuario        Usuario   @relation(fields: [usuario_id], references: [id])
  detalles       VentaDetalle[]

  @@index([fecha_hora], name: "idx_ventas_fecha")
  @@index([usuario_id], name: "idx_ventas_usuario")
  @@map("ventas")
}

// ─────────────────────────────────────────────
// VENTA_DETALLE
// ─────────────────────────────────────────────
model VentaDetalle {
  id              Int      @id @default(autoincrement())
  venta_id        Int
  producto_id     Int
  detalle         String   @db.VarChar(255)
  cantidad        Decimal  @db.Decimal(10, 2)
  precio_unitario Decimal  @db.Decimal(10, 2)
  total           Decimal  @db.Decimal(10, 2)

  venta           Venta    @relation(fields: [venta_id], references: [id], onDelete: Cascade)
  producto        Producto @relation(fields: [producto_id], references: [id])

  @@index([venta_id],    name: "idx_venta_detalle_venta")
  @@index([producto_id], name: "idx_venta_detalle_producto")
  @@map("venta_detalle")
}

// ─────────────────────────────────────────────
// PROVEEDORES
// ─────────────────────────────────────────────
model Proveedor {
  id         Int      @id @default(autoincrement())
  nombre     String   @db.VarChar(150)
  contacto   String?  @db.VarChar(100)
  telefono   String?  @db.VarChar(20)
  direccion  String?  @db.VarChar(255)
  activo     Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  compras    Compra[]

  @@map("proveedores")
}

// ─────────────────────────────────────────────
// COMPRAS (cabecera)
// ─────────────────────────────────────────────
model Compra {
  id               Int       @id @default(autoincrement())
  proveedor_id     Int?
  proveedor_nombre String    @db.VarChar(150)
  monto_total      Decimal   @db.Decimal(10, 2)
  fecha_hora       DateTime
  notas            String?   @db.Text
  usuario_id       Int
  created_at       DateTime  @default(now())

  proveedor        Proveedor? @relation(fields: [proveedor_id], references: [id])
  usuario          Usuario    @relation(fields: [usuario_id], references: [id])
  detalles         CompraDetalle[]

  @@index([fecha_hora],   name: "idx_compras_fecha")
  @@index([proveedor_id], name: "idx_compras_proveedor")
  @@map("compras")
}

// ─────────────────────────────────────────────
// COMPRA_DETALLE
// ─────────────────────────────────────────────
model CompraDetalle {
  id             Int      @id @default(autoincrement())
  compra_id      Int
  producto_id    Int
  cantidad       Decimal  @db.Decimal(10, 2)
  costo_unitario Decimal  @db.Decimal(10, 2)
  total          Decimal  @db.Decimal(10, 2)

  compra         Compra   @relation(fields: [compra_id], references: [id], onDelete: Cascade)
  producto       Producto @relation(fields: [producto_id], references: [id])

  @@index([compra_id],    name: "idx_compra_detalle_compra")
  @@index([producto_id],  name: "idx_compra_detalle_producto")
  @@map("compra_detalle")
}
```

---

## 3. Flujo de migraciones

### Desarrollo (primera migración)
```bash
# Generar migración a partir del schema
pnpm --filter api exec prisma migrate dev --name init

# Esto crea: prisma/migrations/TIMESTAMP_init/migration.sql
# Y ejecuta la migración en la BD de desarrollo
```

### Desarrollo (cambios posteriores)
```bash
# Modificar schema.prisma, luego:
pnpm --filter api exec prisma migrate dev --name descripcion_del_cambio
```

### Producción
```bash
# NUNCA ejecutar migrate dev en producción
pnpm --filter api exec prisma migrate deploy
```

### Regenerar cliente Prisma (tras cambios al schema)
```bash
pnpm --filter api exec prisma generate
```

### Ver estado de migraciones
```bash
pnpm --filter api exec prisma migrate status
```

### Explorar la BD en desarrollo
```bash
pnpm --filter api exec prisma studio
```

---

## 4. Reglas críticas de migraciones

1. **Nunca editar archivos dentro de `prisma/migrations/`** — son inmutables.
2. **Nunca usar `prisma db push` en producción** — solo `prisma migrate deploy`.
3. **Nunca usar `prisma migrate reset` en producción** — destruye todos los datos.
4. **Siempre commitear `prisma/migrations/`** al control de versiones.
5. **El archivo `schema.prisma` siempre refleja el estado actual** de la BD.

---

## 5. Patrón de transacciones atómicas

Toda operación que toca más de una tabla DEBE usar `prisma.$transaction`:

### Ejemplo — Registrar venta (cabecera + detalle + descontar existencias)
```typescript
import { PrismaClient } from '@prisma/client'

async function registrarVenta(
  prisma: PrismaClient,
  data: {
    nombre_cliente: string
    fecha_hora: Date
    usuario_id: number
    items: Array<{
      producto_id: number
      detalle: string
      cantidad: number
      precio_unitario: number
    }>
  }
) {
  const monto_total = data.items.reduce(
    (acc, item) => acc + item.cantidad * item.precio_unitario,
    0
  )

  return await prisma.$transaction(async (tx) => {
    // 1. Crear la cabecera de venta
    const venta = await tx.venta.create({
      data: {
        nombre_cliente: data.nombre_cliente,
        monto_total,
        fecha_hora: data.fecha_hora,
        usuario_id: data.usuario_id,
      },
    })

    // 2. Crear los detalles
    await tx.ventaDetalle.createMany({
      data: data.items.map((item) => ({
        venta_id: venta.id,
        producto_id: item.producto_id,
        detalle: item.detalle,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        total: item.cantidad * item.precio_unitario,
      })),
    })

    // 3. Descontar existencias por cada ítem
    for (const item of data.items) {
      await tx.producto.update({
        where: { id: item.producto_id },
        data: { existencia: { decrement: item.cantidad } },
      })
    }

    return venta
  })
}
```

### Ejemplo — Registrar compra (cabecera + detalle + incrementar existencias)
```typescript
return await prisma.$transaction(async (tx) => {
  const compra = await tx.compra.create({ data: { ...cabecera } })

  await tx.compraDetalle.createMany({
    data: items.map((item) => ({
      compra_id: compra.id,
      ...item,
      total: item.cantidad * item.costo_unitario,
    })),
  })

  for (const item of items) {
    await tx.producto.update({
      where: { id: item.producto_id },
      data: { existencia: { increment: item.cantidad } },
    })
  }

  return compra
})
```

---

## 6. Queries de reportes frecuentes

### Ventas por día en un período
```typescript
const resultado = await prisma.$queryRaw<
  Array<{ fecha: Date; monto: number; cantidad: number }>
>`
  SELECT
    DATE(fecha_hora) AS fecha,
    SUM(monto_total) AS monto,
    COUNT(*) AS cantidad
  FROM ventas
  WHERE fecha_hora BETWEEN ${desde} AND ${hasta}
  GROUP BY DATE(fecha_hora)
  ORDER BY fecha ASC
`
```

### Top productos más vendidos
```typescript
const topProductos = await prisma.ventaDetalle.groupBy({
  by: ['producto_id'],
  where: {
    venta: { fecha_hora: { gte: desde, lte: hasta } },
  },
  _sum: { total: true, cantidad: true },
  orderBy: { _sum: { total: 'desc' } },
  take: limit,
})
```

### Movimiento de inventario (entradas compras + salidas ventas)
```typescript
// Entradas (compras)
const entradas = await prisma.compraDetalle.groupBy({
  by: ['producto_id'],
  where: { compra: { fecha_hora: { gte: desde, lte: hasta } } },
  _sum: { cantidad: true },
})

// Salidas (ventas)
const salidas = await prisma.ventaDetalle.groupBy({
  by: ['producto_id'],
  where: { venta: { fecha_hora: { gte: desde, lte: hasta } } },
  _sum: { cantidad: true },
})
```

---

## 7. Soft delete — patrón estándar

Nunca usar `prisma.X.delete()`. Siempre:

```typescript
// Desactivar producto
await prisma.producto.update({
  where: { id },
  data: { activo: false },
})

// Filtrar solo activos en listados
const productos = await prisma.producto.findMany({
  where: { activo: true },
  orderBy: { nombre: 'asc' },
})
```

---

## 8. Tipos Decimal de Prisma

Prisma representa `DECIMAL` de MySQL como `Prisma.Decimal`, no como `number`.
Al devolver en la API, convertir a número:

```typescript
// Al construir la respuesta JSON:
{
  monto_total: Number(venta.monto_total),
  existencia: Number(producto.existencia),
}
```

O configurar el cliente para que devuelva números directamente si se prefiere.

---

## 9. Verificar que la conexión MySQL funciona

```bash
# Probar conexión antes de hacer migrate
pnpm --filter api exec prisma db pull
# Si muestra el schema inferido de la BD, la conexión funciona
```

---

## 10. Siguiente paso

Con el schema y la primera migración lista:
- **SKILL-05** (`fastify-auth-jwt`) — Implementar autenticación
- **SKILL-06** (`fastify-zod-validation`) — Validación de inputs
- **SKILL-07** (`api-ventas-sync`) — Módulo de ventas con sync batch
