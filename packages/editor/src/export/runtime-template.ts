/**
 * BeoEngine — Runtime Template
 * Generates a single self-contained index.html for exported games.
 * Everything is inlined — no server required. Just open the file.
 */

interface RuntimeTemplateOptions {
  projectName: string
  runtimeJS: string
  gameBundleJS: string
  sceneJSON: string
  /** Map of asset path → base64 data URI */
  assetDataURIs: Record<string, string>
}

export function generateSingleFileHTML(options: RuntimeTemplateOptions): string {
  const { projectName, runtimeJS, gameBundleJS, sceneJSON, assetDataURIs } = options

  // Build the asset map as inline JS
  const assetMapEntries = Object.entries(assetDataURIs)
    .map(([path, dataURI]) => `    ${JSON.stringify(path)}: ${JSON.stringify(dataURI)}`)
    .join(',\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(projectName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>

  <!-- BeoEngine Runtime (inlined) -->
  <script>
${runtimeJS}
  </script>

  <!-- Embedded Assets -->
  <script>
    window.__BEO_ASSETS__ = {
${assetMapEntries}
    };
  </script>

  <!-- User Scripts (inlined) -->
  <script>
${gameBundleJS}
  </script>

  <!-- Embedded Scene Data -->
  <script>
    window.__BEO_SCENE__ = ${sceneJSON};
  </script>

  <!-- Bootstrap -->
  <script>
    (function boot() {
      var BeoEngine = window.BeoEngine;
      var Engine = BeoEngine.Engine;
      var SceneSerializer = BeoEngine.SceneSerializer;
      var ScriptRegistry = BeoEngine.ScriptRegistry;

      var canvas = document.getElementById('game-canvas');
      var engine = new Engine({ canvas: canvas });

      // Register user script classes
      if (window.__BEO_SCRIPTS__) {
        var scripts = window.__BEO_SCRIPTS__;
        for (var path in scripts) {
          if (scripts.hasOwnProperty(path)) {
            ScriptRegistry.set(path, scripts[path]);
          }
        }
      }

      // Asset resolver: return inlined data URIs
      var assets = window.__BEO_ASSETS__ || {};
      engine.setAssetResolver(function(path) {
        if (assets[path]) {
          return Promise.resolve(assets[path]);
        }
        return Promise.resolve(path);
      });

      // Load the embedded scene
      try {
        var sceneData = window.__BEO_SCENE__;
        var scene = SceneSerializer.deserialize(JSON.stringify(sceneData));
        engine.loadScene(scene);
        engine.start();
      } catch (err) {
        console.error('[BeoEngine] Failed to load scene:', err);
        document.body.innerHTML = '<div style="color:#ef4444;padding:40px;font-family:monospace;">' +
          '<h2>Failed to load game</h2><p>' + err.message + '</p></div>';
      }
    })();
  </script>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
