import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

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

  // Delete all existing transactions for this user (full replacement on each upload)
  await prisma.transaction.deleteMany({
    where: { userId },
  })

  // Parse CSV (assuming Nordea format: semicolon-delimited)
  const transactions: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    const values = lines[i].split(";")
    const transactionData: Record<string, string> = {}
    headers.forEach((header, index) => {
      transactionData[header.trim()] = values[index]?.trim() || ""
    })

    // Extract key fields
    const transactionDate = transactionData["Bokföringsdatum"] || transactionData["Datum"] || new Date().toISOString()
    const amount = parseFloat(transactionData["Belopp"]?.replace(",", ".") || "0")
    const currency = transactionData["Valuta"] || "SEK"
    const description = transactionData["Beskrivning"] || transactionData["Text"] || ""

    await prisma.transaction.create({
      data: {
        userId,
        transactionDate: new Date(transactionDate),
        amount,
        currency,
        description,
        rawData: transactionData,
      },
    })

    transactions.push(transactionData)
  }

  return NextResponse.json({ filename: file.name, count: transactions.length })
}


