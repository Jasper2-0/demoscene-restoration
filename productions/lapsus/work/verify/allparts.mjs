// allparts.mjs — render every scheduled part at SEVERAL instants and score
// each against the capture. One command, one report card.
//
//   node productions/lapsus/work/verify/allparts.mjs
//   SAMPLES=8 node productions/lapsus/work/verify/allparts.mjs
//
// IT USED TO SAMPLE THE MIDPOINT ONLY, and that let a real bug through for a
// whole day. Paleksi's camera kick is proportional to a term that is about
// -1.2e-13 at the middle of the part and large either side of it, so the part
// rendered visibly wrong while this gate reported r 0.943, unchanged, every
// time it was asked. Every "median unchanged" claim made against the old
// version only ever meant "unchanged at one instant per part".
//
// So: N samples per part, inset from both ends by a quarter-slot so a sample
// never lands on a part boundary (the same plan tools/inspect/sweep.mjs uses),
// and the report card carries the WORST instant beside the median, because the
// worst instant is the one a viewer notices.
//
// Samples are rendered through the `window.__demo` adapter in ONE page rather
// than a page per frame, which is what makes multi-sampling affordable — 100+
// samples in about the time the old 21 took. That path was checked against the
// old `?scene=&t=` one on paleksi, pehko, hairball and turska: identical to
// four decimal places, including a feedback part and a hair part.
//
// Whole-frame luma correlation is a blunt instrument (see verify/timing.mjs
// for why it is useless for *timing*), but for "which parts are visibly
// wrong" it is exactly right: a part that renders the wrong content cannot
// score well no matter what else is true. Use it to rank work, not to certify
// a frame.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, shootCanvas, fromRepo } from '../../../../tools/harness/index.mjs';

const W = 640, H = 480, N = W * H;
const PHASE1 = {
  startpart1: { start: 0, dur: 1 },     empt: { start: 1, dur: 13 },
  flu2: { start: 14, dur: 9 },          pene: { start: 23, dur: 8 },
  krediili: { start: 31, dur: 16 },     silli: { start: 47, dur: 8 },
  syrjakyla: { start: 55, dur: 9.531 }, paleksi: { start: 64.531, dur: 9.531 },
  pehko: { start: 74.062, dur: 9.531 }, hulluolli: { start: 83.593, dur: 9.531 },
};
const PHASE2 = {
  kuubiotekniikka: { start: 0, dur: 13.8 }, diskojea: { start: 13.8, dur: 8.5 },
  kartonki: { start: 22.3, dur: 7.4 },      hairball: { start: 29.7, dur: 7 },
  higherbiing: { start: 36.7, dur: 14 },    viherio: { start: 50.7, dur: 10.46 },
  morko: { start: 61.16, dur: 3.54 },       turska: { start: 64.7, dur: 7.5 },
  rad_out: { start: 72.2, dur: 14 },        kaivoalieni: { start: 86.2, dur: 13.5 },
  made: { start: 99.7, dur: 5.5 },          hedi: { start: 105.2, dur: 3 },
};

const prod = JSON.parse(fs.readFileSync(fromRepo('productions/lapsus/prod.json'), 'utf8'));
const cap = prod.captures[0];
const MKV = fromRepo(cap.path);
const off1 = cap.trackOffsetsMs['data/mjuusik/1.mp3'] / 1000;
const off2 = cap.trackOffsetsMs['data/mjuusik/2.mp3'] / 1000;
const TMP = path.join(process.env.TMPDIR ?? '/tmp', 'lapsus-allparts');
fs.mkdirSync(TMP, { recursive: true });

const gray = (png, out) => {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', out]);
  return fs.readFileSync(out);
};
const corr = (a, b) => {
  let ma = 0, mb = 0;
  for (let i = 0; i < N; i++) { ma += a[i]; mb += b[i]; }
  ma /= N; mb /= N;
  let d = 0, sa = 0, sb = 0;
  for (let i = 0; i < N; i++) { const u = a[i] - ma, v = b[i] - mb; d += u * v; sa += u * u; sb += v * v; }
  return d / Math.sqrt(sa * sb || 1);
};

const SAMPLES = Math.max(1, Number(process.env.SAMPLES ?? 5));
// Inset by a quarter-slot at each end: a sample exactly on a boundary is
// decided by a one-frame timing difference, not by the renderer.
const localsFor = (dur) => Array.from({ length: SAMPLES }, (_, i) =>
  +((i + 0.5) / SAMPLES * (dur - 0.3) + 0.15).toFixed(3));

const jobs = [];
for (const [phase, table, off] of [[1, PHASE1, off1], [2, PHASE2, off2]]) {
  for (const [scene, e] of Object.entries(table)) {
    if (scene === 'startpart1') continue;        // 1s, entirely its own fade
    for (const local of localsFor(e.dur)) {
      jobs.push({ phase, scene, local, capture: off + e.start + local });
    }
  }
}

const byPart = new Map();
let err = null;
try {
  await withPage({ root: 'productions/lapsus', path: '/web/index.html',
    query: '?inspect=1', width: W, height: H, viewport: { width: W, height: H } },
    async ({ page }) => {
      await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
      const e2 = await page.evaluate(() => window.__lapsusError ?? null);
      if (e2) throw new Error(e2);
      let done = 0;
      for (const j of jobs) {
        let r = null, jobErr = null;
        try {
          await page.evaluate(async (p, l) => { await window.__demo.render({ part: p, local: l }); },
            j.scene, j.local);
          fs.writeFileSync(`${TMP}/o.png`,
            await shootCanvas(page, { canvasSelector: '#c', warmupFrames: 0 }));
          const ours = gray(`${TMP}/o.png`, `${TMP}/o.raw`);
          execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(j.capture), '-i', MKV,
            '-frames:v', '1', `${TMP}/r.png`]);
          r = corr(ours, gray(`${TMP}/r.png`, `${TMP}/r.raw`));
        } catch (e) { jobErr = String(e.message ?? e).split('\n')[0].slice(0, 60); }
        const key = `${j.phase}\u0000${j.scene}`;
        if (!byPart.has(key)) byPart.set(key, { phase: j.phase, scene: j.scene, rs: [], err: null });
        const rec = byPart.get(key);
        if (r == null) rec.err = jobErr; else rec.rs.push(r);
        if (++done % 20 === 0) process.stdout.write(`  ${done}/${jobs.length}`);
      }
    });
} catch (e) { err = String(e.message ?? e).split('\n')[0]; }
if (err) { console.error('\n  harness failed: ' + err); process.exit(1); }

const median = (a) => { const s2 = [...a].sort((x, y) => x - y); return s2[s2.length >> 1]; };
const rows = [...byPart.values()].map((x) => ({
  phase: x.phase, scene: x.scene, err: x.err,
  r: x.rs.length ? median(x.rs) : null,
  worst: x.rs.length ? Math.min(...x.rs) : null,
  spread: x.rs.length ? Math.max(...x.rs) - Math.min(...x.rs) : null,
}));

rows.sort((a, b) => (b.r ?? -1) - (a.r ?? -1));
console.log('\n  median  worst  spread  phase  part');
for (const x of rows) {
  if (x.r == null) { console.log(`  ERR                          ${x.phase}      ${x.scene}   ${x.err ?? ''}`); continue; }
  // A wide spread means the part is right at some instants and wrong at
  // others — which the median alone hides and the midpoint alone cannot see.
  const flag = x.spread > 0.25 ? '  << uneven' : '';
  console.log(`  ${x.r.toFixed(3)}   ${x.worst.toFixed(3)}  ${x.spread.toFixed(3)}     ${x.phase}      ${x.scene}${flag}`);
}
const ok = rows.filter((x) => x.r != null);
const worst = ok.length ? ok.reduce((a, b) => (b.worst < a.worst ? b : a)) : null;
console.log(`\n${ok.length}/${rows.length} parts rendered, ${SAMPLES} samples each` +
  `; median r ${ok.length ? median(ok.map((x) => x.r)).toFixed(3) : '-'}` +
  (worst ? `; worst instant ${worst.worst.toFixed(3)} in ${worst.scene}` : ''));
