import { transform } from 'sucrase'

/**
 * Transpiles TypeScript source code to JavaScript that can be executed in the browser.
 * It also rewrites imports of "beo" to use the globally exposed window.BeoEngine object.
 */
export function compileTS(code: string): string {
  // Transpile TypeScript to standard JS module syntax using sucrase
  const result = transform(code, {
    transforms: ['typescript'],
    production: true,
  })

  let jsCode = result.code

  // Rewrite import from "beo" to use window.BeoEngine
  // e.g., import { Node2D, Input } from "beo"
  // becomes const { Node2D, Input } = window.BeoEngine
  
  // This regex matches: import { ... } from "beo" or import * as Beo from "beo"
  jsCode = jsCode.replace(
    /import\s+{([^}]+)}\s+from\s+['"]beo['"]/g,
    'const {$1} = window.BeoEngine;'
  )

  // Match import * as Beo from "beo"
  jsCode = jsCode.replace(
    /import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+['"]beo['"]/g,
    'const $1 = window.BeoEngine;'
  )

  // Remove empty imports if any, like import "beo"
  jsCode = jsCode.replace(
    /import\s+['"]beo['"];?/g,
    ''
  )

  return jsCode
}
