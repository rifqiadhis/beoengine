/**
 * BeoEngine — Base Node
 * Every object in a BeoEngine scene is a Node.
 * Nodes form a tree (scene graph). This base class has no transform.
 */

let _nextId = 1
function nextId(): string {
  return `node_${String(_nextId++).padStart(4, '0')}`
}

export class Node {
  id: string
  name: string
  children: Node[] = []
  parent: Node | null = null

  /** Set to false to skip update + render for this node and its subtree */
  active: boolean = true

  /** Path to a custom script extending this node (e.g. 'scripts/Player.ts') */
  script: string = ''

  constructor(name?: string) {
    this.id = nextId()
    this.name = name ?? `Node_${this.id}`
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  /** Called once when the node is added to a scene */
  onCreate(): void {}

  /** Called every frame while the scene is running */
  onUpdate(_delta: number): void {}

  /** Called when this node or its children collide with another body */
  onCollide(_other: any): void {}

  /** Called when the node is removed from the scene */
  onDestroy(): void {}

  // ── Tree manipulation ──────────────────────────────────────────────────
  addChild(child: Node): this {
    if (child.parent) {
      child.parent.removeChild(child)
    }
    child.parent = this
    this.children.push(child)
    return this
  }

  removeChild(child: Node): boolean {
    const idx = this.children.indexOf(child)
    if (idx === -1) return false
    this.children.splice(idx, 1)
    child.parent = null
    return true
  }

  /** Walk the entire subtree (including self) in depth-first order */
  walk(cb: (node: Node) => void): void {
    cb(this)
    for (const child of this.children) {
      child.walk(cb)
    }
  }

  /** Find a descendant by id */
  findById(id: string): Node | undefined {
    if (this.id === id) return this
    for (const child of this.children) {
      const found = child.findById(id)
      if (found) return found
    }
    return undefined
  }

  /** Find a descendant by name (first match) */
  findByName(name: string): Node | undefined {
    if (this.name === name) return this
    for (const child of this.children) {
      const found = child.findByName(name)
      if (found) return found
    }
    return undefined
  }

  // ── Serialisation ──────────────────────────────────────────────────────
  get type(): string {
    return this.constructor.name
  }

  /** Convert to JSON-serializable object */
  toJSON(): any {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      active: this.active,
      script: this.script,
      properties: {},
      children: this.children.map(c => c.toJSON()),
    }
  }

  /** Restore properties from JSON data */
  fromJSON(data: any): this {
    if (data.id !== undefined) this.id = data.id
    if (data.name !== undefined) this.name = data.name
    if (data.active !== undefined) this.active = data.active
    if (data.script !== undefined) this.script = data.script
    return this
  }
}
