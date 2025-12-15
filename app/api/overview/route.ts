import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface LineItem {
  amount: number
  sru_code: number
  sru_code_description: string
  comment?: string
}

/**
 * GET /api/overview
 * 
 * Returns overview metrics:
 * - totalIncome: Total revenue from income invoices
 * - totalCost: Sum of cost accounts (4xxx, 5xxx, 6xxx)
 * - vatBalance: Net VAT (ingående - utgående)
 *   - Positive = refund from Skatteverket
 *   - Negative = owe to Skatteverket
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get income invoices to calculate total income
    const incomeInvoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        type: "income",
      },
    })
    const totalIncome = incomeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)

    // Get ALL accounting entries for user's invoices (both expense and income)
    // - Expense invoices have ingående moms (2640-2650) - what we can claim back
    // - Income invoices have utgående moms (2610-2619) - what we owe
    const entries = await prisma.accountingEntry.findMany({
      where: {
        invoice: {
          userId: session.user.id,
        },
      },
    })

    let totalCost = 0
    let utgaendeMoms = 0  // 2610-2619 - negative values (debt to Skatteverket)
    let ingaendeMoms = 0  // 2640-2650 - positive values (claim from Skatteverket)

    for (const entry of entries) {
      const lineItems = entry.lineItems as unknown as LineItem[]

      for (const item of lineItems) {
        const code = item.sru_code
        const amount = item.amount

        // Cost accounts: 4xxx, 5xxx, 6xxx (positive amounts = costs)
        if (code >= 4000 && code < 7000) {
          totalCost += amount
        }

        // Utgående moms (output VAT) - accounts 2610-2619
        // These are typically negative (debt to Skatteverket)
        if (code >= 2610 && code < 2620) {
          utgaendeMoms += amount
        }

        // Ingående moms (input VAT) - accounts 2640-2650
        // These are typically positive (claim from Skatteverket)
        if (code >= 2640 && code <= 2650) {
          ingaendeMoms += amount
        }
      }
    }

    // VAT balance: ingående (positive/claim) + utgående (negative/debt)
    // Positive result = net refund, negative = net payment to Skatteverket
    const vatBalance = ingaendeMoms + utgaendeMoms

    // Profit: Income - Costs + VAT balance
    // VAT balance is added because:
    // - If positive (refund), it increases profit
    // - If negative (payment), it decreases profit
    const profit = totalIncome - totalCost + vatBalance

    return NextResponse.json({
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      vatBalance: Math.round(vatBalance * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      // Detailed breakdown for debugging
      vatDetails: {
        utgaendeMoms: Math.round(utgaendeMoms * 100) / 100,
        ingaendeMoms: Math.round(ingaendeMoms * 100) / 100,
      },
    })
  } catch (error) {
    console.error("Overview API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch overview data" },
      { status: 500 }
    )
  }
}

