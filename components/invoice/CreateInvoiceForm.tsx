"use client"

import { useState, useCallback, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, Download, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CreateInvoiceSchema, type CreateInvoice } from "@/lib/validations/create-invoice"

// Default seller info - user can customize
const defaultSeller = {
  name: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: "Sverige",
  phone: "",
  email: "",
  orgnr: "",
  vat_reg_no: "",
  approved_for_f_tax: true,
}

const defaultBuyer = {
  name: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: "Sverige",
  your_ref: "",
}

const defaultLineItem = {
  description: "",
  quantity: 1,
  unit: "st",
  unit_price: 0,
  net_amount: 0,
}

function getDefaultValues(): CreateInvoice {
  const today = new Date()
  const dueDate = new Date(today)
  dueDate.setDate(dueDate.getDate() + 30)

  return {
    invoice_no: "",
    invoice_date: today.toISOString().split("T")[0],
    due_date: dueDate.toISOString().split("T")[0],
    ocr: "",
    our_ref: "",
    payment_terms_days: 30,
    currency: "SEK",
    seller: defaultSeller,
    buyer: defaultBuyer,
    lines: [{ ...defaultLineItem }],
    total_net: 0,
    total_vat: 0,
    total_gross: 0,
    vat_rate_label: "25%",
    bank: {
      plusgiro: "",
      bankgiro: "",
      iban: "",
      bic: "",
    },
    interest_rate_percent: 8,
  }
}

export function CreateInvoiceForm() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<CreateInvoice>({
    resolver: zodResolver(CreateInvoiceSchema),
    defaultValues: getDefaultValues(),
  })

  // Clear error message when form becomes valid
  const hasErrors = Object.keys(form.formState.errors).length > 0
  useEffect(() => {
    if (!hasErrors) {
      setErrorMessage(null)
    }
  }, [hasErrors])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  })

  const watchLines = form.watch("lines")

  // Calculate totals when lines change
  const calculateTotals = useCallback(() => {
    const lines = form.getValues("lines")
    const vatRate = 0.25 // 25% Swedish VAT

    let totalNet = 0
    lines.forEach((line, index) => {
      const netAmount = line.quantity * line.unit_price
      totalNet += netAmount
      form.setValue(`lines.${index}.net_amount`, netAmount)
    })

    const totalVat = totalNet * vatRate
    const totalGross = totalNet + totalVat

    form.setValue("total_net", totalNet)
    form.setValue("total_vat", totalVat)
    form.setValue("total_gross", totalGross)
  }, [form])

  const handleGeneratePdf = async (data: CreateInvoice) => {
    setIsGenerating(true)
    try {
      // Recalculate totals before submission
      calculateTotals()
      const values = form.getValues()

      const response = await fetch("/api/invoices/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Generering misslyckades")
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `faktura-${values.invoice_no || "utkast"}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("PDF generation error:", error)
      alert(error instanceof Error ? error.message : "Ett fel uppstod")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInvalidSubmit = () => {
    const errors = form.formState.errors
    const errorFields: string[] = []

    // Collect field-level errors
    if (errors.invoice_no) errorFields.push("Fakturanummer")
    if (errors.invoice_date) errorFields.push("Fakturadatum")
    if (errors.due_date) errorFields.push("Förfallodatum")
    if (errors.seller?.name) errorFields.push("Säljarens namn")
    if (errors.seller?.address_line1) errorFields.push("Säljarens adress")
    if (errors.seller?.postal_code) errorFields.push("Säljarens postnummer")
    if (errors.seller?.city) errorFields.push("Säljarens ort")
    if (errors.seller?.country) errorFields.push("Säljarens land")
    if (errors.buyer?.name) errorFields.push("Köparens namn")
    if (errors.buyer?.address_line1) errorFields.push("Köparens adress")
    if (errors.buyer?.postal_code) errorFields.push("Köparens postnummer")
    if (errors.buyer?.city) errorFields.push("Köparens ort")
    if (errors.buyer?.country) errorFields.push("Köparens land")
    if (errors.lines) errorFields.push("Fakturarader")
    if (errors.currency) errorFields.push("Valuta")

    if (errorFields.length > 0) {
      setErrorMessage(`Vänligen fyll i följande fält: ${errorFields.join(", ")}`)
    } else {
      setErrorMessage("Vänligen korrigera felen i formuläret")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleGeneratePdf, handleInvalidSubmit)} className="space-y-8 max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Skapa faktura</h1>
        <Button type="submit" disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Generera PDF
        </Button>
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Invoice Details */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Fakturainformation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="invoice_no">Fakturanummer</Label>
            <Input id="invoice_no" {...form.register("invoice_no")} placeholder="1001" />
          </div>
          <div>
            <Label htmlFor="invoice_date">Fakturadatum</Label>
            <Input id="invoice_date" type="date" {...form.register("invoice_date")} />
          </div>
          <div>
            <Label htmlFor="due_date">Förfallodatum</Label>
            <Input id="due_date" type="date" {...form.register("due_date")} />
          </div>
          <div>
            <Label htmlFor="currency">Valuta</Label>
            <Input id="currency" {...form.register("currency")} placeholder="SEK" />
          </div>
          <div>
            <Label htmlFor="ocr">OCR</Label>
            <Input id="ocr" {...form.register("ocr")} placeholder="Valfritt" />
          </div>
          <div>
            <Label htmlFor="our_ref">Vår referens</Label>
            <Input id="our_ref" {...form.register("our_ref")} placeholder="Valfritt" />
          </div>
          <div>
            <Label htmlFor="payment_terms_days">Betalningsvillkor (dagar)</Label>
            <Input
              id="payment_terms_days"
              type="number"
              {...form.register("payment_terms_days", { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="interest_rate_percent">Dröjsmålsränta (%)</Label>
            <Input
              id="interest_rate_percent"
              type="number"
              {...form.register("interest_rate_percent", { valueAsNumber: true })}
            />
          </div>
        </div>
      </Card>

      {/* Seller Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Säljare (ditt företag)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-1">
            <Label>Företagsnamn</Label>
            <Input {...form.register("seller.name")} placeholder="Mitt Företag AB" />
          </div>
          <div>
            <Label>Org.nummer</Label>
            <Input {...form.register("seller.orgnr")} placeholder="556123-4567" />
          </div>
          <div>
            <Label>Momsreg.nr</Label>
            <Input {...form.register("seller.vat_reg_no")} placeholder="SE556123456701" />
          </div>
          <div className="col-span-2">
            <Label>Adressrad 1</Label>
            <Input {...form.register("seller.address_line1")} placeholder="Gatan 1" />
          </div>
          <div>
            <Label>Adressrad 2</Label>
            <Input {...form.register("seller.address_line2")} placeholder="Valfritt" />
          </div>
          <div>
            <Label>Postnummer</Label>
            <Input {...form.register("seller.postal_code")} placeholder="123 45" />
          </div>
          <div>
            <Label>Ort</Label>
            <Input {...form.register("seller.city")} placeholder="Stockholm" />
          </div>
          <div>
            <Label>Land</Label>
            <Input {...form.register("seller.country")} />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input {...form.register("seller.phone")} placeholder="08-123 456 78" />
          </div>
          <div>
            <Label>E-post</Label>
            <Input {...form.register("seller.email")} placeholder="faktura@foretag.se" />
          </div>
        </div>
      </Card>

      {/* Buyer Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Köpare (kund)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-1">
            <Label>Företags-/kundnamn</Label>
            <Input {...form.register("buyer.name")} placeholder="Kundens Företag AB" />
          </div>
          <div className="col-span-2">
            <Label>Er referens</Label>
            <Input {...form.register("buyer.your_ref")} placeholder="Kontaktperson" />
          </div>
          <div className="col-span-2">
            <Label>Adressrad 1</Label>
            <Input {...form.register("buyer.address_line1")} placeholder="Kundgatan 2" />
          </div>
          <div>
            <Label>Adressrad 2</Label>
            <Input {...form.register("buyer.address_line2")} placeholder="Valfritt" />
          </div>
          <div>
            <Label>Postnummer</Label>
            <Input {...form.register("buyer.postal_code")} placeholder="543 21" />
          </div>
          <div>
            <Label>Ort</Label>
            <Input {...form.register("buyer.city")} placeholder="Göteborg" />
          </div>
          <div>
            <Label>Land</Label>
            <Input {...form.register("buyer.country")} />
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Fakturarader</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ...defaultLineItem })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Lägg till rad
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {index === 0 && <Label>Beskrivning</Label>}
                <Input
                  {...form.register(`lines.${index}.description`)}
                  placeholder="Tjänst/vara"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <Label>Antal</Label>}
                <Input
                  type="number"
                  step="0.01"
                  {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                  onChange={(e) => {
                    form.setValue(`lines.${index}.quantity`, parseFloat(e.target.value) || 0)
                    calculateTotals()
                  }}
                />
              </div>
              <div className="col-span-1">
                {index === 0 && <Label>Enhet</Label>}
                <Input {...form.register(`lines.${index}.unit`)} placeholder="st" />
              </div>
              <div className="col-span-2">
                {index === 0 && <Label>À-pris</Label>}
                <Input
                  type="number"
                  step="0.01"
                  {...form.register(`lines.${index}.unit_price`, { valueAsNumber: true })}
                  onChange={(e) => {
                    form.setValue(`lines.${index}.unit_price`, parseFloat(e.target.value) || 0)
                    calculateTotals()
                  }}
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <Label>Summa</Label>}
                <Input
                  readOnly
                  value={(watchLines[index]?.quantity || 0) * (watchLines[index]?.unit_price || 0)}
                  className="bg-muted"
                />
              </div>
              <div className="col-span-1">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      remove(index)
                      calculateTotals()
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Totals */}
        <div className="flex flex-col items-end gap-2">
          <div className="grid grid-cols-2 gap-4 text-sm w-64">
            <span className="text-muted-foreground">Netto:</span>
            <span className="text-right font-medium">
              {form.watch("total_net").toLocaleString("sv-SE", { minimumFractionDigits: 2 })} SEK
            </span>
            <span className="text-muted-foreground">Moms (25%):</span>
            <span className="text-right font-medium">
              {form.watch("total_vat").toLocaleString("sv-SE", { minimumFractionDigits: 2 })} SEK
            </span>
            <span className="font-semibold">Att betala:</span>
            <span className="text-right font-bold text-lg">
              {form.watch("total_gross").toLocaleString("sv-SE", { minimumFractionDigits: 2 })} SEK
            </span>
          </div>
        </div>
      </Card>

      {/* Bank Details */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Betalningsinformation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Bankgiro</Label>
            <Input {...form.register("bank.bankgiro")} placeholder="123-4567" />
          </div>
          <div>
            <Label>Plusgiro</Label>
            <Input {...form.register("bank.plusgiro")} placeholder="12 34 56-7" />
          </div>
          <div>
            <Label>IBAN</Label>
            <Input {...form.register("bank.iban")} placeholder="SE12 3456 7890 1234 5678 9012" />
          </div>
          <div>
            <Label>BIC/SWIFT</Label>
            <Input {...form.register("bank.bic")} placeholder="SWEDSESS" />
          </div>
        </div>
      </Card>
    </form>
  )
}

