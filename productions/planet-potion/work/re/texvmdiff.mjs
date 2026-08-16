// texvmdiff.mjs — run the JS texture VM and diff against the original's output.
//
//   node work/re/texvmdiff.mjs <dataset-dir>
//
// This is the test that can actually fail. The 69 PNGs are byte-exact output of
// the intro's own code under qemu; a reimplementation either reproduces them or
// does not. Coverage percentages say an implementation exists, which is a much
// weaker claim.
import fs from 'node:fs';
import zlib from 'node:zlib';
import {
  decode, run, toARGB, SIZE, PIXELS, OPERAND_WIDTHS,
} from '../../web/js/texturevm.js';

const dir = process.argv[2];

/** rendertex.py writes 8-bit RGB with filter 0 on every row, so inflate is enough. */
function readPNG(path) {
  const buf = fs.readFileSync(path);
  let p = 8, idat = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p), tag = buf.toString('ascii', p + 4, p + 8);
    if (tag === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + n));
    p += 12 + n;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(PIXELS * 3);
  for (let y = 0; y < SIZE; y++) {
    if (raw[y * (SIZE * 3 + 1)] !== 0) throw new Error('unexpected PNG filter');
    out.set(raw.subarray(y * (SIZE * 3 + 1) + 1, (y + 1) * (SIZE * 3 + 1)), y * SIZE * 3);
  }
  return out;
}

const kernelDoc = JSON.parse(fs.readFileSync(`${dir}/tex_kernels.json`, 'utf8'));
const kernels = {};
// The file keys by "0x50" and wraps each entry as {kernel, sum, maxError}.
for (const [k, v] of Object.entries(kernelDoc.kernels ?? kernelDoc)) {
  kernels[Number(k)] = Array.isArray(v) ? v : (v.kernel ?? v.weights);
}
const progs = JSON.parse(fs.readFileSync(`${dir}/tex_programs.json`, 'utf8')).programs;

let exact = 0, ran = 0, failed = 0, trivialHits = 0;
const dist = [];
for (const p of progs) {
  if (!p.hex) continue;
  const png = `${dir}/textures/${p.part}_${String(p.index).padStart(2, '0')}.png`;
  if (!fs.existsSync(png)) continue;
  let got;
  try {
    const { ops } = decode(Uint8Array.from(Buffer.from(p.hex, 'hex')));
    got = toARGB(run(ops, kernels));           // the whole Surfaces: alpha is the mask
    ran++;
  } catch (e) { failed++; continue; }
  const want = readPNG(png);
  // A uniform reference is a FREE PASS: 25 of the 69 are a single colour, and an
  // implementation that produced nothing but black would "match" all of them.
  // Count them separately or the diff reports its own failure as success.
  const uniform = new Set();
  for (let i = 0; i < PIXELS; i++) uniform.add(`${want[i * 3]},${want[i * 3 + 1]},${want[i * 3 + 2]}`);
  const trivial = uniform.size === 1;
  let diff = 0, maxd = 0;
  for (let i = 0; i < PIXELS; i++) {
    for (let c = 0; c < 3; c++) {
      // export.py writes ARGB as RGB by dropping the first channel.
      const d = Math.abs(got[i * 4 + 1 + c] - want[i * 3 + c]);
      if (d) { diff++; if (d > maxd) maxd = d; }
    }
  }
  if (diff === 0) { if (trivial) trivialHits++; else exact++; }
  dist.push({ id: `${p.part}_${p.index}`, diff, maxd, trivial });
}
dist.sort((a, b) => a.diff - b.diff);
console.log(`ran ${ran} programs, ${failed} threw`);
console.log(`EXACT MATCHES on NON-TRIVIAL references: ${exact}`);
console.log(`(plus ${trivialHits} uniform references matched, which proves nothing)`);
console.log('\nclosest five:');
for (const d of dist.filter((x) => !x.trivial).slice(0, 5)) console.log(`  ${d.id.padEnd(8)} ${d.diff} differing subpixels, max delta ${d.maxd}`);
console.log('\nevery non-trivial reference still differing:');
for (const d of dist.filter((x) => !x.trivial && x.diff)) {
  console.log(`  ${d.id.padEnd(8)} ${String(d.diff).padStart(6)} differing subpixels, max delta ${d.maxd}`);
}

// THE OPERAND TABLE THE PLAYER SHIPS, AGAINST THE ONE THAT WAS MEASURED.
// texturevm.js carries the table read out of the binary; tex_operands.json
// carries what probing each operand actually moved. They are independent, so
// they are worth diffing — with op 16's 127 folded to 1, since 127 is the
// sentinel `decode` folds and the probe recorded the folded width. Without the
// fold this reports a difference that is only a difference in notation.
let tableBad = 0;
try {
  const measured = JSON.parse(fs.readFileSync(`${dir}/tex_operands.json`, 'utf8')).opcodes;
  for (let op = 0; op < OPERAND_WIDTHS.length; op++) {
    const mine = OPERAND_WIDTHS[op] === 0x7f ? 1 : OPERAND_WIDTHS[op];
    const theirs = measured[String(op)]?.operands;
    if (theirs !== undefined && theirs !== mine) {
      console.log(`  op ${op}: shim says ${mine}, tex_operands.json says ${theirs}`);
      tableBad++;
    }
  }
  console.log(`\n${tableBad ? 'FAIL' : 'ok  '}  the shipped operand table matches the measured one`);
} catch (e) {
  console.log(`\n(no tex_operands.json in ${dir}, operand table not cross-checked)`);
}

// AND AN EXIT CODE, which this tool did not have. checkall.sh runs it with
// `|| rc=1`, so until now the one check that can actually fail could not fail
// the suite: it printed its differences and exited 0 like everything else.
const differing = dist.filter((x) => !x.trivial && x.diff).length;
const bad = failed + differing + tableBad;
console.log(bad === 0
  ? 'ok    every non-trivial reference reproduced exactly'
  : `FAIL  ${differing} differ, ${failed} threw, ${tableBad} operand widths disagree`);
process.exit(bad ? 1 : 0);
