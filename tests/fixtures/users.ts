/**
 * Test user definitions
 */

export const testUsers = {
  regular: {
    email: "test@example.com",
    name: "Test User",
  },
  admin: {
    email: "admin@example.com",
    name: "Admin User",
  },
} as const

export type TestUserKey = keyof typeof testUsers

