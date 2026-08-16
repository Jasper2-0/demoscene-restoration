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
import { decode, run, toARGB, SIZE, PIXELS } from '../../web/js/texturevm.js';

const dir = process.argv[2];
const WIDTHS = [3, 20, 13, 12, 1, 10, 12, 9, 18, 12, 1, 1, 1, 1, 1, 1, 127, 3, 4, 0];

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
    const { ops } = decode(Uint8Array.from(Buffer.from(p.hex, 'hex')), WIDTHS);
    got = toARGB(run(ops, kernels));
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
console.log('worst two:');
for (const d of dist.slice(-2)) console.log(`  ${d.id.padEnd(8)} ${d.diff} differing subpixels, max delta ${d.maxd}`);
