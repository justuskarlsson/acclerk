import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { connectPendingInvoices } from "@/server/actions/transactions"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const text = await file.text()
  const lines = text.split("\n")
  const headers = lines[0].split(";")
  const userId = session.user.id

  // Parse all CSV rows first
  interface ParsedTransaction {
    transactionDate: Date
    amount: number
    currency: string
    description: string
    rawData: Record<string, string>
  }

  const csvTransactions: ParsedTransaction[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    const values = lines[i].split(";")
    const transactionData: Record<string, string> = {}
    headers.forEach((header, index) => {
      transactionData[header.trim()] = values[index]?.trim() || ""
    })

    const transactionDateStr = transactionData["Bokföringsdatum"] || transactionData["Datum"] || new Date().toISOString()
    const transactionDate = new Date(transactionDateStr)
    const amount = parseFloat(transactionData["Belopp"]?.replace(",", ".") || "0")
    const currency = transactionData["Valuta"] || "SEK"
    const description = transactionData["Beskrivning"] || transactionData["Text"] || ""

    csvTransactions.push({
      transactionDate,
      amount,
      currency,
      description,
      rawData: transactionData,
    })
  }

  // Smart merge: Find last transaction date in DB
  const lastTransaction = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { transactionDate: "desc" },
  })

  let insertedCount = 0

  if (!lastTransaction) {
    // No existing transactions - insert all
    for (const tx of csvTransactions) {
      await prisma.transaction.create({
        data: {
          userId,
          transactionDate: tx.transactionDate,
          amount: tx.amount,
          currency: tx.currency,
          description: tx.description,
          rawData: tx.rawData,
        },
      })
      insertedCount++
    }
  } else {
    const lastDate = lastTransaction.transactionDate
    const lastDateStr = lastDate.toISOString().split("T")[0]

    // Count transactions on the last date in DB
    const dbCountOnLastDate = await prisma.transaction.count({
      where: {
        userId,
        transactionDate: {
          gte: new Date(lastDateStr),
          lt: new Date(new Date(lastDateStr).getTime() + 24 * 60 * 60 * 1000),
        },
      },
    })

    // Group CSV transactions by date
    const csvOnLastDate = csvTransactions.filter(
      (tx) => tx.transactionDate.toISOString().split("T")[0] === lastDateStr
    )
    const csvAfterLastDate = csvTransactions.filter(
      (tx) => tx.transactionDate > lastDate
    )

    // Insert extras on last date (if CSV has more than DB)
    if (csvOnLastDate.length > dbCountOnLastDate) {
      // Insert the last N transactions from CSV for that date
      const extrasToInsert = csvOnLastDate.slice(dbCountOnLastDate)
      for (const tx of extrasToInsert) {
        await prisma.transaction.create({
          data: {
            userId,
            transactionDate: tx.transactionDate,
            amount: tx.amount,
            currency: tx.currency,
            description: tx.description,
            rawData: tx.rawData,
          },
        })
        insertedCount++
      }
    }

    // Insert all transactions after the last date
    for (const tx of csvAfterLastDate) {
      await prisma.transaction.create({
        data: {
          userId,
          transactionDate: tx.transactionDate,
          amount: tx.amount,
          currency: tx.currency,
          description: tx.description,
          rawData: tx.rawData,
        },
      })
      insertedCount++
    }
  }

  // Trigger connect for pending/no-match invoices (async - don't wait)
  connectPendingInvoices().catch((err) => {
    console.error("[upload-transactions] Background connect failed:", err)
  })

  return NextResponse.json({
    filename: file.name,
    inserted: insertedCount,
    total: csvTransactions.length,
  })
}


