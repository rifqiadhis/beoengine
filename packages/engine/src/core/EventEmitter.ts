/**
 * BeoEngine — EventEmitter
 * Simple typed pub/sub used throughout the engine.
 */

type Listener<T = unknown> = (payload: T) => void

export class EventEmitter<Events extends Record<string, unknown> = Record<string, unknown>> {
  private listeners: Map<string, Set<Listener<unknown>>> = new Map()

  on<K extends keyof Events & string>(event: K, listener: Listener<Events[K]>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>)
    return this
  }

  off<K extends keyof Events & string>(event: K, listener: Listener<Events[K]>): this {
    this.listeners.get(event)?.delete(listener as Listener<unknown>)
    return this
  }

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of set) {
      listener(payload)
    }
  }

  once<K extends keyof Events & string>(event: K, listener: Listener<Events[K]>): this {
    const wrapper: Listener<Events[K]> = (payload) => {
      listener(payload)
      this.off(event, wrapper)
    }
    return this.on(event, wrapper)
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
    return this
  }
}
