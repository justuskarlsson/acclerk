import { z } from "zod"

export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
  currency: z.string().optional(),
})

export const InvoiceSchema = z.object({
  supplier: z.string(),
  invoice_date: z.string(), // ISO-8601 date string
  currency: z.string(), // e.g. "SEK", "EUR", "USD"
  total_amount: z.number(), // total incl. VAT
  invoice_number: z.string().optional(),
  vat_amount: z.number().optional(),
  line_items: z.array(InvoiceLineItemSchema).optional(),
})

export type Invoice = z.infer<typeof InvoiceSchema>
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>


