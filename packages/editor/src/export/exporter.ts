/**
 * BeoEngine — Game Exporter
 * Bundles the current project into a single self-contained HTML file.
 *
 * Everything is inlined: engine runtime, user scripts, scene data,
 * and all assets (as base64 data URIs). The result can be opened
 * directly in any browser — no server required.
 */

import { SceneSerializer } from 'beo'
import type { Scene } from 'beo'
import { compileTS } from '../scripting/transpiler.ts'
import { generateSingleFileHTML } from './runtime-template.ts'
import { listAllFiles, readTextFile } from '../fs/filesystem.ts'
import { engineConsole } from '../stores/console.svelte.ts'

// Pre-built engine runtime — imported as raw text at build time
import beoRuntimeUrl from '../../../engine/dist/beo.runtime.js?url'

const ASSET_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif',
  '.mp3', '.ogg', '.wav', '.aac',
]

const SCRIPT_EXTENSIONS = ['.ts']

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
}

interface ExportOptions {
  scene: Scene
  folderHandle: FileSystemDirectoryHandle
  projectName: string
}

export async function exportProject(options: ExportOptions): Promise<void> {
  const { scene, folderHandle, projectName } = options

  engineConsole.info('[Export] Starting export…')

  // ── 1. Load engine runtime ─────────────────────────────────────────────
  let runtimeJS: string
  try {
    const resp = await fetch(beoRuntimeUrl)
    runtimeJS = await resp.text()
    engineConsole.info('[Export] Loaded engine runtime')
  } catch (err) {
    throw new Error(`Failed to load engine runtime: ${err}`)
  }

  // ── 2. Collect all project files ───────────────────────────────────────
  const allFiles = await listAllFiles(folderHandle)

  // ── 3. Transpile & bundle user scripts ─────────────────────────────────
  const scriptFiles = allFiles.filter(f =>
    SCRIPT_EXTENSIONS.some(ext => f.toLowerCase().endsWith(ext))
  )

  let gameBundleJS = `// BeoEngine — Compiled User Scripts\nwindow.__BEO_SCRIPTS__ = {};\n\n`

  for (const scriptPath of scriptFiles) {
    try {
      const tsSource = await readTextFile(folderHandle, scriptPath)
      let jsCode = compileTS(tsSource)

      gameBundleJS += `;(function() {\n`

      const defaultClassMatch = jsCode.match(/(?:export\s+default\s+class\s+)(\w+)/)
      if (defaultClassMatch) {
        const className = defaultClassMatch[1]
        jsCode = jsCode.replace(/export\s+default\s+class\s+/, 'class ')
        gameBundleJS += jsCode + `\n`
        gameBundleJS += `  window.__BEO_SCRIPTS__["${scriptPath}"] = ${className};\n`
      } else {
        jsCode = jsCode.replace(/export\s+default\s+/, 'const __default_export__ = ')
        gameBundleJS += jsCode + `\n`
        gameBundleJS += `  if (typeof __default_export__ !== 'undefined') window.__BEO_SCRIPTS__["${scriptPath}"] = __default_export__;\n`
      }
      gameBundleJS += `})();\n\n`

      engineConsole.info(`[Export] Compiled: ${scriptPath}`)
    } catch (err) {
      engineConsole.warn(`[Export] Failed to compile ${scriptPath}: ${err}`)
    }
  }

  // ── 4. Serialize the scene ─────────────────────────────────────────────
  const sceneJSON = SceneSerializer.serialize(scene)
  engineConsole.info(`[Export] Serialized scene: ${scene.name}`)

  // ── 5. Collect & inline assets as base64 data URIs ─────────────────────
  const assetFiles = allFiles.filter(f =>
    ASSET_EXTENSIONS.some(ext => f.toLowerCase().endsWith(ext))
  )

  const assetDataURIs: Record<string, string> = {}

  for (const assetPath of assetFiles) {
    try {
      const blob = await readFileAsBlob(folderHandle, assetPath)
      const ext = '.' + assetPath.split('.').pop()!.toLowerCase()
      const mime = MIME_MAP[ext] || 'application/octet-stream'
      const dataURI = await blobToDataURI(blob, mime)
      assetDataURIs[assetPath] = dataURI
      engineConsole.info(`[Export] Inlined asset: ${assetPath}`)
    } catch (err) {
      engineConsole.warn(`[Export] Could not read asset: ${assetPath}`)
    }
  }

  // ── 6. Generate the single HTML file ───────────────────────────────────
  const html = generateSingleFileHTML({
    projectName,
    runtimeJS,
    gameBundleJS,
    sceneJSON,
    assetDataURIs,
  })

  engineConsole.info('[Export] Generated HTML bundle')

  // ── 7. Save to project folder or download ──────────────────────────────
  const filename = `${projectName}.html`
  try {
    await saveToProjectFolder(folderHandle, filename, html)
    engineConsole.info(`[Export] ✅ Saved: ${filename}`)
  } catch (err) {
    triggerDownload(html, filename)
    engineConsole.info(`[Export] ✅ Downloaded: ${filename}`)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function readFileAsBlob(
  dir: FileSystemDirectoryHandle,
  path: string,
): Promise<Blob> {
  const parts = path.split('/')
  let current: FileSystemDirectoryHandle = dir
  for (const part of parts.slice(0, -1)) {
    current = await current.getDirectoryHandle(part)
  }
  const fileHandle = await current.getFileHandle(parts[parts.length - 1]!)
  return await fileHandle.getFile()
}

function blobToDataURI(blob: Blob, mime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(`data:${mime};base64,${base64}`)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function saveToProjectFolder(
  dir: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
