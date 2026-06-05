export type WatchType = 'script' | 'texture'

export interface WatchItem {
  path: string
  type: WatchType
  lastModified: number
  callback: () => void
}

export class ProjectWatcher {
  private handle: FileSystemDirectoryHandle
  private intervalId: number = 0
  private watches: Map<string, WatchItem> = new Map()

  constructor(handle: FileSystemDirectoryHandle) {
    this.handle = handle
  }

  start(intervalMs = 1000) {
    this.stop()
    this.intervalId = window.setInterval(() => this.poll(), intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = 0
    }
  }

  watch(path: string, type: WatchType, callback: () => void) {
    this.watches.set(path, {
      path,
      type,
      lastModified: 0, // Will be updated on first poll
      callback
    })
  }

  unwatch(path: string) {
    this.watches.delete(path)
  }

  clear() {
    this.watches.clear()
  }

  private async poll() {
    for (const [path, item] of this.watches.entries()) {
      try {
        const parts = path.split('/')
        let dir = this.handle
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i])
        }
        const fileHandle = await dir.getFileHandle(parts[parts.length - 1])
        const file = await fileHandle.getFile()

        if (item.lastModified === 0) {
          item.lastModified = file.lastModified
        } else if (file.lastModified > item.lastModified) {
          item.lastModified = file.lastModified
          item.callback()
        }
      } catch (err) {
        // File might have been deleted or moved
      }
    }
  }
}
