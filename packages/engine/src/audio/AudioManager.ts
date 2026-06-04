/**
 * BeoEngine — AudioManager
 * Thin wrapper around the Web Audio API for playing sounds.
 */

export class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null

  private _getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  /** Play an audio file by URL. Returns the source node (so you can stop it). */
  async play(url: string, loop = false): Promise<AudioBufferSourceNode> {
    const ctx = this._getCtx()
    if (ctx.state === 'suspended') await ctx.resume()

    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.loop = loop
    source.connect(this.masterGain!)
    source.start()
    return source
  }

  setVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        Math.max(0, Math.min(1, value)),
        this._getCtx().currentTime,
      )
    }
  }

  suspend(): void {
    void this.ctx?.suspend()
  }

  resume(): void {
    void this.ctx?.resume()
  }
}
