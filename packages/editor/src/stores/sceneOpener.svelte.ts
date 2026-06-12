/**
 * Editor store — scene open requests
 * Used to signal the Viewport to load a .beo file from disk.
 */

function createSceneOpener() {
  // A pending path to open; Viewport watches this and clears it after loading
  let pendingPath = $state<string | null>(null)

  return {
    get pendingPath() { return pendingPath },

    /** Request the Viewport to open a .beo file at this project-relative path */
    requestOpen(path: string) {
      pendingPath = path
    },

    /** Viewport calls this after it has successfully loaded the scene */
    clear() {
      pendingPath = null
    },
  }
}

export const sceneOpener = createSceneOpener()
