<script lang="ts">
  import { onMount } from 'svelte'
  import ScenePanel    from './panels/ScenePanel.svelte'
  import Viewport      from './panels/Viewport.svelte'
  import Inspector     from './panels/Inspector.svelte'
  import AssetBrowser  from './panels/AssetBrowser.svelte'
  import ConsolePanel  from './panels/Console.svelte'
  import Splitter      from './lib/Splitter.svelte'
  import { project }   from './stores/project.svelte.ts'
  import { scene }     from './stores/scene.svelte.ts'
  import { history }   from './stores/history.svelte.ts'
  import { SceneSerializer } from 'beo'
  import { pickProjectFolder, writeTextFile } from './fs/filesystem.ts'
  import { exportProject } from './export/exporter.ts'
  import { engineConsole } from './stores/console.svelte.ts'
  import {
    Diamond,
    FilePlus,
    FolderOpen,
    Save,
    Download,
    Undo2,
    Redo2,
    HelpCircle,
    LayoutPanelLeft,
    RotateCcw,
  } from '@lucide/svelte'

  const LAYOUT_VARS: Record<string, string> = {
    '--scene-panel-w':   '220px',
    '--inspector-w':     '240px',
    '--bottom-panel-h':  '180px',
    '--asset-browser-w': '260px',
  }

  function resetLayout() {
    for (const [varName, defaultVal] of Object.entries(LAYOUT_VARS)) {
      document.documentElement.style.setProperty(varName, defaultVal)
      localStorage.removeItem(`beo-layout:${varName}`)
    }
  }

  onMount(async () => {
    await project.loadRecent()
  })

  async function newProject() {
    const handle = await pickProjectFolder()
    if (handle) await project.openProject(handle)
  }

  async function openProject() {
    const handle = await pickProjectFolder()
    if (handle) await project.openProject(handle)
  }

  async function saveScene() {
    if (!project.folderHandle || !scene.activeScene) return
    const json = SceneSerializer.serialize(scene.activeScene)
    // For now, save to 'scenes/main.beo'
    await writeTextFile(project.folderHandle, `scenes/${scene.activeScene.name}.beo`, json)
    scene.markSaved()
  }

  let exporting = $state(false)

  async function exportGame() {
    if (!project.folderHandle || !scene.activeScene) return
    if (exporting) return
    exporting = true
    try {
      await exportProject({
        scene: scene.activeScene,
        folderHandle: project.folderHandle,
        projectName: project.projectName || 'my-game',
      })
    } catch (err) {
      engineConsole.error(`Export failed: ${err}`)
      alert(`Export failed: ${err}`)
    } finally {
      exporting = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveScene()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) history.redo()
      else history.undo()
    }
  }

  function suppressContextMenu(e: MouseEvent) {
    const tag = (e.target as HTMLElement).tagName
    // Allow native menu on text inputs so cut/copy/paste still works
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    e.preventDefault()
  }
</script>

<svelte:window onkeydown={handleKeydown} oncontextmenu={suppressContextMenu} />

<svelte:head>
  <title>BeoEngine{project.projectName ? ` — ${project.projectName}` : ''}</title>
  <meta name="description" content="BeoEngine — web-based 2D game engine" />
</svelte:head>

<div class="editor-root" id="editor-root">

  <!-- ── MenuBar ─────────────────────────────────────────────────── -->
  <div class="menubar" role="menubar" aria-label="Main menu">
    <div class="menubar-logo" aria-label="BeoEngine">
      <span class="logo-icon"><Diamond size={16} strokeWidth={1.5} /></span>
      <span class="logo-text">BeoEngine</span>
    </div>

    <div class="menubar-menus">
      <div class="menu-group" role="none">
        <button class="menu-item" role="menuitem">File</button>
        <div class="dropdown" role="menu">
          <button class="dropdown-item" role="menuitem" onclick={newProject}>
            <FilePlus size={13} /> New Project…
          </button>
          <button class="dropdown-item" role="menuitem" onclick={openProject}>
            <FolderOpen size={13} /> Open Project…
          </button>
          <hr class="dropdown-sep" />
          <button class="dropdown-item" role="menuitem" disabled={!project.folderHandle || !scene.activeScene} onclick={saveScene}>
            <Save size={13} /> Save Scene
          </button>
          <button class="dropdown-item" role="menuitem" disabled={!project.folderHandle || !scene.activeScene || exporting} onclick={exportGame}>
            <Download size={13} /> {exporting ? 'Exporting…' : 'Export…'}
          </button>
        </div>
      </div>

      <div class="menu-group" role="none">
        <button class="menu-item" role="menuitem">Edit</button>
        <div class="dropdown" role="menu">
          <button class="dropdown-item" role="menuitem" disabled={!history.canUndo} onclick={() => history.undo()}>
            <Undo2 size={13} /> Undo
          </button>
          <button class="dropdown-item" role="menuitem" disabled={!history.canRedo} onclick={() => history.redo()}>
            <Redo2 size={13} /> Redo
          </button>
        </div>
      </div>

      <div class="menu-group" role="none">
        <button class="menu-item" role="menuitem">Scene</button>
        <div class="dropdown" role="menu">
          <button class="dropdown-item" role="menuitem" disabled>Add Node</button>
        </div>
      </div>

      <div class="menu-group" role="none">
        <button class="menu-item" role="menuitem">View</button>
        <div class="dropdown" role="menu">
          <button class="dropdown-item" role="menuitem" onclick={resetLayout}>
            <RotateCcw size={13} /> Reset Layout
          </button>
        </div>
      </div>

      <div class="menu-group" role="none">
        <button class="menu-item" role="menuitem">Help</button>
        <div class="dropdown" role="menu">
          <button class="dropdown-item" role="menuitem">
            <HelpCircle size={13} /> Documentation
          </button>
          <button class="dropdown-item" role="menuitem">
            <Diamond size={13} /> About BeoEngine
          </button>
        </div>
      </div>
    </div>

    <div class="menubar-right">
      {#if project.projectName}
        <span class="project-badge">{project.projectName}</span>
      {:else}
        <span class="no-project-badge">No Project</span>
      {/if}
    </div>
  </div>

  <!-- ── Main workspace ─────────────────────────────────────────── -->
  <div class="workspace">

    <!-- Left: Scene Panel -->
    <div class="col-left">
      <ScenePanel />
    </div>

    <Splitter direction="horizontal" cssVar="--scene-panel-w" min={150} max={500} />

    <!-- Centre: Viewport + Bottom panels -->
    <div class="col-centre">
      <div class="row-top">
        <Viewport />
      </div>
      <Splitter direction="vertical" cssVar="--bottom-panel-h" min={80} max={600} invert />
      <div class="row-bottom">
        <AssetBrowser />
        <Splitter direction="horizontal" cssVar="--asset-browser-w" min={120} max={900} />
        <ConsolePanel />
      </div>
    </div>

    <Splitter direction="horizontal" cssVar="--inspector-w" min={180} max={600} invert />

    <!-- Right: Inspector -->
    <div class="col-right">
      <Inspector />
    </div>

  </div>

</div>

<style>
  .editor-root {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--bg);
  }

  /* ── MenuBar ─────────────────────────────────────────────────────── */
  .menubar {
    height: var(--menubar-h);
    background: var(--menubar-bg);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
    z-index: 100;
    user-select: none;
  }

  .menubar-logo {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 16px;
    border-right: 1px solid var(--border);
    height: 100%;
  }

  .logo-icon {
    font-size: 18px;
    color: var(--accent);
    line-height: 1;
  }

  .logo-text {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-bright);
  }

  .menubar-menus {
    display: flex;
    align-items: stretch;
    height: 100%;
    gap: 0;
  }

  .menu-group {
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
  }

  .menu-item {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 12.5px;
    font-family: var(--font-sans);
    padding: 0 12px;
    height: 100%;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
  }

  .menu-item:hover {
    background: var(--hover-bg);
    color: var(--text);
  }

  .menu-group:hover .dropdown {
    display: flex;
    flex-direction: column;
  }

  .dropdown {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 180px;
    background: var(--surface2);
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 4px;
    z-index: 200;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .dropdown-item {
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    font-size: 12.5px;
    font-family: var(--font-sans);
    padding: 6px 10px;
    border-radius: 4px;
    text-align: left;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.1s;
  }

  .dropdown-item:hover:not(:disabled) {
    background: var(--accent-subtle);
    color: var(--accent-bright);
  }

  .dropdown-item:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .dropdown-sep {
    border: none;
    border-top: 1px solid var(--border);
    margin: 4px 0;
  }

  .menubar-right {
    margin-left: auto;
    padding: 0 16px;
    display: flex;
    align-items: center;
  }

  .project-badge {
    font-size: 11px;
    color: var(--accent);
    background: var(--accent-subtle);
    border: 1px solid var(--accent-border);
    padding: 2px 10px;
    border-radius: 20px;
    font-weight: 500;
  }

  .no-project-badge {
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.5;
  }

  /* ── Workspace layout ────────────────────────────────────────────── */
  .workspace {
    flex: 1;
    display: flex;
    flex-direction: row;
    min-height: 0;
    overflow: hidden;
  }

  .col-left {
    width: var(--scene-panel-w);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .col-right {
    width: var(--inspector-w);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .col-centre {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .row-top {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .row-bottom {
    display: flex;
    flex-direction: row;
    height: var(--bottom-panel-h);
    flex-shrink: 0;
    overflow: hidden;
  }

  /* Asset Browser takes a fixed width, Console takes the rest */
  .row-bottom :global(.asset-browser) {
    width: var(--asset-browser-w);
    flex-shrink: 0;
  }

  .row-bottom :global(.console-panel) {
    flex: 1;
    min-width: 0;
  }

  .col-left :global(.scene-panel),
  .col-right :global(.inspector-panel) {
    flex: 1;
  }

  .row-top :global(.viewport-panel) {
    flex: 1;
  }
</style>
