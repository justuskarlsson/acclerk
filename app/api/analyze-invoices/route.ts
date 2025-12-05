import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { analyzeInvoices } from "@/server/actions/invoices"

export async function POST(req: NextRequest) {
  console.log("[POST /api/analyze-invoices] Request received")

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    console.log("[POST /api/analyze-invoices] Unauthorized - no session")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[POST /api/analyze-invoices] User:", session.user.id)

  try {
    await analyzeInvoices()
    console.log("[POST /api/analyze-invoices] Analysis complete")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[POST /api/analyze-invoices] Error:", error)
    return NextResponse.json({ error: "Failed to analyze invoices" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { prisma } = await import("@/lib/db")
  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invoices)
}


