/**
 * BeoEngine — WebGLRenderer
 * Initialises a WebGL2 context, clears the canvas each frame,
 * and delegates sprite drawing to SpriteBatcher.
 */

import { ShaderManager } from './ShaderManager.ts'
import { TextureManager } from './TextureManager.ts'
import { SpriteBatcher } from './SpriteBatcher.ts'
import { DebugRenderer } from './DebugRenderer.ts'
import type { Scene } from '../core/Scene.ts'
import type { Node } from '../core/Node.ts'
import { Sprite } from '../nodes/Sprite.ts'
import { Camera2D } from '../nodes/Camera2D.ts'
import { CollisionBody } from '../nodes/CollisionBody.ts'
import { Node2D } from '../nodes/Node2D.ts'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return [r, g, b]
}

export class WebGLRenderer {
  readonly canvas: HTMLCanvasElement
  readonly gl: WebGL2RenderingContext

  readonly shaders: ShaderManager
  readonly textures: TextureManager
  private batcher: SpriteBatcher
  private debugRenderer: DebugRenderer

  public debugDraw = false

  private bgR = 0.1
  private bgG = 0.1
  private bgB = 0.18

  private activeCamera: Camera2D | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2')
    if (!gl) throw new Error('[BeoEngine] WebGL 2 not supported in this browser')
    this.gl = gl

    this.shaders = new ShaderManager(gl)
    this.textures = new TextureManager(gl)
    this.batcher = new SpriteBatcher(gl, this.textures)

    // Init batcher shader
    const program = this.shaders.getOrCreate(
      'sprite',
      this.batcher.vertSrc,
      this.batcher.fragSrc,
    )
    this.batcher.init(program)

    this.debugRenderer = new DebugRenderer(gl)
    this.debugRenderer.init(this.shaders)
  }

  // ── Config ─────────────────────────────────────────────────────────────
  setBackground(hex: string): void {
    const [r, g, b] = hexToRgb(hex)
    this.bgR = r
    this.bgG = g
    this.bgB = b
  }

  setCamera(camera: Camera2D): void {
    this.activeCamera = camera
  }

  setAssetResolver(resolver: (path: string) => Promise<string>): void {
    this.textures.setResolver(resolver)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  render(scene: Scene): void {
    const gl = this.gl
    const canvas = this.canvas

    // Resize canvas to its CSS display size
    const dpr = window.devicePixelRatio || 1
    const displayW = Math.floor(canvas.clientWidth  * dpr)
    const displayH = Math.floor(canvas.clientHeight * dpr)
    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width  = displayW
      canvas.height = displayH
    }

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(this.bgR, this.bgG, this.bgB, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Find camera (use activeCamera, or first Camera2D found in scene, or default identity)
    let camera = this.activeCamera
    if (!camera) {
      for (const node of scene.allNodes) {
        if (node instanceof Camera2D) { camera = node; break }
      }
    }

    const viewMatrix = camera
      ? camera.getViewMatrix(canvas.width / dpr, canvas.height / dpr)
      : this._identityView(canvas.width / dpr, canvas.height / dpr)

    // Collect all sprites (sorted by zIndex)
    const sprites: Sprite[] = []
    for (const node of scene.allNodes) {
      if ((node as any).isSprite && node.active && (node as any).texture) {
        sprites.push(node as Sprite)
        // Pre-load texture if needed
        void this.textures.load((node as any).texture)
      }
    }
    sprites.sort((a, b) => a.zIndex - b.zIndex)

    this.batcher.draw(sprites, viewMatrix, canvas.width / dpr, canvas.height / dpr)

    if (this.debugDraw) {
      const bodies: CollisionBody[] = []
      for (const node of scene.allNodes) {
        if ((node as any).isCollisionBody && node.active) {
          bodies.push(node as CollisionBody)
        }
      }
      this.debugRenderer.drawBodies(bodies, viewMatrix, canvas.width / dpr, canvas.height / dpr)
    }
  }

  private _identityView(w: number, h: number): Float32Array {
    // Identity: no camera movement, world origin at top-left
    return new Float32Array([
      1, 0, 0,
      0, 1, 0,
      w / 2, h / 2, 1,
    ])
  }

  dispose(): void {
    this.batcher.dispose()
    this.debugRenderer.dispose()
    this.shaders.dispose()
    this.textures.dispose()
  }
}
