/**
 * Editor store — viewport state
 */

export type GizmoMode = 'move' | 'scale' | 'rotate'
export type PlayState = 'stopped' | 'playing' | 'paused'

function createViewportStore() {
  let cameraX = $state(0)
  let cameraY = $state(0)
  let zoom = $state(1)
  let gizmoMode = $state<GizmoMode>('move')
  let playState = $state<PlayState>('stopped')

  return {
    get cameraX() { return cameraX },
    get cameraY() { return cameraY },
    get zoom() { return zoom },
    get gizmoMode() { return gizmoMode },
    get playState() { return playState },
    get isPlaying() { return playState === 'playing' },

    pan(dx: number, dy: number) {
      cameraX += dx
      cameraY += dy
    },

    setZoom(z: number) {
      zoom = Math.max(0.1, Math.min(10, z))
    },

    setGizmoMode(mode: GizmoMode) {
      gizmoMode = mode
    },

    play() { playState = 'playing' },
    pause() { playState = 'paused' },
    stop() { playState = 'stopped' },
  }
}

export const viewport = createViewportStore()
