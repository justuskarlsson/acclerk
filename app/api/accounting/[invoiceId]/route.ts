import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * GET /api/accounting/[invoiceId]
 * 
 * Fetch accounting line items for an invoice.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Verify invoice ownership
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: session.user.id,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Fetch accounting entry for this invoice
    const accountingEntry = await prisma.accountingEntry.findUnique({
      where: { invoiceId },
    })

    if (!accountingEntry) {
      return NextResponse.json({ lineItems: [] })
    }

    return NextResponse.json({
      lineItems: accountingEntry.lineItems,
      date: accountingEntry.date,
      amount: accountingEntry.amount,
    })
  } catch (error) {
    console.error("Fetch accounting error:", error)
    return NextResponse.json(
      { error: "Failed to fetch accounting data" },
      { status: 500 }
    )
  }
}

