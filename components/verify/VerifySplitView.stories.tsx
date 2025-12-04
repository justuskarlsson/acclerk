import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { http, HttpResponse } from "msw"
import { VerifySplitView } from "./VerifySplitView"

const mockInvoices = [
  {
    id: "inv-1",
    filename: "invoice-2024-001.pdf",
    status: "done",
    createdAt: "2024-01-15T10:30:00Z",
    supplier: "Acme Corp",
    totalAmount: 15000,
    currency: "SEK",
    filePath: "https://www.aeee.in/wp-content/uploads/2020/08/Sample-pdf.pdf",
  },
  {
    id: "inv-2",
    filename: "invoice-2024-002.pdf",
    status: "processing",
    createdAt: "2024-01-16T14:20:00Z",
    supplier: "",
    totalAmount: 0,
    currency: "",
    // Using a CORS-friendly PDF URL
    filePath: "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf",
  },
  {
    id: "inv-3",
    filename: "faktura-supplier-ab.pdf",
    status: "done",
    createdAt: "2024-01-19T11:15:00Z",
    supplier: "Supplier AB",
    totalAmount: 8500,
    currency: "SEK",
    filePath: "https://www.aeee.in/wp-content/uploads/2020/08/Sample-pdf.pdf",
  },
]

const mockAccountingEntries = [
  {
    amount: 12000,
    sru_code: 5010,
    sru_code_description: "Inköp av varor",
    comment: "Office supplies",
  },
  {
    amount: 3000,
    sru_code: 2640,
    sru_code_description: "Ingående moms",
    comment: "VAT 25%",
  },
]

const meta: Meta<typeof VerifySplitView> = {
  title: "Components/VerifySplitView",
  component: VerifySplitView,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("/api/invoices", () => {
          return HttpResponse.json({ invoices: mockInvoices })
        }),
        http.get("/api/accounting/:id", () => {
          return HttpResponse.json({ lineItems: mockAccountingEntries })
        }),
      ],
    },
  },
}

export default meta
type Story = StoryObj<typeof VerifySplitView>

export const Default: Story = {}
