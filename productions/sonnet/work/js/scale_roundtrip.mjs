// scale_roundtrip.mjs — the scale-consistency round-trip over ALL 28 programs.
//
//   generate at scale S  ->  box-downsample by S  ->  compare with the authentic 1x
//
// This is the same criterion as re/REMASTER.md §3 / kernel_scaling_test.mjs §3, but
// applied to every program rather than only the op-28 users, so that a parameter that
// is texel-denominated in ANY handler shows up.  Errors are in 8-bit units.
//
//   node js/scale_roundtrip.mjs [--scales 2,3,4] [--only 0,9,23] [--kernel M] [--json F]
//
import { writeFileSync } from 'node:fs';
import { Img, runTexgen, parseProgram, q8 } from './texgen.mjs';
import { RESOURCES } from './resources.mjs';

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const SCALES = arg('scales', '2,3,4').split(',').map(Number);
const ONLY = arg('only', null);
const KERNEL = arg('kernel', 'continuous');
const NOISE = arg('noise', 'pinned');
const JSONOUT = arg('json', null);
const IDS = ONLY ? ONLY.split(',').map(Number) : [...Array(28).keys()];

// tex 11 is the 2048x512 font strip: 8192x2048 at S=4 is ~270 MB/layer.  Its single
// op (17) is baked offline and is not part of the VM's scaling story, so skip it.
const SKIP = new Set([11]);

export function toImg(r) {
  const im = new Img(r.width, r.height);
  for (let i = 0; i < r.width * r.height; i++) {
    im.p[i * 4] = r.rgba[i * 4 + 3] / 255;      // A
    im.p[i * 4 + 1] = r.rgba[i * 4] / 255;      // R
    im.p[i * 4 + 2] = r.rgba[i * 4 + 1] / 255;  // G
    im.p[i * 4 + 3] = r.rgba[i * 4 + 2] / 255;  // B
  }
  return im;
}
export function down(img, S) {
  const o = new Img(img.iw / S, img.ih / S);
  const inv = 1 / (S * S);
  for (let y = 0; y < o.ih; y++) for (let x = 0; x < o.iw; x++) {
    let a = 0, b = 0, c = 0, d = 0;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const s = ((y * S + j) * img.iw + (x * S + i)) * 4;
      a += img.p[s]; b += img.p[s + 1]; c += img.p[s + 2]; d += img.p[s + 3];
    }
    const t = (y * o.iw + x) * 4;
    o.p[t] = a * inv; o.p[t + 1] = b * inv; o.p[t + 2] = c * inv; o.p[t + 3] = d * inv;
  }
  return o;
}
export function diff(a, b) {
  let sum = 0, max = 0; const n = a.iw * a.ih * 4;
  for (let i = 0; i < n; i++) {
    const e = Math.abs(q8(a.p[i]) - q8(b.p[i]));
    sum += e; if (e > max) max = e;
  }
  return { mean: sum / n, max };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const f = (x) => x.toFixed(3).padStart(8);
  const out = [];
  console.log(`kernel=${KERNEL}  noise=${NOISE}  scales=${SCALES.join(',')}`);
  console.log('  id    size      ' + SCALES.map(S => `S=${S} mean / max`.padStart(20)).join(''));
  for (const id of IDS) {
    if (SKIP.has(id)) { console.log(`  ${String(id).padStart(2)}    (skipped — 2048x512 font strip)`); continue; }
    const p = parseProgram(RESOURCES[id]);
    const ref = toImg(runTexgen(RESOURCES[id], { scale: 1 }));
    const rec = { id, w: p.B, h: p.A, per: {} };
    let s = `  ${String(id).padStart(2)}  ${(p.B + 'x' + p.A).padEnd(9)}`;
    for (const S of SCALES) {
      const d = diff(down(toImg(runTexgen(RESOURCES[id], { scale: S, kernel: KERNEL, noise: NOISE })), S), ref);
      rec.per[S] = d;
      s += `  ${f(d.mean)} / ${String(d.max).padStart(3)}      `;
    }
    console.log(s);
    out.push(rec);
  }
  for (const S of SCALES) {
    const v = out.map(r => r.per[S].mean);
    console.log(`  S=${S}: mean-of-means ${f(v.reduce((a, b) => a + b, 0) / v.length)}  worst ${f(Math.max(...v))} (tex ${out[v.indexOf(Math.max(...v))].id})`);
  }
  if (JSONOUT) writeFileSync(JSONOUT, JSON.stringify(out, null, 2));
}
