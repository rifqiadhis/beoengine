<script lang="ts">
  /**
   * Reusable floating context menu.
   * Usage: bind items and position, show/hide via `visible`.
   */

  export interface ContextMenuItem {
    label: string;
    icon?: any; // Lucide icon component
    shortcut?: string;
    disabled?: boolean;
    separator?: false;
    action: () => void;
  }

  export interface ContextMenuSeparator {
    separator: true;
  }

  export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

  interface Props {
    items: ContextMenuEntry[];
    x: number;
    y: number;
    visible: boolean;
    onclose: () => void;
  }

  let { items, x, y, visible, onclose }: Props = $props();

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
  }

  function handleItemClick(item: ContextMenuItem) {
    if (item.disabled) return;
    item.action();
    onclose();
  }
</script>

{#if visible}
  <!-- Backdrop to catch outside clicks -->
  <div
    class="ctx-backdrop"
    role="presentation"
    onclick={onclose}
    onkeydown={handleKey}
  ></div>

  <div class="ctx-menu" style="left: {x}px; top: {y}px" role="menu">
    {#each items as entry}
      {#if (entry as ContextMenuSeparator).separator}
        <div class="ctx-sep" role="separator"></div>
      {:else}
        {@const item = entry as ContextMenuItem}
        <button
          class="ctx-item"
          class:disabled={item.disabled}
          role="menuitem"
          disabled={item.disabled}
          onclick={() => handleItemClick(item)}
        >
          {#if item.icon}
            <span class="ctx-icon"><item.icon size={13} /></span>
          {/if}
          <span class="ctx-label">{item.label}</span>
          {#if item.shortcut}
            <span class="ctx-shortcut">{item.shortcut}</span>
          {/if}
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .ctx-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
  }

  .ctx-menu {
    position: fixed;
    z-index: 1000;
    background: var(--surface2);
    border: 1px solid var(--border-strong);
    border-radius: 7px;
    padding: 4px;
    min-width: 170px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.5),
      0 2px 8px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    gap: 1px;
    animation: ctx-in 0.08s ease;
  }

  @keyframes ctx-in {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .ctx-sep {
    height: 1px;
    background: var(--border);
    margin: 3px 4px;
  }

  .ctx-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border: none;
    background: none;
    color: var(--text);
    font-size: 12.5px;
    font-family: var(--font-sans);
    text-align: left;
    border-radius: 5px;
    cursor: pointer;
    width: 100%;
    transition:
      background 0.1s,
      color 0.1s;
  }

  .ctx-item:hover:not(.disabled) {
    background: var(--accent-subtle);
    color: var(--accent-bright);
  }

  .ctx-item.disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .ctx-icon {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    flex-shrink: 0;
    width: 16px;
  }

  .ctx-item:hover:not(.disabled) .ctx-icon {
    color: var(--accent);
  }

  .ctx-label {
    flex: 1;
  }

  .ctx-shortcut {
    font-size: 10.5px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }
</style>
