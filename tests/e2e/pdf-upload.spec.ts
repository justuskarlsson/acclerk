import { test, expect } from "@playwright/test"
import { resetTestData, getTestPrismaClient } from "../helpers/db-helpers"
import { getTestFixturePath, readTestFixture } from "../helpers/file-helpers"
import { existsSync } from "fs"

/**
 * UC2: Upload PDF and View Preview
 * 
 * Tests that:
 * - Authenticated user can upload a PDF file via API
 * - PDF is stored and invoice record is created in DB
 * - User can view the verify page
 * - Unauthenticated user cannot upload
 * 
 * Note: globalSetup handles user creation and login.
 * Tests run with authenticated state from storage state.
 */

const TEST_USER_EMAIL = "test@example.com"

test.describe("PDF Upload and Preview", () => {
  test.beforeEach(async () => {
    // Reset test data (invoices, etc.) but NOT users
    await resetTestData()
  })

  test("should allow authenticated user to upload PDF via API", async ({ page }) => {
    // Check if test PDF exists, if not create a minimal one
    const testPdfPath = getTestFixturePath("invoices", "test-invoice.pdf")
    let pdfBuffer: Buffer

    if (existsSync(testPdfPath)) {
      pdfBuffer = await readTestFixture("invoices", "test-invoice.pdf")
    } else {
      // Create a minimal valid PDF for testing
      pdfBuffer = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n100\n%%EOF"
      )
    }

    // Upload PDF via API - page.request uses authenticated context
    // Use proper Playwright multipart format with buffer
    const response = await page.request.post("/api/upload-invoices", {
      multipart: {
        files: {
          name: "test-invoice.pdf",
          mimeType: "application/pdf",
          buffer: pdfBuffer,
        },
      },
    })

    // Verify upload succeeded
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.storedFiles).toBeDefined()
  })

  test("should create invoice record in database after upload", async ({ page }) => {
    const prisma = getTestPrismaClient()

    // Create a minimal PDF
    const pdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n100\n%%EOF"
    )

    try {
      // Upload PDF via API using proper multipart format
      const response = await page.request.post("/api/upload-invoices", {
        multipart: {
          files: {
            name: "test-invoice.pdf",
            mimeType: "application/pdf",
            buffer: pdfBuffer,
          },
        },
      })

      expect(response.status()).toBe(200)

      // Verify invoice was created in database
      const invoices = await prisma.invoice.findMany({
        where: {
          user: {
            email: TEST_USER_EMAIL,
          },
        },
      })

      expect(invoices.length).toBeGreaterThan(0)
      expect(invoices[0].status).toBe("uploading")
    } finally {
      await prisma.$disconnect()
    }
  })

  test("should display verify page", async ({ page }) => {
    // Navigate to verify page
    await page.goto("/verify")

    // Fuzzy: check that page loads
    const pageContent = await page.textContent("body")
    expect(pageContent).toBeTruthy()

    // Verify page is accessible (not 404 or error)
    expect(page.url()).toContain("/verify")
  })

  test("should prevent unauthenticated user from uploading PDF", async ({ browser }) => {
    const pdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\nxref\n0 3\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n50\n%%EOF"
    )

    // Create a new context with EMPTY storage state (no cookies)
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const unauthenticatedPage = await context.newPage()

    try {
      // Try to upload without authentication using proper multipart format
      const response = await unauthenticatedPage.request.post(
        "/api/upload-invoices",
        {
          multipart: {
            files: {
              name: "test-invoice.pdf",
              mimeType: "application/pdf",
              buffer: pdfBuffer,
            },
          },
        }
      )

      // Should be unauthorized
      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body.error).toContain("Unauthorized")
    } finally {
      await context.close()
    }
  })
})
