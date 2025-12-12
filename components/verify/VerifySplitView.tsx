"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Loader2, CheckCircle2, Circle, GripVertical, GripHorizontal, AlertCircle } from "lucide-react"
import { PDFTableView, InvoiceRow, InvoiceStatus } from "@/components/pdf/PDFTableView"
import { PDFPreview } from "@/components/pdf/PDFPreview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AccountingLineItem {
  amount: number
  sru_code: number
  sru_code_description: string
  comment?: string
}

const MIN_PANEL_WIDTH = 280
const MAX_PANEL_WIDTH = 800
const DEFAULT_PANEL_WIDTH = 600

const MIN_ACCOUNTING_HEIGHT = 200
const MAX_ACCOUNTING_HEIGHT = 600
const DEFAULT_ACCOUNTING_HEIGHT = 320

export function VerifySplitView() {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null)
  const [accountingItems, setAccountingItems] = useState<AccountingLineItem[]>([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [hasPendingInvoices, setHasPendingInvoices] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [isDragging, setIsDragging] = useState(false)
  const [accountingHeight, setAccountingHeight] = useState(DEFAULT_ACCOUNTING_HEIGHT)
  const [isVerticalDragging, setIsVerticalDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const updateInvoiceStatusRef = useRef<((id: string, status: InvoiceStatus) => void) | null>(null)

  // Handle horizontal drag resize (left panel width)
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = e.clientX - containerRect.left
      setPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, newWidth)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  // Handle vertical drag resize (accounting panel height)
  useEffect(() => {
    if (!isVerticalDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!rightPanelRef.current) return
      const panelRect = rightPanelRef.current.getBoundingClientRect()
      // Calculate height from bottom of container
      const newHeight = panelRect.bottom - e.clientY
      setAccountingHeight(Math.min(MAX_ACCOUNTING_HEIGHT, Math.max(MIN_ACCOUNTING_HEIGHT, newHeight)))
    }

    const handleMouseUp = () => {
      setIsVerticalDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isVerticalDragging])

  const handleSelectInvoice = useCallback((invoice: InvoiceRow) => {
    setSelectedInvoice(invoice)
    // Fetch accounting entries for this invoice if it's ready/verified
    if (["ready", "verified"].includes(invoice.status)) {
      fetchAccountingEntries(invoice.id)
    } else {
      setAccountingItems([])
    }
  }, [])

  const handleInvoicesLoaded = useCallback((invoices: InvoiceRow[]) => {
    setHasPendingInvoices(invoices.some((inv) => inv.status === "pending"))
  }, [])

  const handleRegisterUpdateStatus = useCallback(
    (updateFn: (id: string, status: InvoiceStatus) => void) => {
      updateInvoiceStatusRef.current = updateFn
    },
    []
  )

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
        // Update local state instead of reloading
        updateInvoiceStatusRef.current?.(selectedInvoice.id, "verified")
        setSelectedInvoice({ ...selectedInvoice, status: "verified" })
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
        // Update local state instead of reloading
        updateInvoiceStatusRef.current?.(selectedInvoice.id, "ready")
        setSelectedInvoice({ ...selectedInvoice, status: "ready" })
      }
    } catch (error) {
      console.error("Rejection failed:", error)
    } finally {
      setIsVerifying(false)
    }
  }

  // Construct PDF URL from file path - handle both external URLs and local paths
  // filePath is stored as relative path (e.g., "invoices/userId/file.pdf")
  const pdfUrl = selectedInvoice?.filePath
    ? selectedInvoice.filePath.startsWith("http")
      ? selectedInvoice.filePath
      : `/api/files/${selectedInvoice.filePath}`
    : null

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-57px)]">
      {/* Left Panel: Invoice Table with Actions */}
      <div
        className="border-r flex flex-col relative"
        style={{ width: panelWidth, minWidth: MIN_PANEL_WIDTH, maxWidth: MAX_PANEL_WIDTH }}
      >
        {/* Pending Banner */}
        {hasPendingInvoices && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Ladda upp CSV-transaktioner för att slutföra bokföringen</span>
          </div>
        )}
        <PDFTableView
          onSelectInvoice={handleSelectInvoice}
          onInvoicesLoaded={handleInvoicesLoaded}
          onRegisterUpdateStatus={handleRegisterUpdateStatus}
          className="flex-1 overflow-hidden"
        />

        {/* Resize Handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors group ${isDragging ? "bg-primary/30" : ""
            }`}
          onMouseDown={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
        >
          <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Right Panel: PDF Preview + Accounting Items */}
      <div ref={rightPanelRef} className="flex-1 flex flex-col">
        {/* PDF Preview */}
        <div className="flex-1 min-h-0">
          <PDFPreview pdfUrl={pdfUrl} className="h-full" />
        </div>

        {/* Verification Panel */}
        {selectedInvoice && ["ready", "verified"].includes(selectedInvoice.status) && (
          <>
            {/* Vertical Resize Handle */}
            <div
              className={`h-1 cursor-row-resize hover:bg-primary/20 transition-colors group relative ${isVerticalDragging ? "bg-primary/30" : ""
                }`}
              onMouseDown={(e) => {
                e.preventDefault()
                setIsVerticalDragging(true)
              }}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div style={{ height: accountingHeight }} className="flex flex-col">
              <Card className="flex-1 rounded-none border-0 border-t overflow-auto">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-sm font-medium">
                        Fakturauppgifter
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={selectedInvoice.status === "verified"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-purple-100 text-purple-800 border-purple-200"
                        }
                      >
                        {selectedInvoice.status === "verified" ? "Verifierad" : "Klar"}
                      </Badge>
                    </div>
                    {/* Large Verify Checkbox */}
                    <div
                      className="flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => {
                        if (selectedInvoice.status === "verified") {
                          handleReject()
                        } else {
                          handleVerify()
                        }
                      }}
                    >
                      <span className="text-sm font-medium">
                        {selectedInvoice.status === "verified" ? "Verifierad" : "Markera som verifierad"}
                      </span>
                      {isVerifying ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : selectedInvoice.status === "verified" ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground hover:text-green-600 transition-colors" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-0 px-4 pb-4">
                  {/* Invoice Info */}
                  <div className="mb-3 p-3 rounded-lg bg-muted/30 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Leverantör:</span>
                      <span className="font-medium">{selectedInvoice.supplier || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Belopp:</span>
                      <span className="font-medium">
                        {selectedInvoice.totalAmount?.toLocaleString("sv-SE") || "—"} {selectedInvoice.currency}
                      </span>
                    </div>
                  </div>

                  {/* Accounting Line Items */}
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Bokföringsposter
                  </div>
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
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      Inga bokföringsposter hittades
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Empty state when no invoice selected */}
        {!selectedInvoice && (
          <div className="h-[280px] flex items-center justify-center border-t">
            <p className="text-muted-foreground text-sm">
              Välj en faktura för att visa detaljer
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
