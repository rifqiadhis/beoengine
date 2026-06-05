<script lang="ts">
  import { scene } from '../stores/scene.svelte.ts'
  import { selection } from '../stores/selection.svelte.ts'
  import { history } from '../stores/history.svelte.ts'
  import type { Node, Node2D, Sprite } from 'beo'

  // Get selected node reactively
  let selectedNode = $derived((() => {
    scene.version; // react to changes outside of Inspector
    return selection.selectedNodeId
      ? scene.activeScene?.findById(selection.selectedNodeId) ?? null
      : null
  })())

  function isNode2D(node: Node): node is Node2D {
    return 'x' in node && 'y' in node
  }

  function isSprite(node: Node): node is Sprite {
    return 'texture' in node
  }

  function handleFocus() {
    if (scene.activeScene) {
      history.takeSnapshot(scene.activeScene)
    }
  }

  function update<T>(key: string, value: T) {
    if (!selectedNode) return
    // @ts-expect-error dynamic property update
    selectedNode[key] = value
    scene.markDirty()
  }

  function parseNum(v: string): number {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }
  import { project } from '../stores/project.svelte.ts'

  const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg']
  let availableTextures = $derived(
    project.assets.filter(a => IMAGE_EXTS.some(ext => a.toLowerCase().endsWith(ext)))
  )

  import { writeTextFile, fileExists } from '../fs/filesystem.ts'

  async function createNewScript() {
    if (!project.folderHandle) return
    const name = prompt('Enter script name (e.g. Player):')
    if (!name) return

    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '')
    if (!cleanName) return

    const scriptPath = `scripts/${cleanName}.ts`

    try {
      const exists = await fileExists(project.folderHandle, scriptPath)
      if (exists) {
        alert(`Script ${scriptPath} already exists!`)
        return
      }

      const baseClass = selectedNode ? selectedNode.type : 'Node2D'
      const template = `import { ${baseClass}, Input } from "beo"

export default class ${cleanName} extends ${baseClass} {
  onCreate() {
    
  }

  onUpdate(delta: number) {
    
  }
}
`
      await writeTextFile(project.folderHandle, scriptPath, template)
      await project.reloadAssets()
      update('script', scriptPath)
    } catch (err) {
      console.error(err)
      alert('Failed to create script')
    }
  }
</script>

<aside class="inspector-panel">
  <header class="panel-header">
    <span class="panel-title">Inspector</span>
  </header>

  <div class="inspector-body">
    {#if !selectedNode}
      <p class="empty-state">Select a node to inspect</p>
    {:else}
      <!-- Node base properties -->
      <section class="prop-section">
        <h3 class="section-title">Node</h3>

        <label class="prop-row">
          <span class="prop-label">Name</span>
          <input
            class="prop-input"
            type="text"
            value={selectedNode.name}
            onfocus={handleFocus} oninput={(e) => update('name', (e.target as HTMLInputElement).value)}
          />
        </label>

        <div class="prop-row">
          <span class="prop-label">Type</span>
          <span class="prop-value-static">{selectedNode.type}</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Script</span>
          <div class="script-input-group">
            <select
              class="prop-input"
              value={selectedNode.script || ''}
              onfocus={handleFocus}
              onchange={(e) => update('script', (e.target as HTMLSelectElement).value)}
            >
              <option value="">(None)</option>
              {#each project.assets.filter(a => a.endsWith('.ts')) as scriptPath}
                <option value={scriptPath}>{scriptPath}</option>
              {/each}
            </select>
            <button class="new-script-btn" onclick={createNewScript} title="Create New Script">+</button>
          </div>
        </div>

        <label class="prop-row">
          <span class="prop-label">Active</span>
          <input
            type="checkbox"
            checked={selectedNode.active}
            onfocus={handleFocus} onchange={(e) => update('active', (e.target as HTMLInputElement).checked)}
          />
        </label>
      </section>

      <!-- Node2D transform -->
      {#if isNode2D(selectedNode)}
        <section class="prop-section">
          <h3 class="section-title">Transform</h3>

          <div class="prop-row">
            <span class="prop-label">Position</span>
            <div class="vec2-inputs">
              <label>
                <span class="axis-label">X</span>
                <input
                  class="prop-input narrow"
                  type="number"
                  value={selectedNode.x}
                  onfocus={handleFocus} oninput={(e) => update('x', parseNum((e.target as HTMLInputElement).value))}
                />
              </label>
              <label>
                <span class="axis-label">Y</span>
                <input
                  class="prop-input narrow"
                  type="number"
                  value={selectedNode.y}
                  onfocus={handleFocus} oninput={(e) => update('y', parseNum((e.target as HTMLInputElement).value))}
                />
              </label>
            </div>
          </div>

          <div class="prop-row">
            <span class="prop-label">Scale</span>
            <div class="vec2-inputs">
              <label>
                <span class="axis-label">X</span>
                <input
                  class="prop-input narrow"
                  type="number"
                  step="0.1"
                  value={selectedNode.scaleX}
                  onfocus={handleFocus} oninput={(e) => update('scaleX', parseNum((e.target as HTMLInputElement).value))}
                />
              </label>
              <label>
                <span class="axis-label">Y</span>
                <input
                  class="prop-input narrow"
                  type="number"
                  step="0.1"
                  value={selectedNode.scaleY}
                  onfocus={handleFocus} oninput={(e) => update('scaleY', parseNum((e.target as HTMLInputElement).value))}
                />
              </label>
            </div>
          </div>

          <label class="prop-row">
            <span class="prop-label">Rotation</span>
            <input
              class="prop-input"
              type="number"
              step="0.01"
              value={selectedNode.rotation.toFixed(3)}
              onfocus={handleFocus} oninput={(e) => update('rotation', parseNum((e.target as HTMLInputElement).value))}
            />
          </label>

          <label class="prop-row">
            <span class="prop-label">Z-Index</span>
            <input
              class="prop-input"
              type="number"
              value={selectedNode.zIndex}
              onfocus={handleFocus} oninput={(e) => update('zIndex', parseNum((e.target as HTMLInputElement).value))}
            />
          </label>
        </section>
      {/if}

      <!-- Sprite properties -->
      {#if isSprite(selectedNode)}
        <section class="prop-section">
          <h3 class="section-title">Sprite</h3>

          <label class="prop-row">
            <span class="prop-label">Texture</span>
            <select
              class="prop-input"
              value={selectedNode.texture}
              onfocus={handleFocus}
              onchange={(e) => update('texture', (e.target as HTMLSelectElement).value)}
            >
              <option value="">(None)</option>
              {#each availableTextures as tex}
                <option value={tex}>{tex}</option>
              {/each}
            </select>
          </label>

          <label class="prop-row">
            <span class="prop-label">Opacity</span>
            <input
              class="prop-input"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={selectedNode.opacity}
              onfocus={handleFocus} oninput={(e) => update('opacity', parseNum((e.target as HTMLInputElement).value))}
            />
          </label>
        </section>
      {/if}
    {/if}
  </div>
</aside>

<style>
  .inspector-panel {
    display: flex;
    flex-direction: column;
    background: var(--panel-bg);
    border-left: 1px solid var(--border);
    overflow: hidden;
    min-width: 0;
  }

  .panel-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
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

  .inspector-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .empty-state {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    padding: 24px 16px;
    margin: 0;
  }

  .prop-section {
    margin-bottom: 4px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }

  .section-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    padding: 8px 12px 4px;
    margin: 0;
  }

  .prop-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    min-height: 28px;
  }

  .prop-label {
    font-size: 12px;
    color: var(--text-muted);
    flex: 0 0 70px;
    user-select: none;
  }

  .prop-input {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-size: 12px;
    font-family: var(--font-mono);
    padding: 3px 6px;
    outline: none;
    transition: border-color 0.15s;
    min-width: 0;
  }

  .prop-input:focus {
    border-color: var(--accent);
  }

  .prop-input.narrow {
    width: 60px;
    flex: 0;
  }

  .prop-value-static {
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .vec2-inputs {
    display: flex;
    gap: 10px;
    flex: 1;
  }

  .script-input-group {
    display: flex;
    gap: 4px;
    flex: 1;
  }

  .new-script-btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-muted);
    border-radius: 4px;
    width: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .new-script-btn:hover {
    background: var(--hover-bg);
    color: var(--text);
  }

  .vec2-inputs label {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
  }

  .axis-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    width: 10px;
    text-align: center;
  }
</style>
