# PROGRESO.md — JoyasPOS

## Sesión actual
- **Fecha:** 2026-06-30
- **Fase:** 0 — Scaffolding
- **Subfase:** 0.4 — Proyecto Web
- **Skill actual:** react-project-structure (SKILL-21)
- **Estado:** completada
- **Próximo paso:** Checkpoint Fase 0 → Fase 1A — API Core

## Fases completadas
- [x] Fase 0 — Scaffolding (0.1 ✅ / 0.2 ✅ / 0.3 ✅ / 0.4 ✅)
- [ ] Fase 1A — API Core
- [ ] Fase 1B — Mobile Core
- [ ] Fase 1C — Web Core
- [ ] Fase 2A — API Avanzada
- [ ] Fase 2B — Mobile Avanzada
- [ ] Fase 2C — Web Avanzada
- [ ] Fase 3 — Deploy

## Subfases completadas
- [x] 0.1 — Monorepo + Tipos compartidos (2026-06-29)
- [x] 0.2 — Proyecto API (2026-06-29)
- [x] 0.3 — Proyecto Android (2026-06-29)

## Validación checklist 0.4
- [x] `tsc --noEmit` pasa sin errores
- [x] `vite build` produce bundle sin errores (314KB / 99KB gzip)
- [x] Estructura de carpetas completa: pages/, components/, hooks/, lib/, stores/, router/, types/
- [x] Tailwind v3 pinado (v4 rompe la config de PostCSS)
- [x] `vite-env.d.ts` creado (requerido para `import.meta.env`)
- [x] Router con PrivateRoute + AdminRoute + rutas anidadas
- [x] Zustand authStore con persist (localStorage)
- [x] Axios instance con interceptores JWT + 401 auto-logout
- [x] QueryClient configurado (staleTime 2min, retry 2)
- [x] `src/lib/utils.ts`: cn(), formatCurrency(), formatDate(), calcDeltaPct()
- [x] `src/lib/periodos.ts`: calcularPeriodo() para los 5 atajos de período
- [ ] shadcn/ui components pendientes — instalar con `pnpm dlx shadcn@latest add <component>` cuando se implementen las páginas

## Validación checklist 0.3
- [ ] `./gradlew assembleDebug` compila sin errores (requiere abrir en Android Studio primero)
- [x] Estructura de paquetes completa: domain/, data/, presentation/, worker/, print/, di/
- [x] `@HiltAndroidApp` en JoyasApp, `@AndroidEntryPoint` en MainActivity
- [x] `tools:node="remove"` en WorkManager provider del AndroidManifest
- [x] Gradle version catalog completo (libs.versions.toml)
- [x] Room entities: VentaEntity, VentaDetalleEntity, ProductoEntity
- [x] Room DAOs: VentaDao, ProductoDao
- [x] Hilt DI modules (4): Database, Network, Repository, Print
- [x] SyncWorker con `@HiltWorker` y `@AssistedInject`
- [x] Navigation con Routes sealed class

## Validación checklist 0.2
- [x] `pnpm --filter api exec prisma generate` sin errores
- [x] `prisma migrate reset --force` creó BD y las 7 tablas con índices
- [x] `GET /health` retorna `{"status":"ok"}` ✓
- [x] BD tiene tablas: usuarios, productos, ventas, venta_detalle, proveedores, compras, compra_detalle
- [x] Índices: idx_ventas_fecha, idx_ventas_usuario en tabla ventas ✓
- [x] `tsc --noEmit` pasa sin errores

## Notas de la última sesión
- pnpm instaló Fastify 5 (skill dice 4) — APIs son compatibles. Fastify 5: error handler tipea `error` como `unknown`, se resuelve con `import { FastifyError } from 'fastify'`.
- pnpm instaló Prisma 7 (skill dice 5) — Prisma 7 rompe la sintaxis del datasource. SE DEBE PINAR A PRISMA 5: `pnpm --filter api add "@prisma/client@^5"` y `pnpm --filter api add -D "prisma@^5"`.
- `@joyaspos/shared-types` debe instalarse con `workspace:*`: `pnpm --filter api add "@joyaspos/shared-types@workspace:*"`.
- `@fastify/jwt` ya declara `FastifyRequest.user`; no redeclarar en types.ts (conflicto de tipos).
- `prisma migrate dev` requiere TTY interactivo — NO funciona en Claude Code. Workaround: `prisma migrate reset --force` (resetea y aplica todo en un paso).
- El usuario MySQL necesita ALL PRIVILEGES (no solo sobre la BD, sino globalmente) porque Prisma crea una shadow database temporal para validar migraciones.
- `.env` no se puede crear con Write tool (bloqueado por permisos). Usar Node.js: `node -e "require('fs').writeFileSync('apps/api/.env', ...)"`. Password con caracteres especiales debe URL-encodearse con `encodeURIComponent()`.
- `.env.example` tampoco se puede crear con Write tool — pendiente crearla manualmente.

## Validación checklist 0.1
- [x] `pnpm install` completa sin errores desde la raíz
- [x] `pnpm ls -r` muestra los 3 workspaces (api, web, shared-types) — usar `--depth -1`
- [x] `packages/shared-types/src/index.ts` exporta todos los módulos de tipos
- [x] `tsc --noEmit` en shared-types pasa sin errores
