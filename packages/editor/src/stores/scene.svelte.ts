/**
 * Editor store — scene state
 */
import type { Scene, Node } from 'beo'

function createSceneStore() {
  let activeScene = $state<Scene | null>(null)
  let isDirty = $state(false)

  return {
    get activeScene() { return activeScene },
    get isDirty() { return isDirty },
    get nodeTree() { return activeScene?.roots ?? [] },

    setScene(scene: Scene) {
      activeScene = scene
      isDirty = false
    },

    markDirty() {
      isDirty = true
    },

    markSaved() {
      isDirty = false
    },
  }
}

export const scene = createSceneStore()
