#!/usr/bin/env node

/**
 * Dev database seed script
 * 
 * Resets the dev database and creates a default user for development.
 * Run with: pnpm dev:seed (loads .env.dev via dotenv-cli)
 * 
 * Default user:
 *   Email: dev@example.com
 *   Password: dev123
 */

import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const DEV_USER = {
  email: "dev@example.com",
  name: "Dev User",
  password: "dev123",
}

function getPrisma() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set. Run with: pnpm dev:seed")
  }

  const pool = new Pool({ connectionString: dbUrl })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

async function resetDevDB(prisma: PrismaClient) {
  console.log("🗑️  Resetting dev database...")

  // Delete everything in order to respect foreign key constraints
  await prisma.accountingEntry.deleteMany().catch(() => { })
  await prisma.match.deleteMany().catch(() => { })
  await prisma.transaction.deleteMany().catch(() => { })
  await prisma.invoice.deleteMany().catch(() => { })
  await prisma.session.deleteMany().catch(() => { })
  await prisma.account.deleteMany().catch(() => { })
  await prisma.user.deleteMany().catch(() => { })

  console.log("✓ Database reset complete")
}

async function createDevUser(prisma: PrismaClient) {
  console.log(`👤 Creating dev user: ${DEV_USER.email}`)

  const hashedPassword = await bcrypt.hash(DEV_USER.password, 10)

  const user = await prisma.user.upsert({
    where: { email: DEV_USER.email },
    update: {
      password: hashedPassword,
      name: DEV_USER.name,
    },
    create: {
      email: DEV_USER.email,
      name: DEV_USER.name,
      password: hashedPassword,
    },
  })

  console.log(`✓ User created: ${user.email}`)
  return user
}

async function main() {
  console.log("\n🌱 Dev Database Seed\n")

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is not set.")
    console.error("Run with: pnpm dev:seed")
    process.exit(1)
  }

  const prisma = getPrisma()

  try {
    await resetDevDB(prisma)
    await createDevUser(prisma)

    console.log("\n🎉 Dev database seeded successfully!\n")
    console.log("You can now log in at http://localhost:3001/login with:")
    console.log(`  Email:    ${DEV_USER.email}`)
    console.log(`  Password: ${DEV_USER.password}\n`)

    process.exit(0)
  } catch (error) {
    console.error("\n❌ Failed to seed dev database:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

