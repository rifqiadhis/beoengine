/**
 * BeoEngine — Engine
 * Main entry point. Owns the game loop, and all sub-systems.
 *
 * Usage:
 *   const engine = new Engine({ canvas })
 *   engine.loadScene(myScene)
 *   engine.start()
 */

import { Scene } from './Scene.ts'
import { EventEmitter } from './EventEmitter.ts'
import { WebGLRenderer } from '../renderer/WebGLRenderer.ts'
import { Input, InputManager } from '../input/Input.ts'
import { AssetManager } from '../assets/AssetManager.ts'
import { AudioManager } from '../audio/AudioManager.ts'
import type { Camera2D } from '../nodes/Camera2D.ts'

const FIXED_TIMESTEP = 1 / 60 // 60 Hz physics

type EngineEvents = {
  start: undefined
  stop: undefined
  pause: undefined
  resume: undefined
  sceneLoaded: Scene
}

export interface EngineOptions {
  canvas: HTMLCanvasElement
}

export class Engine extends EventEmitter<EngineEvents> {
  readonly canvas: HTMLCanvasElement
  readonly renderer: WebGLRenderer
  readonly input: InputManager
  readonly assets: AssetManager
  readonly audio: AudioManager

  private _scene: Scene | null = null
  private _running = false
  private _paused = false
  private _rafHandle = 0
  private _lastTime = 0
  private _accumulator = 0

  constructor(options: EngineOptions) {
    super()
    this.canvas = options.canvas
    this.renderer = new WebGLRenderer(options.canvas)
    this.input = Input
    this.assets = new AssetManager()
    this.audio = new AudioManager()
  }

  // ── Scene ──────────────────────────────────────────────────────────────
  get scene(): Scene | null { return this._scene }

  loadScene(scene: Scene): this {
    if (this._scene) {
      // Destroy old scene nodes
      for (const root of this._scene.roots) {
        root.walk((n) => n.onDestroy())
      }
    }
    this._scene = scene
    this.renderer.setBackground(scene.background)
    this.emit('sceneLoaded', scene)
    return this
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  start(): void {
    if (this._running && !this._paused) return
    this._running = true
    this._paused = false
    this._lastTime = performance.now()
    this._accumulator = 0
    this.input.attach()
    this._tick(this._lastTime)
    this.emit('start', undefined)
  }

  stop(): void {
    if (!this._running) return
    this._running = false
    cancelAnimationFrame(this._rafHandle)
    this.input.detach()
    this.emit('stop', undefined)
  }

  pause(): void {
    if (!this._running || this._paused) return
    this._paused = true
    cancelAnimationFrame(this._rafHandle)
    this.emit('pause', undefined)
  }

  resume(): void {
    if (!this._running || !this._paused) return
    this._paused = false
    this._lastTime = performance.now()
    this._tick(this._lastTime)
    this.emit('resume', undefined)
  }

  get isRunning(): boolean { return this._running && !this._paused }

  get debugDraw(): boolean { return this.renderer.debugDraw }
  set debugDraw(val: boolean) { this.renderer.debugDraw = val }

  // ── Camera helper ──────────────────────────────────────────────────────
  /** Set the active camera for rendering */
  setCamera(camera: Camera2D): void {
    this.renderer.setCamera(camera)
  }

  /** Get the active camera (useful for editor pan/zoom) */
  get camera(): Camera2D | null {
    return this.renderer.camera
  }

  // ── Asset Resolver ─────────────────────────────────────────────────────
  /** 
   * Provide a custom resolver to map virtual asset paths to actual URLs 
   * (e.g., File System Access API Blob URLs).
   */
  setAssetResolver(resolver: (path: string) => Promise<string>): void {
    this.renderer.setAssetResolver(resolver)
  }

  /** Force re-fetch of a texture, useful for hot reloading */
  reloadTexture(path: string): void {
    this.renderer.textures.uncache(path)
  }

  // ── Game loop ──────────────────────────────────────────────────────────
  private _tick = (timestamp: number): void => {
    if (!this._running || this._paused) return
    this._rafHandle = requestAnimationFrame(this._tick)

    const rawDelta = (timestamp - this._lastTime) / 1000
    this._lastTime = timestamp
    // Clamp delta to avoid spiral of death on tab-switch
    const delta = Math.min(rawDelta, 0.1)

    // Fixed timestep accumulator
    this._accumulator += delta
    while (this._accumulator >= FIXED_TIMESTEP) {
      this._scene?.update(FIXED_TIMESTEP)
      this._accumulator -= FIXED_TIMESTEP
    }

    // Render at display refresh rate
    if (this._scene) {
      this.renderer.render(this._scene)
    }

    // Flush input just-pressed/released state
    this.input.flush()
  }
}
