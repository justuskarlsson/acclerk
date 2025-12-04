import { openai } from "@/lib/openai"
import { Invoice, InvoiceSchema } from "@/lib/validations/invoice"
import { createReadStream } from "fs"

export async function extractInvoice(filePath: string): Promise<Invoice> {
  const file = await openai.files.create({
    file: createReadStream(filePath),
    purpose: "user_data",
  })

  const response = await openai.responses.parse({
    model: "o4-mini",
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
    text_format: InvoiceSchema,
  })

  if (!response.output_parsed) {
    throw new Error("Failed to extract invoice data from OpenAI response")
  }
  return response.output_parsed as Invoice
}


