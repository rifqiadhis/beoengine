# BeoEngine — Project Design Document
> Version 0.1 | Status: Planning

---

## 1. Overview

**BeoEngine** is a web-based 2D game engine targeting beginner game developers and web developers familiar with JavaScript/TypeScript. It runs entirely in the browser with no installation required, while still supporting real local project folders for a professional development workflow.

| Property | Value |
|---|---|
| Engine name | BeoEngine |
| API namespace | `Beo` |
| Scene file extension | `.beo` (JSON under the hood) |
| Target platform | Chrome / Edge (File System Access API required) |
| Target users | Beginners, JS/web developers |
| Solo or team | Solo developer projects (v1) |
| License | TBD |

---

## 2. Goals & Philosophy

- **Beginner-friendly first** — API reads like plain JavaScript, sensible defaults everywhere, helpful error messages
- **Web-native** — no install, open in browser, share via URL
- **Local-first** — projects live as real files on disk, compatible with VS Code and git
- **No lock-in** — exported games are plain HTML + JS bundles, runnable anywhere
- **Familiar mental model** — component-style scripting attached to nodes, similar to Unity's approach

---

## 3. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Engine core | TypeScript | Type safety, familiar to JS devs |
| Renderer | WebGL 2 | Performance, shader support |
| Editor UI | Svelte + Vite | Lightweight, fast, low boilerplate |
| Storage | IndexedDB + File System Access API | Hybrid local/browser storage |
| Scene format | JSON (`.beo`) | Readable, git-friendly, lightweight |
| Monorepo | pnpm workspaces | Clean package separation |
| Build | Vite | Fast dev server, great TS support |

---

## 4. Architecture

```
┌─────────────────────────────────────────────────┐
│               EDITOR (Svelte + Vite)            │
│                                                 │
│  ScenePanel │ Viewport │ Inspector │ Console    │
│  AssetBrowser │ Toolbar │ MenuBar               │
└──────────────────────┬──────────────────────────┘
                       │ imports
┌──────────────────────▼──────────────────────────┐
│              ENGINE CORE (TypeScript)           │
│                                                 │
│  Engine → SceneManager → Node → Component      │
│  WebGLRenderer  │  PhysicsWorld                │
│  Input          │  AssetManager                │
│  AudioManager   │  EventEmitter                │
└──────────────────────┬──────────────────────────┘
                       │ reads/writes
┌──────────────────────▼──────────────────────────┐
│              STORAGE LAYER                      │
│                                                 │
│  File System Access API  →  real files on disk  │
│  IndexedDB               →  recent projects,    │
│                              editor state,      │
│                              asset cache        │
└─────────────────────────────────────────────────┘
```

---

## 5. Storage & Project Model (Hybrid)

BeoEngine uses a **hybrid storage model** — projects live as real files on disk, while editor state and cache live in IndexedDB.

### How it works

1. User clicks "Open Project" or "New Project"
2. `window.showDirectoryPicker()` asks the user to select or create a folder
3. Browser receives a `FileSystemDirectoryHandle` — a live reference to that folder
4. BeoEngine reads and writes real files through this handle
5. The handle is persisted in IndexedDB so the project reappears in "Recent Projects" on next visit

### Project folder structure on disk

```
my-game/
├── project.beo          ← project metadata (name, settings, entry scene)
├── scenes/
│   ├── level1.beo       ← scene files (JSON)
│   └── ui.beo
├── assets/
│   ├── textures/
│   │   └── player.png
│   └── audio/
│       └── jump.wav
└── scripts/
    ├── Player.ts
    └── Enemy.ts
```

### IndexedDB stores (browser side)

| Store | Contents |
|---|---|
| `recent_projects` | Directory handles + project name, last opened |
| `editor_state` | Last open scene, panel layout, zoom level |
| `asset_cache` | Processed/compressed versions of assets |
| `thumbnails` | Scene preview thumbnails |

### Key rule
- **Source of truth is always the disk** — IndexedDB is cache only
- Deleting IndexedDB loses nothing important; user just re-opens the folder

---

## 6. User Workflow

```
Day-to-day development:

1. Open BeoEngine in Chrome
2. Click recent project or "Open Folder"
3. Editor loads scene visually in the Viewport
4. Drag, place, and configure nodes in the editor
5. Open same folder in VS Code → edit .ts scripts
6. Save script in VS Code → BeoEngine hot reloads the scene
7. Playtest in the Viewport
8. Export → zip bundle appears in project folder
```

### Hot reload strategy

| Change type | Reload behavior |
|---|---|
| `.ts` script saved | Scene soft-reload (re-run scripts, preserve layout) |
| Texture/asset replaced | Asset hot-swap (no scene reload) |
| `.beo` scene edited externally | Full scene reload |
| Project settings changed | Editor refresh |

---

## 7. Engine Core

### 7.1 Node system

Everything in BeoEngine is a `Node`. Nodes form a tree (scene graph). Each node can have children and a parent.

```
Scene
└── Node2D "World"
    ├── Sprite "Player"
    │   └── CollisionBody "PlayerHitbox"
    ├── Sprite "Enemy"
    └── Camera2D "MainCamera"
```

### 7.2 Built-in node types (v1)

| Node | Description |
|---|---|
| `Node` | Base class, no transform |
| `Node2D` | Base 2D node with position, rotation, scale |
| `Sprite` | Renders a texture |
| `AnimatedSprite` | Sprite with frame animation |
| `Camera2D` | 2D camera with pan and zoom |
| `CollisionBody` | AABB or circle collision |
| `TileMap` | Grid-based tile rendering |
| `AudioPlayer` | Plays a sound |
| `Label` | Renders text |

### 7.3 Scripting model

Scripts are `.ts` files attached to nodes. They follow a simple lifecycle:

```typescript
import { Beo, Node2D, Input } from "beo"

export default class Player extends Node2D {
  speed = 200

  onCreate() {
    // called once when node is added to scene
  }

  onUpdate(delta: number) {
    if (Input.isPressed("ArrowRight")) {
      this.x += this.speed * delta
    }
  }

  onDestroy() {
    // called when node is removed
  }
}
```

### 7.4 Game loop

Fixed timestep with delta time passed to `onUpdate`. Target 60fps.

```
requestAnimationFrame loop
  → accumulate delta
  → run physics step (fixed 16ms)
  → call onUpdate(delta) on all nodes
  → render frame
```

### 7.5 Renderer (WebGL 2)

- Sprite batching — draw calls grouped by texture to minimize GPU overhead
- Z-order sorting — nodes rendered by `zIndex` property
- Camera transform applied as a uniform matrix
- Basic shader support (custom fragment shaders on sprites)
- Texture atlas support for performance

### 7.6 Physics (v1 — simple)

- AABB collision detection (rectangles)
- Circle collision
- No rigid body simulation in v1 — movement is manual via scripts
- Collision callbacks: `onCollide(other: Node)`
- Layers and masks for filtering collisions

### 7.7 Input

```typescript
Input.isPressed("ArrowRight")      // held down
Input.isJustPressed("Space")       // this frame only
Input.isJustReleased("Space")      // released this frame
Input.mouse.position               // { x, y } in world space
Input.mouse.isPressed(0)           // left click
```

---

## 8. Scene Format (.beo)

A `.beo` file is plain JSON. Human-readable, git-diffable.

```json
{
  "version": "0.1",
  "name": "level1",
  "background": "#1a1a2e",
  "nodes": [
    {
      "id": "node_001",
      "type": "Node2D",
      "name": "World",
      "position": { "x": 0, "y": 0 },
      "children": [
        {
          "id": "node_002",
          "type": "Sprite",
          "name": "Player",
          "position": { "x": 100, "y": 200 },
          "rotation": 0,
          "scale": { "x": 1, "y": 1 },
          "texture": "assets/textures/player.png",
          "script": "scripts/Player.ts",
          "properties": {
            "speed": 200
          }
        }
      ]
    }
  ]
}
```

---

## 9. Editor

### 9.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  MenuBar: File │ Edit │ Scene │ Project │ Help              │
├──────────┬──────────────────────────────┬───────────────────┤
│          │                              │                   │
│  Scene   │        VIEWPORT              │    Inspector      │
│  Panel   │   (live WebGL canvas)        │  (selected node   │
│          │                              │   properties)     │
│  node    │                              │                   │
│  tree    │                              │  name, position,  │
│          │                              │  rotation, scale  │
│          │                              │  texture, script  │
│          │                              │  custom props     │
├──────────┴──────────────────────────────┴───────────────────┤
│  Asset Browser: textures │ audio │ scenes │ scripts         │
├─────────────────────────────────────────────────────────────┤
│  Console: logs │ warnings │ errors                          │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Panels

| Panel | Responsibility |
|---|---|
| Scene Panel | Node hierarchy tree, add/delete/rename nodes, drag to reparent |
| Viewport | Live WebGL canvas, gizmos for move/scale, play/pause controls |
| Inspector | Edit properties of selected node, attach scripts |
| Asset Browser | Browse project assets, drag into scene |
| Console | Engine logs, script errors, warnings |

### 9.3 Svelte store architecture

```
stores/
├── project.ts     → project name, folder handle, settings
├── scene.ts       → active scene, node tree, dirty state
├── selection.ts   → currently selected node(s)
├── viewport.ts    → camera pan/zoom, gizmo mode
└── console.ts     → log entries
```

### 9.4 Editor features (v1 scope)

- Create / open / save projects
- Add, delete, rename, reparent nodes
- Move nodes with mouse drag in viewport
- Edit properties in inspector
- Drag assets from asset browser into scene
- Play / pause / stop in viewport
- Undo / redo (Ctrl+Z / Ctrl+Shift+Z)
- Recent projects list
- Export project as zip

### 9.5 Deferred features (post-v1)

- Built-in Monaco code editor
- Tilemap editor
- Animation timeline
- Prefab system
- Project settings panel
- Plugin system

---

## 10. Export

When the user exports a project:

```
Export output (zip):
├── index.html        ← entry point, loads engine
├── beo.runtime.js    ← engine runtime (minified)
├── game.bundle.js    ← compiled user scripts
├── scenes/           ← .beo scene files
└── assets/           ← textures, audio
```

The zip drops into the project folder on disk. User unzips and opens `index.html` in any browser — no server required for simple games. For games needing asset loading, a local server or hosting on itch.io works.

### Export targets

| Target | Format | How |
|---|---|---|
| Browser | HTML bundle (zip) | Open `index.html` in any browser, host on itch.io etc |
| Windows | `.exe` | Electron wraps the HTML bundle |
| macOS | `.app` | Electron wraps the HTML bundle |
| Linux | AppImage | Electron wraps the HTML bundle |
| Mobile (future) | iOS / Android app | Capacitor wraps the HTML bundle |

All desktop targets use the same HTML bundle — Electron is just a thin shell around it. One export, multiple wrappers. The game code itself never changes between targets.

---

## 11. Folder Structure (Monorepo)

```
beoengine/
├── packages/
│   ├── engine/                     ← Beo engine core (TS)
│   │   ├── src/
│   │   │   ├── core/
│   │   │   │   ├── Engine.ts           ← main entry, game loop
│   │   │   │   ├── Scene.ts            ← scene graph
│   │   │   │   ├── Node.ts             ← base node class
│   │   │   │   └── EventEmitter.ts
│   │   │   ├── nodes/
│   │   │   │   ├── Node2D.ts
│   │   │   │   ├── Sprite.ts
│   │   │   │   ├── AnimatedSprite.ts
│   │   │   │   ├── Camera2D.ts
│   │   │   │   ├── CollisionBody.ts
│   │   │   │   ├── TileMap.ts
│   │   │   │   ├── AudioPlayer.ts
│   │   │   │   └── Label.ts
│   │   │   ├── renderer/
│   │   │   │   ├── WebGLRenderer.ts
│   │   │   │   ├── SpriteBatcher.ts
│   │   │   │   ├── ShaderManager.ts
│   │   │   │   └── TextureManager.ts
│   │   │   ├── physics/
│   │   │   │   ├── PhysicsWorld.ts
│   │   │   │   ├── AABB.ts
│   │   │   │   └── CollisionLayer.ts
│   │   │   ├── input/
│   │   │   │   └── Input.ts
│   │   │   ├── audio/
│   │   │   │   └── AudioManager.ts
│   │   │   └── assets/
│   │   │       └── AssetManager.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── editor/                     ← Svelte editor app
│       ├── src/
│       │   ├── App.svelte
│       │   ├── panels/
│       │   │   ├── ScenePanel.svelte
│       │   │   ├── Inspector.svelte
│       │   │   ├── Viewport.svelte
│       │   │   ├── AssetBrowser.svelte
│       │   │   └── Console.svelte
│       │   ├── stores/
│       │   │   ├── project.ts
│       │   │   ├── scene.ts
│       │   │   ├── selection.ts
│       │   │   ├── viewport.ts
│       │   │   └── console.ts
│       │   ├── idb/
│       │   │   └── storage.ts      ← IndexedDB wrapper
│       │   └── fs/
│       │       └── filesystem.ts   ← File System Access API wrapper
│       ├── package.json
│       └── vite.config.ts
│
├── docs/                           ← documentation site
├── examples/                       ← starter projects
│   └── blank/
│       └── project.beo
├── package.json                    ← pnpm workspace root
└── README.md
```

---

## 12. Distribution & Hosting

BeoEngine is **free to use, not open source**. Source code is private.

| Property | Decision |
|---|---|
| License | Proprietary — free to use, not open source |
| Distribution | Hosted website (e.g. `beoengine.dev`) |
| Install required | None — open URL in Chrome/Edge and start building |
| Repository | Private GitHub repo |

The hosted approach means zero friction for beginners — no cloning, no npm install, just open a link and make a game.

---

## 13. Camera System

- **A default `Camera2D` always exists** in every scene — beginners never need to add one manually
- The default camera is centered at `(0, 0)` with no zoom
- Following a node is done via script, one line:

```typescript
// in any script's onCreate()
Beo.camera.follow(this) // camera follows this node
Beo.camera.follow(this, { lerp: 0.1 }) // smooth follow
Beo.camera.follow(null) // stop following
```

- **No multiple cameras in v1** — single camera per scene only
- Camera properties editable in inspector: position, zoom, follow target, follow lerp

---

## 14. Supported Asset Types

| Asset type | Formats | Notes |
|---|---|---|
| Textures | PNG, JPG, WebP | Browser-native, no conversion needed |
| Audio | MP3, OGG, WAV | Browser-native |
| Fonts | TTF, WOFF2 | Used by `Label` node |
| Tilemaps | `.beo` native only | Tiled `.tmx` import deferred to post-v1 |

No asset conversion pipeline needed in v1 — the browser handles all these formats natively. Assets are referenced by relative path from the project folder.

---

## 15. Error Handling UX

Beginner-friendly error handling is a first-class feature. When a script throws an error:

**In the viewport:**
- A red overlay appears with the error message and the node name that caused it
- Other nodes continue running — one broken script doesn't kill the whole game
- Clicking the overlay dismisses it and focuses the Console panel

**In the console:**
- The erroring node is highlighted in red
- Stack trace shown with file name and line number
- Clicking the error jumps to the node in the Scene Panel

**Example overlay message:**
```
⚠ Script error in "Enemy"
TypeError: Cannot read properties of undefined (reading 'x')
  at Enemy.onUpdate (scripts/Enemy.ts:14)
```

This means beginners get immediate, visible feedback rather than a silent broken game.

---



### Milestone 1 — Engine Core
- [ ] Game loop (`Engine.ts`)
- [ ] Base `Node` and `Node2D`
- [ ] `WebGLRenderer` — render a colored rect
- [ ] `Sprite` — render a texture
- [ ] `Input` — keyboard and mouse
- [ ] `Scene` — add/remove/update nodes
- [ ] Playable in browser with no editor

### Milestone 2 — Editor Shell
- [ ] Svelte + Vite project setup
- [ ] File System Access API integration
- [ ] IndexedDB for recent projects
- [ ] Basic layout (Scene Panel, Viewport, Inspector)
- [ ] Engine running inside Viewport canvas

### Milestone 3 — Scene Editing
- [ ] Load/save `.beo` files
- [ ] Add nodes via editor
- [ ] Move nodes with mouse in viewport
- [ ] Inspector editing (position, scale, texture)
- [ ] Undo/redo system

### Milestone 4 — Scripting & Hot Reload
- [ ] Attach `.ts` scripts to nodes
- [ ] File watcher → detect external saves
- [ ] Scene hot reload on script change
- [ ] Asset hot-swap on texture change

### Milestone 5 — Physics & Collisions
- [ ] AABB collision detection
- [ ] Circle collision
- [ ] `onCollide` callbacks
- [ ] Collision layers and masks

### Milestone 6 — Export
- [ ] Bundle scenes + assets + runtime
- [ ] Generate `index.html`
- [ ] Zip and save to project folder (browser target)
- [ ] Electron wrapper for Windows `.exe` build
- [ ] Electron wrapper for macOS `.app` build
- [ ] Electron wrapper for Linux AppImage build

### Milestone 7 — Polish
- [ ] Asset Browser panel
- [ ] Console panel with script errors
- [ ] `TileMap` node
- [ ] `AnimatedSprite` node
- [ ] `Label` node
- [ ] `AudioPlayer` node

### Deferred
- Built-in Monaco code editor
- Mobile export via Capacitor
- Animation timeline
- Prefab system

---

## 17. Browser Compatibility

| Browser | Support | Notes |
|---|---|---|
| Chrome 86+ | ✅ Full | Primary target |
| Edge 86+ | ✅ Full | File System Access API supported |
| Firefox | ⚠️ Partial | No File System Access API — read-only mode or IndexedDB fallback |
| Safari | ⚠️ Partial | Limited File System Access API support |
| Mobile browsers | ❌ Editor not supported | Exported games work on mobile browsers |

---

*BeoEngine Design Doc v0.1 — subject to change as development progresses*