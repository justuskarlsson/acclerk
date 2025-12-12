"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Dynamically import the PDF document component with SSR disabled
// This is the official pattern from react-pdf for Next.js
const PDFDocumentViewer = dynamic(() => import("./PDFDocument"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface PDFPreviewProps {
  pdfUrl: string | null
  className?: string
}

export function PDFPreview({ pdfUrl, className }: PDFPreviewProps) {
  if (!pdfUrl) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/30 rounded-lg", className)}>
        <p className="text-muted-foreground text-sm">Välj en PDF för att förhandsgranska</p>
      </div>
    )
  }

  return <PDFDocumentViewer pdfUrl={pdfUrl} className={cn("h-full", className)} />
}
