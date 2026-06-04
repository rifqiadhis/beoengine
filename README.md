# BeoEngine

BeoEngine is a web-based 2D game engine targeting beginner game developers and web developers familiar with JavaScript/TypeScript. It runs entirely in the browser with no installation required, while still supporting real local project folders for a professional development workflow.

## 🌟 Key Features

*   **Beginner-friendly first** — API reads like plain JavaScript, sensible defaults everywhere, and helpful error messages.
*   **Web-native** — No installation required. Open in your browser and start creating.
*   **Local-first Workflow** — Projects live as real files on disk using the File System Access API. Compatible with VS Code, Git, and standard developer workflows.
*   **Node-Based Scene Graph** — Familiar mental model with component-style scripting attached to nodes.
*   **No lock-in** — Exported games are plain HTML + JS bundles, runnable anywhere and easily wrappable with tools like Electron or Capacitor.

## 🛠️ Tech Stack

*   **Engine Core**: TypeScript
*   **Renderer**: WebGL 2
*   **Editor UI**: Svelte + Vite
*   **Storage**: File System Access API (Local Files) + IndexedDB (Cache/State)
*   **Monorepo Management**: pnpm workspaces

## 📂 Project Structure

This project is structured as a monorepo using pnpm workspaces:

*   **`packages/engine/`**: The core BeoEngine runtime, game loop, scene graph, rendering, and input handling.
*   **`packages/editor/`**: The web-based IDE built with Svelte and Vite.
*   **`docs/`**: Documentation site (planned).
*   **`examples/`**: Starter projects (planned).

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/)
*   [pnpm](https://pnpm.io/)

### Installation & Running

1.  Clone the repository:
    ```bash
    git clone https://github.com/rifqiadhis/beoengine.git
    cd beoengine
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Start the development server (runs the editor):
    ```bash
    pnpm dev
    ```

4.  Open the provided localhost URL in a supported browser (Chrome or Edge recommended for full File System Access API support).

## 🎮 Scripting Example

Scripts in BeoEngine are written in TypeScript and attach directly to nodes:

```typescript
import { Beo, Node2D, Input } from "beo"

export default class Player extends Node2D {
  speed = 200

  onUpdate(delta: number) {
    if (Input.isPressed("ArrowRight")) {
      this.x += this.speed * delta
    }
  }
}
```

## 📄 License

Proprietary — Free to use, not open source.
