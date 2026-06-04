/**
 * Editor store — selection state
 */

function createSelectionStore() {
  let selectedNodeId = $state<string | null>(null)

  return {
    get selectedNodeId() { return selectedNodeId },

    select(id: string | null) {
      selectedNodeId = id
    },

    deselect() {
      selectedNodeId = null
    },
  }
}

export const selection = createSelectionStore()
