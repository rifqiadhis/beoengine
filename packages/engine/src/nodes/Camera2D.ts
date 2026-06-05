/**
 * BeoEngine — Camera2D
 * A 2D camera with pan, zoom, and smooth follow.
 */

import { Node2D } from './Node2D.ts'
import type { Node } from '../core/Node.ts'

export interface FollowOptions {
  /** Lerp factor 0–1. 1 = instant snap, 0.1 = smooth. Default 1 */
  lerp?: number
  /** Pixel offset from the target's position */
  offsetX?: number
  offsetY?: number
}

export class Camera2D extends Node2D {
  zoom: number = 1

  private _followTarget: Node2D | null = null
  private _followLerp: number = 1
  private _followOffsetX: number = 0
  private _followOffsetY: number = 0

  // ── Follow API ─────────────────────────────────────────────────────────
  follow(target: Node2D | null, options: FollowOptions = {}): this {
    this._followTarget = target
    this._followLerp = options.lerp ?? 1
    this._followOffsetX = options.offsetX ?? 0
    this._followOffsetY = options.offsetY ?? 0
    return this
  }

  onUpdate(_delta: number): void {
    if (!this._followTarget) return
    const targetX = this._followTarget.worldX + this._followOffsetX
    const targetY = this._followTarget.worldY + this._followOffsetY
    const t = this._followLerp
    this.x += (targetX - this.x) * t
    this.y += (targetY - this.y) * t
  }

  // ── View matrix (column-major for WebGL) ───────────────────────────────
  /**
   * Returns a 3×3 view matrix flattening to a Float32Array for use
   * as a uniform in shaders.
   *
   * Formula: translate(-cam.x, -cam.y), then scale(zoom, zoom)
   */
  getViewMatrix(canvasWidth: number, canvasHeight: number): Float32Array {
    const z = this.zoom
    const tx = -this.x * z + canvasWidth / 2
    const ty = -this.y * z + canvasHeight / 2

    // Column-major 3×3 used as mat3 in GLSL
    return new Float32Array([
      z,  0,  0,
      0,  z,  0,
      tx, ty, 1,
    ])
  }

  // ── Serialisation ──────────────────────────────────────────────────────
  override toJSON(): any {
    const json = super.toJSON()
    json.properties = {
      ...json.properties,
      zoom: this.zoom,
    }
    return json
  }

  override fromJSON(data: any): this {
    super.fromJSON(data)
    if (data.properties) {
      if (data.properties.zoom !== undefined) this.zoom = data.properties.zoom
    }
    return this
  }
}
