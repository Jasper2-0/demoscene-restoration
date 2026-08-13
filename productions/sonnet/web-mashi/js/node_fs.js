// node_fs.js — the target of the `"node:fs"` entry in index.html's import map.
//
// `audio/module.mjs` and `audio/writexm.mjs` statically import `readFileSync` /
// `writeFileSync` from `node:fs`. Only the read is ever reached in the browser, and
// it is served from the registry in node_compat.js (see the header there).

import { readFileSyncShim } from './node_compat.js';

export const readFileSync = readFileSyncShim;

export function writeFileSync() {
  throw new Error('node_fs: writeFileSync is not available in the browser');
}

export function existsSync(p) {
  try { readFileSyncShim(p); return true; } catch { return false; }
}

export default { readFileSync, writeFileSync, existsSync };
