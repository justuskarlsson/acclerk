import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { http, HttpResponse } from "msw"
import { PDFTableView } from "./PDFTableView"

const mockInvoices = [
  {
    id: "inv-1",
    filename: "invoice-2024-001.pdf",
    status: "done",
    createdAt: "2024-01-15T10:30:00Z",
    supplier: "Acme Corp",
    totalAmount: 15000,
    currency: "SEK",
    filePath: "/storage/invoices/inv-1.pdf",
  },
  {
    id: "inv-2",
    filename: "invoice-2024-002.pdf",
    status: "processing",
    createdAt: "2024-01-16T14:20:00Z",
    supplier: "",
    totalAmount: 0,
    currency: "",
    filePath: "/storage/invoices/inv-2.pdf",
  },
  {
    id: "inv-3",
    filename: "invoice-2024-003.pdf",
    status: "uploading",
    createdAt: "2024-01-17T09:00:00Z",
    supplier: "",
    totalAmount: 0,
    currency: "",
    filePath: "/storage/invoices/inv-3.pdf",
  },
  {
    id: "inv-4",
    filename: "invoice-2024-004.pdf",
    status: "error",
    createdAt: "2024-01-18T16:45:00Z",
    supplier: "",
    totalAmount: 0,
    currency: "",
    filePath: "/storage/invoices/inv-4.pdf",
  },
  {
    id: "inv-5",
    filename: "faktura-supplier-ab.pdf",
    status: "done",
    createdAt: "2024-01-19T11:15:00Z",
    supplier: "Supplier AB",
    totalAmount: 8500,
    currency: "SEK",
    filePath: "/storage/invoices/inv-5.pdf",
  },
]

const meta: Meta<typeof PDFTableView> = {
  title: "Components/PDFTableView",
  component: PDFTableView,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("/api/invoices", () => {
          return HttpResponse.json({ invoices: mockInvoices })
        }),
      ],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "500px" }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof PDFTableView>

export const WithInvoices: Story = {}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/invoices", () => {
          return HttpResponse.json({ invoices: [] })
        }),
      ],
    },
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/invoices", async () => {
          await new Promise((resolve) => setTimeout(resolve, 999999))
          return HttpResponse.json({ invoices: [] })
        }),
      ],
    },
  },
}

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/invoices", () => {
          return HttpResponse.json(
            { error: "Failed to fetch invoices" },
            { status: 500 }
          )
        }),
      ],
    },
  },
}

