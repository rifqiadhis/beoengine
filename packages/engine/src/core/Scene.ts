/**
 * BeoEngine — Scene
 * Holds the root node list (scene graph) and drives node lifecycles.
 */

import { Node } from './Node.ts'
import { EventEmitter } from './EventEmitter.ts'

type SceneEvents = {
  nodeAdded: Node
  nodeRemoved: Node
}

export class Scene extends EventEmitter<SceneEvents> {
  name: string
  background: string = '#1a1a2e'

  /** Top-level nodes (roots of the scene graph) */
  readonly roots: Node[] = []

  constructor(name = 'Untitled') {
    super()
    this.name = name
  }

  // ── Node management ────────────────────────────────────────────────────
  addNode(node: Node): this {
    this.roots.push(node)
    // Fire onCreate for entire subtree
    node.walk((n) => n.onCreate())
    this.emit('nodeAdded', node)
    return this
  }

  removeNode(node: Node): boolean {
    const idx = this.roots.indexOf(node)
    if (idx === -1) return false
    this.roots.splice(idx, 1)
    node.walk((n) => n.onDestroy())
    this.emit('nodeRemoved', node)
    return true
  }

  findById(id: string): Node | undefined {
    for (const root of this.roots) {
      const found = root.findById(id)
      if (found) return found
    }
    return undefined
  }

  findByName(name: string): Node | undefined {
    for (const root of this.roots) {
      const found = root.findByName(name)
      if (found) return found
    }
    return undefined
  }

  // ── Update ─────────────────────────────────────────────────────────────
  /** Called by Engine each frame */
  update(delta: number): void {
    for (const root of this.roots) {
      if (root.active) {
        root.walk((n) => {
          if (n.active) n.onUpdate(delta)
        })
      }
    }
  }

  // ── All nodes (flat list, depth-first) ─────────────────────────────────
  get allNodes(): Node[] {
    const result: Node[] = []
    for (const root of this.roots) {
      root.walk((n) => result.push(n))
    }
    return result
  }
}
