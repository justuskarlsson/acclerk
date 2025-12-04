"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { FileText, Loader2, RefreshCw } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

export interface InvoiceRow {
  id: string
  filename: string
  status: "uploading" | "processing" | "done" | "error"
  createdAt: string
  supplier: string
  totalAmount: number
  currency: string
  filePath: string
}

const statusConfig: Record<
  InvoiceRow["status"],
  { label: string; className: string }
> = {
  uploading: {
    label: "Uploading",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  done: {
    label: "Done",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-800 border-red-200",
  },
}

interface PDFTableViewProps {
  onSelectInvoice?: (invoice: InvoiceRow) => void
  className?: string
}

export function PDFTableView({ onSelectInvoice, className }: PDFTableViewProps) {
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
      setInvoices(data.invoices || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const handleRowClick = (invoice: InvoiceRow) => {
    // Single selection mode for preview
    setSelectedInvoiceIds([invoice.id])
    onSelectInvoice?.(invoice)
  }

  const handleRowDoubleClick = (invoice: InvoiceRow) => {
    // Toggle selection on double click for multi-select
    toggleInvoiceSelection(invoice.id)
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
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h2 className="text-sm font-medium">Invoices ({invoices.length})</h2>
        <Button variant="ghost" size="icon-sm" onClick={fetchInvoices}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Filename</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Result</TableHead>
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
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[160px]">{invoice.filename}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {invoice.status === "done" && invoice.supplier ? (
                      <span className="text-sm">
                        {invoice.supplier} • {invoice.totalAmount.toLocaleString()}{" "}
                        {invoice.currency}
                      </span>
                    ) : invoice.status === "error" ? (
                      <span className="text-destructive text-sm">Failed to process</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
