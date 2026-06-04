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

  constructor(name?: string, texture?: string) {
    super(name)
    if (texture) this.texture = texture
  }
}
