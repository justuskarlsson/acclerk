"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface UploadResult {
    filename: string
    count: number
}

export function TransactionUploadView() {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = useCallback(async (file: File) => {
        if (!file.name.endsWith(".csv")) {
            setError("Vänligen ladda upp en CSV-fil")
            return
        }

        setIsUploading(true)
        setError(null)
        setUploadResult(null)

        try {
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch("/api/upload-transactions", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Upload failed")
            }

            const result = await response.json()
            setUploadResult({
                filename: result.filename,
                count: result.count,
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed")
        } finally {
            setIsUploading(false)
        }
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) {
                handleUpload(file)
            }
        },
        [handleUpload]
    )

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) {
                handleUpload(file)
            }
            e.target.value = ""
        },
        [handleUpload]
    )

    return (
        <div className="flex h-[calc(100vh-57px)] items-center justify-center p-8">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Ladda upp banktransaktioner
                    </CardTitle>
                    <CardDescription>
                        Ladda upp en CSV-fil med dina banktransaktioner. Detta ersätter alla
                        befintliga transaktioner.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Drop Zone */}
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
                            isDragging
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/25 hover:border-muted-foreground/50",
                            isUploading && "pointer-events-none opacity-50"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={isUploading}
                        />
                        <div className="flex flex-col items-center gap-2 text-center">
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                                    <p className="text-sm font-medium">Laddar upp...</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-10 w-10 text-muted-foreground" />
                                    <p className="text-sm font-medium">Släpp CSV-fil här</p>
                                    <p className="text-xs text-muted-foreground">eller klicka för att bläddra</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Success Result */}
                    {uploadResult && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-green-800">
                                    Uppladdning lyckades
                                </p>
                                <p className="text-xs text-green-600">
                                    {uploadResult.count} transaktioner importerade från {uploadResult.filename}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Uppladdning misslyckades</p>
                                <p className="text-xs text-red-600">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p>Format som stöds: CSV (semikolon-separerad, Nordea-format)</p>
                        <p>
                            Obligatoriska kolumner: Bokföringsdatum, Belopp, Valuta
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

