// texone.mjs — diff ONE synthetic opcode program against a texopref.py oracle.
//
//   node work/re/texone.mjs /tmp/opref/op9_refine.json [--rows 0,1]
//
// texopdiff.mjs runs the whole opcode suite; when a single opcode is under the
// microscope that is 30 qemu renders and a table to read past. This takes one
// reference file, runs exactly the program recorded in it, and prints the
// differing columns per row — which is what turned op9's residue from "3,494
// subpixels" into "only the odd columns, only channel 3, always high".
import fs from 'node:fs';
import { run, toARGB, SIZE } from '../../web/js/texturevm.js';

const ref = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const kernelsArg = process.argv.indexOf('--kernels');
const kernels = kernelsArg > 0
  ? JSON.parse(fs.readFileSync(process.argv[kernelsArg + 1], 'utf8')).kernels ?? {}
  : {};

const prog = ref.seed
  ? [{ op: ref.seed.op, operands: ref.seed.operands },
    { op: ref.op, operands: ref.operands }]
  : [{ op: ref.op, operands: ref.operands }];

const want = Uint8Array.from(ref.argb);
const got = toARGB(run(prog, kernels));

let diff = 0, maxd = 0;
const perRow = [];
for (let y = 0; y < SIZE; y++) {
  const cols = [];
  for (let x = 0; x < SIZE; x++) {
    let bad = 0;
    for (let c = 0; c < 4; c++) {
      const d = Math.abs(got[(y * SIZE + x) * 4 + c] - want[(y * SIZE + x) * 4 + c]);
      if (d) { bad++; diff++; if (d > maxd) maxd = d; }
    }
    if (bad) cols.push(x);
  }
  perRow.push(cols);
}

console.log(`op${ref.op} [${ref.operands}]`);
console.log(`${diff} differing subpixels, max delta ${maxd}`);

const rowsArg = process.argv.indexOf('--rows');
const rows = rowsArg > 0 ? process.argv[rowsArg + 1].split(',').map(Number)
  : perRow.findIndex(c => c.length) >= 0 ? [perRow.findIndex(c => c.length)] : [];
for (const y of rows) {
  const cols = perRow[y] ?? [];
  const even = cols.filter(x => !(x & 1)).length;
  console.log(`\nrow ${y}: ${cols.length} bad columns (even ${even}, odd ${cols.length - even})`);
  console.log(`  ${cols.join(' ')}`);
  for (const x of cols.slice(0, 8)) {
    const o = (y * SIZE + x) * 4;
    console.log(`  x=${String(x).padStart(3)}  want ${[...want.slice(o, o + 4)]}`
      + `  got ${[...got.slice(o, o + 4)]}`);
  }
}
