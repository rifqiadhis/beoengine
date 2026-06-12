<script lang="ts">
  import { scene } from '../stores/scene.svelte.ts'
  import { selection } from '../stores/selection.svelte.ts'
  import { history } from '../stores/history.svelte.ts'
  import { Node2D, Sprite, Camera2D, CollisionBody, type Node } from 'beo'
  import ContextMenu from '../lib/ContextMenu.svelte'
  import type { ContextMenuEntry } from '../lib/ContextMenu.svelte'
  import {
    Plus,
    ChevronDown,
    Box,
    Image,
    Camera,
    Hexagon,
    Grid3x3,
    Volume2,
    Type,
    Play,
    Circle,
    SquareDashed,
    Copy,
    Clipboard,
    Trash2,
    Pencil,
    UserPlus,
  } from '@lucide/svelte'

  type IconComponent = typeof Plus

  const NODE_TYPE_ICONS: Record<string, IconComponent> = {
    Node:          Hexagon,
    Node2D:        Box,
    Sprite:        Image,
    AnimatedSprite: Play,
    Camera2D:      Camera,
    CollisionBody: SquareDashed,
    TileMap:       Grid3x3,
    AudioPlayer:   Volume2,
    Label:         Type,
  }

  interface NodeRow {
    node: Node
    depth: number
  }

  function flattenTree(nodes: Node[], depth = 0): NodeRow[] {
    const result: NodeRow[] = []
    for (const node of nodes) {
      result.push({ node, depth })
      if (node.children.length > 0) {
        result.push(...flattenTree(node.children, depth + 1))
      }
    }
    return result
  }

  let rows = $derived(flattenTree(scene.nodeTree))

  let showAddMenu = $state(false)

  // ── Add Node ─────────────────────────────────────────────────────────────
  function handleAddNode(type: 'Node2D' | 'Sprite' | 'Camera2D' | 'CollisionBody', parentId?: string) {
    if (!scene.activeScene) return
    history.takeSnapshot(scene.activeScene)

    let newNode: Node
    if (type === 'Sprite') newNode = new Sprite('New Sprite')
    else if (type === 'Camera2D') newNode = new Camera2D('New Camera')
    else if (type === 'CollisionBody') newNode = new CollisionBody('New CollisionBody')
    else newNode = new Node2D('New Node2D')

    const pid = parentId ?? selection.selectedNodeId
    const parent = pid ? scene.activeScene.findById(pid) : null

    if (parent) {
      parent.addChild(newNode)
    } else {
      scene.activeScene.addNode(newNode)
    }

    scene.markDirty()
    selection.select(newNode.id)
    showAddMenu = false
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  function deleteNode(nodeId: string) {
    if (!scene.activeScene) return
    const node = scene.activeScene.findById(nodeId)
    if (!node) return
    history.takeSnapshot(scene.activeScene)
    if (node.parent) {
      node.parent.removeChild(node)
    } else {
      scene.activeScene.removeNode(node)
    }
    selection.clear()
    scene.markDirty()
  }

  // ── Copy / Paste ──────────────────────────────────────────────────────────
  let clipboardNodeJSON: any = null

  function copyNode(nodeId: string) {
    if (!scene.activeScene) return
    const node = scene.activeScene.findById(nodeId)
    if (!node) return
    clipboardNodeJSON = node.toJSON()
  }

  function pasteNode(parentId?: string) {
    if (!clipboardNodeJSON || !scene.activeScene) return
    const { SceneSerializer } = window as any
    // Reconstruct from JSON — reuse SceneSerializer internals via re-parse trick
    const { SceneSerializer: SS } = (window as any).BeoEngine ?? {}
    // Fallback: deepclone the JSON and reset ids
    const cloned = deepCloneResetIds(clipboardNodeJSON)
    const { NodeRegistry } = getNodeRegistry()
    const node = instantiateFromJSON(cloned, NodeRegistry)
    if (!node) return
    history.takeSnapshot(scene.activeScene)
    const parent = parentId ? scene.activeScene.findById(parentId) : null
    if (parent) parent.addChild(node)
    else scene.activeScene.addNode(node)
    scene.markDirty()
    selection.select(node.id)
  }

  function getNodeRegistry() {
    const NodeRegistry: Record<string, any> = { Node2D, Sprite, Camera2D, CollisionBody }
    return { NodeRegistry }
  }

  function deepCloneResetIds(json: any): any {
    const clone = JSON.parse(JSON.stringify(json))
    resetIds(clone)
    return clone
  }

  function resetIds(node: any) {
    node.id = crypto.randomUUID()
    if (Array.isArray(node.children)) {
      node.children.forEach(resetIds)
    }
  }

  function instantiateFromJSON(data: any, registry: Record<string, any>): Node | null {
    const NodeClass = registry[data.type]
    if (!NodeClass) return null
    const node = new NodeClass()
    node.fromJSON(data)
    if (Array.isArray(data.children)) {
      for (const childData of data.children) {
        const child = instantiateFromJSON(childData, registry)
        if (child) node.addChild(child)
      }
    }
    return node
  }

  // ── Rename (inline) ───────────────────────────────────────────────────────
  let renamingId = $state<string | null>(null)
  let renameValue = $state('')

  function startRename(nodeId: string) {
    if (!scene.activeScene) return
    const node = scene.activeScene.findById(nodeId)
    if (!node) return
    renamingId = nodeId
    renameValue = node.name
    // Focus the input on next tick
    setTimeout(() => {
      const input = document.getElementById(`rename-input-${nodeId}`)
      if (input) (input as HTMLInputElement).select()
    }, 0)
  }

  function commitRename(nodeId: string) {
    if (!scene.activeScene) return
    const node = scene.activeScene.findById(nodeId)
    if (!node) return
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== node.name) {
      history.takeSnapshot(scene.activeScene)
      node.name = trimmed
      scene.markDirty()
    }
    renamingId = null
  }

  function onRenameKeydown(e: KeyboardEvent, nodeId: string) {
    if (e.key === 'Enter') commitRename(nodeId)
    if (e.key === 'Escape') renamingId = null
  }

  // ── Context Menu ──────────────────────────────────────────────────────────
  let ctxVisible = $state(false)
  let ctxX = $state(0)
  let ctxY = $state(0)
  let ctxNodeId = $state<string | null>(null)

  function buildContextMenu(nodeId: string): ContextMenuEntry[] {
    const hasClipboard = clipboardNodeJSON !== null
    return [
      {
        label: 'Rename',
        icon: Pencil,
        shortcut: 'F2',
        action: () => startRename(nodeId),
      },
      { separator: true },
      {
        label: 'Add Child Node',
        icon: UserPlus,
        action: () => {
          // Show type picker — for now just add Node2D as child
          handleAddNode('Node2D', nodeId)
        },
      },
      { separator: true },
      {
        label: 'Copy',
        icon: Copy,
        shortcut: 'Ctrl+C',
        action: () => copyNode(nodeId),
      },
      {
        label: 'Paste as Child',
        icon: Clipboard,
        shortcut: 'Ctrl+V',
        disabled: !hasClipboard,
        action: () => pasteNode(nodeId),
      },
      { separator: true },
      {
        label: 'Delete',
        icon: Trash2,
        shortcut: 'Del',
        action: () => deleteNode(nodeId),
      },
    ]
  }

  // Background right-click (no node selected)
  function buildBgContextMenu(): ContextMenuEntry[] {
    const hasClipboard = clipboardNodeJSON !== null
    return [
      {
        label: 'Add Node2D',
        icon: Box,
        action: () => handleAddNode('Node2D'),
      },
      {
        label: 'Add Sprite',
        icon: Image,
        action: () => handleAddNode('Sprite'),
      },
      {
        label: 'Add Camera2D',
        icon: Camera,
        action: () => handleAddNode('Camera2D'),
      },
      {
        label: 'Add CollisionBody',
        icon: SquareDashed,
        action: () => handleAddNode('CollisionBody'),
      },
      { separator: true },
      {
        label: 'Paste',
        icon: Clipboard,
        disabled: !hasClipboard,
        action: () => pasteNode(),
      },
    ]
  }

  let ctxItems = $state<ContextMenuEntry[]>([])

  function showContextMenu(e: MouseEvent, nodeId: string | null) {
    e.preventDefault()
    e.stopPropagation()
    ctxX = e.clientX
    ctxY = e.clientY
    ctxNodeId = nodeId
    ctxItems = nodeId ? buildContextMenu(nodeId) : buildBgContextMenu()
    ctxVisible = true
    if (nodeId) selection.select(nodeId)
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    if (document.activeElement?.tagName === 'INPUT') return

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selection.selectedNodeId) deleteNode(selection.selectedNodeId)
    }
    if (e.key === 'F2' && selection.selectedNodeId) {
      startRename(selection.selectedNodeId)
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selection.selectedNodeId) {
      copyNode(selection.selectedNodeId)
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      pasteNode(selection.selectedNodeId ?? undefined)
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<ContextMenu
  items={ctxItems}
  x={ctxX}
  y={ctxY}
  visible={ctxVisible}
  onclose={() => ctxVisible = false}
/>

<aside class="scene-panel" oncontextmenu={(e) => showContextMenu(e, null)}>
  <header class="panel-header">
    <span class="panel-title">Scene</span>
    <div style="position: relative;">
      <button class="icon-btn" title="Add node" aria-label="Add node" onclick={() => showAddMenu = !showAddMenu}>
        <Plus size={14} />
      </button>
      {#if showAddMenu}
        <div class="add-menu">
          <button onclick={() => handleAddNode('Node2D')}><Box size={13} /> Node2D</button>
          <button onclick={() => handleAddNode('Sprite')}><Image size={13} /> Sprite</button>
          <button onclick={() => handleAddNode('Camera2D')}><Camera size={13} /> Camera2D</button>
          <button onclick={() => handleAddNode('CollisionBody')}><SquareDashed size={13} /> CollisionBody</button>
        </div>
      {/if}
    </div>
  </header>

  <div class="node-tree" role="tree">
    {#if !scene.activeScene}
      <p class="empty-state">No scene loaded</p>
    {:else if rows.length === 0}
      <p class="empty-state">Scene is empty</p>
    {:else}
      {#each rows as { node, depth } (node.id)}
        {@const isSelected = selection.selectedNodeId === node.id}
        {@const IconComp = NODE_TYPE_ICONS[node.type] ?? Circle}
        {@const isRenaming = renamingId === node.id}
        <div
          class="node-row"
          class:selected={isSelected}
          style="padding-left: {6 + depth * 16}px"
          role="treeitem"
          aria-selected={isSelected}
          tabindex="0"
          onclick={() => selection.select(node.id)}
          ondblclick={() => startRename(node.id)}
          oncontextmenu={(e) => showContextMenu(e, node.id)}
          onkeydown={(e) => {
            if (e.key === 'Enter') selection.select(node.id)
          }}
        >
          <span class="node-arrow">
            {#if node.children.length > 0}
              <ChevronDown size={11} />
            {:else}
              <span style="width:11px;display:inline-block"></span>
            {/if}
          </span>
          <span class="node-icon">
            <IconComp size={13} />
          </span>

          {#if isRenaming}
            <input
              id="rename-input-{node.id}"
              class="rename-input"
              type="text"
              bind:value={renameValue}
              onblur={() => commitRename(node.id)}
              onkeydown={(e) => onRenameKeydown(e, node.id)}
            />
          {:else}
            <span class="node-name">{node.name}</span>
            <span class="node-type">{node.type}</span>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</aside>

<style>
  .scene-panel {
    display: flex;
    flex-direction: column;
    background: var(--panel-bg);
    border-right: 1px solid var(--border);
    overflow: hidden;
    min-width: 0;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
    background: var(--panel-header-bg);
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 3px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background 0.15s;
  }

  .icon-btn:hover {
    color: var(--text);
    background: var(--hover-bg);
  }

  .add-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--surface2);
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 4px;
    min-width: 130px;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
  }

  .add-menu button {
    background: none;
    border: none;
    color: var(--text);
    padding: 6px 10px;
    font-size: 12px;
    font-family: var(--font-sans);
    text-align: left;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .add-menu button:hover {
    background: var(--accent-subtle);
    color: var(--accent-bright);
  }

  .node-tree {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .node-row {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    cursor: pointer;
    padding-right: 8px;
    border-radius: 4px;
    margin: 0 4px;
    transition: background 0.1s;
    user-select: none;
  }

  .node-row:hover {
    background: var(--hover-bg);
  }

  .node-row.selected {
    background: var(--accent-subtle);
  }

  .node-row.selected .node-name {
    color: var(--accent);
  }

  .node-row.selected .node-icon {
    color: var(--accent);
  }

  .node-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    flex-shrink: 0;
    color: var(--text-muted);
    opacity: 0.5;
  }

  .node-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .node-name {
    font-size: 12.5px;
    color: var(--text);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-type {
    font-size: 10px;
    color: var(--text-muted);
    opacity: 0.5;
    flex-shrink: 0;
  }

  .rename-input {
    flex: 1;
    background: var(--surface2);
    border: 1px solid var(--accent-border);
    color: var(--text);
    font-size: 12.5px;
    font-family: var(--font-sans);
    padding: 1px 6px;
    border-radius: 3px;
    outline: none;
    height: 20px;
    min-width: 0;
  }

  .rename-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb, 99 102 241) / 0.2);
  }

  .empty-state {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    padding: 24px 16px;
    margin: 0;
  }
</style>
