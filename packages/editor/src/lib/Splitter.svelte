<script lang="ts">
  /**
   * Draggable splitter handle.
   * Place between two flex/grid siblings to let the user resize them.
   *
   * direction='horizontal' → drags left/right, resizes columns
   * direction='vertical'   → drags up/down, resizes rows
   *
   * It works by reading/writing CSS custom properties on the parent element.
   * Pass `cssVar` = the name of the CSS var to update (e.g. '--scene-panel-w').
   */

  interface Props {
    direction?: 'horizontal' | 'vertical'
    cssVar: string
    /** Which element to set the var on. Defaults to document.documentElement */
    target?: HTMLElement | null
    min?: number
    max?: number
    /** Invert delta direction (e.g. bottom panel grows when you drag up) */
    invert?: boolean
  }

  let {
    direction = 'horizontal',
    cssVar,
    target = null,
    min = 120,
    max = 800,
    invert = false,
  }: Props = $props()

  let dragging = $state(false)

  // Restore saved size from localStorage on mount
  $effect(() => {
    const saved = localStorage.getItem(`beo-layout:${cssVar}`)
    if (saved !== null) {
      const px = parseFloat(saved)
      if (!isNaN(px)) {
        getTarget().style.setProperty(cssVar, `${px}px`)
      }
    }
  })

  function getTarget(): HTMLElement {
    return target ?? document.documentElement
  }

  function getCurrentPx(): number {
    const raw = getComputedStyle(getTarget()).getPropertyValue(cssVar).trim()
    return parseFloat(raw) || 0
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault()
    dragging = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return
    let delta = direction === 'horizontal' ? e.movementX : e.movementY
    if (invert) delta = -delta
    const current = getCurrentPx()
    const next = Math.max(min, Math.min(max, current + delta))
    getTarget().style.setProperty(cssVar, `${next}px`)
    // Persist for next session
    localStorage.setItem(`beo-layout:${cssVar}`, String(next))
  }

  function onPointerUp(e: PointerEvent) {
    dragging = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }
</script>

<div
  class="splitter {direction}"
  class:dragging
  role="separator"
  aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
></div>

<style>
  .splitter {
    flex-shrink: 0;
    background: transparent;
    transition: background 0.15s;
    position: relative;
    z-index: 10;
  }

  /* Widen the hit area beyond the visible 1px border */
  .splitter::after {
    content: '';
    position: absolute;
    background: transparent;
    transition: background 0.15s;
  }

  /* ── Horizontal (left/right resize) ── */
  .splitter.horizontal {
    width: 1px;
    cursor: col-resize;
    background: var(--border);
  }

  .splitter.horizontal::after {
    top: 0;
    bottom: 0;
    left: -3px;
    right: -3px;
  }

  .splitter.horizontal:hover,
  .splitter.horizontal.dragging {
    background: var(--accent);
  }

  /* ── Vertical (top/bottom resize) ── */
  .splitter.vertical {
    height: 1px;
    cursor: row-resize;
    background: var(--border);
  }

  .splitter.vertical::after {
    left: 0;
    right: 0;
    top: -3px;
    bottom: -3px;
  }

  .splitter.vertical:hover,
  .splitter.vertical.dragging {
    background: var(--accent);
  }
</style>
