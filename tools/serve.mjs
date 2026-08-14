// serve.mjs — run a production's web tree so you can watch it.
//
//   node tools/serve.mjs lapsus
//   node tools/serve.mjs productions/lapsus/web        (any path also works)
//
// Uses the same server the verification harnesses use, which matters: it
// serves CASE-EXACTLY, so an asset reference that would 404 on GitHub Pages
// 404s here too rather than working locally and breaking on deploy.
import path from 'node:path';
import fs from 'node:fs';
import { serve, fromRepo } from './harness/index.mjs';

const arg = process.argv[2];
if (!arg) {
  const names = fs.readdirSync(fromRepo('productions'), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();
  console.error('usage: node tools/serve.mjs <production|path>\n' +
                `       productions: ${names.join(', ')}`);
  process.exit(2);
}

// A bare slug means "that production", and its web tree is the document root
// so `/` is the demo — but the page also reaches back into work/ for the
// unpacked assets, so serve the production directory and open /web/.
const asProd = fromRepo('productions', arg);
const root = fs.existsSync(asProd) ? asProd : path.resolve(arg);
if (!fs.existsSync(root)) { console.error(`no such path: ${root}`); process.exit(2); }
const sub = fs.existsSync(path.join(root, 'web', 'index.html')) ? '/web/' : '/';

const server = await serve(root);
const url = (server.url ?? `http://localhost:${server.port}`).replace(/\/$/, '') + sub;
console.log(`\n  ${path.basename(root)}  ->  ${url}\n`);
console.log('  ctrl-c to stop\n');
