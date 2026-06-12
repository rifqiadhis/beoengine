<script lang="ts">
  import { engineConsole } from '../stores/console.svelte.ts'
  import type { LogEntry } from '../stores/console.svelte.ts'
  import { Info, AlertTriangle, XCircle, Trash2, Copy } from '@lucide/svelte'
  import ContextMenu from '../lib/ContextMenu.svelte'
  import type { ContextMenuEntry } from '../lib/ContextMenu.svelte'

  let logListEl: HTMLElement

  $effect(() => {
    const _logs = engineConsole.logs
    if (logListEl) {
      requestAnimationFrame(() => {
        logListEl.scrollTop = logListEl.scrollHeight
      })
    }
  })

  function formatTime(ts: number): string {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  let warnCount = $derived(engineConsole.logs.filter(l => l.level === 'warn').length)
  let errorCount = $derived(engineConsole.logs.filter(l => l.level === 'error').length)

  // Context menu
  let ctxVisible = $state(false)
  let ctxX = $state(0)
  let ctxY = $state(0)
  let ctxItems = $state<ContextMenuEntry[]>([])

  function onLogRightClick(e: MouseEvent, entry: LogEntry | null) {
    e.preventDefault()
    ctxX = e.clientX
    ctxY = e.clientY
    ctxItems = [
      ...(entry ? [{
        label: 'Copy Message',
        icon: Copy,
        action: () => navigator.clipboard.writeText(entry.message),
      } as ContextMenuEntry] : []),
      ...(entry ? [{ separator: true } as ContextMenuEntry] : []),
      {
        label: 'Clear Console',
        icon: Trash2,
        action: () => engineConsole.clear(),
      },
    ]
    ctxVisible = true
  }
</script>

<ContextMenu
  items={ctxItems}
  x={ctxX}
  y={ctxY}
  visible={ctxVisible}
  onclose={() => ctxVisible = false}
/>

<aside class="console-panel">
  <header class="panel-header">
    <span class="panel-title">Console</span>
    <div class="console-actions">
      {#if warnCount > 0}
        <span class="count warn">
          <AlertTriangle size={11} />
          {warnCount}
        </span>
      {/if}
      {#if errorCount > 0}
        <span class="count error">
          <XCircle size={11} />
          {errorCount}
        </span>
      {/if}
      <button class="icon-btn" title="Clear console" onclick={() => engineConsole.clear()}>
        <Trash2 size={13} />
      </button>
    </div>
  </header>

  <div class="log-list" bind:this={logListEl} role="log" aria-live="polite"
    oncontextmenu={(e) => onLogRightClick(e, null)}
  >
    {#each engineConsole.logs as entry (entry.id)}
      <div class="log-entry {entry.level}" role="listitem"
        oncontextmenu={(e) => { e.stopPropagation(); onLogRightClick(e, entry) }}
      >
        <span class="log-icon">
          {#if entry.level === 'info'}
            <Info size={11} />
          {:else if entry.level === 'warn'}
            <AlertTriangle size={11} />
          {:else}
            <XCircle size={11} />
          {/if}
        </span>
        <span class="log-time">{formatTime(entry.timestamp)}</span>
        <span class="log-msg">{entry.message}</span>
        {#if entry.nodeName}
          <span class="log-node">in "{entry.nodeName}"</span>
        {/if}
      </div>
    {/each}

    {#if engineConsole.logs.length === 0}
      <p class="empty-state">No logs yet</p>
    {/if}
  </div>
</aside>

<style>
  .console-panel {
    display: flex;
    flex-direction: column;
    background: var(--panel-bg);
    border-top: 1px solid var(--border);
    overflow: hidden;
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

  .console-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .count {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    padding: 1px 5px;
    border-radius: 3px;
  }

  .count.warn {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.08);
  }

  .count.error {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
  }

  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 3px;
    border-radius: 3px;
    color: var(--text-muted);
    opacity: 0.6;
    transition: opacity 0.15s, color 0.15s;
  }

  .icon-btn:hover {
    opacity: 1;
    color: #ef4444;
  }

  .log-list {
    flex: 1;
    overflow-y: auto;
    font-size: 12px;
    font-family: var(--font-mono);
  }

  .log-entry {
    display: flex;
    align-items: baseline;
    gap: 7px;
    padding: 3px 10px;
    line-height: 1.5;
  }

  .log-entry:hover {
    background: var(--hover-bg);
  }

  .log-entry.info { color: var(--text); }
  .log-entry.warn {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.03);
  }
  .log-entry.error {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }

  .log-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-top: 2px;
    opacity: 0.7;
  }

  .log-time {
    color: var(--text-muted);
    font-size: 10px;
    flex-shrink: 0;
    opacity: 0.5;
  }

  .log-msg {
    flex: 1;
    word-break: break-word;
  }

  .log-node {
    color: var(--text-muted);
    font-size: 10px;
    opacity: 0.5;
    flex-shrink: 0;
  }

  .empty-state {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    padding: 24px;
    margin: 0;
  }
</style>
