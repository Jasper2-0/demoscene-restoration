// livetrace.mjs — record EVERY frame the real player draws, with the show
// clock and the wall clock side by side.
//
//   node productions/lapsus/work/verify/livetrace.mjs 29 8
//
// The other harnesses render chosen instants; this one watches the player run.
// A part that is "only visible for a couple of frames" is either being skipped
// by the clock or starved of frames, and those look identical in a screenshot.
import { withPage } from '../../../../tools/harness/index.mjs';

const seek = parseFloat(process.argv[2] ?? '29');
const secs = parseFloat(process.argv[3] ?? '8');

await withPage(
  { root: 'productions/lapsus', path: '/web/index.html', width: 640, height: 480,
    viewport: { width: 640, height: 480 },
    // Unthrottle the compositor. With vsync on, a headless session here caps
    // rAF anywhere between 30 and 120Hz depending on load, and every part
    // reads "exactly the display rate" whether it has headroom or is barely
    // keeping up. Without the cap the loop runs as fast as the work allows,
    // which is the number worth having.
    extraArgs: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] },
  async ({ page, errors }) => {
    await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
    await page.mouse.click(320, 240);
    // A seek below the phase-1 loader stays in phase 1; anything else goes
    // through the handover into phase 2 first.
    const phase1 = seek < 93;
    if (phase1) {
      await page.waitForFunction('window.__lapsusNow && window.__lapsusNow.phase === 1', { timeout: 90000 });
      await page.evaluate(async (s) => {
        const a = window.__lapsusAudio;
        for (let i = 0; i < 60; i++) {
          a.currentTime = s;
          await new Promise((r) => setTimeout(r, 100));
          if (a.currentTime > s - 2) break;
        }
      }, seek);
    } else {
    // Get into phase 2 by jumping the phase-1 loader, then to the part.
    await page.waitForFunction('window.__lapsusNow && window.__lapsusNow.phase === 1', { timeout: 90000 });
    await page.evaluate(async () => {
      const a = window.__lapsusAudio;
      for (let i = 0; i < 60; i++) {
        a.currentTime = 93;
        await new Promise((r) => setTimeout(r, 100));
        if (a.currentTime > 91) break;
      }
    });
    await page.waitForFunction('window.__lapsusNow && window.__lapsusNow.phase === 2', { timeout: 120000 });
    await page.evaluate(async (s) => {
      const a = window.__lapsusAudio;
      for (let i = 0; i < 60; i++) {
        a.currentTime = s;
        await new Promise((r) => setTimeout(r, 100));
        if (a.currentTime > s - 2) break;
      }
    }, seek);
    }

    const traced = await page.evaluate(async (secs) => {
      const out = [];
      const t0 = performance.now();
      const frames0 = window.__lapsusFrames ?? 0;
      let lastWall = t0;
      await new Promise((done) => {
        const tick = () => {
          const now = performance.now();
          const n = window.__lapsusNow;
          out.push({ dt: +(now - lastWall).toFixed(1),
                     wall: +((now - t0) / 1000).toFixed(2),
                     t: n ? +n.t.toFixed(3) : null,
                     audio: +window.__lapsusAudio.currentTime.toFixed(3),
                     part: n?.part ?? '?', ms: +(window.__lapsusFrameMs ?? 0).toFixed(2) });
          lastWall = now;
          if (now - t0 > secs * 1000) return done();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      return { rows: out,
               playerFps: (window.__lapsusFrames - frames0) / ((performance.now() - t0) / 1000) };
    }, secs);

    const { rows, playerFps } = traced;
    const byPart = new Map();
    for (const r of rows) {
      const e = byPart.get(r.part) ?? { n: 0, ms: [] };
      e.n++; e.ms.push(r.ms);
      byPart.set(r.part, e);
    }
    // Shimmer: how much the picture changes from one frame to the next, and
    // how evenly the show clock advances. A steady part should have small,
    // consistent values for both.
    const stats = (a) => {
      const s2 = [...a].sort((x, y) => x - y);
      return { med: s2[s2.length >> 1], max: s2[s2.length - 1],
               zero: a.filter((x) => x === 0).length };
    };
    console.log(`${rows.length} frames in ${secs}s\n`);
    const steps = [];
    for (let i = 1; i < rows.length; i++) steps.push(+(rows[i].t - rows[i - 1].t).toFixed(4));
    const C = stats(steps);
    console.log(`  PLAYER ${playerFps.toFixed(1)} fps   (tracer sampled ${(rows.length / secs).toFixed(0)}/s); ` +
                `clock step median ${C.med}s, max ${C.max}s, stalled frames ${C.zero}\n`);
    console.log('  frames drawn per part:');
    for (const [p, e] of byPart) {
      const m = e.ms.slice().sort((a, b) => a - b);
      const med = m[m.length >> 1], max = m[m.length - 1];
      console.log(`    ${String(p).padEnd(16)} ${String(e.n).padStart(5)} frames   render median ` +
                  `${String(med.toFixed(1)).padStart(6)}ms  max ${max.toFixed(1)}ms` +
                  (med > 16.7 ? '   << misses 60fps' : ''));
    }
    if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 3));
  });
