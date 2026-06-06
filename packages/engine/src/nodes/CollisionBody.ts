/**
 * BeoEngine — CollisionBody
 * A spatial node that acts as a hitbox or hurtbox.
 */

import { Node2D } from './Node2D.ts'

export type CollisionShape = 'aabb' | 'circle'

export class CollisionBody extends Node2D {
  shape: CollisionShape = 'aabb'
  
  width: number = 50
  height: number = 50
  radius: number = 25
  
  offsetX: number = 0
  offsetY: number = 0

  layer: number = 1
  mask: number = 1

  constructor(name?: string) {
    super(name)
  }

  get isCollisionBody(): boolean { return true }

  // ── Serialisation ──────────────────────────────────────────────────────
  override toJSON(): any {
    const json = super.toJSON()
    json.properties = {
      ...json.properties,
      shape: this.shape,
      width: this.width,
      height: this.height,
      radius: this.radius,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      layer: this.layer,
      mask: this.mask,
    }
    return json
  }

  override fromJSON(data: any): this {
    super.fromJSON(data)
    if (data.properties) {
      if (data.properties.shape !== undefined) this.shape = data.properties.shape
      if (data.properties.width !== undefined) this.width = data.properties.width
      if (data.properties.height !== undefined) this.height = data.properties.height
      if (data.properties.radius !== undefined) this.radius = data.properties.radius
      if (data.properties.offsetX !== undefined) this.offsetX = data.properties.offsetX
      if (data.properties.offsetY !== undefined) this.offsetY = data.properties.offsetY
      if (data.properties.layer !== undefined) this.layer = data.properties.layer
      if (data.properties.mask !== undefined) this.mask = data.properties.mask
    }
    return this
  }
}
