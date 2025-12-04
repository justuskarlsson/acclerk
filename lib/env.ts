/**
 * Centralized environment configuration
 * 
 * Environment files:
 * - .env       → production (port 3000)
 * - .env.dev   → development (port 3001)
 * - .env.test  → test/playwright (port 3002)
 * 
 * Usage: dotenv-cli loads the appropriate file before Next.js starts
 */

function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

export const env = {
  // Database
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),

  // NextAuth
  NEXTAUTH_URL: getRequiredEnv("NEXTAUTH_URL"),
  NEXTAUTH_SECRET: getRequiredEnv("NEXTAUTH_SECRET"),

  // Server
  PORT: getOptionalEnv("PORT", "3000"),

  // Storage
  STORAGE_DIR: getOptionalEnv("STORAGE_DIR", "storage"),

  // OpenAI (optional for tests)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",

  // Email (optional for tests)
  EMAIL_SERVER: process.env.EMAIL_SERVER || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "",
}

// Derive base URL from NEXTAUTH_URL for convenience
export const baseUrl = env.NEXTAUTH_URL

