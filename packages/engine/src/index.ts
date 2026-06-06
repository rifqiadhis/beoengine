/**
 * BeoEngine — Public API
 * Import anything from "beo" in user scripts.
 *
 * @example
 * import { Engine, Node2D, Sprite, Input } from 'beo'
 */

// Core
export { Engine }         from './core/Engine.ts'
export { Scene }          from './core/Scene.ts'
export { Node }           from './core/Node.ts'
export { EventEmitter }   from './core/EventEmitter.ts'
export { SceneSerializer, ScriptRegistry } from './core/SceneSerializer.ts'

// Nodes
export { Node2D }         from './nodes/Node2D.ts'
export { Sprite }         from './nodes/Sprite.ts'
export { Camera2D }       from './nodes/Camera2D.ts'
export { CollisionBody }  from './nodes/CollisionBody.ts'

// Physics
export { PhysicsWorld }   from './physics/PhysicsWorld.ts'

// Renderer
export { WebGLRenderer }  from './renderer/WebGLRenderer.ts'
export { SpriteBatcher }  from './renderer/SpriteBatcher.ts'
export { ShaderManager }  from './renderer/ShaderManager.ts'
export { TextureManager } from './renderer/TextureManager.ts'

// Input
export { Input }          from './input/Input.ts'

// Audio
export { AudioManager }   from './audio/AudioManager.ts'

// Assets
export { AssetManager }   from './assets/AssetManager.ts'

// Re-export types
export type { EngineOptions }   from './core/Engine.ts'
export type { FollowOptions }   from './nodes/Camera2D.ts'
export type { TextureInfo }     from './renderer/TextureManager.ts'
export type { MouseState }      from './input/Input.ts'
