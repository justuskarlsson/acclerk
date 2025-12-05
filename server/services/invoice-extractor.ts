import { openai } from "@/lib/openai"
import { zodTextFormat } from "openai/helpers/zod"
import { Invoice, InvoiceSchema } from "@/lib/validations/invoice"
import { createReadStream } from "fs"
import { getFullPath } from "@/lib/storage"

export async function extractInvoice(filePath: string): Promise<Invoice> {
  // filePath is relative (e.g., "invoices/userId/file.pdf")
  // Convert to full filesystem path using storage root
  const fullPath = getFullPath(filePath)

  console.log("[OpenAI:extract] Uploading file:", filePath)

  const file = await openai.files.create({
    file: createReadStream(fullPath),
    purpose: "user_data",
  })

  console.log("[OpenAI:extract] Sending extraction request, fileId:", file.id)

  const response = await openai.responses.parse({
    model: "gpt-5.1",
    input: [
      {
        role: "user",
        content: [
          { type: "input_file", file_id: file.id },
          {
            type: "input_text",
            text: "Läs fakturan. Returnera enbart giltig JSON som matchar schemat. Ändra inte siffror. Om flera valutor förekommer: använd det belopp som uttryckligen är fakturans totalsumma och ange dess valuta.",
          },
        ],
      },
    ],
    text: { format: zodTextFormat(InvoiceSchema, 'invoice') },
    reasoning: { effort: "medium" },
  })

  console.log("[OpenAI:extract] Response received")

  if (!response.output_parsed) {
    console.log("[OpenAI:extract] No parsed output")
    throw new Error("Failed to extract invoice data from OpenAI response")
  }

  const invoice = response.output_parsed as Invoice
  console.log("[OpenAI:extract] Extracted:", invoice.supplier, invoice.total_amount, invoice.currency)

  return invoice
}


