/**
 * BeoEngine — TextureManager
 * Loads images and uploads them as WebGL textures. Caches by URL.
 */

export interface TextureInfo {
  texture: WebGLTexture
  width: number
  height: number
}

export class TextureManager {
  private gl: WebGL2RenderingContext
  private cache: Map<string, TextureInfo> = new Map()
  private loading: Map<string, Promise<TextureInfo>> = new Map()

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
  }

  /**
   * Load a texture by URL (or resolve immediately from cache).
   */
  load(url: string): Promise<TextureInfo> {
    const cached = this.cache.get(url)
    if (cached) return Promise.resolve(cached)

    const inFlight = this.loading.get(url)
    if (inFlight) return inFlight

    const promise = new Promise<TextureInfo>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const info = this._upload(img)
        this.cache.set(url, info)
        this.loading.delete(url)
        resolve(info)
      }
      img.onerror = () => {
        this.loading.delete(url)
        reject(new Error(`[BeoEngine] Failed to load texture: ${url}`))
      }
      img.src = url
    })

    this.loading.set(url, promise)
    return promise
  }

  /** Get from cache synchronously, or null if not yet loaded */
  get(url: string): TextureInfo | null {
    return this.cache.get(url) ?? null
  }

  private _upload(img: HTMLImageElement): TextureInfo {
    const gl = this.gl
    const texture = gl.createTexture()
    if (!texture) throw new Error('[BeoEngine] Failed to create WebGL texture')

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return { texture, width: img.naturalWidth, height: img.naturalHeight }
  }

  dispose(): void {
    for (const info of this.cache.values()) {
      this.gl.deleteTexture(info.texture)
    }
    this.cache.clear()
  }
}
