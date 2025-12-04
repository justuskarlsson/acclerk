import { create } from "zustand"

interface UIStore {
  selectedInvoiceIds: string[]
  selectedTransactionIds: string[]
  selectedMatchIds: string[]
  filters: {
    invoiceStatus?: string
    dateRange?: { start: Date; end: Date }
    currency?: string
  }
  viewMode: "table" | "split" | "grid"
  loading: {
    invoices: boolean
    transactions: boolean
    matching: boolean
    accounting: boolean
  }
  setSelectedInvoiceIds: (ids: string[]) => void
  setSelectedTransactionIds: (ids: string[]) => void
  setSelectedMatchIds: (ids: string[]) => void
  setFilters: (filters: Partial<UIStore["filters"]>) => void
  setViewMode: (mode: UIStore["viewMode"]) => void
  setLoading: (key: keyof UIStore["loading"], value: boolean) => void
  toggleInvoiceSelection: (id: string) => void
  toggleTransactionSelection: (id: string) => void
  toggleMatchSelection: (id: string) => void
  clearSelections: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedInvoiceIds: [],
  selectedTransactionIds: [],
  selectedMatchIds: [],
  filters: {},
  viewMode: "table",
  loading: {
    invoices: false,
    transactions: false,
    matching: false,
    accounting: false,
  },
  setSelectedInvoiceIds: (ids) => set({ selectedInvoiceIds: ids }),
  setSelectedTransactionIds: (ids) => set({ selectedTransactionIds: ids }),
  setSelectedMatchIds: (ids) => set({ selectedMatchIds: ids }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setLoading: (key, value) => set((state) => ({ loading: { ...state.loading, [key]: value } })),
  toggleInvoiceSelection: (id) =>
    set((state) => ({
      selectedInvoiceIds: state.selectedInvoiceIds.includes(id)
        ? state.selectedInvoiceIds.filter((i) => i !== id)
        : [...state.selectedInvoiceIds, id],
    })),
  toggleTransactionSelection: (id) =>
    set((state) => ({
      selectedTransactionIds: state.selectedTransactionIds.includes(id)
        ? state.selectedTransactionIds.filter((i) => i !== id)
        : [...state.selectedTransactionIds, id],
    })),
  toggleMatchSelection: (id) =>
    set((state) => ({
      selectedMatchIds: state.selectedMatchIds.includes(id)
        ? state.selectedMatchIds.filter((i) => i !== id)
        : [...state.selectedMatchIds, id],
    })),
  clearSelections: () => set({ selectedInvoiceIds: [], selectedTransactionIds: [], selectedMatchIds: [] }),
}))


