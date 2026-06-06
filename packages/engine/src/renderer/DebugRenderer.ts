/**
 * BeoEngine — DebugRenderer
 * Renders primitive lines (rectangles, circles) for debugging collision bodies.
 */

import type { ShaderManager } from './ShaderManager.ts'
import type { CollisionBody } from '../nodes/CollisionBody.ts'

const DEBUG_VERT_SRC = /* glsl */`#version 300 es
in vec2 a_position;
uniform mat3 u_view;
uniform vec2 u_resolution;

void main() {
  vec2 worldPos = (u_view * vec3(a_position, 1.0)).xy;
  vec2 ndc = (worldPos / u_resolution) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
`

const DEBUG_FRAG_SRC = /* glsl */`#version 300 es
precision mediump float;
out vec4 outColor;
uniform vec3 u_color;

void main() {
  outColor = vec4(u_color, 1.0);
}
`

export class DebugRenderer {
  private gl: WebGL2RenderingContext
  private program!: WebGLProgram
  private vao!: WebGLVertexArrayObject
  private vbo!: WebGLBuffer

  private uView!: WebGLUniformLocation
  private uResolution!: WebGLUniformLocation
  private uColor!: WebGLUniformLocation

  private buf = new Float32Array(100 * 2) // 100 vertices (x,y) max for circles
  private initialized = false

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
  }

  init(shaders: ShaderManager): void {
    const gl = this.gl
    this.program = shaders.getOrCreate('debug', DEBUG_VERT_SRC, DEBUG_FRAG_SRC)
    this.uView = gl.getUniformLocation(this.program, 'u_view')!
    this.uResolution = gl.getUniformLocation(this.program, 'u_resolution')!
    this.uColor = gl.getUniformLocation(this.program, 'u_color')!

    this.vao = gl.createVertexArray()!
    this.vbo = gl.createBuffer()!
    
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    gl.bufferData(gl.ARRAY_BUFFER, this.buf.byteLength, gl.DYNAMIC_DRAW)
    
    const aPos = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    
    gl.bindVertexArray(null)
    this.initialized = true
  }

  drawBodies(bodies: CollisionBody[], viewMatrix: Float32Array, canvasWidth: number, canvasHeight: number): void {
    if (!this.initialized || bodies.length === 0) return
    const gl = this.gl

    gl.useProgram(this.program)
    gl.uniformMatrix3fv(this.uView, false, viewMatrix)
    gl.uniform2f(this.uResolution, canvasWidth, canvasHeight)
    
    // Draw in bright green for hitboxes
    gl.uniform3f(this.uColor, 0.0, 1.0, 0.0)

    gl.bindVertexArray(this.vao)
    
    for (const body of bodies) {
      this.drawBody(body)
    }

    gl.bindVertexArray(null)
  }

  private drawBody(body: CollisionBody): void {
    const gl = this.gl
    const buf = this.buf
    let count = 0

    const wx = body.worldX + body.offsetX
    const wy = body.worldY + body.offsetY
    const sx = body.worldScaleX
    const sy = body.worldScaleY

    if (body.shape === 'aabb') {
      const hw = body.width * sx * 0.5
      const hh = body.height * sy * 0.5
      
      buf[0] = wx - hw; buf[1] = wy - hh;
      buf[2] = wx + hw; buf[3] = wy - hh;
      buf[4] = wx + hw; buf[5] = wy + hh;
      buf[6] = wx - hw; buf[7] = wy + hh;
      count = 4;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.subarray(0, count * 2))
      gl.drawArrays(gl.LINE_LOOP, 0, count)

    } else if (body.shape === 'circle') {
      const r = body.radius * Math.max(sx, sy)
      const segments = 32
      count = segments
      for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2
        buf[i * 2] = wx + Math.cos(theta) * r
        buf[i * 2 + 1] = wy + Math.sin(theta) * r
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.subarray(0, count * 2))
      gl.drawArrays(gl.LINE_LOOP, 0, count)
    }
  }

  dispose() {
    this.gl.deleteBuffer(this.vbo)
    this.gl.deleteVertexArray(this.vao)
  }
}
