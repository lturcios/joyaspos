---
name: fastify-project-structure
description: |
  Scaffolding completo del proyecto API de JoyasPOS: Fastify 4 + TypeScript +
  Prisma + Zod + JWT. Usar al inicializar apps/api desde cero, al agregar un
  módulo nuevo (auth, productos, ventas, compras, proveedores, reportes, usuarios),
  o al configurar plugins globales (CORS, logger Pino, manejo de errores, variables
  de entorno). También usar como referencia de la estructura modular cuando se
  dude dónde ubicar un archivo nuevo dentro de la API.
  Depende de SKILL-01 (monorepo-setup). Complementar con SKILL-04 (prisma-mysql),
  SKILL-05 (fastify-auth-jwt) y SKILL-06 (fastify-zod-validation).
---

# SKILL-03 — Fastify Project Structure (apps/api)

## Stack
Node.js 20 LTS · Fastify 4 · TypeScript 5 · Prisma · Zod · JWT · bcryptjs · Pino · pnpm

---

## 1. Estructura de directorios completa

```
apps/api/
├── src/
│   ├── index.ts                  # Entry point; registra plugins y arranca el servidor
│   ├── app.ts                    # Crea y configura la instancia de Fastify
│   ├── config/
│   │   └── env.ts                # Carga y valida variables de entorno con Zod
│   ├── plugins/
│   │   ├── prisma.ts             # Plugin que inyecta PrismaClient en fastify
│   │   ├── auth.ts               # Plugin JWT (decoradores request.user, requireAuth, requireAdmin)
│   │   └── cors.ts               # Configuración de CORS
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.handler.ts
│   │   │   └── auth.schema.ts    # Schemas Zod del módulo
│   │   ├── productos/
│   │   │   ├── productos.routes.ts
│   │   │   ├── productos.handler.ts
│   │   │   └── productos.schema.ts
│   │   ├── ventas/
│   │   │   ├── ventas.routes.ts
│   │   │   ├── ventas.handler.ts
│   │   │   └── ventas.schema.ts
│   │   ├── compras/
│   │   │   ├── compras.routes.ts
│   │   │   ├── compras.handler.ts
│   │   │   └── compras.schema.ts
│   │   ├── proveedores/
│   │   │   ├── proveedores.routes.ts
│   │   │   ├── proveedores.handler.ts
│   │   │   └── proveedores.schema.ts
│   │   ├── reportes/
│   │   │   ├── reportes.routes.ts
│   │   │   └── reportes.handler.ts
│   │   └── usuarios/
│   │       ├── usuarios.routes.ts
│   │       ├── usuarios.handler.ts
│   │       └── usuarios.schema.ts
│   └── shared/
│       ├── errors.ts             # Helpers para lanzar errores HTTP consistentes
│       └── types.ts              # Extensión del tipo FastifyRequest con user
├── prisma/
│   ├── schema.prisma             # Ver SKILL-04
│   └── migrations/               # Generadas por prisma migrate dev
├── .env                          # NUNCA commitear
├── .env.example                  # Sí commitear
├── package.json
└── tsconfig.json
```

---

## 2. Dependencias

```bash
# Producción
pnpm --filter api add fastify @fastify/cors @fastify/jwt
pnpm --filter api add fastify-plugin
pnpm --filter api add @prisma/client
pnpm --filter api add zod
pnpm --filter api add bcryptjs
pnpm --filter api add dotenv

# Desarrollo
pnpm --filter api add -D typescript @types/node @types/bcryptjs
pnpm --filter api add -D tsx prisma
pnpm --filter api add @joyaspos/shared-types
```

---

## 3. Archivos de configuración del workspace

### `apps/api/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `apps/api/package.json` (completo)
```json
{
  "name": "api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  }
}
```

---

## 4. Configuración de variables de entorno

### `.env.example`
```env
# Base de datos MySQL
DATABASE_URL="mysql://usuario:contraseña@host:3306/joyaspos"

# JWT
JWT_SECRET="cambia_esto_por_un_secret_de_al_menos_32_caracteres"
JWT_EXPIRES_IN="8h"

# Servidor
PORT=3000
HOST=0.0.0.0

# CORS — orígenes permitidos separados por coma
CORS_ORIGINS="http://localhost:5173,https://tudominio.com"
```

### `src/config/env.ts`
```typescript
import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
```

---

## 5. Instancia Fastify y plugins

### `src/app.ts`
```typescript
import Fastify from 'fastify'
import { env } from './config/env'
import { prismaPlugin } from './plugins/prisma'
import { authPlugin } from './plugins/auth'
import { corsPlugin } from './plugins/cors'

// Importar routers de módulos
import { authRoutes } from './modules/auth/auth.routes'
import { productosRoutes } from './modules/productos/productos.routes'
import { ventasRoutes } from './modules/ventas/ventas.routes'
import { comprasRoutes } from './modules/compras/compras.routes'
import { proveedoresRoutes } from './modules/proveedores/proveedores.routes'
import { reportesRoutes } from './modules/reportes/reportes.routes'
import { usuariosRoutes } from './modules/usuarios/usuarios.routes'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // Plugins globales
  await app.register(corsPlugin)
  await app.register(prismaPlugin)
  await app.register(authPlugin)

  // Manejo global de errores
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500
    app.log.error(error)
    reply.status(statusCode).send({
      statusCode,
      error: error.name ?? 'Error',
      message:
        process.env.NODE_ENV === 'production' && statusCode >= 500
          ? 'Error interno del servidor'
          : error.message,
    })
  })

  // Rutas de módulos con prefijo /api
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(productosRoutes, { prefix: '/productos' })
  await app.register(ventasRoutes, { prefix: '/ventas' })
  await app.register(comprasRoutes, { prefix: '/compras' })
  await app.register(proveedoresRoutes, { prefix: '/proveedores' })
  await app.register(reportesRoutes, { prefix: '/reportes' })
  await app.register(usuariosRoutes, { prefix: '/usuarios' })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  return app
}
```

### `src/index.ts`
```typescript
import { buildApp } from './app'
import { env } from './config/env'

async function main() {
  const app = await buildApp()

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    console.log(`🚀 API corriendo en http://${env.HOST}:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
```

---

## 6. Plugins

### `src/plugins/prisma.ts`
```typescript
import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })

  await prisma.$connect()

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect()
  })
})

export { prismaPlugin }

// Extensión de tipos Fastify para reconocer fastify.prisma
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}
```

### `src/plugins/cors.ts`
```typescript
import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import { env } from '../config/env'

export const corsPlugin = fp(async (fastify) => {
  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim())
  await fastify.register(cors, {
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
})
```

### `src/plugins/auth.ts`
> **Nota:** El código completo del plugin de autenticación está en **SKILL-05
> (`fastify-auth-jwt`)**. Esta skill solo lo lista como dependencia para
> mantener el orden de registro en `app.ts` (debe ir después de `prismaPlugin`).
> Implementar este archivo siguiendo SKILL-05.

```typescript
// Resumen mínimo — ver SKILL-05 para implementación completa
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { env } from '../config/env'

export const authPlugin = fp(async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })
  // Decoradores requireAuth y requireAdmin — ver SKILL-05
})
```

---

## 7. Patrón de módulo (template reutilizable)

Todo módulo sigue exactamente este patrón de tres archivos:

### `src/modules/{modulo}/{modulo}.schema.ts`
```typescript
import { z } from 'zod'

export const createXSchema = z.object({
  campo: z.string().min(1),
  // ...
})

export type CreateXInput = z.infer<typeof createXSchema>
```

### `src/modules/{modulo}/{modulo}.handler.ts`
```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import type { CreateXInput } from './{modulo}.schema'

export async function createX(
  request: FastifyRequest<{ Body: CreateXInput }>,
  reply: FastifyReply
) {
  const prisma = request.server.prisma
  // lógica de negocio...
  return reply.status(201).send(resultado)
}
```

### `src/modules/{modulo}/{modulo}.routes.ts`
```typescript
import { FastifyPluginAsync } from 'fastify'
import { createX, listX } from './{modulo}.handler'

export const xRoutes: FastifyPluginAsync = async (fastify) => {
  // Ruta protegida — todos los roles
  fastify.get('/', { preHandler: [fastify.requireAuth] }, listX)

  // Ruta protegida — solo admin
  // La validación Zod del body se ejecuta DENTRO del handler con el helper validate()
  // definido en SKILL-06 — no aquí. Fastify usa AJV/JSON Schema por defecto.
  fastify.post(
    '/',
    { preHandler: [fastify.requireAdmin] },
    createX
  )
}
```

> **Importante:** El proyecto usa el patrón de **validación manual con Zod
> dentro del handler** (ver SKILL-06). NO se pasa el schema Zod al campo
> `schema` de Fastify — esa propiedad espera JSON Schema y compila con AJV,
> no con Zod.

---

## 8. `src/shared/errors.ts`
```typescript
import { FastifyReply } from 'fastify'

export function sendNotFound(reply: FastifyReply, message = 'Recurso no encontrado') {
  return reply.status(404).send({ statusCode: 404, error: 'Not Found', message })
}

export function sendConflict(reply: FastifyReply, message: string) {
  return reply.status(409).send({ statusCode: 409, error: 'Conflict', message })
}

export function sendBadRequest(reply: FastifyReply, message: string) {
  return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message })
}

export function sendForbidden(reply: FastifyReply, message = 'Sin permisos para esta acción') {
  return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message })
}
```

---

## 9. Reglas del proyecto API

1. **Nunca usar `any` en TypeScript** sin comentario que explique por qué.
2. **Nunca hardcodear el JWT_SECRET** ni el DATABASE_URL — siempre de `env.ts`.
3. **Nunca poner lógica de negocio en el archivo de rutas** — va en el handler.
4. **Nunca eliminar registros físicamente** — soft delete con `activo = false`.
5. **Siempre usar transacciones Prisma** cuando la operación toca más de una tabla.
6. **El formato de error es siempre** `{ statusCode, error, message }`.
7. **Todos los endpoints (excepto /auth/login y /health) requieren JWT**.

---

## 10. Siguiente paso

Con esta estructura lista, continuar con:
- **SKILL-04** (`prisma-mysql`) — Definir el schema completo y crear la primera migración
- **SKILL-05** (`fastify-auth-jwt`) — Implementar el módulo `auth` completo
- **SKILL-06** (`fastify-zod-validation`) — Validación con Zod en todos los módulos
