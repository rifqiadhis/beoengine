<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Engine, Scene, Camera2D, Sprite, SceneSerializer } from 'beo'
  import { getEditorState, setEditorState } from '../idb/storage.ts'
  import { viewport } from '../stores/viewport.svelte.ts'
  import { scene as sceneStore } from '../stores/scene.svelte.ts'
  import { sceneOpener } from '../stores/sceneOpener.svelte.ts'
  import { ProjectWatcher } from '../fs/watcher.ts'
  import { engineConsole } from '../stores/console.svelte.ts'
  import { project } from '../stores/project.svelte.ts'
  import { readTextFile } from '../fs/filesystem.ts'
  import ContextMenu from '../lib/ContextMenu.svelte'
  import type { ContextMenuEntry } from '../lib/ContextMenu.svelte'
  import {
    Play,
    Pause,
    Square,
    Move,
    Maximize2,
    RotateCw,
    ZoomIn,
    ZoomOut,
    Crosshair,
  } from '@lucide/svelte'

  let canvasEl: HTMLCanvasElement
  let canvasWrapperEl: HTMLDivElement
  let engine: Engine | null = null
  let editorScene: Scene | null = null
  let rafHandle = 0
  let watcher: ProjectWatcher | null = null

  $effect(() => {
    if (project.folderHandle) {
      if (!watcher) {
        watcher = new ProjectWatcher(project.folderHandle)
        watcher.start(1000)
      } else {
        // Handle folder change
        watcher.stop()
        watcher = new ProjectWatcher(project.folderHandle)
        watcher.start(1000)
      }
    } else if (watcher) {
      watcher.stop()
      watcher = null
    }
  })

  // Periodically update watched files based on the active scene
  $effect(() => {
    if (watcher && editorScene) {
      // Re-evaluate dependencies
      const deps = new Set<{path: string, type: 'script' | 'texture'}>()
      for (const n of editorScene.allNodes) {
        if (n.script) deps.add({ path: n.script, type: 'script' })
        if ((n as any).isSprite && (n as any).texture) deps.add({ path: (n as any).texture, type: 'texture' })
      }
      
      watcher.clear()
      for (const dep of deps) {
        watcher.watch(dep.path, dep.type, () => handleHotReload(dep.path, dep.type))
      }
    }
  })

  // Auto-save scene JSON and selection to IndexedDB whenever they change
  $effect(() => {
    const v = sceneStore.version // react to version changes
    if (editorScene && v > 0) {
      const json = SceneSerializer.serialize(editorScene)
      setEditorState('lastSceneJSON', json)
    }
  })

  $effect(() => {
    const selId = selection.selectedNodeId
    if (selId) {
      setEditorState('lastSelectedNodeId', selId)
    } else {
      setEditorState('lastSelectedNodeId', null)
    }
  })

  // Watch for scene open requests from the Asset Browser
  $effect(() => {
    const path = sceneOpener.pendingPath
    if (!path || !project.folderHandle || !engine) return
    sceneOpener.clear()

    ;(async () => {
      try {
        const json = await readTextFile(project.folderHandle!, path)
        const newScene = SceneSerializer.deserialize(json)
        editorScene = newScene

        // Bind new scene to engine
        engine!.loadScene(editorScene)

        // Re-bind camera
        const cam = editorScene.allNodes.find(n => n instanceof Camera2D) as Camera2D | undefined
        if (cam) engine!.setCamera(cam)

        sceneStore.setScene(editorScene)
        // Also persist as the current session scene
        await setEditorState('lastSceneJSON', json)
        engineConsole.info(`[Scene] Opened: ${path}`)
      } catch (err) {
        engineConsole.error(`Failed to open scene "${path}": ${err}`)
      }
    })()
  })

  async function handleHotReload(path: string, type: 'script' | 'texture') {
    engineConsole.info(`[Hot Reload] Detected change in ${path}`)
    if (type === 'script') {
      if (viewport.playState === 'playing' && editorScene) {
        await loadScriptsForScene(editorScene)
        // Reset scene to apply new script logic
        const jsonStr = SceneSerializer.serialize(editorScene)
        const runtimeScene = SceneSerializer.deserialize(jsonStr)
        engine?.loadScene(runtimeScene)
      }
    } else if (type === 'texture') {
      // Force reload texture
      engine?.reloadTexture(path)
      sceneStore.markDirty()
    }
  }

  onMount(async () => {
    try {
      engine = new Engine({ canvas: canvasEl })
      engine.debugDraw = true // Enable debug rendering in editor

      // Set up asset resolver to read from local File System Access API
      engine.setAssetResolver(async (path: string) => {
        if (!project.folderHandle) return path
        try {
          const parts = path.split('/')
          let dir = project.folderHandle
          for (let i = 0; i < parts.length - 1; i++) {
            dir = await dir.getDirectoryHandle(parts[i])
          }
          const fileHandle = await dir.getFileHandle(parts[parts.length - 1])
          const file = await fileHandle.getFile()
          return URL.createObjectURL(file)
        } catch (e) {
          engineConsole.warn(`Could not resolve local asset: ${path}`)
          return path
        }
      })

      // Try to restore saved scene from IndexedDB, otherwise create a default
      let restoredScene: Scene | null = null
      try {
        const savedJSON = await getEditorState<string>('lastSceneJSON')
        if (savedJSON && project.folderHandle) {
          restoredScene = SceneSerializer.deserialize(savedJSON)
          engineConsole.info('Restored scene from previous session')
        }
      } catch {
        // Failed to restore — will create a fresh scene
      }

      if (restoredScene) {
        editorScene = restoredScene
        // Find and set camera
        const cam = editorScene.allNodes.find(n => n instanceof Camera2D) as Camera2D | undefined
        if (cam) engine.setCamera(cam)
      } else {
        editorScene = new Scene('Default Scene')
        editorScene.background = '#12121e'
        const cam = new Camera2D('MainCamera')
        cam.x = 0
        cam.y = 0
        editorScene.addNode(cam)
        engine.setCamera(cam)
      }

      sceneStore.setScene(editorScene)
      engineConsole.info('BeoEngine initialized — WebGL 2 renderer ready')

      try {
        const lastSelected = await getEditorState<string>('lastSelectedNodeId')
        if (lastSelected && editorScene.findById(lastSelected)) {
          selection.select(lastSelected)
        }
      } catch {
        // ignore
      }

      engine.start()
      engine.pause()
      startEditorLoop()
    } catch (err) {
      engineConsole.error(`Failed to initialize engine: ${String(err)}`)
    }

    // Attach wheel listener as non-passive so preventDefault works
    canvasWrapperEl.addEventListener('wheel', onWheel, { passive: false })
  })

  onDestroy(() => {
    stopEditorLoop()
    engine?.stop()
    engine?.renderer.dispose()
    canvasWrapperEl?.removeEventListener('wheel', onWheel)
  })

  function startEditorLoop() {
    const loop = () => {
      if (engine && editorScene) {
        engine.renderer.render(editorScene)
      }
      rafHandle = requestAnimationFrame(loop)
    }
    rafHandle = requestAnimationFrame(loop)
  }

  function stopEditorLoop() {
    cancelAnimationFrame(rafHandle)
  }

  import { compileTS } from '../scripting/transpiler.ts'
  import { ScriptRegistry } from 'beo'

  async function fetchLocalFileContent(path: string): Promise<string> {
    if (!project.folderHandle) return ''
    const parts = path.split('/')
    let dir = project.folderHandle
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i])
    }
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1])
    const file = await fileHandle.getFile()
    return await file.text()
  }

  async function loadScriptsForScene(scene: Scene) {
    const scriptPaths = new Set<string>()
    for (const n of scene.allNodes) {
      if (n.script) scriptPaths.add(n.script)
    }

    for (const path of scriptPaths) {
      try {
        const tsCode = await fetchLocalFileContent(path)
        const jsCode = compileTS(tsCode)
        console.log("Transpiled jsCode for", path, ":", jsCode)
        const blob = new Blob([jsCode], { type: 'application/javascript' })
        const url = URL.createObjectURL(blob)
        const module = await import(/* @vite-ignore */ url)
        if (module.default) {
          ScriptRegistry.set(path, module.default)
        } else {
          engineConsole.warn(`Script ${path} has no default export class`)
        }
        URL.revokeObjectURL(url)
      } catch (err) {
        engineConsole.error(`Failed to compile script ${path}: ${err}`)
      }
    }
  }

  async function handlePlay() {
    if (!engine || !editorScene) return
    if (viewport.playState === 'paused') {
      engine.resume()
      viewport.play()
      engineConsole.info('Game resumed')
    } else {
      stopEditorLoop()
      
      // Load scripts, then reset the scene to apply them
      await loadScriptsForScene(editorScene)
      const jsonStr = SceneSerializer.serialize(editorScene)
      const runtimeScene = SceneSerializer.deserialize(jsonStr)
      engine.loadScene(runtimeScene)
      
      engine.start()
      viewport.play()
      engineConsole.info('Game started')
    }
  }

  function handlePause() {
    engine?.pause()
    viewport.pause()
    startEditorLoop()
    engineConsole.info('Game paused')
  }

  function handleStop() {
    engine?.stop()
    viewport.stop()
    
    // Restore editor scene
    if (editorScene && engine) {
      engine.loadScene(editorScene)
    }
    
    startEditorLoop()
    engineConsole.info('Game stopped')
  }

  // ── Editor Interaction (Dragging) ──────────────────────────────────────
  import { selection } from '../stores/selection.svelte.ts'
  import { history } from '../stores/history.svelte.ts'
  import { Node2D } from 'beo'

  let isDragging = false
  let draggedNode: Node2D | null = null
  let lastMouse = { x: 0, y: 0 }
  let snapshotTaken = false

  function getSelectedNode2D(): Node2D | null {
    if (!editorScene || !selection.selectedNodeId) return null
    const node = editorScene.findById(selection.selectedNodeId)
    return node instanceof Node2D ? node : null
  }

  function onMouseDown(e: MouseEvent) {
    if (viewport.playState === 'playing') return
    if (e.button !== 0) return

    const node = getSelectedNode2D()
    if (!node) return

    isDragging = true
    draggedNode = node
    lastMouse = { x: e.clientX, y: e.clientY }
    snapshotTaken = false
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging || !draggedNode || !engine) return

    if (!snapshotTaken && editorScene) {
      history.takeSnapshot(editorScene)
      snapshotTaken = true
    }

    const cam = engine.camera
    const zoom = cam ? cam.zoom : 1

    const dx = e.clientX - lastMouse.x
    const dy = e.clientY - lastMouse.y

    if (viewport.gizmoMode === 'move') {
      draggedNode.x += dx / zoom
      draggedNode.y += dy / zoom
      sceneStore.markDirty()
    } else if (viewport.gizmoMode === 'scale') {
      draggedNode.scaleX += dx * 0.01
      draggedNode.scaleY -= dy * 0.01 // drag up to scale up
      sceneStore.markDirty()
    } else if (viewport.gizmoMode === 'rotate') {
      draggedNode.rotation += dx * 0.01
      sceneStore.markDirty()
    }

    lastMouse = { x: e.clientX, y: e.clientY }
  }

  function onMouseUp() {
    isDragging = false
    draggedNode = null
    isPanning = false
  }

  // ── Pan (middle mouse) ────────────────────────────────────────────────
  let isPanning = false
  let panLastMouse = { x: 0, y: 0 }

  function onMiddleDown(e: MouseEvent) {
    if (e.button !== 1) return
    isPanning = true
    panLastMouse = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }

  function onPanMove(e: MouseEvent) {
    if (!isPanning || !engine) return
    const cam = engine.camera
    if (!cam) return
    const zoom = cam.zoom
    const dx = e.clientX - panLastMouse.x
    const dy = e.clientY - panLastMouse.y
    cam.x -= dx / zoom
    cam.y -= dy / zoom
    panLastMouse = { x: e.clientX, y: e.clientY }
  }

  // ── Scroll to zoom ────────────────────────────────────────────────────
  function onWheel(e: WheelEvent) {
    if (viewport.playState === 'playing') return
    e.preventDefault()
    const cam = engine?.camera
    if (!cam) return
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    cam.zoom = Math.max(0.05, Math.min(20, cam.zoom * factor))
  }

  // ── Viewport right-click context menu ────────────────────────────────
  let vpCtxVisible = $state(false)
  let vpCtxX = $state(0)
  let vpCtxY = $state(0)
  let vpCtxItems = $state<ContextMenuEntry[]>([])

  function onViewportRightClick(e: MouseEvent) {
    if (viewport.playState === 'playing') return
    e.preventDefault()
    vpCtxX = e.clientX
    vpCtxY = e.clientY
    vpCtxItems = [
      {
        label: 'Reset Camera',
        icon: Crosshair,
        action: () => {
          const cam = engine?.camera
          if (cam) { cam.x = 0; cam.y = 0; cam.zoom = 1 }
        },
      },
      { separator: true },
      {
        label: 'Zoom In',
        icon: ZoomIn,
        shortcut: 'Scroll ↑',
        action: () => {
          const cam = engine?.camera
          if (cam) cam.zoom = Math.min(20, cam.zoom * 1.25)
        },
      },
      {
        label: 'Zoom Out',
        icon: ZoomOut,
        shortcut: 'Scroll ↓',
        action: () => {
          const cam = engine?.camera
          if (cam) cam.zoom = Math.max(0.05, cam.zoom * 0.8)
        },
      },
    ]
    vpCtxVisible = true
  }
</script>

<ContextMenu
  items={vpCtxItems}
  x={vpCtxX}
  y={vpCtxY}
  visible={vpCtxVisible}
  onclose={() => vpCtxVisible = false}
/>

<div class="viewport-panel">
  <div class="viewport-toolbar">
    <!-- Gizmo tools -->
    <div class="toolbar-group">
      <button
        class="tool-btn"
        class:active={viewport.gizmoMode === 'move'}
        title="Move (W)"
        onclick={() => viewport.setGizmoMode('move')}
      >
        <Move size={14} />
      </button>
      <button
        class="tool-btn"
        class:active={viewport.gizmoMode === 'scale'}
        title="Scale (R)"
        onclick={() => viewport.setGizmoMode('scale')}
      >
        <Maximize2 size={14} />
      </button>
      <button
        class="tool-btn"
        class:active={viewport.gizmoMode === 'rotate'}
        title="Rotate (E)"
        onclick={() => viewport.setGizmoMode('rotate')}
      >
        <RotateCw size={14} />
      </button>
    </div>

    <!-- Play controls (centred) -->
    <div class="play-controls">
      {#if viewport.playState !== 'playing'}
        <button class="play-btn play" title="Play" onclick={handlePlay}>
          <Play size={13} />
        </button>
      {:else}
        <button class="play-btn pause" title="Pause" onclick={handlePause}>
          <Pause size={13} />
        </button>
      {/if}
      <button
        class="play-btn stop"
        title="Stop"
        disabled={viewport.playState === 'stopped'}
        onclick={handleStop}
      >
        <Square size={13} />
      </button>
    </div>

    <!-- Right: zoom level -->
    <div class="toolbar-group right">
      <span class="zoom-label">{Math.round((engine?.camera?.zoom ?? 1) * 100)}%</span>
    </div>
  </div>

  <div
    bind:this={canvasWrapperEl}
    class="canvas-wrapper"
    class:panning={isPanning}
    onmousedown={(e) => { onMouseDown(e); onMiddleDown(e) }}
    onmousemove={(e) => { onMouseMove(e); onPanMove(e) }}
    onmouseup={onMouseUp}
    onmouseleave={onMouseUp}
    oncontextmenu={onViewportRightClick}
    role="application"
  >
    <canvas bind:this={canvasEl} id="viewport-canvas"></canvas>

    {#if viewport.playState === 'playing'}
      <div class="play-indicator" aria-label="Playing">
        <Play size={9} />
        PLAYING
      </div>
    {/if}
  </div>
</div>

<style>
  .viewport-panel {
    display: flex;
    flex-direction: column;
    background: #0d0d14;
    overflow: hidden;
    position: relative;
  }

  .viewport-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    background: var(--panel-header-bg);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    z-index: 1;
  }

  .toolbar-group {
    display: flex;
    gap: 2px;
  }

  .toolbar-group.right {
    margin-left: auto;
  }

  .tool-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--text-muted);
    cursor: pointer;
    padding: 5px 7px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .tool-btn:hover {
    background: var(--hover-bg);
    color: var(--text);
  }

  .tool-btn.active {
    background: var(--accent-subtle);
    border-color: var(--accent-border);
    color: var(--accent);
  }

  .play-controls {
    display: flex;
    gap: 4px;
    margin: 0 auto;
  }

  .play-btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    cursor: pointer;
    padding: 5px 14px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .play-btn:hover:not(:disabled) {
    background: var(--hover-bg);
  }

  .play-btn.play:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.12);
    border-color: rgba(34, 197, 94, 0.35);
    color: #22c55e;
  }

  .play-btn.pause:hover:not(:disabled) {
    background: rgba(251, 191, 36, 0.12);
    border-color: rgba(251, 191, 36, 0.35);
    color: #fbbf24;
  }

  .play-btn.stop:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.35);
    color: #ef4444;
  }

  .play-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .zoom-label {
    font-size: 11px;
    color: var(--text-muted);
    padding: 4px 6px;
    font-variant-numeric: tabular-nums;
    font-family: var(--font-mono);
  }

  .canvas-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    cursor: default;
  }

  .canvas-wrapper.panning {
    cursor: grabbing;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .play-indicator {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.25);
    color: #22c55e;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 3px 10px;
    border-radius: 20px;
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 5px;
  }
</style>
