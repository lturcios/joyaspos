---
name: fastify-zod-validation
description: |
  Patrón completo de validación de inputs con Zod en la API Fastify de JoyasPOS:
  integración de Zod como validador global, schemas reutilizables por módulo,
  formato de error consistente, validación de query params y body, y schemas
  de referencia para todos los módulos del proyecto (productos, ventas, compras,
  proveedores, usuarios). Usar SIEMPRE al crear o modificar cualquier endpoint
  que reciba body, query params o path params, y para consultar el schema
  correcto de un módulo específico antes de implementar su handler.
  Depende de SKILL-03 (fastify-project-structure) y SKILL-05 (fastify-auth-jwt).
---

# SKILL-06 — Fastify + Zod Validation (apps/api)

## Principio
Todo endpoint con body o query params tiene su schema Zod.
**Nunca** confiar en los datos del request sin validar.

---

## 1. Integración de Zod con Fastify

Fastify usa por defecto `ajv` para validación de JSON Schema. Para usar Zod
directamente en los handlers (patrón más simple y consistente en este proyecto):

```bash
pnpm --filter api add zod
```

### Patrón de validación manual en handlers

En lugar de integrar Zod con el sistema de schema de Fastify (complejo),
se valida manualmente al inicio de cada handler. Este es el patrón del proyecto:

```typescript
// src/shared/validate.ts
import { z, ZodSchema } from 'zod'
import { FastifyReply } from 'fastify'

/**
 * Valida datos contra un schema Zod.
 * Si falla, envía error 400 y retorna null.
 * Si pasa, retorna los datos tipados y parseados.
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown,
  reply: FastifyReply
): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: result.error.errors[0].message,
      // En desarrollo, incluir todos los errores para depuración:
      ...(process.env.NODE_ENV !== 'production' && {
        details: result.error.flatten().fieldErrors,
      }),
    })
    return null
  }
  return result.data
}
```

### Uso en un handler
```typescript
export async function createProductoHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = validate(createProductoSchema, request.body, reply)
  if (!body) return  // validate() ya envió el 400

  // Aquí body está tipado correctamente como CreateProductoInput
  const producto = await request.server.prisma.producto.create({ data: body })
  return reply.status(201).send(producto)
}
```

---

## 2. Schemas de query params de período (reutilizable)

```typescript
// src/shared/schemas.ts
import { z } from 'zod'

// Reutilizado en ventas, compras y todos los reportes
export const periodoQuerySchema = z.object({
  desde: z
    .string({ required_error: 'El parámetro "desde" es requerido' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato inválido, use YYYY-MM-DD'),
  hasta: z
    .string({ required_error: 'El parámetro "hasta" es requerido' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato inválido, use YYYY-MM-DD'),
})
.refine(
  (data) => new Date(data.desde) <= new Date(data.hasta),
  { message: '"desde" no puede ser posterior a "hasta"', path: ['desde'] }
)

export type PeriodoQuery = z.infer<typeof periodoQuerySchema>

// Path param :id
export const idParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: 'El id debe ser un número' }).int().positive(),
})

export type IdParam = z.infer<typeof idParamSchema>
```

---

## 3. Schemas por módulo

### `src/modules/productos/productos.schema.ts`
```typescript
import { z } from 'zod'

export const createProductoSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(1, 'El nombre no puede estar vacío')
    .max(150),
  unidad_medida: z
    .string({ required_error: 'La unidad de medida es requerida' })
    .min(1, 'La unidad de medida no puede estar vacía')
    .max(30),
  existencia: z.number().nonnegative().default(0),
})

export const updateProductoSchema = z.object({
  nombre: z.string().min(1).max(150).optional(),
  unidad_medida: z.string().min(1).max(30).optional(),
}).refine(
  (data) => data.nombre !== undefined || data.unidad_medida !== undefined,
  { message: 'Se debe proveer al menos un campo para actualizar' }
)

export const ingresoExistenciaSchema = z.object({
  cantidad: z
    .number({ required_error: 'La cantidad es requerida' })
    .positive('La cantidad debe ser mayor a 0'),
})

export type CreateProductoInput = z.infer<typeof createProductoSchema>
export type UpdateProductoInput = z.infer<typeof updateProductoSchema>
export type IngresoExistenciaInput = z.infer<typeof ingresoExistenciaSchema>
```

---

### `src/modules/ventas/ventas.schema.ts`
```typescript
import { z } from 'zod'

export const ventaItemSchema = z.object({
  producto_id: z
    .number({ required_error: 'producto_id es requerido' })
    .int().positive(),
  cantidad: z
    .number({ required_error: 'La cantidad es requerida' })
    .positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z
    .number({ required_error: 'El precio unitario es requerido' })
    .positive('El precio debe ser mayor a 0'),
  detalle_adicional: z.string().max(200).nullable().optional(),
})

export const createVentaSchema = z.object({
  nombre_cliente: z.string().max(100).nullable().optional(),
  fecha_hora: z
    .string()
    .datetime({ message: 'Formato de fecha inválido, use ISO 8601' })
    .optional(),
  items: z
    .array(ventaItemSchema)
    .min(1, 'La venta debe tener al menos un ítem'),
})

// Schema para sincronización batch
export const ventaSyncPayloadSchema = createVentaSchema.extend({
  local_id: z
    .number({ required_error: 'local_id es requerido para sync' })
    .int().positive(),
})

export const syncVentasSchema = z.object({
  ventas: z
    .array(ventaSyncPayloadSchema)
    .min(1, 'El array de ventas no puede estar vacío')
    .max(20, 'Máximo 20 ventas por lote de sincronización'),
})

export type CreateVentaInput = z.infer<typeof createVentaSchema>
export type VentaSyncPayload = z.infer<typeof ventaSyncPayloadSchema>
export type SyncVentasInput = z.infer<typeof syncVentasSchema>
```

---

### `src/modules/proveedores/proveedores.schema.ts`
```typescript
import { z } from 'zod'

export const createProveedorSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre del proveedor es requerido' })
    .min(1)
    .max(150),
  contacto: z.string().max(100).optional(),
  telefono: z.string().max(20).optional(),
  direccion: z.string().max(255).optional(),
})

export const updateProveedorSchema = createProveedorSchema.partial().refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'Se debe proveer al menos un campo para actualizar' }
)

export type CreateProveedorInput = z.infer<typeof createProveedorSchema>
export type UpdateProveedorInput = z.infer<typeof updateProveedorSchema>
```

---

### `src/modules/compras/compras.schema.ts`
```typescript
import { z } from 'zod'

const compraItemSchema = z.object({
  producto_id: z.number().int().positive(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  costo_unitario: z.number().positive('El costo unitario debe ser mayor a 0'),
})

export const createCompraSchema = z
  .object({
    proveedor_id: z.number().int().positive().nullable().optional(),
    proveedor_nombre: z.string().max(150).nullable().optional(),
    notas: z.string().max(2000).nullable().optional(),
    fecha_hora: z.string().datetime().optional(),
    items: z
      .array(compraItemSchema)
      .min(1, 'La compra debe tener al menos un ítem'),
  })
  .refine(
    (data) =>
      (data.proveedor_id != null && data.proveedor_id > 0) ||
      (data.proveedor_nombre != null && data.proveedor_nombre.trim().length > 0),
    {
      message: 'Se debe indicar un proveedor_id o un proveedor_nombre',
      path: ['proveedor_id'],
    }
  )

export type CreateCompraInput = z.infer<typeof createCompraSchema>
```

---

### `src/modules/usuarios/usuarios.schema.ts`
```typescript
import { z } from 'zod'

const rolEnum = z.enum(['admin', 'vendedor'])

export const createUsuarioSchema = z.object({
  username: z
    .string({ required_error: 'El username es requerido' })
    .min(3, 'Mínimo 3 caracteres')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre_completo: z.string().min(1).max(100),
  rol: rolEnum,
})

export const updateUsuarioSchema = z.object({
  nombre_completo: z.string().min(1).max(100).optional(),
  rol: rolEnum.optional(),
  activo: z.boolean().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'Se debe proveer al menos un campo para actualizar' }
)

export const changePasswordSchema = z.object({
  password: z
    .string({ required_error: 'La nueva contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
```

---

## 4. Validación de query params en handlers

```typescript
// Ejemplo: GET /ventas?desde=2026-01-01&hasta=2026-01-31
export async function listVentasHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const query = validate(periodoQuerySchema, request.query, reply)
  if (!query) return

  // query.desde y query.hasta están tipados y validados
  const ventas = await request.server.prisma.venta.findMany({
    where: {
      fecha_hora: {
        gte: new Date(`${query.desde}T00:00:00`),
        lte: new Date(`${query.hasta}T23:59:59`),
      },
    },
  })
  return reply.send(ventas)
}
```

---

## 5. Validación de path params

```typescript
// Ejemplo: GET /productos/:id
export async function getProductoHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = validate(idParamSchema, request.params, reply)
  if (!params) return

  const producto = await request.server.prisma.producto.findFirst({
    where: { id: params.id, activo: true },
  })

  if (!producto) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Producto con id ${params.id} no encontrado`,
    })
  }

  return reply.send(producto)
}
```

---

## 6. Formato de error estándar del proyecto

Todos los errores de la API siguen este formato exacto:

```typescript
// 400 — Validación fallida
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "La cantidad debe ser mayor a 0",
  // En desarrollo también:
  "details": { "cantidad": ["La cantidad debe ser mayor a 0"] }
}

// 401 — Sin token o token inválido
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Token inválido o expirado"
}

// 403 — Sin permisos
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Se requiere rol administrador"
}

// 404 — No encontrado
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Producto con id 99 no encontrado"
}

// 409 — Conflicto (duplicado)
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Ya existe un producto con ese nombre"
}

// 500 — Error interno (mensaje genérico en producción)
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Error interno del servidor"
}
```

---

## 7. Manejo de conflictos por unicidad (MySQL + Prisma)

Los errores de UNIQUE constraint de MySQL llegan como `PrismaClientKnownRequestError`:

```typescript
import { Prisma } from '@prisma/client'

try {
  await prisma.producto.create({ data: body })
} catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return reply.status(409).send({
      statusCode: 409,
      error: 'Conflict',
      message: 'Ya existe un producto con ese nombre',
    })
  }
  throw error  // Re-lanzar para que el handler global lo capture
}
```

Códigos Prisma frecuentes:
- `P2002` — Unique constraint violation
- `P2025` — Record not found (en update/delete)
- `P2003` — Foreign key constraint violation
