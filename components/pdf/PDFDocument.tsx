"use client"

import { useState, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react"
import { pdfjs, Document, Page } from "react-pdf"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFDocumentProps {
    pdfUrl: string
    className?: string
}

export default function PDFDocumentViewer({ pdfUrl, className }: PDFDocumentProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [scale, setScale] = useState<number>(1.0)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    // Reset state when PDF URL changes
    useEffect(() => {
        setIsLoading(true)
        setError(null)
        setPageNumber(1)
        setNumPages(0)
    }, [pdfUrl])

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages)
        setPageNumber(1)
        setIsLoading(false)
        setError(null)
    }, [])

    const onDocumentLoadError = useCallback((error: Error) => {
        setError(error.message)
        setIsLoading(false)
    }, [])

    const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1))
    const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages))
    const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3))
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5))

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Controls */}
            <div className="flex items-center justify-between border-b px-4 py-2 bg-background">
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                        {numPages > 0 ? `${pageNumber} / ${numPages}` : "—"}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={zoomOut}
                        disabled={scale <= 0.5}
                        aria-label="Zoom out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={zoomIn}
                        disabled={scale >= 3}
                        aria-label="Zoom in"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* PDF Document */}
            <div className="flex-1 overflow-auto bg-muted/20 flex items-start justify-center p-4 relative">
                {isLoading && !error && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                )}
                {error && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-destructive text-sm">Kunde inte ladda PDF: {error}</p>
                    </div>
                )}
                {!error && (
                    <Document
                        key={pdfUrl}
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={null}
                        className={cn(isLoading ? "opacity-0" : "opacity-100", "transition-opacity")}
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="shadow-lg"
                        />
                    </Document>
                )}
            </div>
        </div>
    )
}
