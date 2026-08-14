// cost.mjs — how long does one frame of each part take to draw?
//
//   node productions/lapsus/work/verify/cost.mjs [reps]
//
// Frame INTERVAL is useless for this: headless is vsync-capped, so a part with
// plenty of headroom and a part that is about to miss frames both read ~8ms.
// This times the render itself, through the same deterministic path the sweep
// uses, with gl.finish() inside it so the GPU is actually waited on.
import { withPage } from '../../../../tools/harness/index.mjs';

const reps = parseInt(process.argv[2] ?? '10', 10);
const PARTS = [
  ['empt', 1], ['flu2', 1], ['pene', 1], ['krediili', 1], ['silli', 1],
  ['syrjakyla', 1], ['paleksi', 1], ['pehko', 1], ['hulluolli', 1],
  ['kuubiotekniikka', 2], ['diskojea', 2], ['kartonki', 2], ['hairball', 2],
  ['higherbiing', 2], ['viherio', 2], ['morko', 2], ['turska', 2],
  ['rad_out', 2], ['kaivoalieni', 2], ['made', 2], ['hedi', 2],
];

await withPage(
  { root: 'productions/lapsus', path: '/web/index.html', query: '?inspect=1',
    width: 640, height: 480, viewport: { width: 640, height: 480 } },
  async ({ page, errors }) => {
    await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
    const rows = await page.evaluate(async (PARTS, reps) => {
      const out = [];
      for (const [part] of PARTS) {
        // Warm: first frame of a part loads its assets, which is not the
        // steady-state cost we are after.
        try { await window.__demo.render({ part, local: 1.0 }); } catch { continue; }
        const times = [];
        for (let i = 0; i < reps; i++) {
          const local = 1.0 + (i + 1) / 60;
          const t0 = performance.now();
          await window.__demo.render({ part, local });
          times.push(performance.now() - t0);
        }
        times.sort((a, b) => a - b);
        out.push({ part, median: +times[times.length >> 1].toFixed(1),
                   max: +times[times.length - 1].toFixed(1) });
      }
      return out;
    }, PARTS, reps);
    rows.sort((a, b) => b.median - a.median);
    console.log(`  ms/frame   max     part`);
    for (const r of rows) {
      const bar = r.median > 16.7 ? '  << misses 60fps' : '';
      console.log(`  ${String(r.median).padStart(8)}  ${String(r.max).padStart(6)}   ${r.part}${bar}`);
    }
    if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 3));
  });
