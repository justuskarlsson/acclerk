import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { http, HttpResponse } from "msw"
import { OverviewDashboard } from "./OverviewDashboard"

const mockOverviewData = {
  totalVat: 45000,
  companyProfit: 125000,
  totalRevenue: 500000,
  totalExpenses: 375000,
  invoiceCount: 42,
  pendingCount: 5,
}

const meta: Meta<typeof OverviewDashboard> = {
  title: "Components/OverviewDashboard",
  component: OverviewDashboard,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("/api/overview", () => {
          return HttpResponse.json(mockOverviewData)
        }),
      ],
    },
  },
}

export default meta
type Story = StoryObj<typeof OverviewDashboard>

export const Default: Story = {}

export const NegativeProfit: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/overview", () => {
          return HttpResponse.json({
            ...mockOverviewData,
            companyProfit: -50000,
            totalRevenue: 300000,
            totalExpenses: 350000,
          })
        }),
      ],
    },
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/overview", async () => {
          await new Promise((resolve) => setTimeout(resolve, 999999))
          return HttpResponse.json(mockOverviewData)
        }),
      ],
    },
  },
}

