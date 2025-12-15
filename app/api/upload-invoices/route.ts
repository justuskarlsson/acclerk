import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { saveFile } from "@/lib/storage"
import { prisma } from "@/lib/db"
import { analyzeInvoices } from "@/server/actions/invoices"

export async function POST(req: NextRequest) {
  console.log("[POST /api/upload-invoices] Request received")

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
    // Check content-type before trying to parse formData
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const files = formData.getAll("files")
    const invoiceType = (formData.get("type") as string) || "expense"
    const userId = session.user.id

    // Validate invoice type
    if (invoiceType !== "expense" && invoiceType !== "income") {
      return NextResponse.json({ error: "Invalid invoice type" }, { status: 400 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const savedFiles: string[] = []

    for (const file of files) {
      // Handle both File objects and Blob objects
      if (!(file instanceof Blob)) {
        console.warn("Skipping non-file entry:", typeof file)
        continue
      }

      const bytes = await file.arrayBuffer()
      const filename = (file as File).name || `upload-${Date.now()}.pdf`
      const filepath = await saveFile(bytes, `invoices/${userId}`, filename)

      console.log("[POST /api/upload-invoices] Saved file:", filename, "->", filepath, "type:", invoiceType)

      await prisma.invoice.create({
        data: {
          userId,
          filename,
          filePath: filepath,
          status: "uploaded",
          type: invoiceType,
          supplier: "", // Will be filled after extraction
          invoiceDate: new Date(),
          currency: "",
          totalAmount: 0,
        },
      })
      savedFiles.push(filename)
    }

    console.log("[POST /api/upload-invoices] Upload complete, triggering analysis...")

    // Trigger analysis in background (don't await - let it run async)
    analyzeInvoices().catch(err => {
      console.error("[POST /api/upload-invoices] Background analysis failed:", err)
    })

    return NextResponse.json({ storedFiles: savedFiles })
  } catch (error) {
    console.error("[POST /api/upload-invoices] Upload error:", error)
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}


