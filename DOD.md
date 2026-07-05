# Definition of Done (DoD) — JoyasPOS v2.0
**Versión:** 2.0.0 | **Fecha:** 2026-06-29

---

## 1. DoD Global del Monorepo

Aplica a cualquier cambio antes de considerarlo terminado:

### 1.1 Código
- [ ] Código en el lenguaje y framework definido en PRD para ese componente
- [ ] Compila/transpila sin errores
- [ ] Sin warnings críticos del compilador sin justificación
- [ ] Sin código comentado sin propósito (TODOs sin ticket, bloques desactivados)
- [ ] Nombres de variables/funciones/clases en inglés (código); mensajes y UI en español
- [ ] Sin credenciales, secrets ni rutas absolutas hardcodeadas

### 1.2 Funcionalidad
- [ ] Cumple TODOS los criterios de aceptación de su Historia de Usuario
- [ ] Cubre los flujos alternativos documentados en su Caso de Uso
- [ ] Probado manualmente de punta a punta en entorno de desarrollo

### 1.3 Estructura
- [ ] Archivos en la carpeta correcta según la arquitectura definida en PRD
- [ ] Dependencias nuevas registradas en package.json / build.gradle correspondiente
- [ ] No rompe la estructura del monorepo

---

## 2. DoD — API REST (Fastify/Node.js)

### 2.1 Por endpoint
- [ ] Protegido con JWT (excepto POST /auth/login)
- [ ] Validación de entrada con **Zod** rechaza datos inválidos con HTTP 400
- [ ] Control de rol implementado cuando aplica (admin vs vendedor)
- [ ] Código HTTP correcto: 200, 201, 400, 401, 403, 404, 409, 500
- [ ] Formato de error consistente: `{ statusCode, error, message }`
- [ ] Operaciones en múltiples tablas usan **transacciones Prisma** (`prisma.$transaction`)
- [ ] Probado manualmente con cliente HTTP (Insomnia, curl)
- [ ] Documentado en README de la API (método, ruta, body, respuesta)

### 2.2 Módulo de Compras (específico)
- [ ] POST /compras incrementa existencias en la misma transacción que inserta la compra
- [ ] Endpoint acepta `proveedor_id` O `proveedor_nombre`; nunca ambos nulos
- [ ] GET /compras filtra correctamente por fecha_hora usando índice MySQL

### 2.3 Endpoint de sync batch
- [ ] POST /ventas/sync es idempotente (detecta duplicados por timestamp+usuario+monto)
- [ ] Procesa ventas en orden cronológico
- [ ] Retorna `{ sincronizadas: [{local_id, remote_id}], errores: [] }` aunque haya fallos parciales
- [ ] Descuenta existencias por cada venta procesada (misma lógica que POST /ventas)

### 2.4 Endpoints de reportes (específico)
- [ ] Cada endpoint usa JOINs optimizados y los índices definidos en el SRS
- [ ] Responde en < 2 segundos con datos de 6 meses (validar con datos de prueba)
- [ ] Los cálculos de rentabilidad son estimados y están documentados como tal

### 2.5 Base de datos
- [ ] Cambios de esquema tienen su migración Prisma generada (`prisma migrate dev`)
- [ ] `schema.prisma` refleja el estado actual de la BD
- [ ] Relaciones FK definidas en el schema
- [ ] Índices del SRS (RF-RNF-07) aplicados en la migración

### 2.6 Seguridad
- [ ] Contraseñas con `bcryptjs.hash(password, 12)`; nunca en texto plano
- [ ] JWT secret viene de variable de entorno `JWT_SECRET`
- [ ] `DATABASE_URL` en variable de entorno; nunca hardcodeada
- [ ] `.env` en `.gitignore`; `.env.example` actualizado

---

## 3. DoD — App Móvil (Kotlin/Jetpack Compose)

### 3.1 Room (base de datos local)
- [ ] Todas las entidades tienen su `@Entity` con tableName correcto
- [ ] Todos los DAOs tienen sus métodos definidos con Flows reactivos
- [ ] Las relaciones FK están declaradas en `@Entity(foreignKeys = [...])`
- [ ] La base de datos tiene número de versión correcto (`version = N`)
- [ ] Cualquier cambio de esquema tiene su `Migration(from, to)` implementado; **nunca** `fallbackToDestructiveMigration()` en producción
- [ ] Se puede acceder a los datos sin ninguna conexión a internet

### 3.2 Flag `sincronizado` (requisito crítico)
- [ ] Toda venta nueva se inserta en Room con `sincronizado = false`
- [ ] Solo se marca `sincronizado = true` cuando la API confirma con HTTP 201
- [ ] `remoteId` solo se asigna cuando `sincronizado = true`
- [ ] El estado de sync se refleja en la UI en tiempo real vía Flow de Room
- [ ] La UI muestra chip "Pendiente sync" / chip verde / sin indicador según el estado

### 3.3 WorkManager / SyncWorker
- [ ] `SyncWorker : CoroutineWorker` implementado correctamente
- [ ] Periódico cada 15 minutos registrado al iniciar la app
- [ ] Constraint `NetworkType.CONNECTED` aplicado en todos los WorkRequests
- [ ] Backoff exponencial configurado: `BackoffPolicy.EXPONENTIAL`, delay inicial 1 minuto
- [ ] Máximo `MAX_RUN_ATTEMPT_COUNT = 5` antes de parar
- [ ] OneTimeWorkRequest encolado inmediatamente tras venta fallida online
- [ ] En éxito parcial: solo marca exitosas; no falla toda la ejecución por errores parciales
- [ ] Lotes de máximo 20 ventas por llamada a /ventas/sync

### 3.4 Repository Pattern
- [ ] `VentaRepository` escribe en Room antes de intentar la API (local-first)
- [ ] `ProductoRepository` emite siempre desde Room; la red actualiza el cache
- [ ] Ningún ViewModel accede directamente a Retrofit o Room; todo pasa por el Repository

### 3.5 Impresión Sunmi
- [ ] `SunmiPrintHelper` inyectado por Hilt; no instanciado directamente en Composables/ViewModels
- [ ] Llamada a `InnerPrinterManager.bindService` correctamente manejada (onBind/onError)
- [ ] Contenido del recibo exactamente como especificado en PRD sección 8.1
- [ ] Si venta es offline: ID del recibo es `#L-{localId}`
- [ ] Error de impresora muestra AlertDialog; la venta NO se revierte
- [ ] Botón "Reimprimir recibo" funcional en SaleDetailScreen

### 3.6 Pantallas y Navegación
- [ ] Toda pantalla protegida redirige a Login si no hay JWT válido en DataStore
- [ ] HTTP 401 → limpia token → navega a Login automáticamente
- [ ] Ninguna pantalla queda en estado de "cargando" permanente
- [ ] Cada pantalla tiene manejo de estado: loading / success / error / empty

### 3.7 UI/UX Sunmi V2SE
- [ ] Elementos táctiles interactivos ≥ **48dp × 48dp**
- [ ] Fuentes: listas y labels ≥ 14sp; campos de formulario y botones principales ≥ 16sp
- [ ] Campos numéricos (cantidad, precio) abren teclado numérico `KeyboardType.NumberDecimal`
- [ ] Sin desbordamiento horizontal en pantalla de 5.99" (1080×2160)
- [ ] Loading states con `CircularProgressIndicator`
- [ ] Error states con mensaje visible y botón de reintento

### 3.8 Almacenamiento seguro
- [ ] JWT almacenado en **DataStore Preferences** (no SharedPreferences ni memoria)
- [ ] Al cerrar sesión: DataStore completamente limpiado

---

## 4. DoD — Panel Web (React/TypeScript)

### 4.1 TypeScript
- [ ] `tsc --noEmit` pasa sin errores
- [ ] Sin uso de `any` sin comentario justificado
- [ ] Tipos de respuestas API definidos en `packages/shared-types`

### 4.2 Formularios
- [ ] Usan **React Hook Form + Zod** para validación
- [ ] Errores visibles debajo del campo correspondiente
- [ ] Botón submit deshabilitado durante mutación (TanStack Query `isPending`)
- [ ] Tras éxito: formulario cerrado/reseteado y query invalidada (`queryClient.invalidateQueries`)

### 4.3 Tablas
- [ ] Tablas con > 20 filas tienen paginación (TanStack Table)
- [ ] Tablas de ventas y compras muestran total acumulado del período

### 4.4 Módulo Compras (específico)
- [ ] Selector de producto en nueva compra usa el mismo listado que la app
- [ ] Subtotal por ítem y monto total actualizados en tiempo real
- [ ] Confirmación antes de guardar (dialog de confirmación)
- [ ] Tras guardar: existencias reflejadas en la vista de existencias sin recargar la página

### 4.5 Módulo Reportes (específico)
- [ ] Todos los reportes usan los mismos filtros de período (componente reutilizable)
- [ ] Gráficas Recharts con: tooltips interactivos, leyenda, eje X legible (date-fns para formateo)
- [ ] Tarjetas KPI con delta % y flecha ↑ (verde) / ↓ (rojo)
- [ ] Rentabilidad: código de color correcto (verde > 30%, amarillo 10-30%, rojo < 10%)
- [ ] Inventario: filas con balance negativo en rojo
- [ ] Estado vacío: mensaje descriptivo cuando no hay datos para el período

### 4.6 Responsividad
- [ ] Funcional en: desktop (≥ 1024px), tablet (768px), móvil (375px)
- [ ] Tablas en móvil: scroll horizontal o vista de tarjetas
- [ ] Sidebar/nav colapsable en móvil

### 4.7 Autenticación y rutas
- [ ] Rutas protegidas redirigen a /login si no hay token
- [ ] Rutas admin redirigen a dashboard si el usuario es vendedor
- [ ] Axios interceptor agrega `Authorization: Bearer <token>` automáticamente
- [ ] Axios interceptor maneja 401 → limpiar localStorage → redirigir a /login

### 4.8 Estados de UI
- [ ] Loading: skeletons o spinner (TanStack Query `isLoading`)
- [ ] Error: mensaje en pantalla con botón "Reintentar" (TanStack Query `isError`)
- [ ] Vacío: mensaje descriptivo (no tabla vacía sin explicación)

---

## 5. DoD por Historia de Usuario

Una HU está **Done** cuando:

| # | Criterio |
|---|---|
| 1 | Todos los CA de la HU verificados manualmente |
| 2 | Endpoints API relacionados cumplen DoD de API |
| 3 | Pantalla/flujo en app y/o web cumple DoD del componente |
| 4 | Flujos alternativos del CU probados (error de red, datos inválidos, sin permisos, offline) |
| 5 | Sin regresiones en funcionalidades previas |
| 6 | Código integrado al branch principal del monorepo |

**Para HUs de sync/offline, adicionalmente:**
| 7 | Probado desconectando red física durante la operación |
| 8 | Probado que el SyncWorker sincroniza al reconectar |
| 9 | Flag `sincronizado` refleja el estado correcto en Room en todo momento |

**Para HUs de impresión, adicionalmente:**
| 10 | Probado en Sunmi V2SE real (no emulador) |
| 11 | Probado el caso de papel agotado |
| 12 | Probado reimprimir desde SaleDetailScreen |

---

## 6. DoD de una Fase/Sprint Completo

| # | Criterio |
|---|---|
| 1 | Todas las HUs del sprint cumplen su DoD individual |
| 2 | Monorepo compila sin errores en todos los workspaces (`pnpm turbo build`) |
| 3 | API desplegada y funcionando en VPS Oracle (PM2 + Nginx) |
| 4 | Panel web desplegado y accesible vía HTTPS |
| 5 | APK instalado y probado en dispositivo Sunmi V2SE real |
| 6 | Prueba end-to-end: venta offline → reconexión → sync automático → visible en panel web |
| 7 | Prueba de impresión en Sunmi V2SE real (online y offline) |
| 8 | README del monorepo actualizado con instrucciones de instalación y despliegue |
| 9 | `.env.example` de la API actualizado con todas las variables |
| 10 | Migraciones Prisma ejecutadas en BD de producción |
| 11 | Room migrations aplicadas en la APK de producción |

---

## 7. Checklist Rápido para Claude Code

```
═══ API ═══════════════════════════════════════
□ ¿Valida con Zod?
□ ¿Transacción Prisma si toca > 1 tabla?
□ ¿JWT requerido (excepto /auth/login)?
□ ¿HTTP code correcto (200/201/400/401/403/404)?
□ ¿Compra incrementa existencias en la misma transacción?
□ ¿Sync batch es idempotente?
□ ¿Reporte responde < 2s?

═══ APP MÓVIL══════════════════════════════════
□ ¿Venta INSERT en Room ANTES de intentar API?
□ ¿sincronizado=false por defecto al crear?
□ ¿sincronizado=true solo si API retorna 201?
□ ¿SyncWorker tiene NetworkType.CONNECTED constraint?
□ ¿SyncWorker tiene backoff exponencial?
□ ¿Lógica en ViewModel, no en Composables?
□ ¿Toques ≥ 48dp?
□ ¿401 → limpiar token → Login?
□ ¿Token en DataStore?
□ ¿Recibo imprime aunque venta sea offline?
□ ¿Error de impresora no revierte la venta?
□ ¿Room migration versionada (no destructiva)?

═══ PANEL WEB ═════════════════════════════════
□ ¿tsc --noEmit sin errores?
□ ¿React Hook Form + Zod en formularios?
□ ¿Query invalidada tras mutación exitosa?
□ ¿Responsivo en 375px?
□ ¿Gráficas con tooltips y leyenda?
□ ¿KPIs de rentabilidad con código de color correcto?
□ ¿Confirmación antes de guardar compra?
□ ¿Estados: loading/error/empty en todas las vistas?

═══ GENERAL ════════════════════════════════════
□ ¿Todos los CA de la HU cubiertos?
□ ¿Flujos alternativos implementados?
□ ¿Sin credenciales hardcodeadas?
□ ¿Probado offline (desconectar red física)?
```
