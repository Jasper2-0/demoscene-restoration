// serve.mjs — open the inspector on a production.
//
//   node tools/inspect/serve.mjs lapsus
//   node tools/inspect/serve.mjs lapsus --tag=after-fix
//
// Serves the REPO ROOT, because the inspector page needs three things that
// live in different trees: itself (tools/inspect/web/), the production's demo
// (productions/<p>/web/), and the sweep's results and cached reference frames
// (productions/<p>/work/verify/inspect/). One root keeps it to one origin, so
// the inspector can reach into the iframe for the adapter.
import fs from 'node:fs';
import { serve, fromRepo } from '../harness/index.mjs';

const argv = process.argv.slice(2);
const prod = argv.find((a) => !a.startsWith('--'));
const tag = (argv.find((a) => a.startsWith('--tag=')) ?? '').slice(6);
if (!prod) {
  const names = fs.readdirSync(fromRepo('productions'), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();
  console.error(`usage: node tools/inspect/serve.mjs <production> [--tag=x]\n` +
                `       productions: ${names.join(', ')}`);
  process.exit(2);
}
if (!fs.existsSync(fromRepo('productions', prod, 'web', 'index.html'))) {
  console.error(`${prod} has no web/index.html`); process.exit(2);
}
const run = fromRepo('productions', prod, 'work/verify/inspect', `run${tag ? `-${tag}` : ''}.json`);
if (!fs.existsSync(run)) {
  console.warn(`  note: no sweep results yet (${run.split('/').slice(-1)[0]}).\n` +
               `  the inspector still scrubs, just without scores:\n` +
               `    node tools/inspect/sweep.mjs ${prod}\n`);
}

const s = await serve(fromRepo('.'));
const url = `${s.url}/tools/inspect/web/index.html?prod=${prod}${tag ? `&tag=${tag}` : ''}`;
console.log(`\n  inspector  ->  ${url}\n`);
console.log('  ctrl-c to stop\n');
