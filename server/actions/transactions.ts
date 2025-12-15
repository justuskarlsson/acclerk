"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { matchInvoiceToTransaction } from "@/server/services/transaction-matcher"
import { generateAccountingEntry } from "@/server/services/accounting-generator"
import { prisma } from "@/lib/db"
import { Invoice } from "@/lib/validations/invoice"

/**
 * Connect pending invoices to transactions.
 * Processes invoices with status "pending" or "no-match" only.
 * Runs matching + accounting automatically.
 */
export async function connectPendingInvoices() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  console.log("[connectPendingInvoices] Starting for user:", session.user.id)

  // Get pending and no-match invoices only
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["pending", "no-match"] },
    },
  })

  if (invoices.length === 0) {
    console.log("[connectPendingInvoices] No pending invoices to connect")
    return { matched: 0, total: 0 }
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
  })

  if (transactions.length === 0) {
    console.log("[connectPendingInvoices] No transactions available")
    return { matched: 0, total: invoices.length }
  }

  const transactionData = transactions.map((t) => ({
    id: t.id,
    ...(t.rawData as Record<string, any>),
  }))

  let matchedCount = 0

  for (const invoice of invoices) {
    const invoiceExtracted = invoice.extractedData as Invoice
    if (!invoiceExtracted) {
      console.log("[connectPendingInvoices] No extracted data for invoice:", invoice.id)
      continue
    }

    // Try to match this invoice
    const match = await matchInvoiceToTransaction(invoiceExtracted, transactionData)

    if (match && match.transaction_id) {
      // Create match record
      const matchRecord = await prisma.match.create({
        data: {
          invoiceId: invoice.id,
          transactionId: match.transaction_id,
          confidence: match.confidence_percentage,
          reason: match.reason_for_match,
        },
      })

      // Generate accounting entry
      try {
        const transaction = transactions.find((t) => t.id === match.transaction_id)
        if (transaction) {
          const invoiceType = (invoice.type as "expense" | "income") || "expense"
          const accountingEntry = await generateAccountingEntry({
            match_candidate: match,
            transaction: transaction.rawData as Record<string, any>,
            invoice: invoiceExtracted,
          }, invoiceType)

          await prisma.accountingEntry.create({
            data: {
              invoiceId: invoice.id,
              matchId: matchRecord.id,
              date: new Date(accountingEntry.date),
              amount: accountingEntry.amount,
              lineItems: accountingEntry.line_items as any,
            },
          })
        }
      } catch (accountingError) {
        console.error("[connectPendingInvoices] Accounting error:", accountingError)
      }

      // Update status to ready
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "ready" },
      })

      matchedCount++
      console.log("[connectPendingInvoices] Matched invoice:", invoice.id)
    } else {
      // Still no match - keep as no-match
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "no-match" },
      })
      console.log("[connectPendingInvoices] No match for invoice:", invoice.id)
    }
  }

  console.log("[connectPendingInvoices] Complete:", matchedCount, "/", invoices.length)
  return { matched: matchedCount, total: invoices.length }
}


