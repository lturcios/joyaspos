import Fastify, { FastifyError } from 'fastify'
import { env } from './config/env'
import { prismaPlugin } from './plugins/prisma'
import { authPlugin } from './plugins/auth'
import { corsPlugin } from './plugins/cors'
import { tenancyPlugin } from './plugins/tenancy'

import { authRoutes } from './modules/auth/auth.routes'
import { productosRoutes } from './modules/productos/productos.routes'
import { ventasRoutes } from './modules/ventas/ventas.routes'
import { comprasRoutes } from './modules/compras/compras.routes'
import { proveedoresRoutes } from './modules/proveedores/proveedores.routes'
import { reportesRoutes } from './modules/reportes/reportes.routes'
import { usuariosRoutes } from './modules/usuarios/usuarios.routes'
import { sucursalesRoutes } from './modules/sucursales/sucursales.routes'

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

  await app.register(corsPlugin)
  await app.register(prismaPlugin)
  await app.register(authPlugin)
  await app.register(tenancyPlugin)   // must come after authPlugin

  app.setErrorHandler((error: FastifyError, _request, reply) => {
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

  await app.register(authRoutes,      { prefix: '/auth' })
  await app.register(productosRoutes, { prefix: '/productos' })
  await app.register(ventasRoutes,    { prefix: '/ventas' })
  await app.register(comprasRoutes,   { prefix: '/compras' })
  await app.register(proveedoresRoutes, { prefix: '/proveedores' })
  await app.register(reportesRoutes,  { prefix: '/reportes' })
  await app.register(usuariosRoutes,  { prefix: '/usuarios' })
  await app.register(sucursalesRoutes, { prefix: '/sucursales' })

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  return app
}
