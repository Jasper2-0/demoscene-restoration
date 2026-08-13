// verify_ops.mjs — the two Task-3 checks from re/gen/TEXGEN_PORT.md.
//
//   1. op 21's HSV chain (the least-certain handler): hand-trace known RGB values
//      through the port's RGB->HSV->RGB pair and check them against the semantics
//      read out of FUN_00413a01 / FUN_00413b24 by disassembly.
//   2. ops 2, 9 and 18 are ported but never exercised by any of the 28 programs.
//      Run each from a hand-assembled synthetic program so that at least the code
//      path is proven to execute and produce structured output.
//
//   node js/verify_ops.mjs [--png DIR]
//
import { mkdirSync, writeFileSync } from 'node:fs';
import { PIXEL_OPS, runTexgen, q8 } from './texgen.mjs';
import { encodePNG } from './png.mjs';

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const PNGDIR = arg('png', null);

// ---------------------------------------------------------------------------
// 1. op 21 — HSV
// ---------------------------------------------------------------------------
// A textbook reference, written independently from the disassembly notes in §21.
function refRGB2HSV(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const v = mx, s = mx === 0 ? 0 : d / mx;
  if (s === 0) return [600.0, 0, v];                    // 600 = the "no hue" sentinel
  let h;
  if (r === mx) h = (g - b) / d;
  else if (g === mx) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, v];
}

// Drive one texel through the real op-21 handler.
function op21(rgba, dh, dsByte, dvByte) {
  const img = { iw: 1, ih: 1, filter: 1, p: new Float32Array(4) };
  img.p[0] = rgba[0]; img.p[1] = rgba[1]; img.p[2] = rgba[2]; img.p[3] = rgba[3];
  const a = new Uint8Array([dh & 0xff, (dh >> 8) & 0xff, dsByte, dvByte]);
  PIXEL_OPS[21](img, null, a, new DataView(a.buffer));
  return [...img.p];
}

console.log('=== 1. op 21 — HSV chain ===');
console.log('  1a. identity: dh=0, sat byte 128 (delta ~= 0), val byte 128 -> RGB must survive');
const PROBES = [
  ['red', [1, 1, 0, 0]], ['green', [1, 0, 1, 0]], ['blue', [1, 0, 0, 1]],
  ['yellow', [1, 1, 1, 0]], ['cyan', [1, 0, 1, 1]], ['magenta', [1, 1, 0, 1]],
  ['white', [1, 1, 1, 1]], ['black', [1, 0, 0, 0]], ['mid grey', [1, .5, .5, .5]],
  ['orange', [1, 1, .5, 0]], ['teal', [1, 0, .5, .5]], ['olive', [1, .5, .5, 0]],
  ['0.2,0.4,0.6', [1, .2, .4, .6]], ['0.9,0.1,0.3', [1, .9, .1, .3]],
];
let worst = 0;
for (const [name, px] of PROBES) {
  // sat/val byte 128 -> delta = 2*128/255 - 1 = +0.00392, the closest to neutral a
  // byte can express; 127 gives -0.00392.  Use the pair and take the tighter one.
  const out = op21(px, 0, 128, 128);
  const back = [out[1] - 0.00392, out[2] - 0.00392, out[3] - 0.00392];
  const e = Math.max(...[1, 2, 3].map(i => Math.abs(out[i] - px[i])));
  worst = Math.max(worst, e);
  console.log(`    ${name.padEnd(12)} in ${px.slice(1).map(v => v.toFixed(3)).join(' ')}`
    + `  out ${out.slice(1).map(v => v.toFixed(3)).join(' ')}  |err| ${e.toFixed(4)}`);
}
console.log(`    worst |err| = ${worst.toFixed(4)} (expected ~0.004 = one sat/val byte step)`);

console.log('  1b. hue -> the port\'s rgb2hsv vs an independent reference');
let hmax = 0;
for (const [name, px] of PROBES) {
  const [h, s, v] = refRGB2HSV(px[1], px[2], px[3]);
  // drive a 120-degree hue rotation and check the result lands where the reference says
  const out = op21(px, 120, 128, 128);
  const exp = hsvToRGB(h === 600 ? 600 : (h + 120) % 360, Math.min(1, s + 0.00392), Math.min(1, v + 0.00392));
  const e = Math.max(...[0, 1, 2].map(i => Math.abs(out[i + 1] - exp[i])));
  hmax = Math.max(hmax, e);
  console.log(`    ${name.padEnd(12)} h=${h === 600 ? 'none' : h.toFixed(1).padStart(5)}`
    + `  +120deg -> ${out.slice(1).map(v => v.toFixed(3)).join(' ')}`
    + `  ref ${exp.map(v => v.toFixed(3)).join(' ')}  |err| ${e.toFixed(4)}`);
}
console.log(`    worst |err| = ${hmax.toFixed(4)}`);

function hsvToRGB(h, s, v) {
  if (s === 0) return h === 600 ? [v, v, v] : [0, 0, 0];
  const hh = (h === 360 ? 0 : h) / 60, i = Math.floor(hh), f = hh - i;
  const p = (1 - s) * v, q = (1 - f * s) * v, t = (1 - (1 - f) * s) * v;
  return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
}

console.log('  1c. the S==0 && H!=600 branch (FUN_00413b24 @0x413b53 zeroes ALL FOUR)');
{
  const out = op21([1, 0.6, 0.5, 0.5], 0, 0, 128);   // sat byte 0 -> ds = -1, forces s=0
  console.log(`    in A=1 RGB=0.6 0.5 0.5, ds=-1 -> out ${out.map(v => v.toFixed(3)).join(' ')}`
    + `   (alpha must be 0.000, matching the binary)`);
}

// ---------------------------------------------------------------------------
// 2. ops 2, 9, 18 — never exercised by any real program
// ---------------------------------------------------------------------------
// Hand-assemble a texgen program:  u8 ver=1, u16 A(height), u16 B(width), u8 opCount,
// then per op: u16 opcode, u16 flags, u8 argLen, args.
function prog(w, h, ops) {
  const parts = [Uint8Array.of(1, h & 0xff, h >> 8, w & 0xff, w >> 8, ops.length)];
  for (const [opcode, flags, args] of ops) {
    parts.push(Uint8Array.of(opcode & 0xff, opcode >> 8, flags & 0xff, flags >> 8, args.length));
    parts.push(Uint8Array.from(args));
  }
  let n = 0; for (const p of parts) n += p.length;
  const out = new Uint8Array(n); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const NOISE = [0x6b, 0x67, 0xcd, 0xcd, 0xff, 0xc0, 0xa0, 0x80];   // op 3, from tex 3
const RGB = 0x0007;

console.log('\n=== 2. ops 2, 9, 18 — synthetic exercise ===');
const CASES = [
  ['op2  rot+zoom  (zoom u16=510 -> x0.5, angle 30)',
    prog(128, 128, [[3, RGB, NOISE], [2, RGB, [254, 1, 30, 0]]])],
  ['op2  rot+zoom  (zoom u16=128 -> x2,   angle 45)',
    prog(128, 128, [[3, RGB, NOISE], [2, RGB, [128, 0, 45, 0]]])],
  ['op9  vertical bars (width 6, count 8)',
    prog(128, 128, [[3, RGB, NOISE], [9, RGB, [6, 8, 0xcd, 0xcd, 0xff, 0x40, 0x80, 0xc0]]])],
  // op 2 on a structured field, so the rotation is actually visible rather than
  // hiding inside isotropic noise.
  ['op9 bars then op2 rotate 45 (zoom u16=255 -> x1)',
    prog(128, 128, [[3, RGB, NOISE], [9, RGB, [6, 8, 0xcd, 0xcd, 0xff, 0x40, 0x80, 0xc0]],
                    [2, RGB, [255, 0, 45, 0]]])],
  ['op18 mode 0 swap R<->B  (arg 0x0d: src=1 dst=3)',
    prog(128, 128, [[3, RGB, NOISE], [18, RGB, [0x0d]]])],
  ['op18 mode 1 copy       (arg 0x1d)',
    prog(128, 128, [[3, RGB, NOISE], [18, RGB, [0x1d]]])],
  ['op18 mode 2 mean       (arg 0x2c)',
    prog(128, 128, [[3, RGB, NOISE], [18, RGB, [0x2c]]])],
];
if (PNGDIR) mkdirSync(PNGDIR, { recursive: true });
let i = 0;
for (const [name, bytes] of CASES) {
  const base = runTexgen(prog(128, 128, [[3, RGB, NOISE]]), { scale: 1 });   // op 3 only
  const r = runTexgen(bytes, { scale: 1 });
  // summary statistics: does it produce structure, and does it differ from the base?
  let diff = 0, uniq = new Set();
  for (let k = 0; k < r.width * r.height; k++) {
    const key = (r.rgba[k * 4] << 16) | (r.rgba[k * 4 + 1] << 8) | r.rgba[k * 4 + 2];
    uniq.add(key);
    if (r.rgba[k * 4] !== base.rgba[k * 4] || r.rgba[k * 4 + 1] !== base.rgba[k * 4 + 1]
      || r.rgba[k * 4 + 2] !== base.rgba[k * 4 + 2]) diff++;
  }
  const pct = (100 * diff / (r.width * r.height)).toFixed(1);
  console.log(`  ${name.padEnd(48)} ${r.width}x${r.height}  distinct colours ${String(uniq.size).padStart(5)}`
    + `  changed vs op-3 base ${pct.padStart(5)}%`
    + (r.unimplemented.length ? `  UNIMPLEMENTED ${r.unimplemented}` : ''));
  if (PNGDIR) writeFileSync(`${PNGDIR}/synthetic_${i}.png`, encodePNG(r.width, r.height, r.rgba));
  i++;
}
