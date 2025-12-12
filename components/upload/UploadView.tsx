"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { PDFPreview } from "@/components/pdf/PDFPreview"

// Generate unique ID - works in all environments
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

interface FileWithProgress {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  error?: string
}

export function UploadView() {
  const [files, setFiles] = useState<FileWithProgress[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedFile = files.find((f) => f.id === selectedFileId)
  const previewUrl = selectedFile ? URL.createObjectURL(selectedFile.file) : null

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const pdfFiles = Array.from(newFiles).filter(
      (file) => file.type === "application/pdf"
    )

    const fileItems: FileWithProgress[] = pdfFiles.map((file) => ({
      id: generateId(),
      file,
      progress: 0,
      status: "pending",
    }))

    setFiles((prev) => [...prev, ...fileItems])

    // Auto-select the first file if none selected
    if (!selectedFileId && fileItems.length > 0) {
      setSelectedFileId(fileItems[0].id)
    }
  }, [selectedFileId])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    if (selectedFileId === id) {
      setSelectedFileId(null)
    }
  }, [selectedFileId])

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
      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files)
      }
      // Reset input so the same file can be selected again
      e.target.value = ""
    },
    [addFiles]
  )

  const uploadFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending")
    if (pendingFiles.length === 0) return

    for (const fileItem of pendingFiles) {
      // Mark as uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, status: "uploading" as const, progress: 0 } : f
        )
      )

      try {
        const formData = new FormData()
        formData.append("files", fileItem.file)

        const response = await fetch("/api/upload-invoices", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Upload failed")
        }

        // Mark as success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: "success" as const, progress: 100 }
              : f
          )
        )
      } catch (error) {
        // Mark as error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                ...f,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Upload failed",
              }
              : f
          )
        )
      }
    }
  }, [files])

  const pendingCount = files.filter((f) => f.status === "pending").length

  return (
    <div className="flex h-[calc(100vh-57px)] gap-0">
      {/* Left Panel: File Upload & List */}
      <div className="w-96 border-r flex flex-col bg-background">
        {/* Drop Zone */}
        <div
          className={cn(
            "m-4 border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Släpp PDF-filer här</p>
            <p className="text-xs text-muted-foreground">eller klicka för att bläddra</p>
          </div>
        </div>

        {/* File List */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedFileId === fileItem.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
                onClick={() => setSelectedFileId(fileItem.id)}
              >
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(fileItem.file.size / 1024).toFixed(1)} KB
                  </p>
                  {fileItem.status === "uploading" && (
                    <Progress value={fileItem.progress} className="mt-1 h-1" />
                  )}
                  {fileItem.status === "error" && (
                    <p className="text-xs text-destructive mt-1">{fileItem.error}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {fileItem.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(fileItem.id)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {fileItem.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {fileItem.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {fileItem.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Upload Button */}
        {pendingCount > 0 && (
          <div className="p-4 border-t">
            <Button className="w-full" onClick={uploadFiles}>
              <Upload className="h-4 w-4 mr-2" />
              Ladda upp {pendingCount} {pendingCount === 1 ? "fil" : "filer"}
            </Button>
          </div>
        )}
      </div>

      {/* Right Panel: PDF Preview */}
      <div className="flex-1">
        <PDFPreview pdfUrl={previewUrl} className="h-full" />
      </div>
    </div>
  )
}

