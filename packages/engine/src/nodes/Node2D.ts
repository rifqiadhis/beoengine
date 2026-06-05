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

  get isNode2D(): boolean { return true }

  // ── World-space transform ──────────────────────────────────────────────
  /**
   * Returns the world-space position of this node by walking up
   * through parent Node2D transforms.
   */
  get worldX(): number {
    const p = this.parent
    if (p && (p as any).isNode2D) {
      const cos = Math.cos((p as any).worldRotation)
      const sin = Math.sin((p as any).worldRotation)
      const wx = (p as any).worldX
      const wy = (p as any).worldY
      const sx = (p as any).worldScaleX
      const sy = (p as any).worldScaleY
      return wx + (this.x * sx) * cos - (this.y * sy) * sin
    }
    return this.x
  }

  get worldY(): number {
    const p = this.parent
    if (p && (p as any).isNode2D) {
      const cos = Math.cos((p as any).worldRotation)
      const sin = Math.sin((p as any).worldRotation)
      const wx = (p as any).worldX
      const wy = (p as any).worldY
      const sx = (p as any).worldScaleX
      const sy = (p as any).worldScaleY
      return wy + (this.x * sx) * sin + (this.y * sy) * cos
    }
    return this.y
  }

  get worldRotation(): number {
    const p = this.parent
    if (p && (p as any).isNode2D) return (p as Node2D).worldRotation + this.rotation
    return this.rotation
  }

  get worldScaleX(): number {
    const p = this.parent
    if (p && (p as any).isNode2D) return (p as Node2D).worldScaleX * this.scaleX
    return this.scaleX
  }

  get worldScaleY(): number {
    const p = this.parent
    if (p && (p as any).isNode2D) return (p as Node2D).worldScaleY * this.scaleY
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
