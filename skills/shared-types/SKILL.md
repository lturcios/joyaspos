---
name: shared-types
description: |
  Define y mantiene todos los tipos TypeScript compartidos entre la API (Fastify)
  y el panel web (React) del proyecto JoyasPOS, en el paquete @joyaspos/shared-types.
  Usar SIEMPRE al crear un nuevo endpoint de la API o una nueva pantalla del panel
  web que consuma datos de la API: primero se definen los tipos aquí, luego se
  importan en ambos lados. También usar cuando se modifique el modelo de datos
  (PRD sección 6) o cuando haya desincronización de tipos entre api y web.
  Depende de SKILL-01 (monorepo-setup) que debe estar completado.
---

> **⚠️ MULTITENANCY — LEER PRIMERO `skills/multitenancy-empresa-sucursal/SKILL.md`.**
> Esta skill fue escrita antes del requisito multiempresa/multisucursal. La skill
> de multitenancy define deltas OBLIGATORIOS que modifican el código de esta skill
> (campos `empresa_id`/`sucursal_id`, JWT extendido, scoping por sucursal en todos
> los queries, selector de sucursal, aislamiento de datos locales). Donde ambas
> se contradigan, gana la skill de multitenancy.


# SKILL-02 — Shared Types (@joyaspos/shared-types)

## Principio fundamental

`packages/shared-types` es la **única fuente de verdad** para los contratos
de datos entre API y Web. Nunca se duplican interfaces en `apps/api` ni en
`apps/web`. Si un tipo solo lo usa la API internamente (ej. tipos de Prisma),
NO va aquí.

---

## 1. Estructura de archivos

```
packages/shared-types/src/
├── index.ts              # re-exporta todo
├── types/
│   ├── auth.ts           # login, JWT payload, user session
│   ├── productos.ts      # producto, ingreso de existencias
│   ├── ventas.ts         # venta cabecera, detalle, sync batch
│   ├── compras.ts        # compra, detalle, proveedor
│   └── reportes.ts       # todos los DTOs de respuesta de reportes
└── enums/
    ├── roles.ts          # Rol enum
    └── periodos.ts       # PeriodoAtajo enum (para el filtro de período)
```

---

## 2. Enums

### `src/enums/roles.ts`
```typescript
export enum Rol {
  ADMIN = 'admin',
  VENDEDOR = 'vendedor',
}
```

### `src/enums/periodos.ts`
```typescript
export enum PeriodoAtajo {
  HOY = 'hoy',
  ESTA_SEMANA = 'esta_semana',
  ESTA_QUINCENA = 'esta_quincena',
  ESTE_MES = 'este_mes',
  PERSONALIZADO = 'personalizado',
}
```

---

## 3. Auth types

### `src/types/auth.ts`
```typescript
import { Rol } from '../enums/roles'

// DTO de request al login
export interface LoginRequest {
  username: string
  password: string
}

// Payload dentro del JWT
export interface JwtPayload {
  sub: number        // usuario id
  username: string
  rol: Rol
  iat?: number
  exp?: number
}

// Usuario devuelto tras login exitoso
export interface UserSession {
  id: number
  username: string
  nombre_completo: string
  rol: Rol
}

// Response completo del endpoint POST /auth/login
export interface LoginResponse {
  token: string
  user: UserSession
}
```

---

## 4. Productos types

### `src/types/productos.ts`
```typescript
// Producto tal como lo devuelve GET /productos
export interface Producto {
  id: number
  nombre: string
  unidad_medida: string
  existencia: number
  activo: boolean
}

// Body para POST /productos
export interface CreateProductoRequest {
  nombre: string
  unidad_medida: string
  existencia?: number
}

// Body para PUT /productos/:id
export interface UpdateProductoRequest {
  nombre?: string
  unidad_medida?: string
}

// Body para POST /productos/:id/ingreso
export interface IngresoExistenciaRequest {
  cantidad: number    // debe ser > 0
}

// Response de ingreso exitoso
export interface IngresoExistenciaResponse {
  id: number
  nombre: string
  existencia_anterior: number
  existencia_nueva: number
}
```

---

## 5. Ventas types

### `src/types/ventas.ts`
```typescript
// Item individual dentro de una venta (request)
export interface VentaItemRequest {
  producto_id: number
  cantidad: number          // > 0
  precio_unitario: number   // > 0
  detalle_adicional?: string | null
}

// Body para POST /ventas
export interface CreateVentaRequest {
  nombre_cliente?: string | null
  fecha_hora?: string       // ISO 8601; si no se envía, la API usa NOW()
  items: VentaItemRequest[]
}

// Item devuelto en respuesta de venta
export interface VentaDetalleItem {
  id: number
  producto_id: number
  detalle: string           // "{nombre_producto} {detalle_adicional}".trim()
  cantidad: number
  precio_unitario: number
  total: number
}

// Venta completa (response POST /ventas y GET /ventas/:id)
export interface Venta {
  id: number
  nombre_cliente: string
  monto_total: number
  fecha_hora: string        // ISO 8601
  usuario_id: number
  vendedor?: string         // username del vendedor (en listados)
  items?: VentaDetalleItem[]
}

// Item en el listado de ventas (GET /ventas — sin detalle)
export interface VentaResumen {
  id: number
  nombre_cliente: string
  monto_total: number
  fecha_hora: string
  vendedor: string
}

// --- SYNC BATCH (offline → online) ---

// Payload de una venta pendiente enviada por la app
export interface VentaSyncPayload extends CreateVentaRequest {
  local_id: number          // ID local en Room (para mapeo de respuesta)
}

// Body para POST /ventas/sync
export interface SyncVentasRequest {
  ventas: VentaSyncPayload[]
}

// Resultado por venta en el sync
export interface SyncResultItem {
  local_id: number
  remote_id: number
}

// Response de POST /ventas/sync
export interface SyncVentasResponse {
  sincronizadas: SyncResultItem[]
  errores: Array<{ local_id: number; mensaje: string }>
}

// Query params para GET /ventas
export interface VentasPeriodoQuery {
  desde: string   // YYYY-MM-DD
  hasta: string   // YYYY-MM-DD
}
```

---

## 6. Compras types

### `src/types/compras.ts`
```typescript
// Proveedor
export interface Proveedor {
  id: number
  nombre: string
  contacto?: string
  telefono?: string
  direccion?: string
  activo: boolean
}

export interface CreateProveedorRequest {
  nombre: string
  contacto?: string
  telefono?: string
  direccion?: string
}

export interface UpdateProveedorRequest {
  nombre?: string
  contacto?: string
  telefono?: string
  direccion?: string
}

// Ítem de compra (request)
export interface CompraItemRequest {
  producto_id: number
  cantidad: number        // > 0
  costo_unitario: number  // > 0
}

// Body para POST /compras
// Regla: al menos uno de proveedor_id o proveedor_nombre debe estar presente
export interface CreateCompraRequest {
  proveedor_id?: number | null
  proveedor_nombre?: string | null
  notas?: string | null
  fecha_hora?: string     // ISO 8601; si no se envía, API usa NOW()
  items: CompraItemRequest[]
}

// Ítem devuelto en respuesta de compra
export interface CompraDetalleItem {
  id: number
  producto_id: number
  nombre_producto: string
  cantidad: number
  costo_unitario: number
  total: number
}

// Compra completa
export interface Compra {
  id: number
  proveedor_id?: number | null
  proveedor_nombre: string
  monto_total: number
  fecha_hora: string
  notas?: string | null
  registrado_por: string    // username del admin
  items?: CompraDetalleItem[]
}

// Compra en el listado (sin detalle)
export interface CompraResumen {
  id: number
  proveedor_nombre: string
  monto_total: number
  fecha_hora: string
  registrado_por: string
}
```

---

## 7. Reportes types

### `src/types/reportes.ts`
```typescript
// --- Reporte Ventas por Período (GET /reportes/ventas) ---
export interface ReporteVentasPorDia {
  fecha: string         // YYYY-MM-DD
  monto: number
  cantidad: number
}

export interface ReporteVentasPorVendedor {
  username: string
  nombre_completo: string
  monto: number
  cantidad: number
  ticket_promedio: number
}

export interface ReporteVentas {
  total_ventas: number
  cantidad_transacciones: number
  ticket_promedio: number
  por_dia: ReporteVentasPorDia[]
  por_vendedor: ReporteVentasPorVendedor[]
}

// --- Top Productos (GET /reportes/productos-top) ---
export interface ReporteProductoTop {
  producto_id: number
  nombre: string
  cantidad_total: number
  monto_total: number
  porcentaje_del_total: number
}

// --- Movimiento de Inventario (GET /reportes/inventario) ---
export interface ReporteMovimientoProducto {
  producto_id: number
  nombre: string
  existencia_actual: number
  entradas: number      // suma de compras en el período
  salidas: number       // suma de ventas en el período
  balance: number       // entradas - salidas
}

// --- Rentabilidad (GET /reportes/rentabilidad) ---
export interface ReporteRentabilidadProducto {
  producto_id: number
  nombre: string
  ingresos: number      // suma precio_unitario * cantidad de ventas
  costos: number        // suma costo_unitario * cantidad de compras
  margen: number        // ingresos - costos
  margen_pct: number    // (margen / ingresos) * 100
}

export interface ReporteRentabilidad {
  margen_promedio_pct: number
  productos: ReporteRentabilidadProducto[]
}

// --- Dashboard (GET /reportes/dashboard) ---
export interface ReporteDashboard {
  ventas_hoy: { monto: number; cantidad: number }
  ventas_ayer: { monto: number; cantidad: number }
  delta_pct: number             // ((hoy - ayer) / ayer) * 100
  ventas_semana: {
    monto: number
    por_dia: ReporteVentasPorDia[]
  }
  compras_semana: { monto: number; cantidad: number }
  productos_stock_bajo: Array<{  // existencia <= 5
    id: number
    nombre: string
    existencia: number
  }>
  top_productos_hoy: ReporteProductoTop[]
}

// --- Compras por Período (GET /reportes/compras) ---
export interface ReporteComprasPorDia {
  fecha: string
  monto: number
  cantidad: number
}

export interface ReporteComprasPorProveedor {
  proveedor_nombre: string
  monto_total: number
  cantidad_ordenes: number
}

export interface ReporteCompras {
  total_compras: number
  cantidad_ordenes: number
  por_dia: ReporteComprasPorDia[]
  por_proveedor: ReporteComprasPorProveedor[]
}

// --- Query params reutilizables ---
export interface PeriodoQuery {
  desde: string   // YYYY-MM-DD
  hasta: string   // YYYY-MM-DD
}
```

---

## 8. Usuarios types (solo para uso del panel web)

Agregar en un archivo separado `src/types/usuarios.ts`:

```typescript
import { Rol } from '../enums/roles'

export interface Usuario {
  id: number
  username: string
  nombre_completo: string
  rol: Rol
  activo: boolean
}

export interface CreateUsuarioRequest {
  username: string
  password: string
  nombre_completo: string
  rol: Rol
}

export interface UpdateUsuarioRequest {
  nombre_completo?: string
  rol?: Rol
  activo?: boolean
}

export interface ChangePasswordRequest {
  password: string  // mínimo 6 caracteres
}
```

Agregar la exportación en `index.ts`:
```typescript
export * from './types/usuarios'
export * from './enums/roles'
export * from './enums/periodos'
```

---

## 9. `index.ts` completo final

```typescript
// Enums
export * from './enums/roles'
export * from './enums/periodos'

// Types
export * from './types/auth'
export * from './types/productos'
export * from './types/ventas'
export * from './types/compras'
export * from './types/reportes'
export * from './types/usuarios'
```

---

## 10. Cómo consumir desde api y web

### En `apps/api`
```bash
pnpm --filter api add @joyaspos/shared-types
```
```typescript
import type { CreateVentaRequest, Venta } from '@joyaspos/shared-types'
```

### En `apps/web`
```bash
pnpm --filter web add @joyaspos/shared-types
```
```typescript
import type { Producto, ReporteDashboard } from '@joyaspos/shared-types'
```

---

## 11. Reglas de mantenimiento

1. **Agregar tipo aquí ANTES de implementar el endpoint o la pantalla** que lo usa.
2. **Nunca duplicar** interfaces entre `apps/api/src` y `apps/web/src`.
3. **Los tipos Prisma internos** (modelos generados por `prisma generate`) son privados de la API y NO van en shared-types.
4. **Siempre exportar desde `index.ts`** — nunca importar directamente de un archivo interno del paquete.
5. **Tipos de error** tienen formato fijo en la API: `{ statusCode, error, message }` — no se tipan aquí, son del contrato HTTP.
6. Al renombrar o eliminar un tipo, buscar todas las importaciones en api y web antes de proceder.
