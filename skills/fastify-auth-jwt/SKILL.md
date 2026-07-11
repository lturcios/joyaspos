---
name: fastify-auth-jwt
description: |
  Implementa el módulo completo de autenticación JWT en la API de JoyasPOS:
  endpoint POST /auth/login con verificación bcrypt, generación de token con
  expiración de 8 horas, plugin de protección de rutas (requireAuth / requireAdmin),
  y decoradores Fastify para leer el usuario del token. Usar al implementar el
  módulo auth por primera vez, al agregar control de rol a un endpoint nuevo, al
  modificar la expiración del token, o al depurar errores 401/403 en cualquier
  endpoint protegido. También usar cuando se necesite cambiar contraseña de usuario
  (hash bcrypt) o cuando se revise la seguridad del flujo de autenticación.
  Depende de SKILL-03 (fastify-project-structure) y SKILL-04 (prisma-mysql).
---

> **⚠️ MULTITENANCY — LEER PRIMERO `skills/multitenancy-empresa-sucursal/SKILL.md`.**
> Esta skill fue escrita antes del requisito multiempresa/multisucursal. La skill
> de multitenancy define deltas OBLIGATORIOS que modifican el código de esta skill
> (campos `empresa_id`/`sucursal_id`, JWT extendido, scoping por sucursal en todos
> los queries, selector de sucursal, aislamiento de datos locales). Donde ambas
> se contradigan, gana la skill de multitenancy.


# SKILL-05 — Fastify Auth + JWT (apps/api)

## Stack
@fastify/jwt · bcryptjs · Zod · Prisma · TypeScript

---

## 1. Dependencias

```bash
pnpm --filter api add @fastify/jwt bcryptjs
pnpm --filter api add -D @types/bcryptjs
pnpm --filter api add fastify-plugin
```

> **Nota:** Solo se necesita `@fastify/jwt` para JWT — éste ya integra todo
> internamente. No instalar `jsonwebtoken` por separado.

---

## 2. Plugin JWT global

### `src/plugins/auth.ts`
```typescript
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env'
import type { JwtPayload } from '@joyaspos/shared-types'

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  // Registrar el plugin JWT con el secret de entorno
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN }, // '8h'
  })

  /**
   * requireAuth — verifica que el request tiene un JWT válido.
   * Uso: { preHandler: [fastify.requireAuth] }
   */
  fastify.decorate(
    'requireAuth',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify()
      } catch {
        reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token inválido o expirado',
        })
      }
    }
  )

  /**
   * requireAdmin — verifica JWT + rol 'admin'.
   * Uso: { preHandler: [fastify.requireAdmin] }
   */
  fastify.decorate(
    'requireAdmin',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify()
        const user = request.user as JwtPayload
        if (user.rol !== 'admin') {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Se requiere rol administrador',
          })
        }
      } catch {
        reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token inválido o expirado',
        })
      }
    }
  )
})

// Extensión de tipos para que TypeScript reconozca los decoradores
declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    // request.user queda tipado correctamente después de jwtVerify()
    user: JwtPayload
  }
}
```

---

## 3. Módulo auth completo

### `src/modules/auth/auth.schema.ts`
```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  username: z
    .string({ required_error: 'El username es requerido' })
    .min(1, 'El username no puede estar vacío')
    .max(50),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(1, 'La contraseña no puede estar vacía'),
})

export type LoginInput = z.infer<typeof loginSchema>
```

### `src/modules/auth/auth.handler.ts`
```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { validate } from '../../shared/validate'
import { loginSchema } from './auth.schema'
import type { LoginResponse } from '@joyaspos/shared-types'

export async function loginHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Validación con Zod (ver SKILL-06 para el helper validate())
  const body = validate(loginSchema, request.body, reply)
  if (!body) return  // validate() ya envió el 400

  const { username, password } = body
  const prisma = request.server.prisma

  // 1. Buscar usuario activo por username
  const usuario = await prisma.usuario.findFirst({
    where: { username, activo: true },
    select: {
      id: true,
      username: true,
      password_hash: true,
      nombre_completo: true,
      rol: true,
      activo: true,
    },
  })

  // 2. Verificar existencia y contraseña
  // Usar mensaje genérico — nunca especificar cuál campo es incorrecto
  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Usuario o contraseña incorrectos',
    })
  }

  // 3. Generar JWT con payload mínimo necesario
  const token = await reply.jwtSign({
    sub: usuario.id,
    username: usuario.username,
    rol: usuario.rol,
  })

  // 4. Responder con token + datos públicos del usuario
  const response: LoginResponse = {
    token,
    user: {
      id: usuario.id,
      username: usuario.username,
      nombre_completo: usuario.nombre_completo ?? usuario.username,
      rol: usuario.rol as 'admin' | 'vendedor',
    },
  }

  return reply.status(200).send(response)
}
```

### `src/modules/auth/auth.routes.ts`
```typescript
import { FastifyPluginAsync } from 'fastify'
import { loginHandler } from './auth.handler'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /auth/login
   * Público — no requiere JWT
   * La validación Zod se ejecuta DENTRO del handler con el helper validate()
   * definido en SKILL-06 (src/shared/validate.ts).
   */
  fastify.post('/login', loginHandler)
}
```

> El handler `loginHandler` debe llamar `validate(loginSchema, request.body, reply)`
> al inicio. Ver SKILL-06 para el patrón estándar de validación del proyecto.

---

## 4. Módulo de usuarios — helpers de contraseña

Reutilizar estas funciones en el módulo `usuarios` para crear y cambiar contraseñas:

```typescript
// src/modules/usuarios/usuarios.handler.ts
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12 // Mínimo definido en SRS RNF-01

/**
 * Hashea una contraseña nueva con bcrypt.
 * NUNCA almacenar el password original.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS)
}

/**
 * Valida que la contraseña cumple requisitos mínimos antes de hashear.
 * (mínimo 6 caracteres — SRS RF-USER-02)
 */
export function validatePasswordStrength(password: string): boolean {
  return password.length >= 6
}
```

---

## 5. Cómo proteger cualquier endpoint

### Ruta accesible para todos los usuarios autenticados
```typescript
fastify.get(
  '/',
  { preHandler: [fastify.requireAuth] },
  async (request, reply) => {
    const user = request.user  // tipado como JwtPayload
    // ...
  }
)
```

### Ruta solo para administradores
```typescript
fastify.post(
  '/',
  { preHandler: [fastify.requireAdmin] },
  async (request, reply) => {
    const user = request.user  // tipado como JwtPayload, rol = 'admin'
    // ...
  }
)
```

### Filtrar datos por usuario (vendedor solo ve lo suyo)
```typescript
fastify.get(
  '/ventas',
  { preHandler: [fastify.requireAuth] },
  async (request, reply) => {
    const user = request.user
    const where = user.rol === 'admin'
      ? {}                                    // Admin: todas las ventas
      : { usuario_id: user.sub }              // Vendedor: solo las suyas

    const ventas = await request.server.prisma.venta.findMany({ where })
    return reply.send(ventas)
  }
)
```

---

## 6. Creación del primer usuario admin (seed)

La base de datos parte vacía. Crear el primer admin manualmente o con un script de seed:

### `prisma/seed.ts`
```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12)

  await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: passwordHash,
      nombre_completo: 'Administrador',
      rol: 'admin',
      activo: true,
    },
  })

  console.log('✅ Usuario admin creado: username=admin, password=admin123')
  console.log('⚠️  Cambiar la contraseña en producción')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Agregar en `apps/api/package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Ejecutar:
```bash
pnpm --filter api exec prisma db seed
```

---

## 7. Registro del plugin en `app.ts`

Confirmar que `authPlugin` se registra ANTES que las rutas:

```typescript
// src/app.ts — orden de registro (crítico)
await app.register(prismaPlugin)   // 1. Primero Prisma
await app.register(authPlugin)     // 2. Luego Auth (usa fastify.prisma)
await app.register(corsPlugin)     // 3. CORS

// Solo después registrar las rutas:
await app.register(authRoutes, { prefix: '/auth' })
await app.register(productosRoutes, { prefix: '/productos' })
// ...
```

---

## 8. Prueba manual con curl

```bash
# Login exitoso
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# → 200 + { token, user }

# Login fallido
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"malo"}'
# → 401 + { error: "Usuario o contraseña incorrectos" }

# Endpoint protegido sin token
curl http://localhost:3000/productos
# → 401 + { error: "Token inválido o expirado" }

# Endpoint protegido con token
TOKEN="<pegar token del login>"
curl http://localhost:3000/productos \
  -H "Authorization: Bearer $TOKEN"
# → 200 + [...]
```

---

## 9. Reglas de seguridad (NO NEGOCIABLES)

1. **Nunca retornar `password_hash`** en ninguna respuesta de la API.
2. **Nunca especificar si fue el usuario o la contraseña** lo incorrecto en el mensaje de error.
3. **`SALT_ROUNDS = 12` mínimo** — nunca bajar este valor.
4. **`JWT_SECRET` mínimo 32 caracteres** — validado en `env.ts` al arrancar.
5. **El token nunca se invalida en el servidor** (stateless) — la expiración de 8h es el único mecanismo de expiración en el MVP.
6. **Nunca loguear el body de `/auth/login`** — Pino no debe registrar passwords en logs.
