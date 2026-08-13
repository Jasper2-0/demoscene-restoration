// envelopes.mjs — plot a scene's animation channels over its scheduled part.
//
//   node productions/lapsus/work/verify/envelopes.mjs [scene] [duration]
//
// Built to answer a specific question: the silhouette timing probe
// (verify/timing.mjs) found a solid +0.40s offset at pene's local t=4 but
// disagreed with itself at t=2 and t=6. The leading hypothesis was that the
// motion is non-monotonic there — if an object returns to a pose it already
// held, several render times match one reference frame equally well and any
// "best offset" is ambiguous by construction, no matter how good the metric.
//
// So this plots the channels and, more usefully, reports where each one
// REVERSES DIRECTION. A reversal near a sample time is a mechanical reason
// for that sample to be undecidable.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseLWS, evalEnvelope, CHANNELS } from '../js/lws.mjs';

const require = createRequire(import.meta.url);
const { createCanvas } = require('canvas');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCENE = (process.argv[2] ?? 'pene').toLowerCase();
const DUR = parseFloat(process.argv[3] ?? '8');
const STEP = 0.02;

const scene = parseLWS(fs.readFileSync(
  path.join(HERE, '..', 'unpacked/lapsus_dat/data', SCENE + '.lws'), 'utf8'));

const items = [
  ...scene.objects.filter((o) => o.motion).map((o, i) => ({ label: o.file ?? o.name ?? `object${i}`, it: o })),
  ...scene.cameras.filter((c) => c.motion).map((c, i) => ({ label: `camera${i}`, it: c })),
  ...scene.lights.filter((l) => l.motion).map((l, i) => ({ label: `light${i}`, it: l })),
];

// sample every channel of every item
const series = [];
for (const { label, it } of items) {
  for (let c = 0; c < it.motion.length; c++) {
    const vals = [];
    for (let t = 0; t <= DUR + 1e-9; t += STEP) vals.push(evalEnvelope(it.motion[c], t));
    const flat = Math.max(...vals) - Math.min(...vals) < 1e-6;
    if (!flat) series.push({ label, chan: CHANNELS[c] ?? `ch${c}`, vals });
  }
}

// direction reversals: where the sign of the derivative flips
const T = (i) => i * STEP;
console.log(`${SCENE}: ${series.length} non-constant channels over ${DUR}s\n`);
console.log('channel                 range                 reversals (s)');
const allRev = [];
for (const s of series) {
  const rev = [];
  let prev = 0;
  for (let i = 1; i < s.vals.length; i++) {
    const d = s.vals[i] - s.vals[i - 1];
    if (Math.abs(d) < 1e-9) continue;
    const sign = Math.sign(d);
    if (prev && sign !== prev) { rev.push(T(i)); allRev.push(T(i)); }
    prev = sign;
  }
  const lo = Math.min(...s.vals), hi = Math.max(...s.vals);
  console.log(`${(s.label + ' ' + s.chan).padEnd(24)}${(lo.toFixed(2) + ' .. ' + hi.toFixed(2)).padEnd(22)}${rev.map((r) => r.toFixed(2)).join(' ') || '-'}`);
}

// how close is each probe sample to a reversal?
console.log('\nprobe samples vs nearest reversal:');
for (const t of [2, 4, 6]) {
  const near = allRev.length ? allRev.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a)) : null;
  const d = near == null ? Infinity : Math.abs(near - t);
  console.log(`  t=${t}s  nearest reversal ${near == null ? 'none' : near.toFixed(2) + 's'}` +
    `  (${d === Infinity ? '' : 'Δ' + d.toFixed(2) + 's'})  ${d < 0.9 ? '<-- inside the sweep window: ambiguous by construction' : ''}`);
}

// ---- plot ------------------------------------------------------------------
const PW = 900, PH = 130, PAD = 54;
const canvas = createCanvas(PW, PAD + series.length * PH + 20);
const g = canvas.getContext('2d');
g.fillStyle = '#111'; g.fillRect(0, 0, canvas.width, canvas.height);
g.font = '12px sans-serif';
g.fillStyle = '#ddd';
g.fillText(`${SCENE}.lws — animation channels over the ${DUR}s part`, 12, 20);
g.fillText('vertical lines: probe samples t=2/4/6   orange: direction reversal', 12, 36);

series.forEach((s, k) => {
  const y0 = PAD + k * PH, h = PH - 26;
  const lo = Math.min(...s.vals), hi = Math.max(...s.vals), rng = (hi - lo) || 1;
  g.strokeStyle = '#333'; g.beginPath(); g.moveTo(PAD, y0 + h); g.lineTo(PW - 12, y0 + h); g.stroke();
  // probe sample markers
  g.strokeStyle = '#4a90d9';
  for (const t of [2, 4, 6]) {
    const x = PAD + (t / DUR) * (PW - PAD - 12);
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + h); g.stroke();
  }
  // reversals
  g.strokeStyle = '#e08030';
  let prev = 0;
  for (let i = 1; i < s.vals.length; i++) {
    const d = s.vals[i] - s.vals[i - 1];
    if (Math.abs(d) < 1e-9) continue;
    const sign = Math.sign(d);
    if (prev && sign !== prev) {
      const x = PAD + (T(i) / DUR) * (PW - PAD - 12);
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + h); g.stroke();
    }
    prev = sign;
  }
  // curve
  g.strokeStyle = '#7fd97f'; g.lineWidth = 1.5; g.beginPath();
  s.vals.forEach((v, i) => {
    const x = PAD + (T(i) / DUR) * (PW - PAD - 12);
    const y = y0 + h - ((v - lo) / rng) * h;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  });
  g.stroke(); g.lineWidth = 1;
  g.fillStyle = '#ddd'; g.fillText(`${s.label} ${s.chan}`, 12, y0 + 10);
  g.fillStyle = '#888';
  g.fillText(hi.toFixed(2), PW - 46, y0 + 10);
  g.fillText(lo.toFixed(2), PW - 46, y0 + h);
});

const out = path.join(HERE, 'frames', `${SCENE}_envelopes.png`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log(`\nwrote ${path.relative(process.cwd(), out)}`);
