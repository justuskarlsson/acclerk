#!/usr/bin/env node

/**
 * Seed test database script
 * 
 * Seeds the test database with initial test data
 * Run with: pnpm db:seed (loads .env.test via dotenv-cli)
 */

import { seedTestDB } from "./db-helpers"

async function main() {
  console.log("Seeding test database...")

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is not set. Run with: pnpm db:seed")
    process.exit(1)
  }

  try {
    await seedTestDB()
    console.log("✓ Test database seeded successfully")
    process.exit(0)
  } catch (error) {
    console.error("ERROR: Failed to seed test database:", error)
    process.exit(1)
  }
}

main()

