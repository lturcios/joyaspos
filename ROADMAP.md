# ROADMAP.md — Guía de Desarrollo para Claude Code
## JoyasPOS v2.0 — Plan de Ejecución por Fases

**Versión:** 1.0.0 | **Fecha:** 2026-06-29

---

## Cómo usar este documento

Este documento es el **mapa de navegación** que Claude Code debe consultar al inicio de cada sesión de trabajo. Define qué skills leer, en qué orden ejecutar, qué validar antes de avanzar, y cómo saber si una fase está completa.

**Regla fundamental:** antes de escribir cualquier línea de código, leer la skill correspondiente al paso actual. Las skills contienen código listo para implementar, patrones obligatorios y reglas de negocio que no deben reinventarse.

**Documentos de referencia obligatorios:**

| Documento | Cuándo consultar |
|---|---|
| `CLAUDE.md` | Al inicio de cada sesión — reglas no negociables, modelo de datos, endpoints |
| `DOD.md` | Al completar cada paso — checklists de validación por componente |
| `PRD.md` | Si hay duda sobre qué debe hacer una funcionalidad o por qué |
| `SRS.md` | Si hay duda técnica sobre validaciones, campos, o restricciones de datos |
| `HISTORIAS_USUARIO.md` | Para verificar los criterios de aceptación de cada funcionalidad |
| `CASOS_DE_USO.md` | Para verificar flujos alternativos (errores, sin red, sin permisos) |

---

## Estructura de fases

El desarrollo se divide en 7 fases secuenciales. Cada fase tiene subfases que deben completarse en orden. Dentro de cada subfase se indica qué skills leer, qué producen y qué validar antes de continuar.

```
FASE 0 — Scaffolding (monorepo + 3 proyectos)
    │
FASE 1A — API Core (auth + validación + ventas/sync)
    │
FASE 1B — Mobile Core (Room + offline-first + sync + navegación + UI)
    │
FASE 1C — Web Core (auth + routing + data fetching + formularios + tablas)
    │
FASE 2A — API Avanzada (compras/proveedores + reportes)
    │
FASE 2B — Mobile Avanzada (impresión Sunmi)
    │
FASE 2C — Web Avanzada (dashboard + reportes + compras + gráficas)
    │
FASE 3 — Deploy (VPS API + VPS Web + APK Release)
```

---

## FASE 0 — Scaffolding

**Objetivo:** crear la estructura de directorios completa del monorepo con los tres proyectos (API, Web, Mobile) configurados y compilando correctamente, pero sin lógica de negocio.

### 0.1 — Monorepo + Tipos compartidos

| Orden | Skill | Produce |
|---|---|---|
| 1 | `monorepo-setup` (SKILL-01) | `pnpm-workspace.yaml`, `turbo.json`, `package.json` raíz, `.gitignore`, `.npmrc`, estructura `apps/` y `packages/` |
| 2 | `shared-types` (SKILL-02) | Todos los tipos TypeScript en `packages/shared-types/src/` — enums, DTOs de auth, productos, ventas, compras, reportes, usuarios |

**Validar antes de continuar:**

- [ ] `pnpm install` completa sin errores desde la raíz
- [ ] `pnpm ls -r --depth 0` muestra los 3 workspaces (api, web, shared-types)
- [ ] `packages/shared-types/src/index.ts` exporta todos los módulos de tipos
- [ ] `tsc --noEmit` en shared-types pasa sin errores

### 0.2 — Proyecto API

| Orden | Skill | Produce |
|---|---|---|
| 3 | `fastify-project-structure` (SKILL-03) | Estructura `apps/api/src/`, `app.ts`, `index.ts`, plugins (prisma, cors, auth), `config/env.ts`, `shared/errors.ts`, `tsconfig.json` |
| 3b | `multitenancy-empresa-sucursal` (SKILL-00M) | **Leer ANTES de prisma-mysql.** Define tablas `empresas`/`sucursales`, campos `empresa_id`/`sucursal_id` en todos los modelos operativos, y las reglas de scoping que gobiernan TODO el resto del desarrollo |
| 4 | `prisma-mysql` (SKILL-04) | `prisma/schema.prisma` completo **+ los deltas de SKILL-00M**, primera migración, índices MySQL |

**Validar antes de continuar:**

- [ ] `pnpm --filter api exec prisma generate` completa sin errores
- [ ] `pnpm --filter api exec prisma migrate dev --name init` crea la BD y las tablas
- [ ] `pnpm --filter api dev` arranca el servidor y `/health` retorna `{"status":"ok"}`
- [ ] La BD tiene todas las tablas: `empresas`, `sucursales`, `usuarios`, `productos`, `ventas`, `venta_detalle`, `proveedores`, `compras`, `compra_detalle`
- [ ] `usuarios` tiene `empresa_id` (NOT NULL) y `sucursal_id` (nullable); `productos`/`proveedores`/`ventas`/`compras` tienen `sucursal_id` NOT NULL
- [ ] Los uniques compuestos existen: `(sucursal_id, nombre)` en productos y proveedores; `(empresa_id, nombre)` en sucursales
- [ ] Todos los índices del SRS + `idx_ventas_sucursal_fecha` + `idx_compras_sucursal_fecha` están creados

### 0.3 — Sistema de diseño (marca compartida)

| Orden | Skill | Produce |
|---|---|---|
| 5 | `design-system` (SKILL-00D) | Definición de la paleta de marca (dorado antiguo + carbón + marfil) y tipografía, compartida entre Web y Mobile. **Ejecutar antes de 0.4 y 0.5** — ambas skills dependen de esta. |

**Validar antes de continuar:**

- [ ] La paleta está clara: 1 color primario (dorado), 1 secundario (carbón), colores de estado separados (verde/ámbar/rojo/naranja)
- [ ] No es la paleta azul/morada genérica de un dashboard SaaS — debe sentirse "joyería"

### 0.4 — Proyecto Android

| Orden | Skill | Produce |
|---|---|---|
| 6 | `android-project-structure` (SKILL-10) | Proyecto Gradle completo en `apps/mobile/`, `libs.versions.toml`, `build.gradle.kts`, `AndroidManifest.xml`, `JoyasApp.kt`, `MainActivity.kt`, estructura de paquetes |

**Validar antes de continuar:**

- [ ] `./gradlew assembleDebug` compila sin errores (APK vacío pero funcional)
- [ ] `JoyasApp` implementa `Configuration.Provider` con `HiltWorkerFactory`
- [ ] `AndroidManifest.xml` tiene `xmlns:tools` y `tools:node="remove"` en el WorkManager provider
- [ ] `build.gradle.kts` tiene `kapt { arguments { arg("room.schemaLocation", ...) } }`
- [ ] `local.properties` tiene `API_BASE_URL` configurado

> **Nota:** `Theme.kt`/`Type.kt` con la paleta de marca se implementan en
> SKILL-16 (`compose-ui-sunmi`, Fase 1B), pero el contenido exacto ya está
> definido en SKILL-00D desde este punto.

### 0.5 — Proyecto Web

| Orden | Skill | Produce |
|---|---|---|
| 7 | `react-project-structure` (SKILL-21) | Proyecto Vite en `apps/web/`, `App.tsx`, `main.tsx`, `lib/axios.ts`, `lib/queryClient.ts`, `lib/utils.ts`, `lib/periodos.ts`, `src/index.css` (variables CSS de marca — **crítico**, ver SKILL-00D), `tailwind.config.ts`, `components.json` |

**Validar antes de continuar:**

- [ ] `pnpm --filter web dev` arranca Vite sin errores
- [ ] **Verificación visual obligatoria:** abrir `http://localhost:5173` — el fondo debe verse marfil (no blanco puro) y cualquier botón de shadcn/ui debe verse dorado, no gris/sin estilo. Si se ve blanco y negro, `src/index.css` no tiene el contenido de SKILL-00D o no está importado en `main.tsx`.
- [ ] `pnpm --filter web build` produce `dist/` sin errores de TypeScript
- [ ] `@joyaspos/shared-types` es importable desde el código del panel web

### Checkpoint de Fase 0

```
╔═══════════════════════════════════════════════════════════════╗
║  FASE 0 COMPLETADA cuando:                                  ║
║                                                              ║
║  □  pnpm turbo build pasa en los 3 workspaces TS            ║
║  □  API arranca y responde /health                           ║
║  □  BD MySQL tiene todas las tablas con índices              ║
║  □  Android compila APK debug vacío                          ║
║  □  Web compila y sirve página con paleta dorado/carbón      ║
║     visible (NO blanco y negro)                              ║
║  □  Git: primer commit con toda la estructura                ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## FASE 1A — API Core

**Objetivo:** implementar autenticación, validación y el módulo de ventas (incluyendo sync batch) que la app Android consumirá.

**Prerrequisito:** Fase 0 completa.

### 1A.1 — Autenticación JWT

| Orden | Skill | Produce |
|---|---|---|
| 1 | `fastify-auth-jwt` (SKILL-05) | Plugin auth con `requireAuth`/`requireAdmin`, `auth.handler.ts` con login, `prisma/seed.ts` con usuario admin inicial |

**Validar:**

- [ ] `pnpm --filter api exec prisma db seed` crea el usuario admin
- [ ] `curl POST /auth/login` con credenciales correctas retorna `{token, user, empresa, sucursales}`
- [ ] El JWT decodificado contiene `empresa_id` y `sucursal_id` (null para admin)
- [ ] `curl POST /auth/login` con credenciales incorrectas retorna 401
- [ ] `curl GET /productos` sin token retorna 401
- [ ] `curl GET /productos` con token retorna 200 (array vacío por ahora)

### 1A.2 — Validación con Zod

| Orden | Skill | Produce |
|---|---|---|
| 2 | `fastify-zod-validation` (SKILL-06) | `shared/validate.ts`, `shared/schemas.ts` (periodoQuerySchema, idParamSchema), schemas Zod de todos los módulos |

**Validar:**

- [ ] `POST /auth/login` con body vacío retorna 400 con mensaje legible
- [ ] `POST /auth/login` con username vacío retorna 400 mencionando el campo
- [ ] El helper `validate()` está en `src/shared/validate.ts` y se importa en los handlers

### 1A.3 — Módulo de Ventas + Sync

| Orden | Skill | Produce |
|---|---|---|
| 3 | `api-ventas-sync` (SKILL-07) | `ventas.service.ts` (lógica core), `ventas.handler.ts` (4 endpoints), `ventas.routes.ts` |

**Validar:**

- [ ] `POST /ventas` crea una venta y descuenta existencias en transacción
- [ ] `POST /ventas/sync` con lote de ventas: sincroniza exitosas, reporta errores parciales
- [ ] Sync batch es idempotente: re-enviar la misma venta retorna el `remote_id` existente sin duplicar
- [ ] `GET /ventas?desde=...&hasta=...` filtra correctamente por período
- [ ] `GET /ventas/:id` retorna detalle con ítems
- [ ] Vendedor solo ve sus ventas; admin ve todas

### Checkpoint de Fase 1A

```
╔═══════════════════════════════════════════════════════════════╗
║  FASE 1A COMPLETADA cuando:                                 ║
║                                                              ║
║  □  Login funcional con JWT 8h                               ║
║  □  Seed de admin creado                                     ║
║  □  Módulo ventas: 4 endpoints operativos                    ║
║  □  Sync batch idempotente y con error parcial               ║
║  □  Validación Zod en todos los endpoints con body           ║
║  □  Formato de error {statusCode, error, message} en todo    ║
║  □  Probado con curl: login → crear venta → sync → listar   ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## FASE 1B — Mobile Core

**Objetivo:** implementar la app Android funcional con login, listado de productos, flujo de venta offline-first completo (carrito → Room → API → sync automático) y todas las pantallas de UI.

**Prerrequisito:** Fase 1A completa (la API debe estar corriendo).

**Orden de implementación dentro de esta fase:** las skills se aplican en secuencia estricta porque cada una depende de la anterior.

### 1B.1 — Capa de datos local (Room)

| Orden | Skill | Produce |
|---|---|---|
| 1 | `room-database` (SKILL-11) | `VentaEntity`, `VentaDetalleEntity`, `ProductoEntity`, `VentaDao`, `ProductoDao`, `JoyasDatabase` |

**Validar:**

- [ ] Proyecto compila con las 3 entidades y 2 DAOs
- [ ] `JoyasDatabase` tiene `version = 1` y `exportSchema = true`
- [ ] `VentaDetalleEntity` tiene campo `detalleAdicional: String? = null` separado del `detalle`
- [ ] Los DAOs devuelven `Flow<List<...>>` para queries reactivos

### 1B.2 — Sesión persistente (DataStore)

| Orden | Skill | Produce |
|---|---|---|
| 2 | `datastore-preferences` (SKILL-19) | `PreferenceKeys`, `SessionPreferences`, `DataStoreModule` para Hilt |

**Validar:**

- [ ] `SessionPreferences.getToken()` retorna Flow que emite null si no hay sesión
- [ ] `SessionPreferences.saveSession(...)` persiste token, userId, username, nombreCompleto, rol
- [ ] `SessionPreferences.clearSession()` elimina todos los datos

### 1B.3 — Cliente HTTP (Retrofit)

| Orden | Skill | Produce |
|---|---|---|
| 3 | `retrofit-okhttp-setup` (SKILL-14) | `ApiService`, DTOs de red (`AuthDto`, `ProductoDto`, `VentaDto`), `AuthInterceptor`, `UnauthorizedInterceptor`, `NetworkModule` |

**Validar:**

- [ ] `AuthInterceptor` lee token de DataStore e inyecta header `Authorization: Bearer ...`
- [ ] `UnauthorizedInterceptor` detecta 401 y emite broadcast para navegar a Login
- [ ] `NetworkModule` tiene timeouts (15s connect, 30s read/write)
- [ ] `HttpLoggingInterceptor` es `BODY` en debug, `NONE` en release

### 1B.4 — Inyección de dependencias (Hilt)

| Orden | Skill | Produce |
|---|---|---|
| 4 | `hilt-dependency-injection` (SKILL-17) | `DatabaseModule`, `DataStoreModule`, `NetworkModule`, `RepositoryModule`, `PrintModule` |

**Validar:**

- [ ] `JoyasApp` implementa `Configuration.Provider` con `HiltWorkerFactory`
- [ ] Todos los módulos están `@InstallIn(SingletonComponent::class)`
- [ ] `./gradlew assembleDebug` compila sin errores de Hilt

### 1B.5 — Repository Pattern offline-first

| Orden | Skill | Produce |
|---|---|---|
| 5 | `repository-pattern-offline-first` (SKILL-12) | `VentaRepository`/`VentaRepositoryImpl`, `ProductoRepository`/`ProductoRepositoryImpl`, `Mappers.kt` |

**Validar:**

- [ ] `VentaRepositoryImpl.registrarVenta()` inserta en Room ANTES de intentar la API
- [ ] Si la API falla, la venta queda en Room con `sincronizado = false`
- [ ] `Mappers.kt` envía `item.detalleAdicional` (no null) en `toCreateVentaRequest`
- [ ] `ProductoRepositoryImpl.syncProductos()` hace upsert en Room desde la API

### 1B.6 — SyncWorker (WorkManager)

| Orden | Skill | Produce |
|---|---|---|
| 6 | `workmanager-syncworker` (SKILL-13) | `SyncWorker`, `WorkManagerSetup`, DTOs de sync |

**Validar:**

- [ ] Worker periódico registrado cada 15 min con `NetworkType.CONNECTED`
- [ ] Backoff exponencial configurado (1 min base, max 5 intentos)
- [ ] Lotes de máximo 20 ventas
- [ ] En éxito parcial: solo marca sincronizadas las confirmadas por la API
- [ ] `detalleAdicional = item.detalleAdicional` (no null) en el payload de sync

### 1B.7 — Navegación y UI

| Orden | Skill | Produce |
|---|---|---|
| 7 | `jetpack-compose-navigation` (SKILL-15) | `Routes.kt` con SPLASH, `AppNavHost.kt` con ruta splash reactiva, `LoginViewModel` con `authStartupState` |
| 8 | `compose-ui-sunmi` (SKILL-16) | Tema, Typography, `SyncStatusBanner`, `SyncStatusChip`, `ProductoCard`, `PeriodoSelector`, `AddItemDialog`, estados Loading/Error/Empty |
| 9 | `mvvm-viewmodel-stateflow` (SKILL-20) | `HomeViewModel`, `CartViewModel`, `SalesQueryViewModel`, patrón UiState por pantalla |

**Validar:**

- [ ] Al abrir la app: pantalla Splash → verifica token → navega a Home o Login
- [ ] Login funcional contra la API: guarda sesión en DataStore, navega a Home
- [ ] Home muestra productos desde Room (cacheados), banner de offline/pendientes
- [ ] Carrito: agregar ítems, ver subtotales, confirmar venta
- [ ] Tras confirmar: venta aparece en Room, carrito se limpia, pantalla de confirmación
- [ ] Consulta de ventas por período funcional (Hoy/Semana/Quincena/Mes)
- [ ] Área táctil mínima 48dp en todos los elementos interactivos
- [ ] Fuentes mínimas: 14sp en listas, 16sp en botones
- [ ] Logout limpia DataStore y navega a Login

### Checkpoint de Fase 1B

```
╔═══════════════════════════════════════════════════════════════╗
║  FASE 1B COMPLETADA cuando:                                 ║
║                                                              ║
║  □  Login → Home → Agregar productos → Carrito → Confirmar  ║
║  □  Venta se guarda en Room con sincronizado=false           ║
║  □  Con red: venta se sincroniza y marca sincronizado=true   ║
║  □  Sin red: venta queda pendiente, SyncWorker la reintenta  ║
║  □  Consulta de ventas por período muestra datos de Room     ║
║  □  Banner offline y badge de pendientes visibles            ║
║  □  401 redirige a Login automáticamente                     ║
║  □  APK debug instalable y funcional en emulador             ║
║  □  DOD de App Móvil secciones 3.1-3.4, 3.6-3.8 cumplen   ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## FASE 1C — Web Core

**Objetivo:** implementar el panel web con autenticación, rutas protegidas, acceso a datos de la API y los componentes base reutilizables (formularios, tablas, filtro de período).

**Prerrequisito:** Fase 1A completa (la API debe estar corriendo).

**Nota:** Fase 1C puede ejecutarse en paralelo con Fase 1B ya que ambas dependen solo de la API.

### 1C.1 — Autenticación y rutas

| Orden | Skill | Produce |
|---|---|---|
| 1 | `zustand-auth-store` (SKILL-30) | `authStore.ts` con persist en localStorage, interceptores Axios |
| 2 | `react-router-auth-guards` (SKILL-22) | `PrivateRoute`, `AdminRoute`, `AppLayout`, `Sidebar`, `router/index.tsx` con todas las rutas, lazy loading |

**Validar:**

- [ ] Login funcional: guarda token en localStorage vía Zustand
- [ ] Rutas protegidas redirigen a `/login` si no hay token
- [ ] Rutas admin redirigen a `/dashboard` si el rol es vendedor
- [ ] 401 de la API limpia localStorage y redirige a `/login`
- [ ] `Navigate` está importado en `router/index.tsx`
- [ ] Sidebar muestra solo las opciones correspondientes al rol

### 1C.2 — Data fetching + componentes base

| Orden | Skill | Produce |
|---|---|---|
| 3 | `tanstack-query-axios` (SKILL-23) | `queryKeys.ts`, hooks `useProductos`, `useVentas`, `useCompras`, `useProveedores`, `useReportes`, `useUsuarios` |
| 4 | `react-hook-form-zod` (SKILL-24) | `schemas.ts` (validación cliente), `FormField` reutilizable, formularios Login, Producto, Usuario |
| 5 | `tanstack-table` (SKILL-25) | `DataTable` reutilizable con paginación y sorting, columnas de ventas y productos |
| 6 | `period-filter-component` (SKILL-28) | `PeriodFilter` con atajos + DatePicker personalizado, `usePeriodo` hook |

**Validar:**

- [ ] Página de productos: lista, crear, editar, desactivar (CRUD completo)
- [ ] Página de ventas: filtra por período, tabla paginada con total
- [ ] Página de usuarios: lista, crear, editar, desactivar, cambio de contraseña
- [ ] Formularios validan con Zod y muestran errores bajo cada campo
- [ ] Mutaciones invalidan queries correctamente (datos frescos tras guardar)
- [ ] PeriodFilter funciona en ventas con los 4 atajos + rango personalizado
- [ ] Estados Loading/Error/Empty en todas las páginas

### Checkpoint de Fase 1C

```
╔═══════════════════════════════════════════════════════════════╗
║  FASE 1C COMPLETADA cuando:                                 ║
║                                                              ║
║  □  Login → Dashboard (vacío por ahora) funcional            ║
║  □  CRUD de Productos completo en la UI                      ║
║  □  CRUD de Usuarios completo en la UI                       ║
║  □  Listado de ventas con filtro de período funcional         ║
║  □  Todos los formularios usan React Hook Form + Zod         ║
║  □  Todas las tablas usan DataTable con paginación           ║
║  □  Guards de ruta funcionan (PrivateRoute + AdminRoute)      ║
║  □  pnpm --filter web build sin errores TypeScript           ║
║  □  DOD de Panel Web secciones 4.1-4.3, 4.7-4.8 cumplen    ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## FASE 2A — API Avanzada

**Objetivo:** implementar los módulos de compras/proveedores y reportes en la API.

**Prerrequisito:** Fase 1A completa.

### 2A.1 — Compras y Proveedores

| Orden | Skill | Produce |
|---|---|---|
| 1 | `api-compras-proveedores` (SKILL-08) | CRUD proveedores (soft delete), POST /compras con transacción atómica (cabecera + detalle + incremento existencias), GET /compras, GET /compras/:id |

**Validar:**

- [ ] CRUD de proveedores funcional: crear, listar, editar, desactivar
- [ ] `POST /compras` incrementa existencias en la misma transacción
- [ ] `POST /compras` acepta `proveedor_id` O `proveedor_nombre` (al menos uno)
- [ ] `GET /compras?desde=...&hasta=...` filtra por período correctamente
- [ ] Error Prisma `P2002` en proveedor duplicado retorna 409

### 2A.2 — Reportes

| Orden | Skill | Produce |
|---|---|---|
| 2 | `api-reportes` (SKILL-09) | 6 endpoints: dashboard, ventas, productos-top, inventario, rentabilidad, compras |

**Validar:**

- [ ] `GET /reportes/dashboard` retorna KPIs del día, delta vs ayer, stock bajo
- [ ] `GET /reportes/ventas` retorna total, ticket promedio, desglose por día y vendedor
- [ ] `GET /reportes/productos-top` retorna top N productos con porcentaje del total
- [ ] `GET /reportes/inventario` retorna entradas (compras) y salidas (ventas) por producto
- [ ] `GET /reportes/rentabilidad` retorna margen estimado por producto
- [ ] `GET /reportes/compras` retorna desglose por día y proveedor
- [ ] Todos responden < 2 segundos con datos de prueba

### Checkpoint de Fase 2A

```
╔═══════════════════════════════════════════════════════════════╗
║  FASE 2A COMPLETADA cuando:                                 ║
║                                                              ║
║  □  7 endpoints de compras/proveedores operativos            ║
║  □  4 endpoints de sucursales operativos (CRUD)              ║
║  □  6 endpoints de reportes operativos                       ║
║  □  Compras incrementan existencias en transacción           ║
║  □  Dashboard retorna KPIs correctos                         ║
║  □  Todos probados con curl con datos reales                 ║
║  □  AISLAMIENTO probado con 2 empresas × 2 sucursales:       ║
║     checklist sección 6 de multitenancy-empresa-sucursal     ║
║  □  DOD de API secciones 2.2-2.4 cumplen                    ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## FASE 2B — Mobile Avanzada

**Objetivo:** integrar la impresión térmica Sunmi en la app Android.

**Prerrequisito:** Fase 1B completa.

### 2B.1 — Impresión Sunmi

| Orden | Skill | Produce |
|---|---|---|
| 1 | `sunmi-printer-sdk` (SKILL-18) | `SunmiPrintHelper`, `ReceiptData`/`ReceiptItem`, `ConfirmationViewModel` con impresión automática, AlertDialog de reintento |

**Validar:**

- [ ] `SunmiPrintHelper` se conecta al servicio AIDL al iniciar la app
- [ ] Recibo imprime: encabezado, datos de venta, tabla de ítems alineada, total, pie
- [ ] ID condicional: `#R-{remoteId}` si sincronizado, `#L-{localId}` si offline
- [ ] Error de impresora muestra AlertDialog con "Reintentar" y "Omitir"
- [ ] La venta NUNCA se revierte por error de impresora
- [ ] **Probado en dispositivo Sunmi V2SE real** (obligatorio; emulador no funciona)

### Checkpoint de Fase 2B

```
╔═══════════════════════════════════════════════════════════════╗
║  FASE 2B COMPLETADA cuando:                                 ║
║                                                              ║
║  □  Recibo se imprime automáticamente tras confirmar venta   ║
║  □  ID correcto en recibo (online vs offline)                ║
║  □  Error de impresora NO revierte la venta                  ║
║  □  AlertDialog de reintento funcional                       ║
║  □  Probado en Sunmi V2SE real con papel y sin papel         ║
║  □  DOD de App Móvil sección 3.5 cumple                     ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## FASE 2C — Web Avanzada

**Objetivo:** implementar el dashboard con KPIs, los 5 módulos de reportes con gráficas, el formulario de nueva compra, y las páginas de proveedores y existencias.

**Prerrequisito:** Fase 1C + Fase 2A completas.

### 2C.1 — Dashboard y KPIs

| Orden | Skill | Produce |
|---|---|---|
| 1 | `kpi-cards-dashboard` (SKILL-27) | `KpiCard` reutilizable (delta %, skeleton), `StockAlertBanner`, `DashboardPage` completo |

### 2C.2 — Reportes con gráficas

| Orden | Skill | Produce |
|---|---|---|
| 2 | `recharts-reportes` (SKILL-26) | `LineChartCard`, `BarChartCard`, paleta de colores, integración con date-fns y tooltips con moneda |

### 2C.3 — Formulario de nueva compra

| Orden | Skill | Produce |
|---|---|---|
| 3 | `nueva-compra-form` (SKILL-29) | `NuevaCompraPage` con useFieldArray, toggle catálogo/libre, total en tiempo real, dialog de confirmación |

**Validar (todo el bloque 2C):**

- [ ] Dashboard muestra 4 KPIs principales, gráfica semanal, top 5 productos, alerta stock bajo
- [ ] `useDashboard()` se auto-refresca cada 5 minutos
- [ ] Reporte de ventas: LineChart por día + desglose por vendedor
- [ ] Reporte productos top: BarChart horizontal con porcentajes
- [ ] Reporte inventario: tabla con entradas, salidas, balance
- [ ] Reporte rentabilidad: tabla con margen y código de color
- [ ] Reporte compras: LineChart por día + desglose por proveedor
- [ ] Nueva compra: ítems dinámicos, total en tiempo real, confirmación obligatoria
- [ ] Tras guardar compra: existencias actualizadas sin recargar la página
- [ ] CRUD de proveedores completo en la UI
- [ ] Página de existencias muestra stock actual con código de color

### Checkpoint de Fase 2C

```
╔═══════════════════════════════════════════════════════════════╗
║  FASE 2C COMPLETADA cuando:                                 ║
║                                                              ║
║  □  Dashboard con KPIs, gráfica y alertas funcional          ║
║  □  5 reportes con gráficas Recharts operativos              ║
║  □  Nueva compra con ítems dinámicos funcional               ║
║  □  Proveedores: CRUD completo                               ║
║  □  Existencias: vista con código de color                   ║
║  □  Código de color correcto (verde/amarillo/rojo)           ║
║  □  DOD de Panel Web secciones 4.4-4.6 cumplen              ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## FASE 3 — Deploy

**Objetivo:** desplegar los tres componentes a producción: API en VPS, panel web en VPS, APK firmado para Sunmi V2SE.

**Prerrequisito:** todas las fases anteriores completadas y probadas en desarrollo.

### 3.1 — Deploy API

| Orden | Skill | Produce |
|---|---|---|
| 1 | `deploy-api-vps` (SKILL-31) | Node.js 20 en VPS, PM2 cluster, Nginx reverse proxy, SSL con Certbot, script `deploy-api.sh` |

**Validar:**

- [ ] `curl https://api.tudominio.com/health` retorna `{"status":"ok"}`
- [ ] PM2 muestra la API en estado `online` con 2+ instancias
- [ ] SSL instalado: HTTP redirige a HTTPS
- [ ] `prisma migrate deploy` aplicó todas las migraciones
- [ ] Usuario admin seed creado en la BD de producción

### 3.2 — Deploy Web

| Orden | Skill | Produce |
|---|---|---|
| 2 | `deploy-web-vps` (SKILL-32) | Build Vite con `VITE_API_URL` de producción, Nginx con SPA fallback, SSL, script `deploy-web.sh` |

**Validar:**

- [ ] `https://tudominio.com` carga el panel web
- [ ] Login funcional contra la API de producción
- [ ] Recargar `/dashboard` directamente NO da 404 (SPA fallback funciona)
- [ ] Assets cacheados con `Cache-Control: public, immutable`
- [ ] Sin errores CORS en el navegador

### 3.3 — Android Release Build

| Orden | Skill | Produce |
|---|---|---|
| 3 | `android-release-build` (SKILL-33) | APK firmado `app-release.apk`, keystore, ProGuard configurado |

**Validar:**

- [ ] `./gradlew assembleRelease` completa sin errores
- [ ] `jarsigner -verify` confirma que el APK está firmado
- [ ] APK instalado en Sunmi V2SE via ADB
- [ ] Login funciona contra la API de producción
- [ ] Venta online funciona
- [ ] Venta offline + reconexión + sync automático funciona
- [ ] Recibo se imprime correctamente

### Checkpoint de Fase 3

```
╔═══════════════════════════════════════════════════════════════╗
║  FASE 3 COMPLETADA cuando:                                  ║
║                                                              ║
║  □  API operativa en https://api.tudominio.com               ║
║  □  Panel web operativo en https://tudominio.com             ║
║  □  APK release instalado en Sunmi V2SE                      ║
║  □  Prueba end-to-end completa:                              ║
║     - Venta offline en Sunmi                                 ║
║     - Reconexión → sync automático                           ║
║     - Venta visible en panel web                             ║
║     - Recibo impreso correctamente                           ║
║  □  DOD de Fase/Sprint (DOD.md sección 6) cumple            ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Mapa de dependencias entre skills

El siguiente diagrama muestra qué skill depende de cuál. **Nunca ejecutar una skill sin que sus dependencias estén completadas.**

```
SKILL-01 (monorepo-setup)
    │
    ├── SKILL-02 (shared-types)
    │
    ├── SKILL-00D (design-system) ← fuente única de la paleta de marca
    │       │ (requerido por SKILL-10, SKILL-16, SKILL-21, SKILL-26)
    │
    ├── SKILL-00M (multitenancy-empresa-sucursal) ← fuente única del modelo
    │       │ empresa/sucursal (requerido por SKILL-04, 05, 07, 08, 09,
    │       │ 11, 19, 22, 23, 30 — gana sobre todas donde se contradigan)
    │
    ├── SKILL-03 (fastify-project-structure)
    │       │
    │       ├── SKILL-04 (prisma-mysql)
    │       │
    │       ├── SKILL-05 (fastify-auth-jwt) ← depende de SKILL-04
    │       │
    │       ├── SKILL-06 (fastify-zod-validation) ← depende de SKILL-05
    │       │
    │       ├── SKILL-07 (api-ventas-sync) ← depende de SKILL-04, 05, 06
    │       │
    │       ├── SKILL-08 (api-compras-proveedores) ← depende de SKILL-04, 05, 06
    │       │
    │       └── SKILL-09 (api-reportes) ← depende de SKILL-04, 05, 06
    │
    ├── SKILL-10 (android-project-structure)
    │       │
    │       ├── SKILL-11 (room-database)
    │       │
    │       ├── SKILL-19 (datastore-preferences)
    │       │
    │       ├── SKILL-14 (retrofit-okhttp-setup) ← depende de SKILL-19
    │       │
    │       ├── SKILL-17 (hilt-dependency-injection) ← depende de SKILL-11, 14, 19
    │       │
    │       ├── SKILL-12 (repository-pattern) ← depende de SKILL-11, 14
    │       │
    │       ├── SKILL-13 (workmanager-syncworker) ← depende de SKILL-11, 12, 17
    │       │
    │       ├── SKILL-15 (jetpack-compose-navigation) ← depende de SKILL-19, 20
    │       │
    │       ├── SKILL-16 (compose-ui-sunmi) ← depende de SKILL-20
    │       │
    │       ├── SKILL-20 (mvvm-viewmodel-stateflow) ← depende de SKILL-12, 15
    │       │
    │       └── SKILL-18 (sunmi-printer-sdk) ← depende de SKILL-17
    │
    └── SKILL-21 (react-project-structure)
            │
            ├── SKILL-30 (zustand-auth-store)
            │
            ├── SKILL-22 (react-router-auth-guards) ← depende de SKILL-30
            │
            ├── SKILL-23 (tanstack-query-axios) ← depende de SKILL-30
            │
            ├── SKILL-24 (react-hook-form-zod) ← depende de SKILL-23
            │
            ├── SKILL-25 (tanstack-table)
            │
            ├── SKILL-28 (period-filter-component)
            │
            ├── SKILL-27 (kpi-cards-dashboard) ← depende de SKILL-23, 26
            │
            ├── SKILL-26 (recharts-reportes) ← depende de SKILL-23
            │
            └── SKILL-29 (nueva-compra-form) ← depende de SKILL-23, 24, 28

Deploy (requiere todas las anteriores):
    SKILL-31 (deploy-api-vps)
    SKILL-32 (deploy-web-vps) ← depende de SKILL-31
    SKILL-33 (android-release-build) ← depende de SKILL-31
```

---

## Protocolo de inicio de sesión de trabajo

Cada vez que Claude Code inicie una nueva sesión, debe seguir este protocolo:

1. **Leer `CLAUDE.md`** para refrescar las reglas no negociables y el modelo de datos.
2. **Leer este archivo (`ROADMAP.md`)** para identificar en qué fase/subfase se quedó el desarrollo.
3. **Revisar el checkpoint de la fase actual** — si está completo, avanzar a la siguiente fase.
4. **Leer la skill correspondiente al paso actual** antes de escribir código.
5. **Tras completar un paso**, verificar con su checklist de validación.
6. **Tras completar una fase**, verificar con el checkpoint de fase y anotar el avance.

---

## Protocolo de continuidad entre sesiones

Para evitar retrocesos entre sesiones de Claude Code, mantener un archivo `PROGRESO.md` en la raíz del monorepo con este formato:

```markdown
# PROGRESO.md — JoyasPOS

## Sesión actual
- **Fecha:** 2026-XX-XX
- **Fase:** 1B
- **Subfase:** 1B.5
- **Skill actual:** repository-pattern-offline-first (SKILL-12)
- **Estado:** en progreso / completada
- **Próximo paso:** SKILL-13 (workmanager-syncworker)

## Fases completadas
- [x] Fase 0 — Scaffolding (2026-XX-XX)
- [x] Fase 1A — API Core (2026-XX-XX)
- [ ] Fase 1B — Mobile Core
- [ ] Fase 1C — Web Core
- [ ] Fase 2A — API Avanzada
- [ ] Fase 2B — Mobile Avanzada
- [ ] Fase 2C — Web Avanzada
- [ ] Fase 3 — Deploy

## Notas de la última sesión
(Lo que sea relevante para la siguiente sesión)
```

Al inicio de cada sesión, Claude Code debe leer `PROGRESO.md` para saber exactamente dónde continuar.
