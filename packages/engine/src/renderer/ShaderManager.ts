/**
 * BeoEngine — ShaderManager
 * Compiles, links, and caches WebGL shader programs.
 */

export class ShaderManager {
  private gl: WebGL2RenderingContext
  private cache: Map<string, WebGLProgram> = new Map()

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
  }

  getOrCreate(key: string, vertSrc: string, fragSrc: string): WebGLProgram {
    const cached = this.cache.get(key)
    if (cached) return cached

    const program = this._compile(vertSrc, fragSrc)
    this.cache.set(key, program)
    return program
  }

  private _compile(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl
    const vert = this._compileShader(gl.VERTEX_SHADER, vertSrc)
    const frag = this._compileShader(gl.FRAGMENT_SHADER, fragSrc)

    const program = gl.createProgram()
    if (!program) throw new Error('[BeoEngine] Failed to create WebGL program')

    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error(`[BeoEngine] Shader link error: ${log ?? 'unknown'}`)
    }

    gl.deleteShader(vert)
    gl.deleteShader(frag)
    return program
  }

  private _compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)
    if (!shader) throw new Error('[BeoEngine] Failed to create shader')

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      const typeName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
      throw new Error(`[BeoEngine] ${typeName} shader compile error: ${log ?? 'unknown'}`)
    }

    return shader
  }

  dispose(): void {
    for (const program of this.cache.values()) {
      this.gl.deleteProgram(program)
    }
    this.cache.clear()
  }
}
