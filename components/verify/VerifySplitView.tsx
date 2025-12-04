"use client"

import { useState, useCallback } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { PDFTableView, InvoiceRow } from "@/components/pdf/PDFTableView"
import { PDFPreview } from "@/components/pdf/PDFPreview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AccountingLineItem {
  amount: number
  sru_code: number
  sru_code_description: string
  comment?: string
}

export function VerifySplitView() {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null)
  const [accountingItems, setAccountingItems] = useState<AccountingLineItem[]>([])
  const [isVerifying, setIsVerifying] = useState(false)

  const handleSelectInvoice = useCallback((invoice: InvoiceRow) => {
    setSelectedInvoice(invoice)
    // Fetch accounting entries for this invoice if it has been processed
    if (invoice.status === "done") {
      fetchAccountingEntries(invoice.id)
    } else {
      setAccountingItems([])
    }
  }, [])

  const fetchAccountingEntries = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/accounting/${invoiceId}`)
      if (response.ok) {
        const data = await response.json()
        setAccountingItems(data.lineItems || [])
      }
    } catch {
      // Silently fail - invoice might not have accounting entries yet
      setAccountingItems([])
    }
  }

  const handleVerify = async () => {
    if (!selectedInvoice) return
    setIsVerifying(true)
    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: true }),
      })
      if (response.ok) {
        // Refresh the table to show updated status
        window.location.reload()
      }
    } catch (error) {
      console.error("Verification failed:", error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleReject = async () => {
    if (!selectedInvoice) return
    setIsVerifying(true)
    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: false }),
      })
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error("Rejection failed:", error)
    } finally {
      setIsVerifying(false)
    }
  }

  // Construct PDF URL from file path
  const pdfUrl = selectedInvoice?.filePath
    ? `/api/files/${encodeURIComponent(selectedInvoice.filePath)}`
    : null

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Left Panel: Invoice Table */}
      <div className="w-[400px] border-r flex flex-col">
        <PDFTableView
          onSelectInvoice={handleSelectInvoice}
          className="flex-1"
        />
      </div>

      {/* Right Panel: PDF Preview + Accounting Items */}
      <div className="flex-1 flex flex-col">
        {/* PDF Preview */}
        <div className="flex-1 min-h-0">
          <PDFPreview pdfUrl={pdfUrl} className="h-full" />
        </div>

        {/* Accounting Line Items Panel */}
        {selectedInvoice && selectedInvoice.status === "done" && (
          <>
            <Separator />
            <div className="h-[280px] flex flex-col">
              <Card className="flex-1 rounded-none border-0 border-t">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      Accounting Line Items
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReject}
                        disabled={isVerifying}
                        className="text-destructive hover:text-destructive"
                      >
                        {isVerifying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-1" />
                        )}
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isVerifying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Verify
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-0 px-4">
                  <ScrollArea className="h-[180px]">
                    {accountingItems.length > 0 ? (
                      <div className="space-y-2">
                        {accountingItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="font-mono">
                                {item.sru_code}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium">
                                  {item.sru_code_description}
                                </p>
                                {item.comment && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.comment}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-medium tabular-nums">
                              {item.amount.toLocaleString("sv-SE")} SEK
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No accounting entries found
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Empty state when no invoice selected */}
        {!selectedInvoice && (
          <div className="h-[280px] flex items-center justify-center border-t">
            <p className="text-muted-foreground text-sm">
              Select an invoice to view details
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
