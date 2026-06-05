/**
 * Editor store — project state
 */
import type { RecentProject } from '../types.ts'
import { loadRecentProjects, saveRecentProject } from '../idb/storage.ts'
import { listAllFiles } from '../fs/filesystem.ts'

export type { RecentProject }

function createProjectStore() {
  let projectName = $state<string>('')
  let folderHandle = $state<FileSystemDirectoryHandle | null>(null)
  let recentProjects = $state<RecentProject[]>([])
  let assets = $state<string[]>([])
  let isLoading = $state(false)

  return {
    get projectName() { return projectName },
    get folderHandle() { return folderHandle },
    get recentProjects() { return recentProjects },
    get assets() { return assets },
    get isLoading() { return isLoading },

    async loadRecent() {
      isLoading = true
      try {
        recentProjects = await loadRecentProjects()
      } finally {
        isLoading = false
      }
    },

    async openProject(handle: FileSystemDirectoryHandle) {
      folderHandle = handle
      // Try to read project.beo for the name
      try {
        const file = await handle.getFileHandle('project.beo')
        const f = await file.getFile()
        const json = JSON.parse(await f.text()) as { name?: string }
        projectName = json.name ?? handle.name
      } catch {
        projectName = handle.name
      }
      const recent: RecentProject = {
        handle,
        name: projectName,
        lastOpened: Date.now(),
      }
      await saveRecentProject(recent)
      recentProjects = await loadRecentProjects()

      try {
        assets = await listAllFiles(handle)
      } catch (e) {
        console.error('Failed to list assets', e)
        assets = []
      }
    },

    closeProject() {
      folderHandle = null
      projectName = ''
      assets = []
    },
  }
}

export const project = createProjectStore()
