import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectPendingInvoices } from "@/server/actions/transactions"

/**
 * POST /api/invoices/connect
 * 
 * Runs the invoice-to-transaction matching synchronously.
 * Updates invoice statuses:
 * - "analyzed" → "to-verify" (if matched)
 * - "analyzed" → "connection-fail" (if no match found)
 * 
 * Returns the result including counts of matched/total invoices.
 */
export async function POST(req: NextRequest) {
  // Check for session token cookie first (faster than full session check)
  const sessionToken = req.cookies.get("next-auth.session-token")
  if (!sessionToken?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Full auth check
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await connectPendingInvoices()
    return NextResponse.json({
      success: true,
      matched: result.matched,
      total: result.total,
    })
  } catch (error) {
    console.error("Connect invoices error:", error)
    return NextResponse.json(
      { error: "Failed to connect invoices", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

