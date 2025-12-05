"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateAccountingEntries } from "@/server/services/accounting-generator"
import { prisma } from "@/lib/db"
import { MatchedPair } from "@/lib/validations/transaction"

/**
 * Create accounting entries for matches that don't have them yet.
 * Note: Accounting is now done automatically during connect,
 * so this is mainly for re-processing or manual triggering.
 */
export async function createAccounting() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Find matches without accounting entries
  const matches = await prisma.match.findMany({
    where: {
      invoice: { userId: session.user.id },
      accounting: null, // Only process matches without accounting
    },
    include: {
      invoice: true,
      transaction: true,
    },
  })

  if (matches.length === 0) {
    return []
  }

  const matchedPairs: MatchedPair[] = matches.map((match) => ({
    match_candidate: {
      transaction_id: match.transactionId,
      reason_for_match: match.reason,
      confidence_percentage: match.confidence,
    },
    transaction: match.transaction.rawData as Record<string, any>,
    invoice: match.invoice.extractedData as any,
  }))

  const accountingEntries = await generateAccountingEntries(matchedPairs)

  // Save accounting entries to database
  for (let i = 0; i < accountingEntries.length; i++) {
    const entry = accountingEntries[i]
    const match = matches[i]

    await prisma.accountingEntry.create({
      data: {
        invoiceId: match.invoiceId,
        matchId: match.id,
        date: new Date(entry.date),
        amount: entry.amount,
        lineItems: entry.line_items as any,
      },
    })
  }

  return accountingEntries
}


