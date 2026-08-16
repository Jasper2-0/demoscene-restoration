// texopdiff.mjs — diff each texture opcode against its own oracle.
//
//   node work/re/texopdiff.mjs /tmp/opsuite2
//
// The whole-program diff cannot isolate an opcode and cannot see one at all when
// a later opcode overwrites the surface — op9 was wrong three ways while every
// program using it still matched. texopsuite.py renders each opcode ALONE
// (after a fixed op9 seed, so the input is non-trivial) with the intro's own
// _generate. This runs the same pair in JS and compares.
import fs from 'node:fs';
import { decode, run, toARGB, PIXELS } from '../../web/js/texturevm.js';

const dir = process.argv[2] ?? '/tmp/opsuite2';
const index = JSON.parse(fs.readFileSync(`${dir}/index.json`, 'utf8'));
const kernelDoc = JSON.parse(fs.readFileSync(process.argv[3]
  ?? `${process.env.HOME}/kernels.json`, 'utf8'));
const kernels = {};
for (const [k, v] of Object.entries(kernelDoc.kernels ?? kernelDoc)) {
  kernels[Number(k)] = Array.isArray(v) ? v : (v.kernel ?? v.weights);
}

const rows = [];
for (const [opStr, meta] of Object.entries(index.ops)) {
  const op = Number(opStr);
  const ref = JSON.parse(fs.readFileSync(`${dir}/${meta.file}`, 'utf8'));
  const want = Uint8Array.from(ref.argb);
  const ops = [{ op: ref.seed.op, operands: ref.seed.operands },
    { op, operands: ref.operands }];
  let got;
  try { got = toARGB(run(ops, kernels)); }
  catch (e) { rows.push({ op, err: e.message }); continue; }
  let diff = 0, maxd = 0;
  for (let i = 0; i < PIXELS; i++) {
    for (let c = 0; c < 4; c++) {          // all four: alpha is 255 - mask
      const d = Math.abs(got[i * 4 + c] - want[i * 4 + c]);
      if (d) { diff++; if (d > maxd) maxd = d; }
    }
  }
  rows.push({ op, diff, maxd, uniq: meta.distinctPixels });
}

rows.sort((a, b) => (a.diff ?? 1e9) - (b.diff ?? 1e9));
let exact = 0;
for (const r of rows) {
  if (r.err) { console.log(`op${String(r.op).padEnd(4)} ERROR ${r.err}`); continue; }
  if (r.diff === 0) exact++;
  const label = r.op < 20 ? `op${r.op}` : `kernel 0x${r.op.toString(16)}`;
  console.log(`${r.diff === 0 ? 'ok  ' : 'FAIL'}  ${label.padEnd(13)}`
    + `${String(r.diff).padStart(6)} differing subpixels, max delta ${r.maxd}`);
}
console.log(`\n${exact}/${rows.length} opcodes byte-exact in isolation`);

// An exit code, for the same reason texvmdiff needed one: checkall.sh reads it,
// and a suite that always exits 0 is a report, not a check.
process.exit(exact === rows.length ? 0 : 1);
