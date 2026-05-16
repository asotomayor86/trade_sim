import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123456"

  const passwordHash = await hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    create: { username: adminUsername, passwordHash, role: "ADMIN" },
    update: {},
  })

  console.log(`✓ Admin user: ${admin.username} (id: ${admin.id})`)
  console.log("Seed completado. Los 5 análisis estándar se crearán en F4.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
