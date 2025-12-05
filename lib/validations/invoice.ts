import { z } from "zod"

export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  currency: z.string().nullable(),
})

export const InvoiceSchema = z.object({
  supplier: z.string(),
  invoice_date: z.string(), // ISO-8601 date string
  currency: z.string(), // e.g. "SEK", "EUR", "USD"
  total_amount: z.number(), // total incl. VAT
  invoice_number: z.string().nullable(),
  vat_amount: z.number().nullable(),
  line_items: z.array(InvoiceLineItemSchema).nullable(),
})

export type Invoice = z.infer<typeof InvoiceSchema>
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>


