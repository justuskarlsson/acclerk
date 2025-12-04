"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { matchInvoicesToTransactions } from "@/server/services/transaction-matcher"
import { prisma } from "@/lib/db"
import { Invoice } from "@/lib/validations/invoice"

export async function connectTransactions() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id, status: "done" },
  })

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
  })

  const invoiceData: Invoice[] = invoices.map((inv) => inv.extractedData as Invoice)
  const transactionData = transactions.map((t) => ({
    id: t.id,
    ...(t.rawData as Record<string, any>),
  }))

  const matchingResult = await matchInvoicesToTransactions(invoiceData, transactionData)

  // Create Match records in database
  for (const match of matchingResult.matches) {
    const invoice = invoices.find((inv) => {
      const invData = inv.extractedData as Invoice
      return invData.supplier === match.invoice.supplier && invData.invoice_date === match.invoice.invoice_date
    })

    if (invoice) {
      await prisma.match.create({
        data: {
          invoiceId: invoice.id,
          transactionId: match.match_candidate.transaction_id,
          confidence: match.match_candidate.confidence_percentage,
          reason: match.match_candidate.reason_for_match,
        },
      })
    }
  }

  return matchingResult
}


