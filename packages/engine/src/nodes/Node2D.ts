/**
 * BeoEngine — Node2D
 * Base 2D node with position, rotation, scale and world-space transforms.
 */

import { Node } from '../core/Node.ts'

export class Node2D extends Node {
  x: number = 0
  y: number = 0
  rotation: number = 0   // radians
  scaleX: number = 1
  scaleY: number = 1
  zIndex: number = 0

  // ── World-space transform ──────────────────────────────────────────────
  /**
   * Returns the world-space position of this node by walking up
   * through parent Node2D transforms.
   */
  get worldX(): number {
    const p = this.parent
    if (p instanceof Node2D) {
      const cos = Math.cos(p.worldRotation)
      const sin = Math.sin(p.worldRotation)
      const wx = p.worldX
      const wy = p.worldY
      const sx = p.worldScaleX
      const sy = p.worldScaleY
      return wx + (this.x * sx) * cos - (this.y * sy) * sin
    }
    return this.x
  }

  get worldY(): number {
    const p = this.parent
    if (p instanceof Node2D) {
      const cos = Math.cos(p.worldRotation)
      const sin = Math.sin(p.worldRotation)
      const wx = p.worldX
      const wy = p.worldY
      const sx = p.worldScaleX
      const sy = p.worldScaleY
      return wy + (this.x * sx) * sin + (this.y * sy) * cos
    }
    return this.y
  }

  get worldRotation(): number {
    const p = this.parent
    if (p instanceof Node2D) return p.worldRotation + this.rotation
    return this.rotation
  }

  get worldScaleX(): number {
    const p = this.parent
    if (p instanceof Node2D) return p.worldScaleX * this.scaleX
    return this.scaleX
  }

  get worldScaleY(): number {
    const p = this.parent
    if (p instanceof Node2D) return p.worldScaleY * this.scaleY
    return this.scaleY
  }

  // ── Convenience ────────────────────────────────────────────────────────
  setPosition(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  setScale(sx: number, sy = sx): this {
    this.scaleX = sx
    this.scaleY = sy
    return this
  }

  translate(dx: number, dy: number): this {
    this.x += dx
    this.y += dy
    return this
  }

  // ── Serialisation ──────────────────────────────────────────────────────
  override toJSON(): any {
    const json = super.toJSON()
    json.properties = {
      ...json.properties,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      zIndex: this.zIndex,
    }
    return json
  }

  override fromJSON(data: any): this {
    super.fromJSON(data)
    if (data.properties) {
      if (data.properties.x !== undefined) this.x = data.properties.x
      if (data.properties.y !== undefined) this.y = data.properties.y
      if (data.properties.rotation !== undefined) this.rotation = data.properties.rotation
      if (data.properties.scaleX !== undefined) this.scaleX = data.properties.scaleX
      if (data.properties.scaleY !== undefined) this.scaleY = data.properties.scaleY
      if (data.properties.zIndex !== undefined) this.zIndex = data.properties.zIndex
    }
    return this
  }
}
