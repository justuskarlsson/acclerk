import { z } from "zod"

export const AddressSchema = z.object({
  name: z.string().min(1, "Namn krävs"),
  address_line1: z.string().min(1, "Adressrad 1 krävs"),
  address_line2: z.string().optional(),
  postal_code: z.string().min(1, "Postnummer krävs"),
  city: z.string().min(1, "Ort krävs"),
  country: z.string().min(1, "Land krävs"),
  phone: z.string().optional(),
  email: z.string().email("Ogiltig e-postadress").optional().or(z.literal("")),
  orgnr: z.string().optional(),
  vat_reg_no: z.string().optional(),
  approved_for_f_tax: z.boolean().optional(),
  your_ref: z.string().optional(),
})

export const LineItemSchema = z.object({
  description: z.string().min(1, "Beskrivning krävs"),
  quantity: z.number().positive("Antal måste vara positivt"),
  unit: z.string().min(1, "Enhet krävs"),
  unit_price: z.number().min(0, "Pris kan inte vara negativt"),
  net_amount: z.number(),
})

export const BankDetailsSchema = z.object({
  plusgiro: z.string().optional(),
  bankgiro: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
})

export const CreateInvoiceSchema = z.object({
  invoice_no: z.string().min(1, "Fakturanummer krävs"),
  invoice_date: z.string().min(1, "Fakturadatum krävs"),
  due_date: z.string().min(1, "Förfallodatum krävs"),
  ocr: z.string().optional(),
  our_ref: z.string().optional(),
  payment_terms_days: z.number().int().positive(),
  currency: z.string().min(1, "Valuta krävs"),
  seller: AddressSchema,
  buyer: AddressSchema,
  lines: z.array(LineItemSchema).min(1, "Minst en rad krävs"),
  total_net: z.number(),
  total_vat: z.number(),
  total_gross: z.number(),
  vat_rate_label: z.string(),
  bank: BankDetailsSchema,
  interest_rate_percent: z.number(),
})

export type Address = z.infer<typeof AddressSchema>
export type LineItem = z.infer<typeof LineItemSchema>
export type BankDetails = z.infer<typeof BankDetailsSchema>
export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>

