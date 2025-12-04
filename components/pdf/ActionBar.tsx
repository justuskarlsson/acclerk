"use client"

import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function ActionBar() {
  const router = useRouter()

  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/upload")}
            aria-label="Upload PDFs"
          >
            <Upload className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Upload PDFs</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
