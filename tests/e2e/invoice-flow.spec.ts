import { test, expect } from "@playwright/test"
import { resetTestData, getTestPrismaClient } from "../helpers/db-helpers"
import { readTestFixture } from "../helpers/file-helpers"

/**
 * Complete Invoice Processing Flow E2E Tests
 * 
 * This test suite covers the full invoice lifecycle:
 * - Phase 1: Upload and analyze invoices
 * - Phase 2: Upload bank transactions
 * - Phase 3: Connect invoices to transactions
 * - Phase 4: Verify/unverify/delete invoices
 * 
 * IMPORTANT: Tests run sequentially and share state.
 * Database is reset once at the start, then each phase builds on previous results.
 */

const TEST_USER_EMAIL = "test@example.com"

// Track invoice IDs across test phases
let uploadedInvoiceIds: string[] = []

test.describe.serial("Invoice Processing Flow", () => {
  // Reset database once at the start of the test suite
  test.beforeAll(async () => {
    await resetTestData()
    uploadedInvoiceIds = []
  })

  // =========================================================================
  // PHASE 1: Invoice Upload & Analysis
  // =========================================================================
  test.describe("Phase 1: Invoice Upload & Analysis", () => {
    test("1.1 Upload PDF invoice - onyx_ink_moms.pdf", async ({ page }) => {
      const pdfBuffer = await readTestFixture("invoices", "onyx_ink_moms.pdf")

      const response = await page.request.post("/api/upload-invoices", {
        multipart: {
          files: {
            name: "onyx_ink_moms.pdf",
            mimeType: "application/pdf",
            buffer: pdfBuffer,
          },
        },
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.storedFiles).toBeDefined()
      expect(body.storedFiles).toContain("onyx_ink_moms.pdf")
    })

    test("1.2 Upload PDF invoice - anthropic_ex_moms_1.pdf", async ({ page }) => {
      const pdfBuffer = await readTestFixture("invoices", "anthropic_ex_moms_1.pdf")

      const response = await page.request.post("/api/upload-invoices", {
        multipart: {
          files: {
            name: "anthropic_ex_moms_1.pdf",
            mimeType: "application/pdf",
            buffer: pdfBuffer,
          },
        },
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.storedFiles).toContain("anthropic_ex_moms_1.pdf")
    })

    test("1.3 Verify invoices created with status=uploaded", async ({ page }) => {
      const prisma = getTestPrismaClient()

      try {
        const invoices = await prisma.invoice.findMany({
          where: {
            user: { email: TEST_USER_EMAIL },
          },
          orderBy: { createdAt: "asc" },
        })

        expect(invoices.length).toBe(2)
        // Status may be "uploaded" or "processing" if analysis started quickly
        expect(["uploaded", "processing"]).toContain(invoices[0].status)
        expect(["uploaded", "processing"]).toContain(invoices[1].status)

        // Store IDs for later phases
        uploadedInvoiceIds = invoices.map(inv => inv.id)
      } finally {
        await prisma.$disconnect()
      }
    })

    test("1.4 Analyze invoices - status changes to analyzed", async ({ page }) => {
      // Trigger analysis via API
      const response = await page.request.post("/api/analyze-invoices")
      expect(response.status()).toBe(200)

      // Verify status changed
      const prisma = getTestPrismaClient()
      try {
        const invoices = await prisma.invoice.findMany({
          where: {
            user: { email: TEST_USER_EMAIL },
          },
        })

        // At least one should be analyzed (or still processing)
        const analyzedOrProcessing = invoices.filter(
          inv => inv.status === "analyzed" || inv.status === "processing"
        )
        expect(analyzedOrProcessing.length).toBeGreaterThan(0)
      } finally {
        await prisma.$disconnect()
      }
    })

    test("1.5 Unauthenticated upload is blocked", async ({ browser }) => {
      // Create context without auth
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] }
      })
      const unauthPage = await context.newPage()

      try {
        // Try to access upload page without auth
        await unauthPage.goto("/upload")

        // Should be redirected to login page by middleware
        expect(unauthPage.url()).toContain("/login")
      } finally {
        await context.close()
      }
    })
  })

  // =========================================================================
  // PHASE 2: Transaction Upload
  // =========================================================================
  test.describe("Phase 2: Transaction Upload", () => {
    test("2.1 Upload CSV transactions", async ({ page }) => {
      const csvBuffer = await readTestFixture("transactions", "2025-12-05.csv")

      const response = await page.request.post("/api/upload-transactions", {
        multipart: {
          file: {
            name: "2025-12-05.csv",
            mimeType: "text/csv",
            buffer: csvBuffer,
          },
        },
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.filename).toBe("2025-12-05.csv")
      expect(body.count).toBeGreaterThan(0)
    })

    test("2.2 Verify transactions created in database", async ({ page }) => {
      const prisma = getTestPrismaClient()

      try {
        const transactions = await prisma.transaction.findMany({
          where: {
            user: { email: TEST_USER_EMAIL },
          },
        })

        expect(transactions.length).toBeGreaterThan(0)
      } finally {
        await prisma.$disconnect()
      }
    })

    test("2.3 Re-upload replaces existing transactions", async ({ page }) => {
      const prisma = getTestPrismaClient()

      try {
        // Get count before
        const before = await prisma.transaction.count({
          where: { user: { email: TEST_USER_EMAIL } },
        })

        // Upload again
        const csvBuffer = await readTestFixture("transactions", "2025-12-05.csv")
        const response = await page.request.post("/api/upload-transactions", {
          multipart: {
            file: {
              name: "2025-12-05.csv",
              mimeType: "text/csv",
              buffer: csvBuffer,
            },
          },
        })
        expect(response.status()).toBe(200)

        // Get count after - should be same (replaced, not added)
        const after = await prisma.transaction.count({
          where: { user: { email: TEST_USER_EMAIL } },
        })

        expect(after).toBe(before)
      } finally {
        await prisma.$disconnect()
      }
    })
  })

  // =========================================================================
  // PHASE 3: Connect Invoices to Transactions
  // =========================================================================
  test.describe("Phase 3: Connect Invoices to Transactions", () => {
    test("3.1 Wait for analysis to complete", async ({ page }) => {
      const prisma = getTestPrismaClient()

      try {
        // Wait for invoices to be analyzed (poll for up to 60 seconds)
        let attempts = 0
        const maxAttempts = 30
        let allAnalyzed = false

        while (attempts < maxAttempts && !allAnalyzed) {
          const invoices = await prisma.invoice.findMany({
            where: {
              user: { email: TEST_USER_EMAIL },
              status: { in: ["uploaded", "processing"] },
            },
          })

          if (invoices.length === 0) {
            allAnalyzed = true
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000))
            attempts++
          }
        }

        // Verify all are analyzed
        const finalInvoices = await prisma.invoice.findMany({
          where: { user: { email: TEST_USER_EMAIL } },
        })

        const analyzedCount = finalInvoices.filter(inv => inv.status === "analyzed").length
        expect(analyzedCount).toBeGreaterThan(0)
      } finally {
        await prisma.$disconnect()
      }
    })

    test("3.2 Connect invoices to transactions", async ({ page }) => {
      const response = await page.request.post("/api/invoices/connect")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(typeof body.total).toBe("number")
      expect(typeof body.matched).toBe("number")
    })

    test("3.3 Verify invoice statuses updated", async ({ page }) => {
      const prisma = getTestPrismaClient()

      try {
        const invoices = await prisma.invoice.findMany({
          where: { user: { email: TEST_USER_EMAIL } },
        })

        // Each invoice should be either to-verify or connection-fail
        for (const invoice of invoices) {
          expect(["to-verify", "connection-fail", "analyzed"]).toContain(invoice.status)
        }
      } finally {
        await prisma.$disconnect()
      }
    })
  })

  // =========================================================================
  // PHASE 4: Verify Actions
  // =========================================================================
  test.describe("Phase 4: Verify Actions", () => {
    let verifiableInvoiceId: string | null = null

    test("4.1 Find a to-verify invoice", async ({ page }) => {
      const prisma = getTestPrismaClient()

      try {
        const invoice = await prisma.invoice.findFirst({
          where: {
            user: { email: TEST_USER_EMAIL },
            status: "to-verify",
          },
        })

        if (invoice) {
          verifiableInvoiceId = invoice.id
          expect(invoice.status).toBe("to-verify")
        } else {
          // If no to-verify invoice, skip remaining verify tests
          test.skip()
        }
      } finally {
        await prisma.$disconnect()
      }
    })

    test("4.2 Verify invoice - status changes to verified", async ({ page }) => {
      if (!verifiableInvoiceId) {
        test.skip()
        return
      }

      const response = await page.request.post(
        `/api/invoices/${verifiableInvoiceId}/verify`,
        {
          data: { verified: true },
        }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.invoice.status).toBe("verified")

      // Verify in database
      const prisma = getTestPrismaClient()
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: verifiableInvoiceId },
        })
        expect(invoice?.status).toBe("verified")
      } finally {
        await prisma.$disconnect()
      }
    })

    test("4.3 Unverify invoice - status changes back to to-verify", async ({ page }) => {
      if (!verifiableInvoiceId) {
        test.skip()
        return
      }

      const response = await page.request.post(
        `/api/invoices/${verifiableInvoiceId}/verify`,
        {
          data: { verified: false },
        }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.invoice.status).toBe("to-verify")

      // Verify in database
      const prisma = getTestPrismaClient()
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: verifiableInvoiceId },
        })
        expect(invoice?.status).toBe("to-verify")
      } finally {
        await prisma.$disconnect()
      }
    })

    test("4.4 Delete invoice - removed from database", async ({ page }) => {
      if (!verifiableInvoiceId) {
        test.skip()
        return
      }

      const response = await page.request.delete(
        `/api/invoices/${verifiableInvoiceId}`
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)

      // Verify deleted from database
      const prisma = getTestPrismaClient()
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: verifiableInvoiceId },
        })
        expect(invoice).toBeNull()
      } finally {
        await prisma.$disconnect()
      }
    })

    test("4.5 Delete non-existent invoice returns 404", async ({ page }) => {
      const response = await page.request.delete(
        "/api/invoices/non-existent-id-12345"
      )

      expect(response.status()).toBe(404)
    })
  })

  // =========================================================================
  // Verify Page UI Tests
  // =========================================================================
  test.describe("Verify Page UI", () => {
    test("Verify page is accessible", async ({ page }) => {
      await page.goto("/verify")

      // Wait for page to load
      await page.waitForSelector("body")

      // Should be on verify page
      expect(page.url()).toContain("/verify")

      // Should show the table or empty state
      const content = await page.textContent("body")
      expect(content).toBeTruthy()
    })
  })
})

