"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Calculator, Info, TrendingUp, Coins, Banknote } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const taxPlanningSchema = z.object({
  privateIncome: z.preprocess((val) => Number(val) || 0, z.number().min(0, "Must be 0 or greater")),
  capitalNetto: z.preprocess((val) => Number(val) || 0, z.number().min(0, "Must be 0 or greater")),
  companyProfit: z.preprocess((val) => Number(val) || 0, z.number().min(0, "Must be 0 or greater")),
  ownershipPercentage: z.preprocess((val) => Number(val) || 100, z.number().min(0).max(100)),
})

type TaxPlanningFormData = z.infer<typeof taxPlanningSchema>

// Swedish tax constants for 2024
const TAX_CONSTANTS = {
  // Income tax brackets
  municipalTaxRate: 0.32, // Average municipal tax
  stateTaxThreshold: 598500, // Brytpunkt för statlig skatt
  stateTaxRate: 0.20, // Statlig skatt över brytpunkten
  
  // 3:12 rules (Fåmansbolag)
  baseAmount: 204000, // 2.75 * prisbasbelopp (74300 * 2.75)
  capitalTaxRate: 0.20, // Skatt på utdelning inom gränsbeloppet (kapitalinkomst)
  salaryTaxRate: 0.52, // Marginalskatt på lön (kommunal + statlig)
  
  // Employer costs
  employerTaxRate: 0.3142, // Arbetsgivaravgift
}

interface TaxResult {
  grossAmount: number
  tax: number
  netAmount: number
  effectiveTaxRate: number
}

function calculateSalaryTax(grossSalary: number, otherIncome: number): TaxResult {
  const totalIncome = grossSalary + otherIncome
  const employerCost = grossSalary * TAX_CONSTANTS.employerTaxRate
  
  // Municipal tax on total income
  let tax = totalIncome * TAX_CONSTANTS.municipalTaxRate
  
  // State tax if above threshold
  if (totalIncome > TAX_CONSTANTS.stateTaxThreshold) {
    tax += (totalIncome - TAX_CONSTANTS.stateTaxThreshold) * TAX_CONSTANTS.stateTaxRate
  }
  
  // Tax only on salary portion
  const salaryTax = grossSalary * TAX_CONSTANTS.municipalTaxRate
  const stateTax = Math.max(0, (totalIncome - TAX_CONSTANTS.stateTaxThreshold)) * TAX_CONSTANTS.stateTaxRate
  const totalTax = salaryTax + (grossSalary / totalIncome) * stateTax
  
  const totalCost = grossSalary + employerCost
  const netAmount = grossSalary - totalTax
  
  return {
    grossAmount: totalCost,
    tax: totalTax + employerCost,
    netAmount,
    effectiveTaxRate: (totalTax + employerCost) / totalCost,
  }
}

function calculateDividendTax(dividend: number, capitalNetto: number): TaxResult {
  // Within gränsbelopp (3:12 rules) - taxed as capital income at 20%
  const withinLimit = Math.min(dividend, capitalNetto + TAX_CONSTANTS.baseAmount)
  const aboveLimit = Math.max(0, dividend - withinLimit)
  
  // Tax within limit (capital income)
  const capitalTax = withinLimit * TAX_CONSTANTS.capitalTaxRate
  
  // Tax above limit (treated as salary income)
  const salaryTax = aboveLimit * TAX_CONSTANTS.salaryTaxRate
  
  const totalTax = capitalTax + salaryTax
  
  return {
    grossAmount: dividend,
    tax: totalTax,
    netAmount: dividend - totalTax,
    effectiveTaxRate: dividend > 0 ? totalTax / dividend : 0,
  }
}

export function TaxPlanningForm() {
  const [results, setResults] = useState<{
    salary: TaxResult
    dividend: TaxResult
    recommendation: "salary" | "dividend" | "mixed"
  } | null>(null)

  const form = useForm<TaxPlanningFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(taxPlanningSchema) as any,
    defaultValues: {
      privateIncome: 0,
      capitalNetto: 0,
      companyProfit: 100000,
      ownershipPercentage: 100,
    },
  })

  // Watch form values for real-time updates if needed
  form.watch()

  const calculate = (data: TaxPlanningFormData) => {
    const availableProfit = data.companyProfit * (data.ownershipPercentage / 100)
    
    const salaryResult = calculateSalaryTax(availableProfit, data.privateIncome)
    const dividendResult = calculateDividendTax(availableProfit, data.capitalNetto)
    
    // Determine recommendation
    let recommendation: "salary" | "dividend" | "mixed" = "dividend"
    if (salaryResult.netAmount > dividendResult.netAmount) {
      recommendation = "salary"
    } else if (dividendResult.netAmount > salaryResult.netAmount * 1.1) {
      recommendation = "dividend"
    } else {
      recommendation = "mixed"
    }
    
    setResults({
      salary: salaryResult,
      dividend: dividendResult,
      recommendation,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skatteplanering</h1>
          <p className="text-muted-foreground mt-1">
            Tax planning for Fåmansbolag (3:12 rules)
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Input Values
              </CardTitle>
              <CardDescription>
                Enter your financial details to calculate optimal tax strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={form.handleSubmit(calculate as (data: Record<string, unknown>) => void)}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="companyProfit">Company Profit (Bolagets vinst)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The profit available for distribution</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="companyProfit"
                    type="number"
                    placeholder="0"
                    {...form.register("companyProfit")}
                  />
                  {form.formState.errors.companyProfit && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.companyProfit.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="privateIncome">Private Income (Övrig inkomst)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your other taxable income (employment, etc.)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="privateIncome"
                    type="number"
                    placeholder="0"
                    {...form.register("privateIncome")}
                  />
                  {form.formState.errors.privateIncome && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.privateIncome.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="capitalNetto">Capital Netto (Kapitalunderlag)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your accumulated capital base for 3:12 rules</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="capitalNetto"
                    type="number"
                    placeholder="0"
                    {...form.register("capitalNetto")}
                  />
                  {form.formState.errors.capitalNetto && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.capitalNetto.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownershipPercentage">Ownership (%)</Label>
                  <Input
                    id="ownershipPercentage"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="100"
                    {...form.register("ownershipPercentage")}
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {results ? (
              <>
                {/* Comparison Cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card
                    className={cn(
                      "relative overflow-hidden transition-all",
                      results.recommendation === "salary" && "ring-2 ring-green-500"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Salary (Lön)
                      </CardDescription>
                      <CardTitle className="text-2xl tabular-nums text-green-600">
                        {formatCurrency(results.salary.netAmount)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total cost</span>
                        <span>{formatCurrency(results.salary.grossAmount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total tax</span>
                        <span>{formatCurrency(results.salary.tax)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Effective rate</span>
                        <span>{formatPercent(results.salary.effectiveTaxRate)}</span>
                      </div>
                    </CardContent>
                    {results.recommendation === "salary" && (
                      <div className="absolute top-2 right-2">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Recommended
                        </span>
                      </div>
                    )}
                  </Card>

                  <Card
                    className={cn(
                      "relative overflow-hidden transition-all",
                      results.recommendation === "dividend" && "ring-2 ring-green-500"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Dividend (Utdelning)
                      </CardDescription>
                      <CardTitle className="text-2xl tabular-nums text-green-600">
                        {formatCurrency(results.dividend.netAmount)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Gross dividend</span>
                        <span>{formatCurrency(results.dividend.grossAmount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total tax</span>
                        <span>{formatCurrency(results.dividend.tax)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Effective rate</span>
                        <span>{formatPercent(results.dividend.effectiveTaxRate)}</span>
                      </div>
                    </CardContent>
                    {results.recommendation === "dividend" && (
                      <div className="absolute top-2 right-2">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Recommended
                        </span>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Recommendation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5" />
                      Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {results.recommendation === "salary" && (
                        <>
                          Based on your inputs, <strong>taking salary</strong> gives you
                          the best net outcome. This is likely because your other income
                          is low, making the salary tax brackets favorable.
                        </>
                      )}
                      {results.recommendation === "dividend" && (
                        <>
                          Based on your inputs, <strong>taking dividend</strong> is more
                          tax efficient. Your capital base (gränsbelopp) allows you to
                          take advantage of the lower 20% capital gains tax rate.
                        </>
                      )}
                      {results.recommendation === "mixed" && (
                        <>
                          The difference between salary and dividend is small. Consider a{" "}
                          <strong>mixed approach</strong> - take enough salary to build
                          pension rights, and the rest as dividend.
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                      Note: This is a simplified calculation. Consult a tax advisor for
                      personalized advice.
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[300px]">
                <CardContent className="text-center">
                  <Calculator className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Enter your details and click Calculate to see results
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
