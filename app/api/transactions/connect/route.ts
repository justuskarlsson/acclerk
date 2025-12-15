import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectPendingInvoices } from "@/server/actions/transactions"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await connectPendingInvoices()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Failed to connect transactions" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { prisma } = await import("@/lib/db")
  const matches = await prisma.match.findMany({
    where: {
      invoice: { userId: session.user.id },
    },
    include: {
      invoice: true,
      transaction: true,
    },
  })

  return NextResponse.json({ matches })
}


