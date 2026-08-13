// modulegraph.mjs — every ES module the browser runtime actually reaches,
// walked from web/js/main.js.
//
// `build-sonnet.sh` uses this to decide what to ship, so the deploy file list is
// DERIVED rather than remembered. A `cp js/*.mjs` glob shipped seven files the
// browser never loads (bake_tex, meshgen_test, kernel_scaling_test, …), which is
// both wasteful and misleading: a reader of the dist cannot tell runtime from
// tooling.
//
//   node web/test/modulegraph.mjs            # paths relative to productions/sonnet/
//   node web/test/modulegraph.mjs --check    # also verify every file exists
//
// Static `import`/`export … from` and dynamic `import('…')` are both followed.
// Bare specifiers are NOT followed: the only one is `node:fs`, which resolves
// through index.html's import map to web/js/node_fs.js and is therefore
// listed explicitly below — a static walk cannot see it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.resolve(HERE, '..', '..');
const ENTRY = path.join(WORK, 'web/js/main.js');

// Reached only via the import map in index.html.
const IMPORT_MAP_TARGETS = ['web/js/node_fs.js'];

const seen = new Set();
const missing = [];

function walk(file) {
  if (seen.has(file)) return;
  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    missing.push(path.relative(WORK, file));
    return;
  }
  seen.add(file);
  // Strip comments first: this codebase documents unported features by naming
  // their modules in prose, and a commented-out import would otherwise be
  // shipped as if it were live.
  src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const specs = [];
  for (const m of src.matchAll(/from\s*['"]([^'"]+)['"]/g)) specs.push(m[1]);
  for (const m of src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  for (const s of specs) if (s.startsWith('.')) walk(path.resolve(path.dirname(file), s));
}

walk(ENTRY);
for (const extra of IMPORT_MAP_TARGETS) walk(path.join(WORK, extra));

const list = [...seen].map((f) => path.relative(WORK, f)).sort();

if (process.argv.includes('--check')) {
  let bad = 0;
  for (const r of list) {
    if (!fs.existsSync(path.join(WORK, r))) { console.error('MISSING ' + r); bad++; }
  }
  for (const m of missing) { console.error('UNRESOLVED ' + m); bad++; }
  console.error(`${list.length} modules, ${bad} problem(s)`);
  process.exit(bad ? 1 : 0);
}

if (missing.length) {
  console.error('warning: unresolved specifiers:\n  ' + missing.join('\n  '));
}
console.log(list.join('\n'));
