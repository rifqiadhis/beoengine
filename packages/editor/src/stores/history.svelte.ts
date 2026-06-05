import { SceneSerializer, type Scene } from 'beo'
import { scene } from './scene.svelte.ts'
import { selection } from './selection.svelte.ts'

function createHistoryStore() {
  let undoStack = $state<string[]>([])
  let redoStack = $state<string[]>([])
  let isRecording = false

  function takeSnapshot(currentScene: Scene | null) {
    if (!currentScene || isRecording) return
    const json = SceneSerializer.serialize(currentScene)
    undoStack.push(json)
    redoStack = []
    scene.markDirty()
  }

  function undo() {
    if (undoStack.length === 0 || !scene.activeScene) return
    
    // Save current state to redo
    const currentJson = SceneSerializer.serialize(scene.activeScene)
    redoStack.push(currentJson)
    
    const previousJson = undoStack.pop()!
    restore(previousJson)
  }

  function redo() {
    if (redoStack.length === 0 || !scene.activeScene) return
    
    // Save current state to undo
    const currentJson = SceneSerializer.serialize(scene.activeScene)
    undoStack.push(currentJson)
    
    const nextJson = redoStack.pop()!
    restore(nextJson)
  }

  function restore(json: string) {
    isRecording = true
    try {
      const restoredScene = SceneSerializer.deserialize(json)
      scene.setScene(restoredScene)
      // Attempt to preserve selection if node still exists
      if (selection.selectedNodeId) {
        const stillExists = restoredScene.findById(selection.selectedNodeId)
        if (!stillExists) {
          selection.clear()
        }
      }
      scene.markDirty()
    } catch (e) {
      console.error('Failed to restore history snapshot:', e)
    }
    isRecording = false
  }

  function clear() {
    undoStack = []
    redoStack = []
  }

  return {
    get canUndo() { return undoStack.length > 0 },
    get canRedo() { return redoStack.length > 0 },
    takeSnapshot,
    undo,
    redo,
    clear
  }
}

export const history = createHistoryStore()
