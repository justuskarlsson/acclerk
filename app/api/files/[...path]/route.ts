import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { readStoredFile, fileExists } from "@/lib/storage"

/**
 * GET /api/files/[...path]
 * 
 * Serves files from the storage directory.
 * Path should be relative (e.g., "invoices/userId/file.pdf")
 * Full path is constructed using STORAGE_DIR env variable.
 * Requires authentication.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Check authentication
  const sessionToken = req.cookies.get("next-auth.session-token")
  if (!sessionToken?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { path } = await params
    // Reconstruct the relative file path from URL segments
    const relativePath = path.join("/")
    
    console.log("[api/files] Requested file:", relativePath)

    // Security: Block path traversal attempts
    if (relativePath.includes("..") || relativePath.startsWith("/")) {
      console.error("[api/files] Invalid path (traversal attempt):", relativePath)
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    // Check if file exists
    if (!fileExists(relativePath)) {
      console.error("[api/files] File not found:", relativePath)
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Read and serve the file
    const fileBuffer = await readStoredFile(relativePath)
    
    // Determine content type based on extension
    const ext = relativePath.split(".").pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      csv: "text/csv",
    }
    const contentType = contentTypes[ext || ""] || "application/octet-stream"

    console.log("[api/files] Serving file:", relativePath, "Content-Type:", contentType)

    // Convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[api/files] Error serving file:", error)
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    )
  }
}

