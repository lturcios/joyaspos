/**
 * Alta de una nueva empresa cliente con su primera sucursal y usuario admin.
 *
 * Uso:
 *   pnpm --filter api exec tsx scripts/crear-empresa.ts \
 *     --empresa "Joyería El Diamante" \
 *     --sucursal "Sucursal San Miguel" \
 *     --admin-user "admin.diamante" \
 *     --admin-pass "CambiarEsta123" \
 *     --admin-nombre "María López"
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function getArg(name: string, required = true): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  const value = idx !== -1 ? process.argv[idx + 1] : undefined
  if (required && !value) {
    console.error(`❌ Falta el parámetro obligatorio --${name}`)
    console.error(
      'Uso: tsx scripts/crear-empresa.ts --empresa "..." --sucursal "..." ' +
      '--admin-user "..." --admin-pass "..." --admin-nombre "..." ' +
      '[--direccion "..."] [--telefono "..."]'
    )
    process.exit(1)
  }
  return value
}

async function main() {
  const empresaNombre = getArg('empresa')!
  const sucursalNombre = getArg('sucursal')!
  const adminUser = getArg('admin-user')!
  const adminPass = getArg('admin-pass')!
  const adminNombre = getArg('admin-nombre')!
  const direccion = getArg('direccion', false)
  const telefono = getArg('telefono', false)

  if (adminPass.length < 8) {
    console.error('❌ La contraseña del admin debe tener al menos 8 caracteres')
    process.exit(1)
  }
  const empresaExiste = await prisma.empresa.findUnique({
    where: { nombre: empresaNombre },
  })
  if (empresaExiste) {
    console.error(`❌ Ya existe una empresa llamada "${empresaNombre}"`)
    process.exit(1)
  }
  const usuarioExiste = await prisma.usuario.findUnique({
    where: { username: adminUser },
  })
  if (usuarioExiste) {
    console.error(`❌ Ya existe un usuario con username "${adminUser}"`)
    process.exit(1)
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: { nombre: empresaNombre },
    })

    const sucursal = await tx.sucursal.create({
      data: {
        empresa_id: empresa.id,
        nombre: sucursalNombre,
        direccion: direccion ?? null,
        telefono: telefono ?? null,
      },
    })

    const admin = await tx.usuario.create({
      data: {
        username: adminUser,
        password_hash: await bcrypt.hash(adminPass, 12),
        nombre_completo: adminNombre,
        rol: 'admin',
        empresa_id: empresa.id,
        sucursal_id: null,
      },
    })

    return { empresa, sucursal, admin }
  })

  console.log('✅ Empresa creada exitosamente:\n')
  console.log(`   Empresa:  [${resultado.empresa.id}] ${resultado.empresa.nombre}`)
  console.log(`   Sucursal: [${resultado.sucursal.id}] ${resultado.sucursal.nombre}`)
  console.log(`   Admin:    [${resultado.admin.id}] ${resultado.admin.username}`)
  console.log('\n   El admin puede iniciar sesión en el panel web y desde ahí')
  console.log('   crear más sucursales, vendedores, productos y proveedores.')
}

main()
  .catch((e) => {
    console.error('❌ Error inesperado:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
