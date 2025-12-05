import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * GET /api/invoices/[id]
 * 
 * Get a single invoice by ID with full details.
 */
export async function GET(
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
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: session.user.id, // Ensure user owns this invoice
      },
      include: {
        matches: {
          include: {
            transaction: true,
          },
        },
        accounting: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error("Get invoice error:", error)
    return NextResponse.json(
      { error: "Failed to get invoice" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/invoices/[id]
 * 
 * Delete an invoice by ID. Only the owner can delete.
 */
export async function DELETE(
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

    // Delete the invoice (cascade will handle related records)
    await prisma.invoice.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete invoice error:", error)
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    )
  }
}

