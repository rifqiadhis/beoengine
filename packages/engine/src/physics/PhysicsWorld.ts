/**
 * BeoEngine — PhysicsWorld
 * Simple collision detection engine for AABB and Circle shapes.
 */

import type { Scene } from '../core/Scene.ts'
import type { CollisionBody } from '../nodes/CollisionBody.ts'

export class PhysicsWorld {
  step(scene: Scene): void {
    const bodies: CollisionBody[] = []

    // Collect all active bodies
    for (const root of scene.roots) {
      if (!root.active) continue
      root.walk((n) => {
        if (n.active && (n as any).isCollisionBody) {
          bodies.push(n as CollisionBody)
        }
      })
    }

    // Check overlaps
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const b1 = bodies[i]
        const b2 = bodies[j]

        // Only check if they can collide based on layers and masks
        const b1HitsB2 = (b1.mask & b2.layer) !== 0
        const b2HitsB1 = (b2.mask & b1.layer) !== 0

        if (b1HitsB2 || b2HitsB1) {
          if (this.checkCollision(b1, b2)) {
            if (b1HitsB2) {
              b1.onCollide(b2)
              if (b1.parent) b1.parent.onCollide(b2)
            }
            if (b2HitsB1) {
              b2.onCollide(b1)
              if (b2.parent) b2.parent.onCollide(b1)
            }
          }
        }
      }
    }
  }

  private checkCollision(b1: CollisionBody, b2: CollisionBody): boolean {
    const isB1Circle = b1.shape === 'circle'
    const isB2Circle = b2.shape === 'circle'

    if (isB1Circle && isB2Circle) {
      return this.circleCircle(b1, b2)
    } else if (!isB1Circle && !isB2Circle) {
      return this.aabbAabb(b1, b2)
    } else if (isB1Circle && !isB2Circle) {
      return this.circleAabb(b1, b2)
    } else {
      return this.circleAabb(b2, b1)
    }
  }

  private aabbAabb(b1: CollisionBody, b2: CollisionBody): boolean {
    const wx1 = b1.worldX + b1.offsetX
    const wy1 = b1.worldY + b1.offsetY
    const w1 = b1.width * b1.worldScaleX
    const h1 = b1.height * b1.worldScaleY

    const wx2 = b2.worldX + b2.offsetX
    const wy2 = b2.worldY + b2.offsetY
    const w2 = b2.width * b2.worldScaleX
    const h2 = b2.height * b2.worldScaleY

    return (
      wx1 < wx2 + w2 &&
      wx1 + w1 > wx2 &&
      wy1 < wy2 + h2 &&
      wy1 + h1 > wy2
    )
  }

  private circleCircle(b1: CollisionBody, b2: CollisionBody): boolean {
    const wx1 = b1.worldX + b1.offsetX
    const wy1 = b1.worldY + b1.offsetY
    // Use the max scale to approximate ellipse as circle
    const r1 = b1.radius * Math.max(b1.worldScaleX, b1.worldScaleY)

    const wx2 = b2.worldX + b2.offsetX
    const wy2 = b2.worldY + b2.offsetY
    const r2 = b2.radius * Math.max(b2.worldScaleX, b2.worldScaleY)

    const dx = wx1 - wx2
    const dy = wy1 - wy2
    const distSq = dx * dx + dy * dy
    const radSum = r1 + r2

    return distSq < radSum * radSum
  }

  private circleAabb(circle: CollisionBody, aabb: CollisionBody): boolean {
    const cx = circle.worldX + circle.offsetX
    const cy = circle.worldY + circle.offsetY
    const cr = circle.radius * Math.max(circle.worldScaleX, circle.worldScaleY)

    const ax = aabb.worldX + aabb.offsetX
    const ay = aabb.worldY + aabb.offsetY
    const aw = aabb.width * aabb.worldScaleX
    const ah = aabb.height * aabb.worldScaleY

    // Find closest point on AABB to circle center
    const testX = Math.max(ax, Math.min(cx, ax + aw))
    const testY = Math.max(ay, Math.min(cy, ay + ah))

    const dx = cx - testX
    const dy = cy - testY
    return (dx * dx + dy * dy) < (cr * cr)
  }
}
