/**
 * BeoEngine — AssetManager
 * Loads and caches raw assets (images, audio buffers, JSON) by URL.
 */

export class AssetManager {
  private images: Map<string, HTMLImageElement> = new Map()
  private json: Map<string, unknown> = new Map()
  private blobs: Map<string, string> = new Map() // URL → object URL

  // ── Images ─────────────────────────────────────────────────────────────
  loadImage(url: string): Promise<HTMLImageElement> {
    const cached = this.images.get(url)
    if (cached) return Promise.resolve(cached)

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        this.images.set(url, img)
        resolve(img)
      }
      img.onerror = () => reject(new Error(`[BeoEngine] Failed to load image: ${url}`))
      img.src = url
    })
  }

  getImage(url: string): HTMLImageElement | undefined {
    return this.images.get(url)
  }

  // ── JSON ───────────────────────────────────────────────────────────────
  async loadJSON<T = unknown>(url: string): Promise<T> {
    const cached = this.json.get(url)
    if (cached) return cached as T

    const res = await fetch(url)
    if (!res.ok) throw new Error(`[BeoEngine] Failed to fetch JSON: ${url} (${res.status})`)
    const data = await res.json() as T
    this.json.set(url, data as unknown)
    return data
  }

  // ── Blob / File System ─────────────────────────────────────────────────
  /** Create an object URL from a File (e.g. from FileSystemAccess API) and cache it */
  registerFile(key: string, file: File): string {
    const existing = this.blobs.get(key)
    if (existing) URL.revokeObjectURL(existing)
    const objUrl = URL.createObjectURL(file)
    this.blobs.set(key, objUrl)
    return objUrl
  }

  getObjectURL(key: string): string | undefined {
    return this.blobs.get(key)
  }

  // ── Cleanup ────────────────────────────────────────────────────────────
  dispose(): void {
    for (const url of this.blobs.values()) {
      URL.revokeObjectURL(url)
    }
    this.images.clear()
    this.json.clear()
    this.blobs.clear()
  }
}
