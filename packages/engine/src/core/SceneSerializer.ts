import { Scene } from './Scene.ts'
import { Node } from './Node.ts'
import { Node2D } from '../nodes/Node2D.ts'
import { Sprite } from '../nodes/Sprite.ts'
import { Camera2D } from '../nodes/Camera2D.ts'

/**
 * Registry of node types available for deserialization.
 */
const NodeRegistry: Record<string, new () => Node> = {
  Node,
  Node2D,
  Sprite,
  Camera2D,
}

export class SceneSerializer {
  /**
   * Serializes a Scene into a .beo JSON string.
   */
  static serialize(scene: Scene): string {
    const data = {
      version: '0.1',
      name: scene.name,
      background: scene.background,
      nodes: scene.roots.map(root => root.toJSON()),
    }
    return JSON.stringify(data, null, 2)
  }

  /**
   * Deserializes a .beo JSON string into a Scene instance.
   */
  static deserialize(jsonString: string): Scene {
    let data: any
    try {
      data = JSON.parse(jsonString)
    } catch (err) {
      throw new Error(`Failed to parse scene JSON: ${err}`)
    }

    const scene = new Scene(data.name || 'Untitled')
    if (data.background) {
      scene.background = data.background
    }

    if (Array.isArray(data.nodes)) {
      for (const nodeData of data.nodes) {
        const node = this.deserializeNode(nodeData)
        if (node) {
          scene.addNode(node)
        }
      }
    }

    return scene
  }

  /**
   * Recursively instantiates a node and its children from JSON data.
   */
  private static deserializeNode(data: any): Node | null {
    if (!data || !data.type) return null

    const NodeClass = NodeRegistry[data.type]
    if (!NodeClass) {
      console.warn(`[SceneSerializer] Unknown node type: ${data.type}`)
      return null
    }

    const node = new NodeClass()
    node.fromJSON(data)

    if (Array.isArray(data.children)) {
      for (const childData of data.children) {
        const child = this.deserializeNode(childData)
        if (child) {
          node.addChild(child)
        }
      }
    }

    return node
  }
}
