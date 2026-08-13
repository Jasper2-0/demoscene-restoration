// flatten_mjs.mjs — rename every shipped `.mjs` module to `.js` inside a built
// dist, rewriting the import specifiers that point at them.
//
//   node web/test/flatten_mjs.mjs <dist-root>
//
// WHY. `.mjs` is a Node convention, not a web one. Plenty of real web servers
// have no `.mjs` entry in their MIME table and send the file with **no
// Content-Type at all** — and the HTML spec requires a JavaScript MIME type for
// module scripts, so the browser refuses to execute them. The page then shows
// its static markup (Sonnet's "click to start" overlay is in index.html) and
// does nothing, with the only clue in the console.
//
// Observed on www.jasperschelling.nl, 2026-08-10: `main.js` came back as
// `application/javascript` and every `.mjs` came back with no Content-Type.
//
// Fixing it by renaming is strictly more robust than shipping an `.htaccess`
// with `AddType`: it depends on nothing server-side and works on any host. The
// WORKING TREE keeps `.mjs` — that is correct for Node, and the test suite
// imports those paths — so this is a build-time transform, not a source change.
//
// Specifiers are rewritten only inside `from '…'` and `import('…')`, never in
// prose: this codebase names modules in comments constantly, and rewriting
// those would make the shipped comments describe files that do not exist in the
// repository they were copied from.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2];
if (!ROOT || !fs.existsSync(ROOT)) {
  console.error('usage: node flatten_mjs.mjs <dist-root>');
  process.exit(2);
}

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
})(ROOT);

// 1. rename
const renamed = [];
for (const f of files) {
  if (!f.endsWith('.mjs')) continue;
  const to = f.slice(0, -4) + '.js';
  fs.renameSync(f, to);
  renamed.push(path.relative(ROOT, f));
}

// 2. rewrite specifiers in every remaining JS file
const jsFiles = files
  .map((f) => (f.endsWith('.mjs') ? f.slice(0, -4) + '.js' : f))
  .filter((f) => f.endsWith('.js'));

let edits = 0;
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const out = src.replace(
    /(\bfrom\s*|\bimport\s*\(\s*)(['"])([^'"]+?)\.mjs\2/g,
    (_m, lead, q, spec) => { edits++; return `${lead}${q}${spec}.js${q}`; },
  );
  if (out !== src) fs.writeFileSync(f, out);
}

// 3. assert nothing still points at a .mjs, and nothing named .mjs survives
const left = [];
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+\.mjs)['"]/g)) {
    left.push(`${path.relative(ROOT, f)} -> ${m[1]}`);
  }
}
const stragglers = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.mjs')) stragglers.push(path.relative(ROOT, p));
  }
})(ROOT);

if (left.length || stragglers.length) {
  if (left.length) console.error('unrewritten specifiers:\n  ' + left.join('\n  '));
  if (stragglers.length) console.error('leftover .mjs files:\n  ' + stragglers.join('\n  '));
  process.exit(1);
}

console.log(`  flattened ${renamed.length} .mjs -> .js, rewrote ${edits} specifier(s)`);
