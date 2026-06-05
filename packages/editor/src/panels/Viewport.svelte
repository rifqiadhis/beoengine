<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Engine, Scene, Camera2D } from 'beo'
  import { viewport } from '../stores/viewport.svelte.ts'
  import { scene as sceneStore } from '../stores/scene.svelte.ts'
  import { engineConsole } from '../stores/console.svelte.ts'
  import { project } from '../stores/project.svelte.ts'
  import {
    Play,
    Pause,
    Square,
    Move,
    Maximize2,
    RotateCw,
  } from '@lucide/svelte'

  let canvasEl: HTMLCanvasElement
  let engine: Engine | null = null
  let editorScene: Scene | null = null
  let rafHandle = 0

  onMount(() => {
    try {
      engine = new Engine({ canvas: canvasEl })

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

      editorScene = new Scene('Default Scene')
      editorScene.background = '#12121e'

      const cam = new Camera2D('MainCamera')
      cam.x = 0
      cam.y = 0
      editorScene.addNode(cam)
      engine.setCamera(cam)

      sceneStore.setScene(editorScene)
      engineConsole.info('BeoEngine initialized — WebGL 2 renderer ready')

      engine.start()
      engine.pause()
      startEditorLoop()
    } catch (err) {
      engineConsole.error(`Failed to initialize engine: ${String(err)}`)
    }
  })

  onDestroy(() => {
    stopEditorLoop()
    engine?.stop()
    engine?.renderer.dispose()
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

  function handlePlay() {
    if (!engine) return
    if (viewport.playState === 'paused') {
      engine.resume()
      viewport.play()
      engineConsole.info('Game resumed')
    } else {
      stopEditorLoop()
      engine.resume()
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
    engine?.pause()
    viewport.stop()
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
  }
</script>

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

    <!-- Right: zoom -->
    <div class="toolbar-group right">
      <span class="zoom-label">{Math.round(viewport.zoom * 100)}%</span>
    </div>
  </div>

  <div
    class="canvas-wrapper"
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    onmouseleave={onMouseUp}
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
