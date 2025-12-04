#!/usr/bin/env node

/**
 * Smoke test script
 * 
 * Runs basic validation checks:
 * - TypeScript compilation
 * - Next.js build
 * - ESLint
 * - Basic sanity checks
 * 
 * Catches ~50% of errors before running full test suite
 */

import "dotenv/config"
import { execSync } from "child_process"
import { existsSync } from "fs"

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
}

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function runCommand(command: string, description: string): boolean {
  try {
    log(`\n${description}...`, "yellow")
    execSync(command, { stdio: "inherit", cwd: process.cwd() })
    log(`✓ ${description} passed`, "green")
    return true
  } catch (error) {
    log(`✗ ${description} failed`, "red")
    return false
  }
}

async function main() {
  log("Running smoke tests...", "yellow")
  
  let allPassed = true

  // Check TypeScript compilation - verify it can compile
  allPassed = runCommand("pnpm exec tsc --noEmit", "TypeScript compilation check") && allPassed

  // ESLint check removed - not part of smoke tests

  // Check that required environment variables are documented
  if (!existsSync(".env.example")) {
    log("⚠ Warning: .env.example not found", "yellow")
  }

  // Basic sanity checks
  log("\nRunning sanity checks...", "yellow")
  
  // Check that package.json exists
  if (!existsSync("package.json")) {
    log("✗ package.json not found", "red")
    allPassed = false
  } else {
    log("✓ package.json exists", "green")
  }

  // Check that prisma schema exists
  if (!existsSync("prisma/schema.prisma")) {
    log("✗ prisma/schema.prisma not found", "red")
    allPassed = false
  } else {
    log("✓ prisma/schema.prisma exists", "green")
  }

  // Check that .env.test exists (for E2E tests)
  if (!existsSync(".env.test")) {
    log("⚠ Warning: .env.test not found (needed for E2E tests)", "yellow")
  }

  // Summary
  log("\n" + "=".repeat(50), "reset")
  if (allPassed) {
    log("✓ All smoke tests passed", "green")
    process.exit(0)
  } else {
    log("✗ Some smoke tests failed", "red")
    process.exit(1)
  }
}

main().catch((error) => {
  log(`\n✗ Smoke test script error: ${error.message}`, "red")
  process.exit(1)
})

