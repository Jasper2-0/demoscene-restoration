// allparts.mjs — render every scheduled part at its midpoint and score it
// against the capture. One command, one report card.
//
//   node productions/lapsus/work/verify/allparts.mjs
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

const rows = [];
for (const [phase, table, off] of [[1, PHASE1, off1], [2, PHASE2, off2]]) {
  for (const [scene, e] of Object.entries(table)) {
    if (scene === 'startpart1') continue;          // 1s, dominated by its fade
    const local = e.dur / 2;
    const capture = off + e.start + local;
    let ours = null, err = null;
    try {
      await withPage({ root: 'productions/lapsus', path: '/web/index.html',
        query: `?scene=${scene}&t=${local}`, width: W, height: H, viewport: { width: W, height: H } },
        async ({ page }) => {
          await page.waitForFunction('window.__lapsusReady === true', { timeout: 30000 });
          const e2 = await page.evaluate(() => window.__lapsusError ?? null);
          if (e2) throw new Error(e2);
          fs.writeFileSync(`${TMP}/o.png`, await shootCanvas(page, { canvasSelector: '#c', warmupFrames: 2 }));
        });
      ours = gray(`${TMP}/o.png`, `${TMP}/o.raw`);
    } catch (e) { err = String(e.message ?? e).split('\n')[0].slice(0, 60); }

    if (!ours) { rows.push({ phase, scene, r: null, err }); continue; }
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(capture), '-i', MKV, '-frames:v', '1', `${TMP}/r.png`]);
    rows.push({ phase, scene, r: corr(ours, gray(`${TMP}/r.png`, `${TMP}/r.raw`)), err: null });
  }
}

rows.sort((a, b) => (b.r ?? -1) - (a.r ?? -1));
console.log('\n  r      phase  part');
for (const x of rows) {
  console.log(`  ${x.r == null ? 'ERR  ' : x.r.toFixed(3)}   ${x.phase}      ${x.scene}${x.err ? '   ' + x.err : ''}`);
}
const ok = rows.filter((x) => x.r != null);
console.log(`\n${ok.length}/${rows.length} rendered; median r ${ok.length ? ok[Math.floor(ok.length/2)].r.toFixed(3) : '-'}`);
