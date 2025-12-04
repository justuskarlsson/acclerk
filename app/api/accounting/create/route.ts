import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAccounting } from "@/server/actions/accounting"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const entries = await createAccounting()
    return NextResponse.json(entries)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create accounting entries" }, { status: 500 })
  }
}


