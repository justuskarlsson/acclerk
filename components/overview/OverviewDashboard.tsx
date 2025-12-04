"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { TrendingUp, TrendingDown, Receipt, Wallet, Calendar, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OverviewData {
  totalVat: number
  companyProfit: number
  totalRevenue: number
  totalExpenses: number
  invoiceCount: number
  pendingCount: number
}

type PeriodOption = "thisMonth" | "lastMonth" | "last3Months" | "thisYear"

const periodOptions: { value: PeriodOption; label: string }[] = [
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "last3Months", label: "Last 3 months" },
  { value: "thisYear", label: "This year" },
]

function getDateRange(period: PeriodOption): { start: Date; end: Date } {
  const now = new Date()
  switch (period) {
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case "lastMonth":
      const lastMonth = subMonths(now, 1)
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
    case "last3Months":
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    case "thisYear":
      return { start: new Date(now.getFullYear(), 0, 1), end: now }
  }
}

export function OverviewDashboard() {
  const [period, setPeriod] = useState<PeriodOption>("thisMonth")
  const [data, setData] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dateRange = getDateRange(period)

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        })
        const response = await fetch(`/api/overview?${params}`)
        if (!response.ok) {
          throw new Error("Failed to fetch overview data")
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
        // Set mock data for development
        setData({
          totalVat: 0,
          companyProfit: 0,
          totalRevenue: 0,
          totalExpenses: 0,
          invoiceCount: 0,
          pendingCount: 0,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchOverview()
  }, [dateRange.start.toISOString(), dateRange.end.toISOString()])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPeriodLabel = () => {
    return `${format(dateRange.start, "d MMM")} - ${format(
      dateRange.end,
      "d MMM yyyy"
    )}`
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Översikt</h1>
            <p className="text-muted-foreground mt-1">
              Financial overview for your company
            </p>
          </div>
          <div className="flex items-center gap-2">
            {periodOptions.map((option) => (
              <Button
                key={option.value}
                variant={period === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Period indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatPeriodLabel()}</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Main Metrics */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* VAT Card */}
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Total VAT (Moms)
                  </CardDescription>
                  <CardTitle className="text-4xl tabular-nums">
                    {formatCurrency(data?.totalVat ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    VAT to be reported for the period
                  </p>
                </CardContent>
                <div className="absolute right-0 top-0 h-full w-2 bg-amber-500" />
              </Card>

              {/* Profit Card */}
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Company Profit (Vinst)
                  </CardDescription>
                  <CardTitle
                    className={cn(
                      "text-4xl tabular-nums",
                      (data?.companyProfit ?? 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {formatCurrency(data?.companyProfit ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    {(data?.companyProfit ?? 0) >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-muted-foreground">
                      Revenue minus expenses
                    </span>
                  </div>
                </CardContent>
                <div
                  className={cn(
                    "absolute right-0 top-0 h-full w-2",
                    (data?.companyProfit ?? 0) >= 0 ? "bg-green-500" : "bg-red-500"
                  )}
                />
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Revenue</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {formatCurrency(data?.totalRevenue ?? 0)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Expenses</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {formatCurrency(data?.totalExpenses ?? 0)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Invoices Processed</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {data?.invoiceCount ?? 0}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Verification</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {data?.pendingCount ?? 0}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {error && (
              <p className="text-sm text-muted-foreground text-center">
                Note: Using placeholder data. Connect API for live metrics.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
