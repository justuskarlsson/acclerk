import nunjucks from "nunjucks"
import { chromium } from "playwright"
import path from "path"
import fs from "fs"

// Configure Nunjucks environment
const templateDir = path.join(process.cwd())
const env = nunjucks.configure(templateDir, {
    autoescape: true,
    noCache: true,
})

// Custom filter: Swedish number format (comma as decimal separator, space as thousand separator)
env.addFilter("svnum", (value: number | null | undefined): string => {
    if (value === null || value === undefined) return ""
    const formatted = value.toLocaleString("sv-SE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })
    return formatted
})

// Custom filter: Currency format with symbol
env.addFilter("sek", (value: number | null | undefined, currency: string = "SEK"): string => {
    if (value === null || value === undefined) return ""

    const currencySymbols: Record<string, string> = {
        SEK: "kr",
        EUR: "€",
        USD: "$",
        GBP: "£",
    }

    const symbol = currencySymbols[currency] || currency
    const formatted = value.toLocaleString("sv-SE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })

    // Swedish format: amount followed by currency symbol
    return `${formatted} ${symbol}`
})

export interface InvoiceAddress {
    name: string
    address_line1: string
    address_line2?: string
    postal_code: string
    city: string
    country: string
    phone?: string
    email?: string
    orgnr?: string
    vat_reg_no?: string
    approved_for_f_tax?: boolean
    your_ref?: string
}

export interface InvoiceLineItem {
    description: string
    quantity: number
    unit: string
    unit_price: number
    net_amount: number
}

export interface InvoiceBankDetails {
    plusgiro?: string
    bankgiro?: string
    iban?: string
    bic?: string
}

export interface CreateInvoiceData {
    invoice_no: string
    invoice_date: string
    due_date: string
    ocr?: string
    our_ref?: string
    payment_terms_days: number
    currency: string
    seller: InvoiceAddress
    buyer: InvoiceAddress
    lines: InvoiceLineItem[]
    total_net: number
    total_vat: number
    total_gross: number
    vat_rate_label: string
    bank: InvoiceBankDetails
    interest_rate_percent: number
}

/**
 * Render invoice HTML from template
 */
export function renderInvoiceHtml(data: CreateInvoiceData): string {
    const templatePath = "invoice_template.jinja2.html"

    // Verify template exists
    const fullPath = path.join(templateDir, templatePath)
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Template not found: ${fullPath}`)
    }

    return env.render(templatePath, { invoice: data })
}

/**
 * Generate PDF from invoice data using Playwright
 */
export async function generateInvoicePdf(data: CreateInvoiceData): Promise<Buffer> {
    const html = renderInvoiceHtml(data)

    // Launch headless browser
    const browser = await chromium.launch({
        headless: true,
    })

    try {
        const page = await browser.newPage()

        // Set content and wait for fonts to load
        await page.setContent(html, { waitUntil: "networkidle" })

        // Generate PDF with A4 format
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "0",
                bottom: "0",
                left: "0",
                right: "0",
            },
        })

        return Buffer.from(pdfBuffer)
    } finally {
        await browser.close()
    }
}

