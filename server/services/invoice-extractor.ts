import { openai } from "@/lib/openai"
import { zodTextFormat } from "openai/helpers/zod"
import { Invoice, InvoiceSchema } from "@/lib/validations/invoice"
import { createReadStream } from "fs"
import { getFullPath } from "@/lib/storage"

export async function extractInvoice(filePath: string): Promise<Invoice> {
  // filePath is relative (e.g., "invoices/userId/file.pdf")
  // Convert to full filesystem path using storage root
  const fullPath = getFullPath(filePath)

  console.log("[extractInvoice] Processing:", filePath, "->", fullPath)

  const file = await openai.files.create({
    file: createReadStream(fullPath),
    purpose: "user_data",
  })

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

  if (!response.output_parsed) {
    throw new Error("Failed to extract invoice data from OpenAI response")
  }
  return response.output_parsed as Invoice
}


