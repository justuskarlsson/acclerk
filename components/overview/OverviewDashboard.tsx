"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Receipt, Wallet, ShoppingCart, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface OverviewData {
  totalIncome: number
  totalCost: number
  vatBalance: number
  profit: number
  vatDetails?: {
    utgaendeMoms: number
    ingaendeMoms: number
  }
}

export function OverviewDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/overview")
        if (!response.ok) {
          throw new Error("Failed to fetch overview data")
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOverview()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Översikt</h1>
          <p className="text-muted-foreground mt-1">
            Ekonomisk sammanställning
          </p>
        </div>

        {/* Profit Card - Highlighted */}
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Vinst
            </CardDescription>
            <CardTitle
              className={cn(
                "text-4xl tabular-nums",
                (data?.profit ?? 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              )}
            >
              {formatCurrency(data?.profit ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Intäkter − Kostnader + Momssaldo
            </p>
          </CardContent>
          <div
            className={cn(
              "absolute right-0 top-0 h-full w-2",
              (data?.profit ?? 0) >= 0 ? "bg-green-500" : "bg-red-500"
            )}
          />
        </Card>

        {/* Main Metrics */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Income Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Intäkter
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {formatCurrency(data?.totalIncome ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Totala intäkter från inkomstfakturor
              </p>
            </CardContent>
            <div className="absolute right-0 top-0 h-full w-1.5 bg-green-500" />
          </Card>

          {/* Cost Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Kostnader
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {formatCurrency(data?.totalCost ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Totala kostnader (ex. moms)
              </p>
            </CardContent>
            <div className="absolute right-0 top-0 h-full w-1.5 bg-red-500" />
          </Card>

          {/* VAT Balance Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Momssaldo
              </CardDescription>
              <CardTitle
                className={cn(
                  "text-3xl tabular-nums",
                  (data?.vatBalance ?? 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {formatCurrency(data?.vatBalance ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {(data?.vatBalance ?? 0) >= 0
                  ? "Att få tillbaka från Skatteverket"
                  : "Att betala till Skatteverket"}
              </p>
            </CardContent>
            <div
              className={cn(
                "absolute right-0 top-0 h-full w-1.5",
                (data?.vatBalance ?? 0) >= 0 ? "bg-green-500" : "bg-amber-500"
              )}
            />
          </Card>
        </div>

        {/* VAT Details */}
        {data?.vatDetails && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Momsdetaljer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utgående moms (2610-2619):</span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(data.vatDetails.utgaendeMoms)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ingående moms (2640-2650):</span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(data.vatDetails.ingaendeMoms)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
