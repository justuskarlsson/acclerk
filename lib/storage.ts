import { writeFile, mkdir, readFile } from "fs/promises"
import { join } from "path"

/**
 * Get the storage root directory from STORAGE_DIR env variable
 * Defaults to "storage" if not set
 */
function getStorageRoot(): string {
  return process.env.STORAGE_DIR || "storage"
}

export async function ensureStorageDir(path: string): Promise<string> {
  const fullPath = join(process.cwd(), getStorageRoot(), path)
  await mkdir(fullPath, { recursive: true })
  return fullPath
}

export async function saveFile(
  file: Buffer | ArrayBuffer,
  path: string,
  filename: string
): Promise<string> {
  const dir = await ensureStorageDir(path)
  const filepath = join(dir, filename)
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file)
  await writeFile(filepath, buffer)
  return filepath
}

export async function readStoredFile(path: string): Promise<Buffer> {
  const fullPath = join(process.cwd(), getStorageRoot(), path)
  return await readFile(fullPath)
}


