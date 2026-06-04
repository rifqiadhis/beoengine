<script lang="ts">
  import { project } from '../stores/project.svelte.ts'
  import { pickProjectFolder } from '../fs/filesystem.ts'
  import type { FSEntry } from '../fs/filesystem.ts'
  import {
    FolderOpen,
    Folder,
    File,
    ChevronRight,
    FileImage,
    FileAudio,
    FileCode,
    FileJson,
  } from '@lucide/svelte'

  let entries = $state<FSEntry[]>([])
  let currentPath = $state<string[]>([])

  async function openFolder() {
    const handle = await pickProjectFolder()
    if (!handle) return
    await project.openProject(handle)
    entries = []
    currentPath = []
  }

  function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) return FileImage
    if (['mp3', 'ogg', 'wav'].includes(ext)) return FileAudio
    if (['ts', 'js'].includes(ext)) return FileCode
    if (['json', 'beo'].includes(ext)) return FileJson
    return File
  }
</script>

<aside class="asset-browser">
  <header class="panel-header">
    <span class="panel-title">Assets</span>
    {#if project.folderHandle}
      <span class="project-name">{project.projectName}</span>
    {/if}
  </header>

  <div class="asset-content">
    {#if !project.folderHandle}
      <div class="no-project">
        <div class="no-project-icon">
          <FolderOpen size={32} strokeWidth={1.2} />
        </div>
        <p>No project open</p>
        <button class="open-btn" onclick={openFolder}>
          <FolderOpen size={13} />
          Open Folder
        </button>
      </div>
    {:else}
      <div class="breadcrumb">
        <button class="crumb root" onclick={() => { currentPath = []; entries = [] }}>
          {project.projectName}
        </button>
        {#each currentPath as part, i}
          <ChevronRight size={10} class="crumb-sep" />
          <button class="crumb" onclick={() => { currentPath = currentPath.slice(0, i + 1) }}>
            {part}
          </button>
        {/each}
      </div>

      {#if entries.length === 0}
        <p class="empty-state">Folder is empty</p>
      {:else}
        <div class="entry-list">
          {#each entries as entry}
            {@const EntryIcon = entry.kind === 'directory' ? Folder : getFileIcon(entry.name)}
            <div class="entry" role="button" tabindex="0">
              <span class="entry-icon" class:dir={entry.kind === 'directory'}>
                <EntryIcon size={14} />
              </span>
              <span class="entry-name">{entry.name}</span>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</aside>

<style>
  .asset-browser {
    display: flex;
    flex-direction: column;
    background: var(--panel-bg);
    border-top: 1px solid var(--border);
    border-right: 1px solid var(--border);
    overflow: hidden;
    min-width: 0;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
    background: var(--panel-header-bg);
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  .project-name {
    font-size: 11px;
    color: var(--accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asset-content {
    flex: 1;
    overflow-y: auto;
  }

  .no-project {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 100%;
    padding: 16px;
    text-align: center;
  }

  .no-project-icon {
    color: var(--text-muted);
    opacity: 0.3;
  }

  .no-project p {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0;
  }

  .open-btn {
    background: var(--accent-subtle);
    border: 1px solid var(--accent-border);
    color: var(--accent);
    cursor: pointer;
    font-size: 12px;
    font-family: var(--font-sans);
    padding: 5px 14px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }

  .open-btn:hover {
    background: var(--accent);
    color: #fff;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    gap: 2px;
    flex-wrap: wrap;
    color: var(--text-muted);
  }

  .crumb {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    font-family: var(--font-sans);
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
  }

  .crumb:hover {
    color: var(--text);
    background: var(--hover-bg);
  }

  .entry-list {
    padding: 4px;
  }

  .entry {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text);
  }

  .entry:hover {
    background: var(--hover-bg);
  }

  .entry-icon {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .entry-icon.dir {
    color: var(--accent);
    opacity: 0.7;
  }

  .entry-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-state {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    padding: 24px;
    margin: 0;
  }
</style>
