<script lang="ts">
  import { scene } from '../stores/scene.svelte.ts'
  import { selection } from '../stores/selection.svelte.ts'
  import type { Node } from 'beo'
  import {
    Plus,
    ChevronRight,
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
</script>

<aside class="scene-panel">
  <header class="panel-header">
    <span class="panel-title">Scene</span>
    <button class="icon-btn" title="Add node" aria-label="Add node">
      <Plus size={14} />
    </button>
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
        <div
          class="node-row"
          class:selected={isSelected}
          style="padding-left: {6 + depth * 16}px"
          role="treeitem"
          aria-selected={isSelected}
          tabindex="0"
          onclick={() => selection.select(node.id)}
          onkeydown={(e) => e.key === 'Enter' && selection.select(node.id)}
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
          <span class="node-name">{node.name}</span>
          <span class="node-type">{node.type}</span>
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

  .empty-state {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    padding: 24px 16px;
    margin: 0;
  }
</style>
