/**
 * BeoEngine — Sprite
 * Renders a texture at the node's world-space position.
 */

import { Node2D } from './Node2D.ts'

export class Sprite extends Node2D {
  /** Path to the texture asset (relative to project root) */
  texture: string = ''
  /** Render width in pixels. Defaults to texture natural width if 0 */
  width: number = 0
  /** Render height in pixels. Defaults to texture natural height if 0 */
  height: number = 0
  /** 0 = transparent, 1 = fully opaque */
  opacity: number = 1
  /** Horizontal flip */
  flipX: boolean = false
  /** Vertical flip */
  flipY: boolean = false
  /** Tint colour (CSS hex). '' = no tint */
  tint: string = ''

  get isSprite(): boolean { return true }

  constructor(name?: string, texture?: string) {
    super(name)
    if (texture) this.texture = texture
  }

  // ── Serialisation ──────────────────────────────────────────────────────
  override toJSON(): any {
    const json = super.toJSON()
    json.properties = {
      ...json.properties,
      texture: this.texture,
      width: this.width,
      height: this.height,
      opacity: this.opacity,
      flipX: this.flipX,
      flipY: this.flipY,
      tint: this.tint,
    }
    return json
  }

  override fromJSON(data: any): this {
    super.fromJSON(data)
    if (data.properties) {
      if (data.properties.texture !== undefined) this.texture = data.properties.texture
      if (data.properties.width !== undefined) this.width = data.properties.width
      if (data.properties.height !== undefined) this.height = data.properties.height
      if (data.properties.opacity !== undefined) this.opacity = data.properties.opacity
      if (data.properties.flipX !== undefined) this.flipX = data.properties.flipX
      if (data.properties.flipY !== undefined) this.flipY = data.properties.flipY
      if (data.properties.tint !== undefined) this.tint = data.properties.tint
    }
    return this
  }
}
