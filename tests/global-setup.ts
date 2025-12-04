import { chromium, FullConfig } from "@playwright/test"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const TEST_USER = {
  email: "test@example.com",
  name: "Test User",
  password: "testpassword123",
}

/**
 * Global setup for Playwright tests
 * - Creates test user in database (once)
 * - Logs in via UI and saves storage state
 * - All tests reuse this authenticated state
 * 
 * Environment: .env.test loaded via dotenv-cli (pnpm test:e2e)
 */
async function globalSetup(config: FullConfig) {
  // Verify that DATABASE_URL is set (loaded from .env.test)
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set. Run with: pnpm test:e2e")
  }

  console.log("🔧 Setting up test environment...")

  // Create Prisma client for test database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // Create or update test user with password
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10)
    await prisma.user.upsert({
      where: { email: TEST_USER.email },
      update: { password: hashedPassword },
      create: {
        email: TEST_USER.email,
        name: TEST_USER.name,
        password: hashedPassword,
      },
    })
    console.log("✅ Test user created/updated")

    // Launch browser and login
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    // Navigate to login page
    const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3002"
    await page.goto(`${baseURL}/login`)

    // Fill login form
    await page.waitForSelector('input[name="email"]')
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Wait for session cookie (JWT)
    let attempts = 0
    const maxAttempts = 30
    while (attempts < maxAttempts) {
      const cookies = await context.cookies()
      const hasSession = cookies.some(c => c.name === "next-auth.session-token")
      if (hasSession) {
        console.log("✅ Login successful, session cookie obtained")
        break
      }
      await page.waitForTimeout(200)
      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error("Login failed - session cookie not found")
    }

    // Save authenticated state
    await context.storageState({ path: "playwright/.auth/user.json" })
    console.log("✅ Storage state saved")

    await browser.close()
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }

  console.log("🎉 Test setup complete!")
}

export default globalSetup
