/**
 * BeoEngine — SpriteBatcher
 * Batches sprite quads into a single draw call per texture.
 *
 * Each sprite is two triangles (a quad) packed into a Float32Array.
 * Attribute layout per vertex: [x, y, u, v, opacity, r, g, b]
 */

import type { TextureManager } from './TextureManager.ts'
import type { Sprite } from '../nodes/Sprite.ts'

// Attributes per vertex: x, y, u, v, opacity
const ATTRS_PER_VERTEX = 5
const VERTS_PER_SPRITE = 6  // 2 triangles × 3 verts
const MAX_SPRITES = 2048

const SPRITE_VERT_SRC = /* glsl */`#version 300 es
precision mediump float;

in vec2 a_position;
in vec2 a_uv;
in float a_opacity;

uniform mat3 u_view;
uniform vec2 u_resolution;

out vec2 v_uv;
out float v_opacity;

void main() {
  // Apply camera view
  vec2 worldPos = (u_view * vec3(a_position, 1.0)).xy;
  // NDC: flip y (WebGL is bottom-up, we want top-down)
  vec2 ndc = (worldPos / u_resolution) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
  v_uv = a_uv;
  v_opacity = a_opacity;
}
`

const SPRITE_FRAG_SRC = /* glsl */`#version 300 es
precision mediump float;

in vec2 v_uv;
in float v_opacity;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  vec4 color = texture(u_texture, v_uv);
  outColor = vec4(color.rgb, color.a * v_opacity);
}
`

export class SpriteBatcher {
  private gl: WebGL2RenderingContext
  private textures: TextureManager

  private program!: WebGLProgram
  private vao!: WebGLVertexArrayObject
  private vbo!: WebGLBuffer
  private buf!: Float32Array

  // Uniform locations
  private uView!: WebGLUniformLocation
  private uResolution!: WebGLUniformLocation
  private uTexture!: WebGLUniformLocation

  private initialized = false

  constructor(gl: WebGL2RenderingContext, textures: TextureManager) {
    this.gl = gl
    this.textures = textures
    this.buf = new Float32Array(MAX_SPRITES * VERTS_PER_SPRITE * ATTRS_PER_VERTEX)
  }

  init(shaderProgram: WebGLProgram): void {
    const gl = this.gl
    this.program = shaderProgram

    this.uView      = gl.getUniformLocation(shaderProgram, 'u_view')!
    this.uResolution = gl.getUniformLocation(shaderProgram, 'u_resolution')!
    this.uTexture   = gl.getUniformLocation(shaderProgram, 'u_texture')!

    this.vao = gl.createVertexArray()!
    this.vbo = gl.createBuffer()!

    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    gl.bufferData(gl.ARRAY_BUFFER, this.buf.byteLength, gl.DYNAMIC_DRAW)

    const stride = ATTRS_PER_VERTEX * 4 // bytes

    const aPos = gl.getAttribLocation(shaderProgram, 'a_position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0)

    const aUv = gl.getAttribLocation(shaderProgram, 'a_uv')
    gl.enableVertexAttribArray(aUv)
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 8)

    const aOpacity = gl.getAttribLocation(shaderProgram, 'a_opacity')
    gl.enableVertexAttribArray(aOpacity)
    gl.vertexAttribPointer(aOpacity, 1, gl.FLOAT, false, stride, 16)

    gl.bindVertexArray(null)
    this.initialized = true
  }

  get vertSrc(): string { return SPRITE_VERT_SRC }
  get fragSrc(): string { return SPRITE_FRAG_SRC }

  /**
   * Draw all sprites. Groups by texture to reduce WebGL state changes.
   */
  draw(
    sprites: Sprite[],
    viewMatrix: Float32Array,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    if (!this.initialized || sprites.length === 0) return
    const gl = this.gl

    // Sort by texture, then zIndex
    const sorted = [...sprites].sort((a, b) => {
      if (a.texture < b.texture) return -1
      if (a.texture > b.texture) return 1
      return a.zIndex - b.zIndex
    })

    gl.useProgram(this.program)
    gl.uniformMatrix3fv(this.uView, false, viewMatrix)
    gl.uniform2f(this.uResolution, canvasWidth, canvasHeight)
    gl.uniform1i(this.uTexture, 0)
    gl.activeTexture(gl.TEXTURE0)

    gl.bindVertexArray(this.vao)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    let batchStart = 0
    let currentTex = sorted[0]?.texture ?? ''

    const flush = (end: number) => {
      const batch = sorted.slice(batchStart, end)
      if (batch.length === 0) return

      const texInfo = this.textures.get(currentTex)
      if (!texInfo) return

      let offset = 0
      for (const sprite of batch) {
        const w = sprite.width  || texInfo.width
        const h = sprite.height || texInfo.height
        this._pushQuad(sprite, w, h, offset)
        offset += VERTS_PER_SPRITE * ATTRS_PER_VERTEX
      }

      const count = batch.length * VERTS_PER_SPRITE
      gl.bindTexture(gl.TEXTURE_2D, texInfo.texture)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.buf.subarray(0, offset))
      gl.drawArrays(gl.TRIANGLES, 0, count)
    }

    for (let i = 0; i < sorted.length; i++) {
      const sprite = sorted[i]!
      if (sprite.texture !== currentTex) {
        flush(i)
        batchStart = i
        currentTex = sprite.texture
      }
    }
    flush(sorted.length)

    gl.bindVertexArray(null)
  }

  private _pushQuad(sprite: Sprite, w: number, h: number, offset: number): void {
    const buf = this.buf
    const wx = sprite.worldX
    const wy = sprite.worldY
    const cos = Math.cos(sprite.worldRotation)
    const sin = Math.sin(sprite.worldRotation)
    const sx = sprite.worldScaleX * (sprite.flipX ? -1 : 1)
    const sy = sprite.worldScaleY * (sprite.flipY ? -1 : 1)
    const op = sprite.opacity

    // local corners (centred)
    const hw = w * 0.5
    const hh = h * 0.5
    const corners: [number, number, number, number][] = [
      [-hw, -hh, 0, 0],
      [ hw, -hh, 1, 0],
      [ hw,  hh, 1, 1],
      [-hw, -hh, 0, 0],
      [ hw,  hh, 1, 1],
      [-hw,  hh, 0, 1],
    ]

    let o = offset
    for (const [lx, ly, u, v] of corners) {
      // Scale then rotate then translate
      const rx = lx * sx * cos - ly * sy * sin + wx
      const ry = lx * sx * sin + ly * sy * cos + wy
      buf[o++] = rx
      buf[o++] = ry
      buf[o++] = u
      buf[o++] = v
      buf[o++] = op
    }
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteBuffer(this.vbo)
    gl.deleteVertexArray(this.vao)
  }
}
