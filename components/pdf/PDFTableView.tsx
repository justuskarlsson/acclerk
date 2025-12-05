"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { FileText, Loader2, RefreshCw, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

export type InvoiceStatus =
  | "processing"
  | "pending"
  | "ready"
  | "no-match"
  | "verified"
  | "error"

export interface InvoiceRow {
  id: string
  filename: string
  status: InvoiceStatus
  createdAt: string
  supplier: string
  totalAmount: number
  currency: string
  filePath: string
}

const statusConfig: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  ready: {
    label: "Ready",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  "no-match": {
    label: "No Match",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  verified: {
    label: "Verified",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-800 border-red-200",
  },
}

interface PDFTableViewProps {
  onSelectInvoice?: (invoice: InvoiceRow) => void
  onInvoicesLoaded?: (invoices: InvoiceRow[]) => void
  onRegisterUpdateStatus?: (updateFn: (invoiceId: string, status: InvoiceStatus) => void) => void
  className?: string
}

export function PDFTableView({ onSelectInvoice, onInvoicesLoaded, onRegisterUpdateStatus, className }: PDFTableViewProps) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { selectedInvoiceIds, toggleInvoiceSelection, setSelectedInvoiceIds } =
    useUIStore()

  const fetchInvoices = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/invoices")
      if (!response.ok) {
        throw new Error("Failed to fetch invoices")
      }
      const data = await response.json()
      const loadedInvoices = data.invoices || []
      setInvoices(loadedInvoices)
      onInvoicesLoaded?.(loadedInvoices)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  // Register update function for parent to update invoice status without refetch
  useEffect(() => {
    onRegisterUpdateStatus?.((invoiceId: string, status: InvoiceStatus) => {
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, status } : inv))
      )
    })
  }, [onRegisterUpdateStatus])

  const handleRowClick = (invoice: InvoiceRow) => {
    // Single selection mode for preview
    setSelectedInvoiceIds([invoice.id])
    onSelectInvoice?.(invoice)
  }

  const handleRowDoubleClick = (invoice: InvoiceRow) => {
    // Toggle selection on double click for multi-select
    toggleInvoiceSelection(invoice.id)
  }

  const handleDelete = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation() // Prevent row selection

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete invoice")
      }

      // Remove from local state
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId))

      // Clear selection if deleted invoice was selected
      if (selectedInvoiceIds.includes(invoiceId)) {
        setSelectedInvoiceIds(selectedInvoiceIds.filter((id) => id !== invoiceId))
      }
    } catch (err) {
      console.error("Delete error:", err)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-64 gap-4", className)}>
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchInvoices}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-64 gap-2", className)}>
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">No invoices uploaded yet</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <h2 className="text-sm font-medium">Invoices ({invoices.length})</h2>
        <Button variant="ghost" size="icon-sm" onClick={fetchInvoices}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <Table className="w-full">
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="min-w-[140px]">Filename</TableHead>
              <TableHead className="min-w-[80px]">Status</TableHead>
              <TableHead className="min-w-[90px]">Date</TableHead>
              <TableHead className="min-w-[120px]">Result</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const isSelected = selectedInvoiceIds.includes(invoice.id)
              const status = statusConfig[invoice.status]

              return (
                <TableRow
                  key={invoice.id}
                  data-state={isSelected ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(invoice)}
                  onDoubleClick={() => handleRowDoubleClick(invoice)}
                >
                  <TableCell className="font-medium max-w-[180px]">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate" title={invoice.filename}>{invoice.filename}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("whitespace-nowrap text-xs", status.className)}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                    {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    {["pending", "ready", "verified"].includes(invoice.status) && invoice.supplier ? (
                      <span className="text-xs truncate block" title={`${invoice.supplier} • ${invoice.totalAmount.toLocaleString()} ${invoice.currency}`}>
                        {invoice.supplier} • {invoice.totalAmount.toLocaleString()}{" "}
                        {invoice.currency}
                      </span>
                    ) : invoice.status === "error" ? (
                      <span className="text-destructive text-xs">Failed to process</span>
                    ) : invoice.status === "no-match" ? (
                      <span className="text-orange-600 text-xs">No matching transaction</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => handleDelete(e, invoice.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
