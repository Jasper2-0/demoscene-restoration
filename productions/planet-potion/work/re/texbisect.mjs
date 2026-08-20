// texbisect.mjs — name the first opcode whose float surface diverges.
//
//   node work/re/texbisect.mjs /tmp/texbisect p1_15 [--kernels tex_kernels.json]
//
// Reads the prefix surfaces texbisect.py wrote and runs the same prefixes in JS,
// comparing float32 values rather than the 8-bit texture — so a divergence is
// reported at the opcode that introduced it, not at the one that finally pushed
// it across a rounding boundary.
import fs from 'node:fs';
import { run, PIXELS } from '../../web/js/texturevm.js';

const dir = process.argv[2], name = process.argv[3];
const ki = process.argv.indexOf('--kernels');
const kernels = {};
if (ki > 0) {
  const doc = JSON.parse(fs.readFileSync(process.argv[ki + 1], 'utf8'));
  for (const [k, v] of Object.entries(doc.kernels ?? doc)) {
    kernels[Number(k)] = Array.isArray(v) ? v : (v.kernel ?? v.weights);
  }
}

const meta = JSON.parse(fs.readFileSync(`${dir}/${name}.json`, 'utf8'));
for (const p of meta.prefixes) {
  const want = JSON.parse(fs.readFileSync(`${dir}/${p.file}`, 'utf8')).floats;
  const got = run(meta.ops.slice(0, p.k), kernels).current;
  let n = 0, first = null, high = 0;
  for (let i = 0; i < PIXELS * 4; i++) {
    if (got[i] !== want[i]) {
      n++;
      if (got[i] > want[i]) high++;
      if (!first) {
        first = `px ${(i >> 2) % 128},${(i >> 2) / 128 | 0} ch${i & 3}`
          + `  want ${want[i]}  got ${got[i]}`;
      }
    }
  }
  const label = p.op < 20 ? `op${p.op}` : `0x${p.op.toString(16)}`;
  console.log(`${p.k === 1 ? '' : ''}${String(p.k).padStart(2)}  ${label.padEnd(6)}`
    + `${n === 0 ? 'identical' : `${n} floats differ (${high} high)`}`);
  if (n) { console.log(`      ${first}`); break; }
}
