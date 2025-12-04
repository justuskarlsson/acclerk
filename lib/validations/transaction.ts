import { z } from "zod"

export const TransactionMatchSchema = z.object({
  transaction_id: z.string(),
  reason_for_match: z.string(),
  confidence_percentage: z.number(),
})

export const MatchedPairSchema = z.object({
  match_candidate: TransactionMatchSchema,
  transaction: z.record(z.string(), z.string()),
  invoice: z.any(), // Invoice schema
})

export const MatchingResultSchema = z.object({
  matches: z.array(MatchedPairSchema),
  remaining_transactions: z.array(z.record(z.string(), z.string())),
  remaining_invoices: z.array(z.any()), // Invoice schema
})

export type TransactionMatch = z.infer<typeof TransactionMatchSchema>
export type MatchedPair = z.infer<typeof MatchedPairSchema>
export type MatchingResult = z.infer<typeof MatchingResultSchema>


