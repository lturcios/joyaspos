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
