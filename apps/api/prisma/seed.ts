import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ──────────────────────────────────────────
  // EMPRESA DEMO (tenant 1)
  // ──────────────────────────────────────────
  const empresaDemo = await prisma.empresa.upsert({
    where: { nombre: 'Empresa Demo' },
    update: {},
    create: { nombre: 'Empresa Demo' },
  })

  const sucursalCentral = await prisma.sucursal.upsert({
    where: { empresa_id_nombre: { empresa_id: empresaDemo.id, nombre: 'Sucursal Central' } },
    update: {},
    create: {
      empresa_id: empresaDemo.id,
      nombre: 'Sucursal Central',
      direccion: 'Av. Principal 100',
      telefono: '2222-0001',
    },
  })

  const sucursalNorte = await prisma.sucursal.upsert({
    where: { empresa_id_nombre: { empresa_id: empresaDemo.id, nombre: 'Sucursal Norte' } },
    update: {},
    create: {
      empresa_id: empresaDemo.id,
      nombre: 'Sucursal Norte',
      direccion: 'Zona Norte 45',
      telefono: '2222-0002',
    },
  })

  const sucursalSur = await prisma.sucursal.upsert({
    where: { empresa_id_nombre: { empresa_id: empresaDemo.id, nombre: 'Sucursal Sur' } },
    update: {},
    create: {
      empresa_id: empresaDemo.id,
      nombre: 'Sucursal Sur',
      direccion: 'Zona Sur 78',
      telefono: '2222-0003',
    },
  })

  // Admin de Empresa Demo — sin sucursal fija (acceso a todas)
  await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: await bcrypt.hash('admin123', 12),
      nombre_completo: 'Administrador Demo',
      rol: 'admin',
      empresa_id: empresaDemo.id,
      sucursal_id: null,
    },
  })

  // Vendedor 1 en Sucursal Central
  await prisma.usuario.upsert({
    where: { username: 'vendedor1' },
    update: {},
    create: {
      username: 'vendedor1',
      password_hash: await bcrypt.hash('pass123', 12),
      nombre_completo: 'Vendedor Central',
      rol: 'vendedor',
      empresa_id: empresaDemo.id,
      sucursal_id: sucursalCentral.id,
    },
  })

  // Vendedor 2 en Sucursal Norte
  await prisma.usuario.upsert({
    where: { username: 'vendedor2' },
    update: {},
    create: {
      username: 'vendedor2',
      password_hash: await bcrypt.hash('pass123', 12),
      nombre_completo: 'Vendedor Norte',
      rol: 'vendedor',
      empresa_id: empresaDemo.id,
      sucursal_id: sucursalNorte.id,
    },
  })

  // ──────────────────────────────────────────
  // EMPRESA RIVAL (tenant 2) — isolation checklist
  // ──────────────────────────────────────────
  const empresaRival = await prisma.empresa.upsert({
    where: { nombre: 'Empresa Rival' },
    update: {},
    create: { nombre: 'Empresa Rival' },
  })

  const sucursalRival = await prisma.sucursal.upsert({
    where: { empresa_id_nombre: { empresa_id: empresaRival.id, nombre: 'Sucursal Rival' } },
    update: {},
    create: {
      empresa_id: empresaRival.id,
      nombre: 'Sucursal Rival',
      direccion: 'Otro Barrio 1',
    },
  })

  await prisma.usuario.upsert({
    where: { username: 'admin_rival' },
    update: {},
    create: {
      username: 'admin_rival',
      password_hash: await bcrypt.hash('rival123', 12),
      nombre_completo: 'Administrador Rival',
      rol: 'admin',
      empresa_id: empresaRival.id,
      sucursal_id: null,
    },
  })

  console.log('✅ Seed completado:')
  console.log(`   Empresa Demo  [${empresaDemo.id}] — sucursales: Central[${sucursalCentral.id}], Norte[${sucursalNorte.id}], Sur[${sucursalSur.id}]`)
  console.log(`   Usuarios Demo: admin / admin123, vendedor1 / pass123, vendedor2 / pass123`)
  console.log(`   Empresa Rival [${empresaRival.id}] — sucursal: Rival[${sucursalRival.id}]`)
  console.log(`   Usuario Rival: admin_rival / rival123`)
  console.log('⚠️  Cambiar todas las contraseñas en producción')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
