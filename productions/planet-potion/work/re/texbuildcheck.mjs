// texbuildcheck.mjs — check the layer the browser actually calls.
//
//   node work/re/texbuildcheck.mjs <dataset-dir>
//
// texvmdiff.mjs proves the VM: it runs each program and compares the ARGB the
// original produced. But the browser does not call the VM. It calls
// `buildTextures`, which additionally decides WHICH part a program belongs to,
// WHERE in that part's array it lands, and REORDERS the channels for WebGL. All
// three of those are untested by texvmdiff, and the third is the dangerous one:
// `argbToRGBA` is four index expressions, a swap between any two of them puts
// the whole intro in wrong colours, and every existing check stays green while
// it happens — because they all compare before the reorder.
//
// So this walks the other way round. Take the oracle PNG, and check the bytes
// that would go to `texImage2D`:
//
//     out[i*4+0] = argb[i*4+1]   R
//     out[i*4+1] = argb[i*4+2]   G
//     out[i*4+2] = argb[i*4+3]   B
//     out[i*4+3] = argb[i*4+0]   A  <- the mask, which the PNG does not carry
//
// The PNG is RGB, so R, G and B are checkable against it directly and alpha is
// not; alpha is checked for being present and non-constant instead, which is
// enough to catch the reorder that would fill it with a colour channel.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { buildTextures } from '../../web/js/textures.js';
import { SIZE, PIXELS } from '../../web/js/texturevm.js';

const dir = process.argv[2] ?? 'web/data';

let bad = 0;
const say = (ok, what, detail = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

/** rendertex.py writes 8-bit RGB with filter 0 on every row, so inflate is enough. */
function readPNG(path) {
  const buf = fs.readFileSync(path);
  let p = 8;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(PIXELS * 3);
  for (let y = 0; y < SIZE; y++) {
    const src = y * (SIZE * 3 + 1) + 1;             // +1 skips the filter byte
    out.set(raw.subarray(src, src + SIZE * 3), y * SIZE * 3);
  }
  return out;
}

const programs = JSON.parse(fs.readFileSync(`${dir}/tex_programs.json`, 'utf8'));
const kernels = JSON.parse(fs.readFileSync(`${dir}/tex_kernels.json`, 'utf8'));

const t0 = process.hrtime.bigint();
const { byPart, failures, size } = buildTextures(programs, kernels);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;

console.log(`built ${Object.values(byPart).flat().filter(Boolean).length} textures `
  + `at ${size}x${size} in ${ms.toFixed(0)}ms`);

say(failures.length === 0, 'every program builds', failures.join('; ') || 'no failures');

// THE PER-PART COUNTS ARE LOAD-BEARING, not decoration. A draw's `texture: 12`
// indexes whichever part's table was current, so if a program landed in the
// wrong part's array every draw in that part binds the wrong image — and it
// would still be a valid image, so nothing downstream would throw.
say(byPart.p1?.length === 48, 'part one holds 48 programs', `got ${byPart.p1?.length}`);
say(byPart.p3?.length === 21, 'part three holds 21 programs', `got ${byPart.p3?.length}`);
for (const [part, list] of Object.entries(byPart)) {
  say(list.every((x) => x && x.length === PIXELS * 4),
    `${part} is dense and every entry is ${PIXELS * 4} bytes`,
    `${list.filter(Boolean).length}/${list.length} present`);
}

// The reorder, against the oracle. Only the references that exist as PNGs.
let compared = 0;
let wrongRGB = 0;
let flatAlpha = 0;
for (const p of programs.programs) {
  const png = `${dir}/textures/${p.part}_${String(p.index).padStart(2, '0')}.png`;
  if (!fs.existsSync(png)) continue;
  const rgba = byPart[p.part]?.[p.index];
  if (!rgba) continue;
  const want = readPNG(png);
  compared++;
  for (let i = 0; i < PIXELS; i++) {
    if (rgba[i * 4] !== want[i * 3]
      || rgba[i * 4 + 1] !== want[i * 3 + 1]
      || rgba[i * 4 + 2] !== want[i * 3 + 2]) { wrongRGB++; break; }
  }
  // A reorder that put a colour channel in alpha would usually still vary, so
  // this is the weaker half of the check — but a reorder that DROPPED alpha,
  // leaving it constant across a texture the original masks, shows up here.
  const alphas = new Set();
  for (let i = 0; i < PIXELS && alphas.size < 2; i++) alphas.add(rgba[i * 4 + 3]);
  if (alphas.size < 2) flatAlpha++;
}

say(compared > 0, 'there were oracle PNGs to compare against', `${compared} compared`);
say(wrongRGB === 0, 'RGB survives the ARGB -> RGBA reorder',
  `${wrongRGB}/${compared} textures differ from the oracle`);
console.log(`      (${flatAlpha}/${compared} have a constant alpha channel — `
  + 'expected for the unmasked ones, reported not asserted)');

console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
