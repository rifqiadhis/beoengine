import { transform } from "sucrase";

const tsCode = `
import { Sprite, Input } from "beo"

export default class player extends Sprite {
  onCreate() {
  }
  onUpdate(delta: number) {
    this.x += 100 * delta
  }
}
`;

const jsCode = transform(tsCode, { transforms: ["typescript"], production: true }).code;
console.log("SUCRASE OUTPUT:");
console.log(jsCode);

let replaced = jsCode.replace(
  /import\s+{([^}]+)}\s+from\s+['"]beo['"];?/g,
  'const {$1} = window.BeoEngine;'
);
replaced = replaced.replace(
  /import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+['"]beo['"];?/g,
  'const $1 = window.BeoEngine;'
);
console.log("\nREPLACED OUTPUT:");
console.log(replaced);
