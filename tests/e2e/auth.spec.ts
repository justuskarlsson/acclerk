import { test, expect } from "@playwright/test"

/**
 * UC1: User Login and Authentication
 * 
 * Tests that:
 * - Person can access login page
 * - Authenticated user can access protected routes
 * - Unauthenticated user cannot access protected routes
 * 
 * Note: globalSetup handles user creation and login.
 * Tests run with authenticated state from storage state.
 */

test.describe("Authentication", () => {
  test("should allow user to access login page", async ({ page }) => {
    await page.goto("/login")

    // Verify login page is accessible
    const pageContent = await page.textContent("body")
    expect(pageContent?.toLowerCase()).toContain("login")

    // Verify page loaded successfully (not 404)
    expect(page.url()).toContain("/login")
  })

  test("should have session cookie from storage state", async ({ page }) => {
    // Verify storage state is loaded
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name === "next-auth.session-token")

    expect(sessionCookie).toBeDefined()
    expect(sessionCookie?.value).toBeTruthy()
  })

  test("should allow authenticated user to access protected API routes", async ({ page }) => {
    // page.request automatically uses cookies from the browser context
    const response = await page.request.post("/api/upload-invoices", {})

    // Should not be unauthorized (401) - might be 400 for empty files, but not 401
    expect(response.status()).not.toBe(401)
  })

  test("should prevent unauthenticated user from accessing protected routes", async ({ browser }) => {
    // Create a new context with EMPTY storage state (no cookies)
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    // Try to access protected API route without authentication
    const response = await page.request.post("/api/upload-invoices", {})

    // Should be unauthorized
    expect(response.status()).toBe(401)

    const body = await response.json()
    expect(body.error).toContain("Unauthorized")

    await context.close()
  })
})
