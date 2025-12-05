import { writeFile, mkdir, readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

/**
 * Get the storage root directory from STORAGE_DIR env variable
 * Defaults to "storage" if not set
 */
export function getStorageRoot(): string {
  return process.env.STORAGE_DIR || "storage"
}

/**
 * Get the full filesystem path for a relative storage path
 */
export function getFullPath(relativePath: string): string {
  return join(process.cwd(), getStorageRoot(), relativePath)
}

/**
 * Check if a file exists in storage
 */
export function fileExists(relativePath: string): boolean {
  return existsSync(getFullPath(relativePath))
}

export async function ensureStorageDir(path: string): Promise<string> {
  const fullPath = join(process.cwd(), getStorageRoot(), path)
  await mkdir(fullPath, { recursive: true })
  return fullPath
}

/**
 * Save a file to storage
 * @returns Relative path (e.g., "invoices/userId/file.pdf") - NOT the full path
 */
export async function saveFile(
  file: Buffer | ArrayBuffer,
  path: string,
  filename: string
): Promise<string> {
  const dir = await ensureStorageDir(path)
  const fullFilePath = join(dir, filename)
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file)
  await writeFile(fullFilePath, buffer)

  // Return relative path, not full path
  return join(path, filename)
}

/**
 * Read a file from storage using relative path
 */
export async function readStoredFile(relativePath: string): Promise<Buffer> {
  const fullPath = getFullPath(relativePath)
  return await readFile(fullPath)
}


