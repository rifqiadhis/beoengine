/**
 * BeoEngine Editor — File System Access API wrapper
 * Helpers for reading/writing real project files on disk.
 */

// ── Directory picker ───────────────────────────────────────────────────────
export async function pickProjectFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch (e) {
    // User cancelled
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

// ── Read / Write files ─────────────────────────────────────────────────────
export async function readTextFile(
  dir: FileSystemDirectoryHandle,
  path: string,
): Promise<string> {
  const parts = path.split('/')
  let current: FileSystemDirectoryHandle = dir
  for (const part of parts.slice(0, -1)) {
    current = await current.getDirectoryHandle(part)
  }
  const fileName = parts[parts.length - 1]!
  const fileHandle = await current.getFileHandle(fileName)
  const file = await fileHandle.getFile()
  return file.text()
}

export async function writeTextFile(
  dir: FileSystemDirectoryHandle,
  path: string,
  content: string,
): Promise<void> {
  const parts = path.split('/')
  let current: FileSystemDirectoryHandle = dir
  for (const part of parts.slice(0, -1)) {
    current = await current.getDirectoryHandle(part, { create: true })
  }
  const fileName = parts[parts.length - 1]!
  const fileHandle = await current.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export async function fileExists(
  dir: FileSystemDirectoryHandle,
  path: string,
): Promise<boolean> {
  try {
    await readTextFile(dir, path)
    return true
  } catch {
    return false
  }
}

// ── List directory ─────────────────────────────────────────────────────────
export interface FSEntry {
  name: string
  kind: 'file' | 'directory'
}

export async function listDirectory(
  dir: FileSystemDirectoryHandle,
  subpath?: string,
): Promise<FSEntry[]> {
  let target = dir
  if (subpath) {
    for (const part of subpath.split('/')) {
      target = await target.getDirectoryHandle(part)
    }
  }
  const entries: FSEntry[] = []
  for await (const [name, handle] of target.entries()) {
    entries.push({ name, kind: handle.kind })
  }
  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
