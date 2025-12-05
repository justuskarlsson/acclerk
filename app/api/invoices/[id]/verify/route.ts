import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * POST /api/invoices/[id]/verify
 * 
 * Verify or unverify an invoice.
 * 
 * Body:
 * - verified: true  -> sets status to "verified"
 * - verified: false -> sets status to "ready" (unverify)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Check for session token cookie first
  const sessionToken = req.cookies.get("next-auth.session-token")
  if (!sessionToken?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { verified } = body

    if (typeof verified !== "boolean") {
      return NextResponse.json(
        { error: "verified must be a boolean" },
        { status: 400 }
      )
    }

    // Verify ownership first
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Only allow verification from ready or verified status
    if (!["ready", "verified"].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Cannot verify invoice with status: ${invoice.status}` },
        { status: 400 }
      )
    }

    // Update status
    const newStatus = verified ? "verified" : "ready"
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status: newStatus },
    })

    // Also update the match verified status
    await prisma.match.updateMany({
      where: { invoiceId: id },
      data: { verified },
    })

    return NextResponse.json({
      success: true,
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status,
      },
    })
  } catch (error) {
    console.error("Verify invoice error:", error)
    return NextResponse.json(
      { error: "Failed to verify invoice" },
      { status: 500 }
    )
  }
}

