"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { extractInvoice } from "@/server/services/invoice-extractor"
import { prisma } from "@/lib/db"

export async function analyzeInvoices() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id, status: "uploading" },
  })

  for (const invoice of invoices) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "processing" },
    })

    try {
      const extracted = await extractInvoice(invoice.filePath)
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "done",
          extractedData: extracted as any,
          supplier: extracted.supplier,
          invoiceDate: new Date(extracted.invoice_date),
          currency: extracted.currency,
          totalAmount: extracted.total_amount,
          vatAmount: extracted.vat_amount,
          invoiceNumber: extracted.invoice_number,
        },
      })
    } catch (error) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "error" },
      })
    }
  }
}


