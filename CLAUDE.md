# CLAUDE.md — JoyasPOS Monorepo v2.0
## Instrucciones de Gobernanza para Claude Code

---

## 🗂 Estructura del Proyecto

```
joyaspos/
├── apps/
│   ├── mobile/                    # Android — Kotlin + Jetpack Compose
│   │   ├── data/
│   │   │   ├── local/             # Room
│   │   │   │   ├── entity/        # VentaEntity, VentaDetalleEntity, ProductoEntity
│   │   │   │   ├── dao/           # VentaDao, ProductoDao
│   │   │   │   └── JoyasDatabase.kt
│   │   │   ├── remote/            # Retrofit services
│   │   │   └── repository/        # VentaRepository, ProductoRepository
│   │   ├── domain/                # Use cases, modelos de dominio
│   │   ├── presentation/          # ViewModels + Composables
│   │   ├── worker/                # SyncWorker (WorkManager)
│   │   └── print/                 # SunmiPrintHelper
│   ├── api/                       # Fastify 4 + Prisma + MySQL
│   │   └── src/modules/
│   │       ├── auth/
│   │       ├── productos/
│   │       ├── ventas/            # incluye /sync endpoint
│   │       ├── compras/
│   │       ├── proveedores/
│   │       ├── reportes/
│   │       └── usuarios/
│   └── web/                       # React 18 + TS + Vite
│       └── src/pages/
│           ├── dashboard/
│           ├── ventas/
│           ├── compras/
│           ├── proveedores/
│           ├── reportes/
│           ├── productos/
│           ├── existencias/
│           └── usuarios/
└── packages/
    └── shared-types/              # Tipos TS compartidos API <-> Web
```

---

## 🔧 Stack por Componente

### apps/api
Node.js 20 LTS · Fastify 4 · Prisma (MySQL) · Zod · JWT + bcryptjs · pnpm

### apps/web
React 18 + TypeScript + Vite · shadcn/ui + Tailwind CSS · Zustand · TanStack Query v5 · TanStack Table v8 · React Router v6 · React Hook Form + Zod · Recharts · Axios · pnpm

### apps/mobile
Kotlin · Jetpack Compose · MVVM + Clean Architecture · Hilt · Retrofit 2 + OkHttp3 · Room · WorkManager · Sunmi Printer SDK (AIDL) · DataStore Preferences · Navigation Compose · Gradle Kotlin DSL · Android 9+ API 28

---

## REGLAS NO NEGOCIABLES

### Seguridad
1. NUNCA hardcodear secrets, passwords, URLs de producción en código
2. NUNCA almacenar contraseñas en texto plano — siempre bcryptjs.hash(password, 12)
3. NUNCA omitir validación Zod en endpoints con body

### Arquitectura App
4. NUNCA poner lógica de negocio en Composables — solo en ViewModels
5. NUNCA acceder a Retrofit o Room directamente desde un ViewModel — siempre via Repository
6. NUNCA usar fallbackToDestructiveMigration() en Room en producción — siempre migración versionada

### Offline-first (CRITICO)
7. SIEMPRE insertar la venta en Room con sincronizado=false ANTES de intentar la API
8. NUNCA marcar sincronizado=true antes de recibir HTTP 201 de la API
9. NUNCA limpiar el carrito si hay error — solo limpiarlo tras INSERT exitoso en Room
10. SIEMPRE encolar SyncWorker inmediatamente tras venta que no se pudo sincronizar

### Impresion
11. NUNCA revertir una venta por error de impresora — la impresión es siempre opcional
12. Si venta offline: ID en recibo debe ser "#L-{localId}", no null ni vacío

### Base de datos
13. NUNCA eliminar físicamente ventas, productos, usuarios — solo soft delete (activo=0)
14. SIEMPRE usar transacciones Prisma cuando la operacion toca mas de 1 tabla
15. SIEMPRE usar any de TypeScript con comentario — nunca silenciosamente

### Panel Web
16. SIEMPRE invalidar queries de TanStack Query tras mutaciones exitosas
17. SIEMPRE usar React Hook Form + Zod en formularios — nunca estado manual con useState para campos

---

## 📋 Modelo de Datos (referencia rápida)

### MySQL (API)
```
usuarios: id, username(UNIQUE), password_hash, nombre_completo, rol(admin|vendedor), activo, created_at, updated_at
productos: id, nombre, unidad_medida, existencia, activo, created_at, updated_at
ventas: id, nombre_cliente(DEFAULT 'Clientes Varios'), monto_total, fecha_hora, usuario_id(FK), created_at
venta_detalle: id, venta_id(FK), producto_id(FK), detalle, cantidad, precio_unitario, total
proveedores: id, nombre, contacto, telefono, direccion, activo, created_at, updated_at
compras: id, proveedor_id(FK nullable), proveedor_nombre, monto_total, fecha_hora, notas, usuario_id(FK), created_at
compra_detalle: id, compra_id(FK), producto_id(FK), cantidad, costo_unitario, total
```

### Room (App — SQLite local)
```
ventas: id(autoGen), remoteId(nullable), nombreCliente, montoTotal, fechaHora(ISO8601), usuarioId, sincronizado(BOOLEAN DEFAULT false)
venta_detalle: id(autoGen), ventaLocalId(FK->ventas.id CASCADE), productoId, detalle, cantidad, precioUnitario, total
productos: id(=remoteId), nombre, unidadMedida, existencia, activo, ultimaSync(timestamp)
```

Reglas criticas:
- Precio NO en productos; se ingresa en venta -> venta_detalle.precio_unitario
- Costo NO en productos; se ingresa en compra -> compra_detalle.costo_unitario
- campo detalle = "{nombre_producto} {detalle_adicional}".trim() — construido por el cliente

---

## 🔑 Endpoints de la API

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | /auth/login | público | Login |
| GET | /productos | todos | Listar activos |
| POST | /productos | admin | Crear |
| PUT | /productos/:id | admin | Editar |
| DELETE | /productos/:id | admin | Desactivar |
| POST | /productos/:id/ingreso | admin | Incrementar existencia |
| POST | /ventas | todos | Registrar venta online |
| POST | /ventas/sync | todos | Sync batch offline->online |
| GET | /ventas | todos | Listar por periodo |
| GET | /ventas/:id | todos | Detalle de venta |
| GET | /proveedores | admin | Listar activos |
| POST | /proveedores | admin | Crear |
| PUT | /proveedores/:id | admin | Editar |
| DELETE | /proveedores/:id | admin | Desactivar |
| POST | /compras | admin | Registrar compra |
| GET | /compras | admin | Listar por periodo |
| GET | /compras/:id | admin | Detalle de compra |
| GET | /reportes/ventas | admin | Ventas por periodo |
| GET | /reportes/productos-top | admin | Top productos |
| GET | /reportes/inventario | admin | Movimiento inventario |
| GET | /reportes/rentabilidad | admin | Rentabilidad estimada |
| GET | /reportes/dashboard | admin | KPIs del dia |
| GET | /reportes/compras | admin | Compras por periodo |
| GET | /usuarios | admin | Listar |
| POST | /usuarios | admin | Crear |
| PUT | /usuarios/:id | admin | Editar |
| DELETE | /usuarios/:id | admin | Desactivar |
| PUT | /usuarios/:id/password | admin | Cambiar contraseña |

---

## 📱 Flujo de Pantallas App

```
LoginScreen
  └→ HomeScreen (productos Room + sync bg)
        ├→ AddItemDialog (cantidad, precio, detalle)
        ├→ CartScreen
        │     └→ SaleConfirmationScreen
        │           └→ [impresión automática Sunmi]
        │                   └→ Nueva venta (limpiar carrito)
        └→ SalesQueryScreen (Hoy/Semana/Quincena/Mes — Room)
              └→ SaleDetailScreen
                    └→ [Reimprimir recibo]
```

Banners en HomeScreen:
- "Modo offline — sin conexión" si no hay red
- "X ventas pendientes de sincronizar" si hay Room.sincronizado=false

---

## 🔄 Ciclo de vida de una venta

```
Confirmar venta
      │
      ▼
INSERT Room (sincronizado=false) ←── SIEMPRE primero
      │
      ├──[red disponible]──► POST /ventas
      │                           │
      │                   ┌───────┴──────────┐
      │               HTTP 201          Error/sin red
      │                   │                  │
      │            UPDATE Room          Room queda
      │         sincronizado=true      sincronizado=false
      │         remoteId=x.id          SyncWorker encolado
      │                   │                  │
      └───────────────────┴──────────────────┘
                          │
                          ▼
              SaleConfirmationScreen (SIEMPRE)
                          │
                          ▼
              Imprimir recibo (SIEMPRE intenta)
              ID: remoteId | "#L-{localId}" si offline
                          │
                          ▼
                    Limpiar carrito
```

---

## 🌐 Rutas del Panel Web

```
/login
/dashboard
/ventas
/productos  /productos/nuevo  /productos/:id/editar
/proveedores  /proveedores/nuevo
/compras  /compras/nueva  /compras/:id
/reportes/ventas
/reportes/productos-top
/reportes/inventario
/reportes/rentabilidad
/reportes/compras
/existencias
/usuarios  /usuarios/nuevo
```

---

## 🎨 Convenciones de Reportes (Web)

Codigo de color para margenes y stock:
- Verde #16a34a — margen > 30%, stock > 15, delta positivo
- Amarillo #ca8a04 — margen 10-30%, stock ≤ 15
- Rojo #dc2626 — margen < 10%, stock ≤ 5, balance negativo, delta negativo

Patron KPI card:
```tsx
<KpiCard title="Ventas hoy" value={formatCurrency(monto)} delta={pct} />
// delta positivo: flecha arriba verde; negativo: flecha abajo rojo
```

Todos los reportes comparten el mismo componente de selector de periodo (Hoy / Esta semana / Esta quincena / Este mes / Personalizado).

---

## 🚀 Comandos

```bash
pnpm install                                           # instalar todo
pnpm --filter api dev                                  # API dev
pnpm --filter web dev                                  # Web dev
pnpm --filter api exec prisma generate                 # generar cliente
pnpm --filter api exec prisma migrate dev --name xxx   # crear migración
pnpm --filter api exec prisma migrate deploy           # producción
pnpm turbo build                                       # build total
./gradlew assembleDebug                                # APK debug (desde apps/mobile)
./gradlew assembleRelease                              # APK release
```

---

## 📄 Documentos de Referencia

| Archivo | Contenido |
|---|---|
| PRD.md | Vision v2, stack, modelo de datos completo, arquitectura offline-first, impresion |
| SRS.md | 40+ RFs; entidades Room con codigo Kotlin; indices MySQL; proceso de sync |
| HISTORIAS_USUARIO.md | 28 HUs con CA y SP (117 SP total) |
| CASOS_DE_USO.md | 9 CUs con flujos principales y alternativos; matriz actores |
| DOD.md | DoD por componente; checklist rapido; criterios especificos offline/sync/impresion |

---

## REGLAS DE MULTITENANCY (empresa + sucursal) — NO NEGOCIABLES

> Fuente completa: `skills/multitenancy-empresa-sucursal/SKILL.md`. Estas reglas
> aplican a TODO el código del proyecto y prevalecen sobre cualquier ejemplo
> anterior que no incluya `empresa_id`/`sucursal_id`.

1. **Modelo:** una EMPRESA tiene N SUCURSALES. El admin pertenece a la empresa
   (sucursal_id NULL) y administra todas sus sucursales. Vendedores, productos,
   proveedores, ventas y compras pertenecen a UNA sucursal. Cada sucursal
   gestiona su propio catálogo — NO existe traslado de productos entre sucursales.
2. **Jamás un query de datos operativos sin scope de sucursal/empresa.** Todo
   `findMany`, `findFirst`, `aggregate` y `$queryRaw` sobre productos, proveedores,
   ventas o compras filtra por `sucursal_id` o por las sucursales de la empresa.
3. **El vendedor NUNCA elige sucursal** — se deriva del JWT. Cualquier
   `sucursal_id` enviado por un cliente con rol vendedor se ignora.
4. **El admin escribe sobre una sucursal explícita** (validada contra su
   empresa_id) y puede leer en consolidado (sin sucursal = toda su empresa).
5. **JWT payload:** `{sub, username, rol, empresa_id, sucursal_id}`.
6. **404 indistinguibles:** acceder a un recurso de otra empresa retorna el
   mismo 404 que un recurso inexistente — nunca revelar su existencia.
7. **Android:** si inicia sesión un vendedor de otra sucursal en el mismo
   dispositivo, limpiar Room; BLOQUEAR el cambio si hay ventas sin sincronizar.
8. **Web:** `sucursalActiva` del authStore entra en todas las queryKeys y
   params; las mutaciones de creación se deshabilitan en vista consolidada.
