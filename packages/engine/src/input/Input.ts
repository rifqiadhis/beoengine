/**
 * BeoEngine — Input
 * Keyboard and mouse input with per-frame just-pressed / just-released tracking.
 */

export interface MouseState {
  /** Mouse position in canvas (CSS pixels) */
  x: number
  y: number
  /** isPressed(0) = left, isPressed(1) = middle, isPressed(2) = right */
  isPressed(button: number): boolean
}

export class InputManager {
  private held     = new Set<string>()
  private justDown = new Set<string>()
  private justUp   = new Set<string>()

  private mouseX = 0
  private mouseY = 0
  private mouseHeld    = new Set<number>()
  private mouseJustDown = new Set<number>()
  private mouseJustUp   = new Set<number>()

  readonly mouse: MouseState = {
    get x() { return (this as unknown as Input).mouseX },
    get y() { return (this as unknown as Input).mouseY },
    isPressed: (button: number) => this.mouseHeld.has(button),
  }

  // ── Attach / detach ────────────────────────────────────────────────────
  attach(): void {
    window.addEventListener('keydown',   this._onKeyDown,   { passive: true })
    window.addEventListener('keyup',     this._onKeyUp,     { passive: true })
    window.addEventListener('mousemove', this._onMouseMove, { passive: true })
    window.addEventListener('mousedown', this._onMouseDown, { passive: true })
    window.addEventListener('mouseup',   this._onMouseUp,   { passive: true })
  }

  detach(): void {
    window.removeEventListener('keydown',   this._onKeyDown)
    window.removeEventListener('keyup',     this._onKeyUp)
    window.removeEventListener('mousemove', this._onMouseMove)
    window.removeEventListener('mousedown', this._onMouseDown)
    window.removeEventListener('mouseup',   this._onMouseUp)
    this.held.clear()
    this.justDown.clear()
    this.justUp.clear()
    this.mouseHeld.clear()
    this.mouseJustDown.clear()
    this.mouseJustUp.clear()
  }

  // ── Keyboard API ───────────────────────────────────────────────────────
  /** True while a key is held down */
  isPressed(key: string): boolean {
    return this.held.has(key)
  }

  /** True only in the frame the key was first pressed */
  isJustPressed(key: string): boolean {
    return this.justDown.has(key)
  }

  /** True only in the frame the key was released */
  isJustReleased(key: string): boolean {
    return this.justUp.has(key)
  }

  // ── Called at end of each frame ────────────────────────────────────────
  flush(): void {
    this.justDown.clear()
    this.justUp.clear()
    this.mouseJustDown.clear()
    this.mouseJustUp.clear()
  }

  // ── Handlers ───────────────────────────────────────────────────────────
  private _onKeyDown = (e: KeyboardEvent): void => {
    if (!this.held.has(e.key)) {
      this.justDown.add(e.key)
    }
    this.held.add(e.key)
  }

  private _onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.key)
    this.justUp.add(e.key)
  }

  private _onMouseMove = (e: MouseEvent): void => {
    this.mouseX = e.clientX
    this.mouseY = e.clientY
  }

  private _onMouseDown = (e: MouseEvent): void => {
    if (!this.mouseHeld.has(e.button)) {
      this.mouseJustDown.add(e.button)
    }
    this.mouseHeld.add(e.button)
  }

  private _onMouseUp = (e: MouseEvent): void => {
    this.mouseHeld.delete(e.button)
    this.mouseJustUp.add(e.button)
  }
}

export const Input = new InputManager()
