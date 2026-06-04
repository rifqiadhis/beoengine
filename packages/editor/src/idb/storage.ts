/**
 * BeoEngine Editor — IndexedDB storage
 * Thin wrapper around the IDB API (no dependencies — uses raw IDB).
 *
 * Stores:
 *   recent_projects — { handle, name, lastOpened }
 *   editor_state    — arbitrary JSON keyed by string
 */

import type { RecentProject } from '../types.ts'

const DB_NAME = 'beoengine_editor'
const DB_VERSION = 1

type StoreNames = 'recent_projects' | 'editor_state'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('recent_projects')) {
        db.createObjectStore('recent_projects', { keyPath: 'name' })
      }
      if (!db.objectStoreNames.contains('editor_state')) {
        db.createObjectStore('editor_state')
      }
    }

    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror   = (e) => reject((e.target as IDBOpenDBRequest).error)
  })
}

function tx<T>(
  store: StoreNames,
  mode: IDBTransactionMode,
  cb: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const s = t.objectStore(store)
        const req = cb(s)
        req.onsuccess = () => resolve(req.result)
        req.onerror   = () => reject(req.error)
      }),
  )
}

// ── Recent Projects ────────────────────────────────────────────────────────
export async function loadRecentProjects(): Promise<RecentProject[]> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const t = db.transaction('recent_projects', 'readonly')
      const s = t.objectStore('recent_projects')
      const req = s.getAll()
      req.onsuccess = () => {
        const all = (req.result as RecentProject[]).sort(
          (a, b) => b.lastOpened - a.lastOpened,
        )
        resolve(all)
      }
      req.onerror = () => reject(req.error)
    })
  })
}

export async function saveRecentProject(entry: RecentProject): Promise<void> {
  await tx('recent_projects', 'readwrite', (s) => s.put(entry))
}

export async function removeRecentProject(name: string): Promise<void> {
  await tx('recent_projects', 'readwrite', (s) => s.delete(name))
}

// ── Editor State ───────────────────────────────────────────────────────────
export async function getEditorState<T>(key: string): Promise<T | undefined> {
  return tx<T>('editor_state', 'readonly', (s) => s.get(key))
}

export async function setEditorState(key: string, value: unknown): Promise<void> {
  await tx<IDBValidKey>('editor_state', 'readwrite', (s) => s.put(value, key))
}
