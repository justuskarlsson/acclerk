import { openai } from "@/lib/openai"
import { zodTextFormat } from "openai/helpers/zod"
import { Invoice } from "@/lib/validations/invoice"
import { TransactionMatch, MatchingResult, MatchedPair, TransactionMatchSchema } from "@/lib/validations/transaction"

export async function matchInvoiceToTransaction(
  invoice: Invoice,
  transactions: Record<string, any>[]
): Promise<TransactionMatch | null> {
  const transactionsText = JSON.stringify(transactions, null, 2)
  const invoiceText = JSON.stringify(invoice, null, 2)

  console.log("[OpenAI:matchInvoice] Sending request for invoice:", invoice.supplier)

  const response = await openai.responses.parse({
    model: "gpt-5.1",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Invoice:\n" + invoiceText,
          },
          {
            type: "input_text",
            text: "Transactions:\n" + transactionsText,
          },
        ],
      },
    ],
    instructions:
      "Please try to connect the invoice with a transaction. Try to match supplier, date (and if needed, amount). Keep in mind, currency might be different on the invoice and the transaction.",
    text: { format: zodTextFormat(TransactionMatchSchema, 'transaction_match') },
    reasoning: { effort: "medium" },
  })

  console.log("[OpenAI:matchInvoice] Response received")

  if (!response.output_parsed) {
    console.log("[OpenAI:matchInvoice] No parsed output")
    return null
  }
  const match: TransactionMatch = response.output_parsed as TransactionMatch

  console.log("[OpenAI:matchInvoice] Match result:", {
    transactionId: match.transaction_id,
    confidence: match.confidence_percentage,
  })

  if (match.confidence_percentage > 50.0 && match.transaction_id) {
    return match
  }

  return null
}

export async function matchInvoicesToTransactions(
  invoices: Invoice[],
  transactions: Record<string, any>[]
): Promise<MatchingResult> {
  const result: MatchingResult = {
    matches: [],
    remaining_transactions: [],
    remaining_invoices: [],
  }

  let availableTransactions = [...transactions]

  for (const invoice of invoices) {
    const match = await matchInvoiceToTransaction(invoice, availableTransactions)

    if (match && match.transaction_id) {
      const transaction = availableTransactions.find((t) => t.id === match.transaction_id)

      if (transaction) {
        const matchedPair: MatchedPair = {
          match_candidate: match,
          transaction,
          invoice,
        }
        result.matches.push(matchedPair)
        availableTransactions = availableTransactions.filter((t) => t.id !== match.transaction_id)
        continue
      }
    }

    result.remaining_invoices.push(invoice)
  }

  result.remaining_transactions = availableTransactions

  return result
}


