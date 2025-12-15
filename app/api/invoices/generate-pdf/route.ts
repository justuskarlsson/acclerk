import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateInvoicePdf } from "@/server/services/invoice-pdf-generator"
import { CreateInvoiceSchema } from "@/lib/validations/create-invoice"

export async function POST(req: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    
    // Validate input
    const parseResult = CreateInvoiceSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Ogiltig fakturadata", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const invoiceData = parseResult.data

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf(invoiceData)

    // Return PDF as download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="faktura-${invoiceData.invoice_no || "utkast"}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("[generate-pdf] Error:", error)
    return NextResponse.json(
      { error: "Kunde inte generera PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

