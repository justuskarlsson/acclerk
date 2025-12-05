import { openai } from "@/lib/openai"
import { zodTextFormat } from "openai/helpers/zod"
import { MatchedPair } from "@/lib/validations/transaction"
import { AccountingEntry, AccountingEntrySchema } from "@/lib/validations/accounting"

const ACCOUNTING_INSTRUCTIONS = `Given the matching of invoice and transaction, create accounting line items for the transaction. The line items should follow Swedish Skatteverket law.
So use the sru code for each line item. The currency should be in SEK, and totalling the amount given per the transaction. So if the invoice amount is in EUR, converter invoice line items to SEK (should total to the transaction amount). To help you, here are some examples done in Fortnox:
#VER A 1 20250101 "Registreringsavgift Bolagsverket" 20250302
{
#TRANS 6991 {} 1900 "" "" 0
#TRANS 2018 {} -1900 "" "" 0
}
#VER A 2 20250509 "gsuite" 20250509
{
#TRANS 1930 {} -91.11 "" "" 0
#TRANS 4535 {} 91.11 "" "" 0
#TRANS 2614 {} -22.78 "" "" 0
#TRANS 2645 {} 22.78 "" "" 0
}
#VER A 3 20250509 "gsuite" 20250509
{
#TRANS 1930 {} -57.91 "" "" 0
#TRANS 4535 {} 57.91 "" "" 0
#TRANS 2614 {} -14.48 "" "" 0
#TRANS 2645 {} 14.48 "" "" 0
}
#VER A 4 20250509 "hetzner apr" 20250509
{
#TRANS 1930 {} -140.54 "" "" 0
#TRANS 4535 {} 140.54 "" "" 0
#TRANS 2614 {} -35.14 "" "" 0
#TRANS 2645 {} 35.14 "" "" 0
}
#VER A 5 20250509 "Utbetalning av registreringsavgift" 20250509
{
#TRANS 2018 {} 1900 "" "" 0
#TRANS 1930 {} -1900 "" "" 0
}
#VER A 6 20250509 "hetzner mar" 20250509
{
#TRANS 1930 {} -138 "" "" 0
#TRANS 4535 {} 138 "" "" 0
#TRANS 2614 {} -34.5 "" "" 0
#TRANS 2645 {} 34.5 "" "" 0 
}`

export async function generateAccountingEntry(match: MatchedPair): Promise<AccountingEntry> {
  // Remove match_candidate from the data sent to OpenAI
  const { match_candidate, ...matchData } = match
  const matchDataText = JSON.stringify(matchData, null, 2)

  console.log("[OpenAI:accounting] Sending request for invoice:", match.invoice.supplier)

  const response = await openai.responses.parse({
    model: "gpt-5.1",
    input: [
      {
        role: "user",
        content: matchDataText,
      },
    ],
    text: { format: zodTextFormat(AccountingEntrySchema, 'accounting_entry') },
    instructions: ACCOUNTING_INSTRUCTIONS,
    reasoning: { effort: "medium" },
  })

  console.log("[OpenAI:accounting] Response received")

  if (!response.output_parsed) {
    console.log("[OpenAI:accounting] No parsed output")
    throw new Error("Failed to generate accounting entry from OpenAI response")
  }

  const entry = response.output_parsed as AccountingEntry
  console.log("[OpenAI:accounting] Generated", entry.line_items.length, "line items, total:", entry.amount)

  return entry
}

export async function generateAccountingEntries(matches: MatchedPair[]): Promise<AccountingEntry[]> {
  const entries: AccountingEntry[] = []

  for (const match of matches) {
    try {
      const entry = await generateAccountingEntry(match)
      entries.push(entry)
    } catch (error) {
      console.error(`Failed to generate accounting entry for match:`, error)
      // Continue with other matches even if one fails
    }
  }

  return entries
}


