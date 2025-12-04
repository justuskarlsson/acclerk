import { create } from "zustand"
import { Invoice } from "@/lib/validations/invoice"
import { MatchingResult } from "@/lib/validations/transaction"
import { AccountingEntry } from "@/lib/validations/accounting"

interface DataStore {
  invoices: Invoice[]
  transactions: Record<string, any>[]
  matches: MatchingResult | null
  accountingEntries: AccountingEntry[]
  setInvoices: (invoices: Invoice[]) => void
  setTransactions: (transactions: Record<string, any>[]) => void
  setMatches: (matches: MatchingResult) => void
  setAccountingEntries: (entries: AccountingEntry[]) => void
  addInvoice: (invoice: Invoice) => void
  addTransaction: (transaction: Record<string, any>) => void
  clear: () => void
}

export const useDataStore = create<DataStore>((set) => ({
  invoices: [],
  transactions: [],
  matches: null,
  accountingEntries: [],
  setInvoices: (invoices) => set({ invoices }),
  setTransactions: (transactions) => set({ transactions }),
  setMatches: (matches) => set({ matches }),
  setAccountingEntries: (entries) => set({ accountingEntries: entries }),
  addInvoice: (invoice) => set((state) => ({ invoices: [...state.invoices, invoice] })),
  addTransaction: (transaction) => set((state) => ({ transactions: [...state.transactions, transaction] })),
  clear: () => set({ invoices: [], transactions: [], matches: null, accountingEntries: [] }),
}))


