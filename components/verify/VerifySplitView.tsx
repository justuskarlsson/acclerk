"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Check, X, Loader2, RefreshCw, Link2, CheckCircle2, Circle, GripVertical } from "lucide-react"
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

const MIN_PANEL_WIDTH = 280
const MAX_PANEL_WIDTH = 800
const DEFAULT_PANEL_WIDTH = 400

export function VerifySplitView() {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null)
  const [accountingItems, setAccountingItems] = useState<AccountingLineItem[]>([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectResult, setConnectResult] = useState<{ matched: number; total: number } | null>(null)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [isDragging, setIsDragging] = useState(false)
  const tableRef = useRef<{ refresh: () => void } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle drag resize
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

  const handleSelectInvoice = useCallback((invoice: InvoiceRow) => {
    setSelectedInvoice(invoice)
    // Fetch accounting entries for this invoice if it has been connected/verified
    if (["to-verify", "verified"].includes(invoice.status)) {
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

  const handleConnect = async () => {
    setIsConnecting(true)
    setConnectResult(null)
    try {
      const response = await fetch("/api/invoices/connect", {
        method: "POST",
      })
      if (response.ok) {
        const data = await response.json()
        setConnectResult({ matched: data.matched, total: data.total })
        // Refresh table after connection
        window.location.reload()
      }
    } catch (error) {
      console.error("Connect failed:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
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
        {/* Action Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Link2 className="h-4 w-4 mr-1" />
              )}
              Connect
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
        <PDFTableView
          onSelectInvoice={handleSelectInvoice}
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
      <div className="flex-1 flex flex-col">
        {/* PDF Preview */}
        <div className="flex-1 min-h-0">
          <PDFPreview pdfUrl={pdfUrl} className="h-full" />
        </div>

        {/* Verification Panel */}
        {selectedInvoice && ["to-verify", "verified"].includes(selectedInvoice.status) && (
          <>
            <Separator />
            <div className="h-[320px] flex flex-col">
              <Card className="flex-1 rounded-none border-0 border-t">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-sm font-medium">
                        Invoice Details
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={selectedInvoice.status === "verified"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-purple-100 text-purple-800 border-purple-200"
                        }
                      >
                        {selectedInvoice.status === "verified" ? "Verified" : "Pending"}
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
                        {selectedInvoice.status === "verified" ? "Verified" : "Mark as Verified"}
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
                <CardContent className="py-0 px-4">
                  {/* Invoice Info */}
                  <div className="mb-3 p-3 rounded-lg bg-muted/30 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Supplier:</span>
                      <span className="font-medium">{selectedInvoice.supplier || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">
                        {selectedInvoice.totalAmount?.toLocaleString("sv-SE") || "—"} {selectedInvoice.currency}
                      </span>
                    </div>
                  </div>

                  {/* Accounting Line Items */}
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Accounting Line Items
                  </div>
                  <ScrollArea className="h-[140px]">
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
