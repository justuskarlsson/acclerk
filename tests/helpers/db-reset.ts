#!/usr/bin/env node

/**
 * Reset test database script
 * 
 * Deletes all data from the test database
 * Run with: pnpm db:reset (loads .env.test via dotenv-cli)
 */

import { resetTestDB } from "./db-helpers"

async function main() {
  console.log("Resetting test database...")

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is not set. Run with: pnpm db:reset")
    process.exit(1)
  }

  try {
    await resetTestDB()
    console.log("✓ Test database reset successfully")
    process.exit(0)
  } catch (error) {
    console.error("ERROR: Failed to reset test database:", error)
    process.exit(1)
  }
}

main()

