import { Page } from "@playwright/test"
import { readFile } from "fs/promises"
import { join } from "path"

/**
 * File helpers for E2E tests
 */

/**
 * Get path to a test fixture file
 */
export function getTestFixturePath(category: "invoices" | "transactions", filename: string): string {
    return join(process.cwd(), "tests", "fixtures", category, filename)
}

/**
 * Read a test fixture file as buffer
 */
export async function readTestFixture(category: "invoices" | "transactions", filename: string): Promise<Buffer> {
    const path = getTestFixturePath(category, filename)
    return await readFile(path)
}

/**
 * Upload a test PDF file via file input
 */
export async function uploadTestPDF(page: Page, fileInputSelector: string, filename: string): Promise<void> {
    const filePath = getTestFixturePath("invoices", filename)
    await page.setInputFiles(fileInputSelector, filePath)
}

/**
 * Upload a test CSV file via file input
 */
export async function uploadTestCSV(page: Page, fileInputSelector: string, filename: string): Promise<void> {
    const filePath = getTestFixturePath("transactions", filename)
    await page.setInputFiles(fileInputSelector, filePath)
}

