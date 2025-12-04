import { z } from "zod"

export const AccountingEntryLineItemSchema = z.object({
  amount: z.number(),
  sru_code: z.number(),
  sru_code_description: z.string(),
  comment: z.string().optional(),
})

export const AccountingEntrySchema = z.object({
  id: z.string(),
  date: z.string(), // ISO-8601 date string
  amount: z.number(),
  line_items: z.array(AccountingEntryLineItemSchema),
})

export type AccountingEntryLineItem = z.infer<typeof AccountingEntryLineItemSchema>
export type AccountingEntry = z.infer<typeof AccountingEntrySchema>


