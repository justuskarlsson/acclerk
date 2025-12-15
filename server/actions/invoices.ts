"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { extractInvoice } from "@/server/services/invoice-extractor"
import { prisma } from "@/lib/db"
import { matchInvoiceToTransaction } from "@/server/services/transaction-matcher"
import { generateAccountingEntry } from "@/server/services/accounting-generator"
import { Invoice } from "@/lib/validations/invoice"

export async function analyzeInvoices() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  console.log("[analyzeInvoices] Starting analysis for user:", session.user.id)

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id, status: "uploaded" },
  })

  console.log("[analyzeInvoices] Found", invoices.length, "invoices to analyze")

  // Get all transactions for this user (needed for auto-connect)
  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
  })
  const transactionData = transactions.map((t) => ({
    id: t.id,
    ...(t.rawData as Record<string, any>),
  }))

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

      // Update invoice with extracted data (still processing)
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          extractedData: extracted as any,
          supplier: extracted.supplier,
          invoiceDate: new Date(extracted.invoice_date),
          currency: extracted.currency,
          totalAmount: extracted.total_amount,
          vatAmount: extracted.vat_amount,
          invoiceNumber: extracted.invoice_number,
        },
      })

      // Auto-connect: Check if transactions exist
      if (transactions.length === 0) {
        // No transactions - set to pending
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "pending" },
        })
        console.log("[analyzeInvoices] No transactions, invoice set to pending:", invoice.id)
        continue
      }

      // Try to match this invoice to a transaction
      const match = await matchInvoiceToTransaction(extracted, transactionData)

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

        // Auto-accounting: Generate accounting entry
        try {
          const transaction = transactions.find((t) => t.id === match.transaction_id)
          if (transaction) {
            const invoiceType = (invoice.type as "expense" | "income") || "expense"
            const accountingEntry = await generateAccountingEntry({
              match_candidate: match,
              transaction: transaction.rawData as Record<string, any>,
              invoice: extracted,
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

          // Set status to ready (has match + accounting)
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: "ready" },
          })
          console.log("[analyzeInvoices] Invoice matched and accounted:", invoice.id)
        } catch (accountingError) {
          console.error("[analyzeInvoices] Accounting error:", accountingError)
          // Still mark as ready even if accounting fails
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: "ready" },
          })
        }
      } else {
        // No match found
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "no-match" },
        })
        console.log("[analyzeInvoices] No match found for invoice:", invoice.id)
      }
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


