/**
 * Editor store — scene state
 */
import type { Scene, Node } from 'beo'

function createSceneStore() {
  let activeScene = $state<Scene | null>(null)
  let isDirty = $state(false)
  let version = $state(0)

  return {
    get activeScene() { return activeScene },
    get isDirty() { return isDirty },
    get nodeTree() { 
      version; // depend on version for reactivity
      return activeScene?.roots ?? [] 
    },
    get version() { return version },

    setScene(scene: Scene) {
      activeScene = scene
      isDirty = false
      version++
    },

    markDirty() {
      isDirty = true
      version++
    },

    markSaved() {
      isDirty = false
    },
  }
}

export const scene = createSceneStore()
