---
name: monorepo-setup
description: |
  Configura el monorepo JoyasPOS desde cero con pnpm workspaces + Turborepo.
  Usar SIEMPRE al inicializar el proyecto, crear la estructura de directorios,
  configurar pnpm-workspace.yaml, turbo.json, package.json raíz, y los tres
  workspaces (api, web, mobile). También usar cuando se agregue un workspace
  nuevo o se necesite ajustar la configuración de Turborepo (pipelines, caché).
  Es la Fase 0 obligatoria antes de cualquier otro skill del proyecto.
---

# SKILL-01 — Monorepo Setup (JoyasPOS)

## Contexto del proyecto

Monorepo con tres workspaces:
- `apps/api` — Fastify 4 + Prisma + MySQL (pnpm)
- `apps/web` — React 18 + TypeScript + Vite (pnpm)
- `apps/mobile` — Android/Kotlin (Gradle; NO es workspace pnpm, vive en el mismo repo)
- `packages/shared-types` — Tipos TypeScript compartidos (pnpm)

---

## 1. Estructura de directorios a crear

```
joyaspos/
├── apps/
│   ├── api/
│   │   └── package.json          # workspace api
│   ├── web/
│   │   └── package.json          # workspace web
│   └── mobile/                   # proyecto Android (Gradle, no pnpm workspace)
│       └── .gitkeep
├── packages/
│   └── shared-types/
│       ├── package.json
│       └── src/
│           └── index.ts
├── .gitignore
├── .npmrc
├── package.json                   # raíz del monorepo
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

Crear con:
```bash
mkdir -p apps/api apps/web apps/mobile packages/shared-types/src
touch apps/mobile/.gitkeep packages/shared-types/src/index.ts
```

---

## 2. Archivos de configuración raíz

### `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/api'
  - 'apps/web'
  - 'packages/*'
```
> `apps/mobile` NO se incluye — es un proyecto Gradle independiente.

---

### `.npmrc`
```
shamefully-hoist=false
strict-peer-dependencies=false
auto-install-peers=true
```

---

### `package.json` (raíz)
```json
{
  "name": "joyaspos",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

### `.gitignore`
```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.production

# Turbo
.turbo/

# Android
apps/mobile/.gradle/
apps/mobile/build/
apps/mobile/local.properties
*.apk
*.aab

# Logs
*.log
pnpm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
*.iml
.vscode/settings.json
```

---

## 3. Package raíz de `shared-types`

### `packages/shared-types/package.json`
```json
{
  "name": "@joyaspos/shared-types",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

### `packages/shared-types/src/index.ts`
```typescript
// Exportaciones iniciales — se expanden en SKILL-02 (shared-types)
export * from './types/auth'
export * from './types/productos'
export * from './types/ventas'
export * from './types/compras'
export * from './types/reportes'
```

Crear los archivos vacíos por ahora:
```bash
mkdir -p packages/shared-types/src/types
touch packages/shared-types/src/types/{auth,productos,ventas,compras,reportes}.ts
```

---

## 4. Package.json mínimos de workspaces

### `apps/api/package.json` (mínimo inicial)
```json
{
  "name": "api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  }
}
```

### `apps/web/package.json` (mínimo inicial)
```json
{
  "name": "web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  }
}
```

---

## 5. Inicialización

```bash
# Desde la raíz del monorepo
pnpm install

# Verificar que los workspaces están reconocidos
pnpm ls -r --depth 0
```

Salida esperada:
```
Legend: production dependency, optional only, dev only

joyaspos@1.0.0 /path/to/joyaspos

devDependencies:
turbo 2.x.x

packages/shared-types/@joyaspos/shared-types@1.0.0

apps/api/api@1.0.0

apps/web/web@1.0.0
```

---

## 6. Reglas de estructura (NO NEGOCIABLES)

1. **Nunca instalar dependencias en la raíz** salvo herramientas de monorepo (turbo, eslint config raíz).
2. **Siempre instalar en el workspace correspondiente:** `pnpm --filter api add fastify`
3. **`apps/mobile` no es workspace pnpm** — el proyecto Android se gestiona exclusivamente con Gradle.
4. **shared-types es fuente de verdad de tipos** — nunca duplicar interfaces entre api y web.
5. **Todos los scripts de build siguen el pipeline de Turbo** — no ejecutar builds manualmente si hay dependencias entre paquetes.

---

## 7. Comandos frecuentes de referencia

```bash
# Agregar dependencia a un workspace específico
pnpm --filter api add fastify
pnpm --filter web add react react-dom
pnpm --filter api add -D typescript @types/node

# Agregar shared-types como dependencia interna
pnpm --filter api add @joyaspos/shared-types
pnpm --filter web add @joyaspos/shared-types

# Ejecutar script en workspace específico
pnpm --filter api exec prisma generate

# Ejecutar todos los builds en orden correcto (Turbo)
pnpm turbo build

# Limpiar todo
pnpm turbo clean && rm -rf node_modules
```

---

## 8. Siguiente paso

Una vez completada esta skill, continuar con:
- **SKILL-02** (`shared-types`) — Definir todos los tipos TypeScript compartidos
- **SKILL-03** (`fastify-project-structure`) — Scaffolding del proyecto API
- **SKILL-10** (`android-project-structure`) — Scaffolding del proyecto Android
- **SKILL-21** (`react-project-structure`) — Scaffolding del proyecto Web
