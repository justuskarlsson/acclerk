import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

/**
 * Test database helpers
 * 
 * Uses DATABASE_URL environment variable (loaded from .env.test via dotenv-cli)
 * Run with: pnpm test:e2e, pnpm db:reset, pnpm db:seed
 */
const getTestPrisma = () => {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
        throw new Error("DATABASE_URL environment variable is not set. Run with: pnpm test:e2e")
    }

    // Prisma 7: Use PostgreSQL adapter with connection pool
    // Handle Unix socket connections (format: postgresql://user:pass@/db?host=/path)
    const pool = new Pool({
        connectionString: dbUrl,
        // Allow Unix socket connections
    })
    const adapter = new PrismaPg(pool)

    const client = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "test" ? ["error"] : [],
    })

    return client
}

/**
 * Reset test data (invoices, transactions, etc.) but NOT users/sessions
 * Use this in beforeEach to clean up test data without breaking auth
 */
export async function resetTestData(): Promise<void> {
    const prisma = getTestPrisma()

    try {
        // Delete test data in order to respect foreign key constraints
        // Do NOT delete users, sessions, or accounts (needed for auth)
        await prisma.accountingEntry.deleteMany().catch(() => { })
        await prisma.match.deleteMany().catch(() => { })
        await prisma.transaction.deleteMany().catch(() => { })
        await prisma.invoice.deleteMany().catch(() => { })
    } finally {
        await prisma.$disconnect()
    }
}

/**
 * Reset the entire test database including users (for full reset)
 * Use sparingly - usually resetTestData() is preferred
 */
export async function resetTestDB(): Promise<void> {
    const prisma = getTestPrisma()

    try {
        // Delete everything in order to respect foreign key constraints
        await prisma.accountingEntry.deleteMany().catch(() => { })
        await prisma.match.deleteMany().catch(() => { })
        await prisma.transaction.deleteMany().catch(() => { })
        await prisma.invoice.deleteMany().catch(() => { })
        await prisma.session.deleteMany().catch(() => { })
        await prisma.account.deleteMany().catch(() => { })
        await prisma.user.deleteMany().catch(() => { })
    } finally {
        await prisma.$disconnect()
    }
}

/**
 * Seed test database with initial data
 */
export async function seedTestDB(): Promise<void> {
    const prisma = getTestPrisma()

    // Reset first
    await resetTestDB()

    // Seed test users if needed
    // This can be expanded with more test data

    await prisma.$disconnect()
}

/**
 * Create a test user with optional password
 * Uses upsert to handle existing users (updates password if provided)
 */
export async function createTestUser(
    email: string,
    name?: string,
    password?: string
) {
    const prisma = getTestPrisma()

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            // Update password if provided, otherwise keep existing
            ...(hashedPassword && { password: hashedPassword }),
            // Update name if provided
            ...(name && { name }),
        },
        create: {
            email,
            name: name || email.split("@")[0],
            password: hashedPassword,
        },
    })

    await prisma.$disconnect()
    return user
}

/**
 * Get test database Prisma client
 */
export function getTestPrismaClient(): PrismaClient {
    return getTestPrisma()
}

