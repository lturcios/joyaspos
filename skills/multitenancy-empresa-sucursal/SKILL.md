---
name: multitenancy-empresa-sucursal
description: |
  Arquitectura multiempresa (multi-tenant) y multisucursal de JoyasPOS. Define
  TODOS los deltas obligatorios sobre las demás skills: nuevas tablas empresas
  y sucursales, campos empresa_id/sucursal_id en usuarios/productos/proveedores/
  ventas/compras, JWT extendido, middleware de scoping por sucursal en la API,
  selector de sucursal en el panel web (admin), y aislamiento de datos por
  sucursal en la app Android (Room + sesión).
  LEER ESTA SKILL ANTES de: prisma-mysql, shared-types, fastify-auth-jwt,
  api-ventas-sync, api-compras-proveedores, api-reportes, room-database,
  datastore-preferences, zustand-auth-store, tanstack-query-axios. Donde esta
  skill contradiga a otra, ESTA SKILL GANA — las demás fueron escritas antes
  del requisito multiempresa.
  Modelo de negocio: un admin pertenece a una EMPRESA y administra todas sus
  SUCURSALES. Vendedores, productos, proveedores, compras y ventas pertenecen
  a UNA sucursal. Cada sucursal gestiona su propio catálogo — NO hay traslado
  de productos entre sucursales.
---

# SKILL-00M — Multiempresa + Multisucursal (todo el proyecto)

## Modelo de negocio

```
EMPRESA (tenant)
 ├── admin(es)                      ← pertenecen a la empresa, ven TODAS las sucursales
 ├── proveedores                    ← A NIVEL EMPRESA: un proveedor puede suministrar a varias sucursales
 └── SUCURSAL 1..N
      ├── vendedores                ← pertenecen a UNA sucursal
      ├── productos (catálogo propio, sin traslados entre sucursales)
      ├── compras                   ← por sucursal, pero referencian proveedores de la empresa
      └── ventas
```

**Reglas de oro (no negociables):**

1. **Datos por sucursal:** productos, ventas y compras tienen `sucursal_id`. **Proveedores son por EMPRESA** (`empresa_id`) — un mismo proveedor puede suministrar a varias sucursales.
2. **Un vendedor NUNCA elige su sucursal** — se deriva siempre de su JWT. Cualquier `sucursal_id` que envíe un cliente con rol vendedor se ignora.
3. **Un admin opera "en nombre de" una sucursal concreta para escrituras** — crear producto/compra requiere sucursal explícita, validada contra su `empresa_id`.
4. **Para lecturas/reportes, el admin puede omitir la sucursal** — la API responde el consolidado de toda la empresa.
5. **Jamás un query sin scope** — todo `findMany`/`SELECT` de datos operativos filtra por `sucursal_id`/`empresa_id` según corresponda. Un dato de la empresa A no debe poder verse desde la empresa B bajo ninguna combinación de parámetros.
6. **Las empresas se crean con el script parametrizado** `scripts/crear-empresa.ts` (ver sección 6) — no hay registro público de empresas en el MVP.
7. **El vendedor solo consulta las ventas del día actual** (móvil y API); el admin consulta el histórico completo con selector de período. La restricción se aplica en la UI Y en la API (defensa en profundidad).

---

## 1. Cambios al schema Prisma (delta sobre SKILL-04)

### Nuevos modelos

```prisma
model Empresa {
  id     Int     @id @default(autoincrement())
  nombre String  @unique @db.VarChar(150)
  activo Boolean @default(true)

  sucursales  Sucursal[]
  usuarios    Usuario[]
  proveedores Proveedor[]     // proveedores a nivel empresa

  creado_en DateTime @default(now())

  @@map("empresas")
}

model Sucursal {
  id         Int     @id @default(autoincrement())
  empresa_id Int
  nombre     String  @db.VarChar(150)
  direccion  String? @db.VarChar(255)
  telefono   String? @db.VarChar(20)
  activo     Boolean @default(true)

  empresa   Empresa    @relation(fields: [empresa_id], references: [id])
  usuarios  Usuario[]
  productos Producto[]
  ventas    Venta[]
  compras   Compra[]

  creado_en DateTime @default(now())

  @@unique([empresa_id, nombre])      // nombre único DENTRO de la empresa
  @@index([empresa_id], name: "idx_sucursales_empresa")
  @@map("sucursales")
}
```

### Modelos existentes — campos a agregar

```prisma
model Usuario {
  // ... campos existentes ...
  empresa_id  Int                    // NOT NULL — todo usuario pertenece a una empresa
  sucursal_id Int?                   // NULL = admin (opera sobre todas); NOT NULL = vendedor

  empresa  Empresa   @relation(fields: [empresa_id], references: [id])
  sucursal Sucursal? @relation(fields: [sucursal_id], references: [id])

  @@index([empresa_id],  name: "idx_usuarios_empresa")
  @@index([sucursal_id], name: "idx_usuarios_sucursal")
}

model Producto {
  // ... campos existentes ...
  sucursal_id Int                    // NOT NULL — catálogo por sucursal
  sucursal    Sucursal @relation(fields: [sucursal_id], references: [id])

  @@unique([sucursal_id, nombre])    // REEMPLAZA el unique global de nombre
  @@index([sucursal_id], name: "idx_productos_sucursal")
}

model Proveedor {
  // ... campos existentes ...
  empresa_id Int                     // A NIVEL EMPRESA — suministra a cualquier sucursal
  empresa    Empresa @relation(fields: [empresa_id], references: [id])

  @@unique([empresa_id, nombre])     // REEMPLAZA el unique global de nombre
  @@index([empresa_id], name: "idx_proveedores_empresa")
}

model Venta {
  // ... campos existentes ...
  sucursal_id Int
  sucursal    Sucursal @relation(fields: [sucursal_id], references: [id])

  @@index([sucursal_id, fecha_hora], name: "idx_ventas_sucursal_fecha")  // clave para reportes
}

model Compra {
  // ... campos existentes ...
  sucursal_id Int
  sucursal    Sucursal @relation(fields: [sucursal_id], references: [id])

  @@index([sucursal_id, fecha_hora], name: "idx_compras_sucursal_fecha")
}
```

> **Validación a nivel aplicación (Prisma no puede expresarla):** si
> `usuario.rol === 'vendedor'` entonces `sucursal_id` es obligatorio, y la
> sucursal debe pertenecer a `usuario.empresa_id`. Validar en el handler de
> creación/edición de usuarios.

### Seed actualizado

```typescript
// prisma/seed.ts — reemplaza el seed de SKILL-05
const empresa = await prisma.empresa.upsert({
  where: { nombre: 'Empresa Demo' },
  update: {},
  create: { nombre: 'Empresa Demo' },
})

const sucursal = await prisma.sucursal.upsert({
  where: { empresa_id_nombre: { empresa_id: empresa.id, nombre: 'Sucursal Central' } },
  update: {},
  create: { empresa_id: empresa.id, nombre: 'Sucursal Central' },
})

await prisma.usuario.upsert({
  where: { username: 'admin' },
  update: {},
  create: {
    username: 'admin',
    password_hash: await bcrypt.hash('admin123', 12),
    nombre_completo: 'Administrador',
    rol: 'admin',
    empresa_id: empresa.id,
    sucursal_id: null,          // admin NO tiene sucursal fija
  },
})
```

---

## 2. Cambios a los tipos compartidos (delta sobre SKILL-02)

```typescript
// src/entities/empresa.ts (NUEVO)
export interface Empresa {
  id: number
  nombre: string
  activo: boolean
}

export interface Sucursal {
  id: number
  empresa_id: number
  nombre: string
  direccion?: string | null
  telefono?: string | null
  activo: boolean
}

export interface CreateSucursalRequest {
  nombre: string
  direccion?: string
  telefono?: string
}
export type UpdateSucursalRequest = Partial<CreateSucursalRequest> & { activo?: boolean }

// src/auth.ts — JwtPayload EXTENDIDO
export interface JwtPayload {
  sub: number
  username: string
  rol: Rol
  empresa_id: number
  sucursal_id: number | null      // null = admin
}

// UserSession EXTENDIDO
export interface UserSession {
  id: number
  username: string
  nombre_completo: string
  rol: Rol
  empresa_id: number
  sucursal_id: number | null
  sucursal_nombre: string | null  // para mostrar en la UI sin otro fetch
}

// LoginResponse EXTENDIDO — el panel web necesita las sucursales del admin
export interface LoginResponse {
  token: string
  user: UserSession
  empresa: Empresa
  sucursales: Sucursal[]          // todas las de la empresa (admin) o solo la propia (vendedor)
}

// CreateUsuarioRequest EXTENDIDO
export interface CreateUsuarioRequest {
  username: string
  password: string
  nombre_completo: string
  rol: Rol
  sucursal_id?: number            // obligatorio si rol === 'vendedor'
}
```

---

## 3. API — Scoping por sucursal (delta sobre SKILL-05, 06, 07, 08, 09)

### 3.1 Decorador `resolveSucursal` — usar en TODOS los handlers de datos operativos

```typescript
// src/plugins/tenancy.ts (NUEVO)
import fp from 'fastify-plugin'
import { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtPayload } from '@joyaspos/shared-types'

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Resuelve la sucursal efectiva del request.
     *
     * VENDEDOR → siempre su sucursal del JWT. El input del cliente se IGNORA.
     * ADMIN    → sucursal_id del query/body; se valida que pertenezca a su empresa.
     *            - requerida=true  → 400 si no la envía (escrituras)
     *            - requerida=false → null si no la envía = consolidado (lecturas)
     *
     * Retorna number | null, o undefined si ya respondió un error.
     */
    resolveSucursal: (
      request: FastifyRequest,
      reply: FastifyReply,
      opts: { requerida: boolean }
    ) => Promise<number | null | undefined>
  }
}

export const tenancyPlugin = fp(async (fastify) => {
  fastify.decorate('resolveSucursal', async (request, reply, opts) => {
    const user = request.user as JwtPayload

    // Vendedor: sucursal SIEMPRE del token
    if (user.rol === 'vendedor') {
      if (!user.sucursal_id) {
        reply.status(403).send({
          statusCode: 403, error: 'Forbidden',
          message: 'Usuario vendedor sin sucursal asignada',
        })
        return undefined
      }
      return user.sucursal_id
    }

    // Admin: sucursal del input (query para GET, body para POST/PUT)
    const raw =
      (request.query as any)?.sucursal_id ??
      (request.body as any)?.sucursal_id
    const sucursalId = raw != null ? Number(raw) : null

    if (sucursalId == null) {
      if (opts.requerida) {
        reply.status(400).send({
          statusCode: 400, error: 'Bad Request',
          message: 'sucursal_id es requerido para esta operación',
        })
        return undefined
      }
      return null   // consolidado de toda la empresa
    }

    // Validar pertenencia a la empresa del admin — CRÍTICO para el aislamiento
    const sucursal = await fastify.prisma.sucursal.findFirst({
      where: { id: sucursalId, empresa_id: user.empresa_id, activo: true },
      select: { id: true },
    })
    if (!sucursal) {
      reply.status(404).send({
        statusCode: 404, error: 'Not Found',
        message: `Sucursal ${sucursalId} no encontrada en tu empresa`,
      })
      return undefined
    }
    return sucursalId
  })
})
```

Registrar en `app.ts` después de `authPlugin`.

### 3.2 Helper de filtro para consolidados

```typescript
// src/shared/tenancy.ts (NUEVO)
import { PrismaClient } from '@prisma/client'
import type { JwtPayload } from '@joyaspos/shared-types'

/**
 * Construye el filtro Prisma de sucursal para queries de lectura.
 * sucursalId concreto → { sucursal_id: X }
 * null (consolidado admin) → { sucursal: { empresa_id } } — todas las de SU empresa
 */
export function sucursalWhere(sucursalId: number | null, user: JwtPayload) {
  return sucursalId != null
    ? { sucursal_id: sucursalId }
    : { sucursal: { empresa_id: user.empresa_id } }
}
```

### 3.3 Patrón de uso en handlers existentes

```typescript
// LECTURA (GET /ventas, reportes...) — consolidado permitido para admin
const sucursalId = await request.server.resolveSucursal(request, reply, { requerida: false })
if (sucursalId === undefined) return
const ventas = await prisma.venta.findMany({
  where: {
    ...sucursalWhere(sucursalId, user),
    fecha_hora: { gte: ..., lte: ... },
  },
})

// ESCRITURA (POST /ventas, /productos, /compras...) — sucursal obligatoria
const sucursalId = await request.server.resolveSucursal(request, reply, { requerida: true })
if (sucursalId === undefined) return
await prisma.venta.create({ data: { ..., sucursal_id: sucursalId } })
```

**Aplicar este patrón (scoping por SUCURSAL) a:** productos (CRUD + ingreso existencia), ventas (crear, sync, listar, detalle), compras (crear, listar, detalle), y los 6 reportes. En los reportes con `$queryRaw`, agregar `AND v.sucursal_id IN (...)` o `AND v.sucursal_id = ?` según el caso — nunca dejar un raw query sin el filtro.

**Proveedores usan scoping por EMPRESA** (no por sucursal) — ver sección 3.8.

**Restricción de histórico para vendedor (GET /ventas):** si el rol es
vendedor, la API sobreescribe `desde`/`hasta` al día actual sin importar lo
que envíe el cliente — el vendedor solo consulta ventas de HOY. El admin
conserva el rango solicitado completo:

```typescript
// listVentasHandler — tras validar el periodoQuerySchema:
let { desde, hasta } = query
if (user.rol === 'vendedor') {
  const hoy = new Date().toISOString().slice(0, 10)   // YYYY-MM-DD
  desde = hoy
  hasta = hoy
}
```

### 3.4 Detalle por ID — validar pertenencia, no solo existencia

`GET /ventas/:id`, `GET /compras/:id`, `PUT /productos/:id`, etc. deben validar
que el recurso pertenece a la empresa del solicitante (y a la sucursal, si es
vendedor). Un 404 de otra empresa y un 404 real deben ser indistinguibles:

```typescript
const venta = await prisma.venta.findFirst({
  where: {
    id: params.id,
    ...(user.rol === 'vendedor'
      ? { sucursal_id: user.sucursal_id! }
      : { sucursal: { empresa_id: user.empresa_id } }),
  },
})
if (!venta) return reply.status(404).send({ ... })
```

### 3.5 Login extendido (delta sobre SKILL-05)

```typescript
// auth.handler.ts — tras validar credenciales:
const token = await reply.jwtSign({
  sub: usuario.id,
  username: usuario.username,
  rol: usuario.rol,
  empresa_id: usuario.empresa_id,
  sucursal_id: usuario.sucursal_id,   // null si admin
})

const sucursales = await prisma.sucursal.findMany({
  where: {
    empresa_id: usuario.empresa_id,
    activo: true,
    ...(usuario.rol === 'vendedor' ? { id: usuario.sucursal_id! } : {}),
  },
  orderBy: { nombre: 'asc' },
})

return reply.send({
  token,
  user: { ...datosPublicos, empresa_id, sucursal_id, sucursal_nombre },
  empresa: { id, nombre, activo },
  sucursales,
})
```

### 3.6 Nuevo módulo: Sucursales

| Método | Ruta | Rol | Notas |
|---|---|---|---|
| GET | /sucursales | auth | Admin: todas las de su empresa. Vendedor: solo la propia |
| POST | /sucursales | admin | `{nombre, direccion?, telefono?}` — empresa_id del JWT |
| PUT | /sucursales/:id | admin | Validar pertenencia a su empresa |
| DELETE | /sucursales/:id | admin | Soft delete. Rechazar (409) si tiene vendedores activos |

### 3.7 Usuarios (delta sobre el CRUD existente)

- Crear/editar vendedor: `sucursal_id` obligatorio, validar que pertenece a la empresa del admin.
- Listar usuarios: filtrar SIEMPRE por `empresa_id` del admin; opcionalmente por `?sucursal_id=`.
- Un admin no puede crear usuarios de otra empresa bajo ninguna combinación de inputs.

### 3.8 Proveedores por empresa (delta sobre SKILL-08)

Los proveedores NO usan `resolveSucursal` — su scope es la empresa del JWT:

```typescript
// GET /proveedores — todos los de la empresa, sin importar la sucursal activa
const proveedores = await prisma.proveedor.findMany({
  where: { empresa_id: user.empresa_id, activo: true },
  orderBy: { nombre: 'asc' },
})

// POST /proveedores — empresa del JWT, nunca del body
await prisma.proveedor.create({
  data: { ...body, empresa_id: user.empresa_id },
})

// PUT/DELETE /proveedores/:id — validar pertenencia a la empresa
const proveedor = await prisma.proveedor.findFirst({
  where: { id: params.id, empresa_id: user.empresa_id, activo: true },
})
if (!proveedor) return reply.status(404).send({ ... })
```

**En POST /compras:** el `proveedor_id` se valida contra `empresa_id` del
solicitante (no contra la sucursal):

```typescript
const proveedor = await prisma.proveedor.findFirst({
  where: { id: body.proveedor_id, empresa_id: user.empresa_id, activo: true },
})
```

Así un mismo proveedor puede aparecer en compras de cualquier sucursal de la
empresa. El reporte de compras "por proveedor" en consolidado agrupa
correctamente las compras de todas las sucursales al mismo proveedor.

---

## 4. App Android — Aislamiento por sucursal (delta sobre SKILL-11, 12, 13, 15, 19, 20)

La app la usan **vendedores Y administradores**, con capacidades distintas:

| Capacidad | Vendedor | Admin |
|---|---|---|
| Sucursal | Fija (del JWT) | La ELIGE al iniciar sesión (SucursalPicker) |
| Registrar ventas | ✅ En su sucursal | ✅ En la sucursal seleccionada |
| Consulta de ventas | **Solo el día actual** (sin selector de período) | Histórico completo con selector Hoy/Semana/Quincena/Mes |

### 4.1 SessionPreferences (delta sobre SKILL-19)

```kotlin
// PreferenceKeys — agregar:
val EMPRESA_ID = longPreferencesKey("empresa_id")
val SUCURSAL_ID = longPreferencesKey("sucursal_id")
val SUCURSAL_NOMBRE = stringPreferencesKey("sucursal_nombre")

// SessionPreferences.saveSession(...) — nuevos parámetros:
// empresaId: Long, sucursalId: Long, sucursalNombre: String
// SessionData — nuevos campos: empresaId, sucursalId, sucursalNombre
// Para el vendedor: sucursalId viene del LoginResponse.
// Para el admin: sucursalId se guarda DESPUÉS del SucursalPicker (4.3).
```

### 4.2 Limpieza de Room al cambiar de usuario/sucursal — CRÍTICO

Si en el mismo dispositivo inicia sesión un usuario que operará sobre OTRA
sucursal (u otra empresa), los productos y ventas locales del anterior NO
deben mezclarse ni filtrarse. Antes de guardar la nueva sucursal en sesión:

```kotlin
// Aplica tanto al login del vendedor como a la selección de sucursal del admin
val previoSucursalId = sessionPreferences.getSucursalId().firstOrNull()
val pendientes = ventaRepository.countPendientesOnce()

if (previoSucursalId != null && previoSucursalId != nuevaSucursalId) {
    if (pendientes > 0) {
        // BLOQUEAR el cambio: hay ventas sin sincronizar de la otra sucursal
        _uiState.value = Error(
            "Hay $pendientes venta(s) sin sincronizar de otra sucursal. " +
            "Conecta a internet y sincroniza antes de cambiar."
        )
        return@launch
    }
    joyasDatabase.clearAllTables()   // exponer via repository/DAO
}
```

> Nunca borrar tablas con ventas pendientes de sync — es pérdida de dinero real.
> El bloqueo con mensaje es el comportamiento correcto.

### 4.3 SucursalPicker para admin (nueva pantalla, delta sobre SKILL-15)

Nueva ruta `Routes.SUCURSAL_PICKER` entre Splash/Login y Home:

- **Vendedor** (LoginResponse trae `sucursal_id` no nulo): flujo actual — directo a HOME.
- **Admin** (`sucursal_id` null): tras login exitoso, navegar a `SUCURSAL_PICKER`
  con la lista `LoginResponse.sucursales`. Al seleccionar: aplicar la regla de
  limpieza de 4.2, guardar `sucursalId`/`sucursalNombre` en sesión, sincronizar
  productos de esa sucursal, navegar a HOME.
- En HOME, el admin ve un ícono/menú "Cambiar sucursal" que vuelve al picker
  (misma regla de limpieza 4.2).

```kotlin
// Splash routing actualizado:
// token null            → LOGIN
// token + sucursal null → SUCURSAL_PICKER  (admin sin sucursal elegida)
// token + sucursal      → HOME
```

### 4.4 Payloads de venta y sync del admin (delta sobre SKILL-12, 13, 14)

- **Vendedor:** los payloads NO cambian — el servidor deriva la sucursal del JWT.
- **Admin:** el JWT tiene `sucursal_id` null, así que `resolveSucursal({requerida:true})`
  espera la sucursal en el body. Incluir `sucursal_id` (de la sesión) en
  `CreateVentaRequest` y en cada `VentaSyncPayload` cuando el rol es admin:

```kotlin
// Mappers.kt / SyncWorker — leer rol y sucursal de SessionPreferences:
val sucursalIdParaApi = if (session.rol == "admin") session.sucursalId else null
// CreateVentaRequest(..., sucursalId = sucursalIdParaApi)  → @Json(name = "sucursal_id")
```

- **Sync de productos del admin:** `GET /productos?sucursal_id={session.sucursalId}`.
  El vendedor llama sin parámetro (el servidor usa su JWT).

### 4.5 Consulta de ventas restringida por rol (delta sobre SKILL-20)

```kotlin
// SalesQueryViewModel — exponer el rol:
val esAdmin: StateFlow<Boolean> = sessionPreferences.getSessionData()
    .map { it?.rol == "admin" }
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

// SalesQueryScreen:
// - esAdmin == true  → mostrar PeriodoSelector completo (comportamiento actual)
// - esAdmin == false → OCULTAR el PeriodoSelector; forzar período "hoy";
//   título de la pantalla: "Ventas de hoy"
```

> La restricción también se aplica en la API por defensa en profundidad:
> si el rol es vendedor y `desde`/`hasta` no corresponden al día actual,
> la API los sobreescribe al día actual (nunca confiar solo en la UI).

### 4.6 UI general (delta sobre SKILL-16)

- El `TopAppBar` de Home muestra `"{sucursalNombre} — {username}"` — el usuario siempre sabe en qué sucursal opera.
- El recibo (SKILL-18) agrega la línea de sucursal bajo el nombre del negocio: `printText("${data.sucursalNombre}\n", null)` — `sucursalNombre` entra a `ReceiptData` desde la sesión.

---

## 5. Panel Web — Selector de sucursal (delta sobre SKILL-22, 23, 30 y páginas)

### 5.1 authStore extendido (delta sobre SKILL-30)

```typescript
interface AuthState {
  token: string | null
  user: UserSession | null
  empresa: Empresa | null
  sucursales: Sucursal[]
  /**
   * Sucursal activa del admin. null = "Todas (consolidado)".
   * Para vendedor: siempre su propia sucursal, no editable.
   */
  sucursalActiva: number | null
  isAuthenticated: boolean

  login: (...) => ...   // guarda también empresa, sucursales, y setea sucursalActiva
  setSucursalActiva: (id: number | null) => void
  logout: () => void
}

// En login onSuccess:
//   vendedor → sucursalActiva = user.sucursal_id (fija)
//   admin    → sucursalActiva = null (arranca en "Todas las sucursales" —
//              la vista global es el punto de partida natural del admin)
// Persistir sucursalActiva en el partialize.
```

### 5.2 SucursalSelector en el Header (delta sobre SKILL-22)

```tsx
// src/components/layout/SucursalSelector.tsx (NUEVO)
// Select de shadcn/ui visible solo para admin, en el Header.
// La PRIMERA opción es SIEMPRE "Todas las sucursales" (value "all" →
// sucursalActiva = null) — presente en TODAS las vistas: dashboard,
// reportes, productos, existencias, ventas, compras y usuarios.
// Debajo: una opción por sucursal activa de la empresa.
// Para vendedor: texto estático con su sucursal (sin dropdown).
// Al cambiar: setSucursalActiva(...) — las queries se refrescan solas porque
// la sucursal es parte de las queryKeys (ver 5.3).
```

### 5.3 Hooks de datos (delta sobre SKILL-23)

**Regla:** `sucursalActiva` entra en TODAS las queryKeys y como parámetro
`sucursal_id` en todas las llamadas de datos operativos:

```typescript
export function useProductos() {
  const sucursalId = useAuthStore((s) => s.sucursalActiva)
  return useQuery({
    queryKey: [...queryKeys.productos.list(), { sucursalId }],
    queryFn: async () => {
      const { data } = await api.get<Producto[]>('/productos', {
        params: sucursalId != null ? { sucursal_id: sucursalId } : {},
      })
      return data
    },
  })
}
// Mismo patrón en useVentas, useCompras, useReportes y useUsuarios.
// EXCEPCIÓN: useProveedores NO usa sucursalActiva — los proveedores son de
// la empresa completa (la API los filtra por empresa_id del JWT); su queryKey
// no incluye sucursalId y su listado es idéntico en cualquier vista.
```

**Mutaciones de creación por sucursal (productos, compras, ingreso de
existencias):** requieren una sucursal CONCRETA. Si `sucursalActiva === null`
(consolidado), deshabilitar los botones "Nuevo producto" / "Nueva compra" con
tooltip "Selecciona una sucursal para crear registros". Incluir
`sucursal_id: sucursalActiva` en el body.
**Excepción:** crear/editar PROVEEDORES sí está permitido en vista consolidada
— son de la empresa, no de una sucursal.

### 5.3b Columna "Sucursal" en vistas consolidadas

Cuando `sucursalActiva === null`, las tablas de datos por sucursal deben
distinguir el origen de cada fila. Agregar la columna "Sucursal" (la API ya
retorna `sucursal_nombre` en los listados) a: ventas, compras, productos,
existencias y usuarios. Cuando hay una sucursal concreta seleccionada, la
columna se OCULTA (sería redundante):

```tsx
// Patrón en las definiciones de columnas:
const sucursalId = useAuthStore((s) => s.sucursalActiva)
const columns = useMemo(
  () => getVentasColumns({ mostrarSucursal: sucursalId === null }),
  [sucursalId]
)
```

> Delta correspondiente en la API: los listados (GET /ventas, /compras,
> /productos, /usuarios) incluyen `sucursal_nombre` vía `include`/join cuando
> el solicitante es admin.

### 5.4 Nueva página: Sucursales (admin)

- Ruta `/sucursales` dentro de `AdminRoute` + item de sidebar (ícono `Store` de lucide).
- Tabla (DataTable) + `SucursalFormDialog` con React Hook Form + Zod (`nombre` requerido, `direccion`/`telefono` opcionales) — mismo patrón de SKILL-24.

### 5.5 Usuarios (delta)

- El formulario de usuario agrega un `Select` de sucursal, visible y obligatorio cuando `rol === 'vendedor'`, oculto cuando `rol === 'admin'`.
- La tabla de usuarios agrega columna "Sucursal".

### 5.6 Dashboard y reportes (delta sobre SKILL-27 / 26)

- Sin sucursal seleccionada (consolidado): los KPIs y gráficas agregan toda la empresa; el título indica "— Todas las sucursales".
- Con sucursal: datos de esa sucursal; el título indica el nombre.
- No se requieren cambios en los componentes de gráficas — solo en los parámetros de los hooks.

---

## 6. Script de alta de empresas — `scripts/crear-empresa.ts`

Las empresas se dan de alta con un script parametrizado que crea "lo básico"
en una sola transacción: la empresa, su primera sucursal y su usuario admin.

### `apps/api/scripts/crear-empresa.ts`

```typescript
/**
 * Alta de una nueva empresa cliente con su primera sucursal y usuario admin.
 *
 * Uso:
 *   pnpm --filter api exec tsx scripts/crear-empresa.ts \
 *     --empresa "Joyería El Diamante" \
 *     --sucursal "Sucursal San Miguel" \
 *     --admin-user "admin.diamante" \
 *     --admin-pass "CambiarEsta123" \
 *     --admin-nombre "María López"
 *
 * Parámetros opcionales:
 *   --direccion "Av. Roosevelt #123"   (dirección de la sucursal)
 *   --telefono "2660-0000"             (teléfono de la sucursal)
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Parseo simple de argumentos --clave "valor" ───────────────────────────────
function getArg(name: string, required = true): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  const value = idx !== -1 ? process.argv[idx + 1] : undefined
  if (required && !value) {
    console.error(`❌ Falta el parámetro obligatorio --${name}`)
    console.error(
      'Uso: tsx scripts/crear-empresa.ts --empresa "..." --sucursal "..." ' +
      '--admin-user "..." --admin-pass "..." --admin-nombre "..." ' +
      '[--direccion "..."] [--telefono "..."]'
    )
    process.exit(1)
  }
  return value
}

async function main() {
  const empresaNombre = getArg('empresa')!
  const sucursalNombre = getArg('sucursal')!
  const adminUser = getArg('admin-user')!
  const adminPass = getArg('admin-pass')!
  const adminNombre = getArg('admin-nombre')!
  const direccion = getArg('direccion', false)
  const telefono = getArg('telefono', false)

  // ── Validaciones previas ────────────────────────────────────────────────────
  if (adminPass.length < 8) {
    console.error('❌ La contraseña del admin debe tener al menos 8 caracteres')
    process.exit(1)
  }
  const empresaExiste = await prisma.empresa.findUnique({
    where: { nombre: empresaNombre },
  })
  if (empresaExiste) {
    console.error(`❌ Ya existe una empresa llamada "${empresaNombre}"`)
    process.exit(1)
  }
  const usuarioExiste = await prisma.usuario.findUnique({
    where: { username: adminUser },
  })
  if (usuarioExiste) {
    console.error(`❌ Ya existe un usuario con username "${adminUser}"`)
    process.exit(1)
  }

  // ── Creación atómica: empresa + sucursal + admin ────────────────────────────
  const resultado = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: { nombre: empresaNombre },
    })

    const sucursal = await tx.sucursal.create({
      data: {
        empresa_id: empresa.id,
        nombre: sucursalNombre,
        direccion: direccion ?? null,
        telefono: telefono ?? null,
      },
    })

    const admin = await tx.usuario.create({
      data: {
        username: adminUser,
        password_hash: await bcrypt.hash(adminPass, 12),
        nombre_completo: adminNombre,
        rol: 'admin',
        empresa_id: empresa.id,
        sucursal_id: null,     // admin: sin sucursal fija
      },
    })

    return { empresa, sucursal, admin }
  })

  console.log('✅ Empresa creada exitosamente:\n')
  console.log(`   Empresa:  [${resultado.empresa.id}] ${resultado.empresa.nombre}`)
  console.log(`   Sucursal: [${resultado.sucursal.id}] ${resultado.sucursal.nombre}`)
  console.log(`   Admin:    [${resultado.admin.id}] ${resultado.admin.username}`)
  console.log('\n   El admin puede iniciar sesión en el panel web y desde ahí')
  console.log('   crear más sucursales, vendedores, productos y proveedores.')
}

main()
  .catch((e) => {
    console.error('❌ Error inesperado:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

### Ejemplos de uso

```bash
# Alta mínima (parámetros obligatorios)
pnpm --filter api exec tsx scripts/crear-empresa.ts \
  --empresa "Joyería El Diamante" \
  --sucursal "Sucursal Central" \
  --admin-user "admin.diamante" \
  --admin-pass "unPassSeguro9" \
  --admin-nombre "María López"

# Alta con datos completos de la sucursal
pnpm --filter api exec tsx scripts/crear-empresa.ts \
  --empresa "Oro y Plata SV" \
  --sucursal "Sucursal San Miguel" \
  --direccion "Av. Roosevelt Sur #123, San Miguel" \
  --telefono "2660-1234" \
  --admin-user "admin.oroplata" \
  --admin-pass "otroPassSeguro7" \
  --admin-nombre "Carlos Ramírez"

# En el VPS de producción (dentro de /var/www/joyaspos):
cd /var/www/joyaspos && pnpm --filter api exec tsx scripts/crear-empresa.ts \
  --empresa "..." --sucursal "..." --admin-user "..." --admin-pass "..." --admin-nombre "..."
```

> Del resto (más sucursales, vendedores, productos, proveedores) se encarga el
> propio admin desde el panel web — el script solo crea el punto de entrada.
> El seed de desarrollo (`prisma/seed.ts`) sigue existiendo por separado para
> la "Empresa Demo" local.

---

## 7. Checklist de validación de aislamiento (agregar al DOD)

Probar con 2 empresas y 2 sucursales por empresa (extender el seed):

- [ ] Vendedor de Sucursal A no ve productos/ventas/compras de Sucursal B (misma empresa)
- [ ] Vendedor no puede forzar otra sucursal enviando `sucursal_id` en query/body — se ignora
- [ ] Admin de Empresa 1 no puede leer NI escribir datos de Empresa 2, ni siquiera adivinando IDs (`GET /ventas/:id` ajeno → 404)
- [ ] Admin con `?sucursal_id=` de otra empresa → 404
- [ ] Consolidado del admin suma exactamente la suma de sus sucursales (verificar montos)
- [ ] **Proveedores:** un proveedor de Empresa 1 NO es visible desde Empresa 2; el MISMO proveedor SÍ aparece en compras de distintas sucursales de su empresa; el reporte de compras consolidado agrupa correctamente por proveedor a través de sucursales
- [ ] Crear vendedor con sucursal de otra empresa → 400/404
- [ ] Desactivar sucursal con vendedores activos → 409
- [ ] **Móvil — vendedor:** la consulta de ventas muestra SOLO el día actual, sin selector de período; forzar `desde`/`hasta` de otro día vía API con token de vendedor retorna solo el día actual
- [ ] **Móvil — admin:** tras login pasa por el SucursalPicker; puede vender en la sucursal elegida (el payload lleva `sucursal_id`); su consulta de ventas tiene el selector de período completo; "Cambiar sucursal" aplica la regla de limpieza de Room
- [ ] Login de un usuario de otra sucursal (o cambio de sucursal del admin) en el mismo dispositivo Android limpia Room — y se BLOQUEA si hay ventas pendientes de sync
- [ ] El recibo impreso muestra el nombre de la sucursal
- [ ] En el panel web, el selector muestra SIEMPRE "Todas las sucursales" como primera opción en dashboard, reportes, productos, existencias, ventas, compras y usuarios; cambiar de sucursal refresca todo sin recargar la página
- [ ] En vista consolidada, las tablas muestran la columna "Sucursal"; con sucursal concreta, la columna se oculta
- [ ] `scripts/crear-empresa.ts` crea empresa + sucursal + admin en una transacción, y rechaza nombres/usernames duplicados