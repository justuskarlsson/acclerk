"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { extractInvoice } from "@/server/services/invoice-extractor"
import { prisma } from "@/lib/db"

export async function analyzeInvoices() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  console.log("[analyzeInvoices] Starting analysis for user:", session.user.id)

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id, status: "uploaded" },
  })

  console.log("[analyzeInvoices] Found", invoices.length, "invoices to analyze")

  for (const invoice of invoices) {
    console.log("[analyzeInvoices] Processing invoice:", invoice.id, invoice.filename)

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "processing" },
    })

    try {
      console.log("[analyzeInvoices] Extracting data from:", invoice.filePath)
      const extracted = await extractInvoice(invoice.filePath)
      console.log("[analyzeInvoices] Extraction successful:", {
        supplier: extracted.supplier,
        total: extracted.total_amount,
        currency: extracted.currency,
      })

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "analyzed",
          extractedData: extracted as any,
          supplier: extracted.supplier,
          invoiceDate: new Date(extracted.invoice_date),
          currency: extracted.currency,
          totalAmount: extracted.total_amount,
          vatAmount: extracted.vat_amount,
          invoiceNumber: extracted.invoice_number,
        },
      })
      console.log("[analyzeInvoices] Invoice analyzed successfully:", invoice.id)
    } catch (error) {
      console.error("[analyzeInvoices] Error analyzing invoice:", invoice.id, error)
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "error" },
      })
    }
  }

  console.log("[analyzeInvoices] Analysis complete")
}


