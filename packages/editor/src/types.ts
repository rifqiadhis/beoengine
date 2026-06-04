/**
 * Shared types — no runes, no svelte, safe to import from anywhere
 */

export interface RecentProject {
  handle: FileSystemDirectoryHandle
  name: string
  lastOpened: number
}
