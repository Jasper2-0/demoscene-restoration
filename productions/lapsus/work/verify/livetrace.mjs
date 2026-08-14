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
    viewport: { width: 640, height: 480 } },
  async ({ page, errors }) => {
    await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
    await page.mouse.click(320, 240);
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

    const rows = await page.evaluate(async (secs) => {
      const out = [];
      const gl = document.getElementById('c').getContext('webgl2');
      const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      const luma = () => {
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight,
                      gl.RGBA, gl.UNSIGNED_BYTE, px);
        let sum = 0;
        for (let i = 0; i < px.length; i += 16) sum += 0.299*px[i] + 0.587*px[i+1] + 0.114*px[i+2];
        return +(sum / (px.length / 16)).toFixed(2);
      };
      const t0 = performance.now();
      let lastWall = t0;
      await new Promise((done) => {
        const tick = () => {
          const now = performance.now();
          const n = window.__lapsusNow;
          out.push({ dt: +(now - lastWall).toFixed(1),
                     wall: +((now - t0) / 1000).toFixed(2),
                     t: n ? +n.t.toFixed(3) : null,
                     audio: +window.__lapsusAudio.currentTime.toFixed(3),
                     part: n?.part ?? '?', luma: luma() });
          lastWall = now;
          if (now - t0 > secs * 1000) return done();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      return out;
    }, secs);

    const byPart = new Map();
    for (const r of rows) {
      const e = byPart.get(r.part) ?? { n: 0, lit: 0 };
      e.n++; if (r.luma > 1) e.lit++;
      byPart.set(r.part, e);
    }
    // Shimmer: how much the picture changes from one frame to the next, and
    // how evenly the show clock advances. A steady part should have small,
    // consistent values for both.
    const hbAll = rows.filter((r) => r.part === 'hairball');
    const dLuma = [], dClock = [];
    for (let i = 1; i < hbAll.length; i++) {
      dLuma.push(Math.abs(hbAll[i].luma - hbAll[i - 1].luma));
      dClock.push(+(hbAll[i].t - hbAll[i - 1].t).toFixed(4));
    }
    const stats = (a) => {
      const s2 = [...a].sort((x, y) => x - y);
      return { med: s2[s2.length >> 1], max: s2[s2.length - 1],
               zero: a.filter((x) => x === 0).length };
    };
    console.log(`${rows.length} frames in ${secs}s`);
    if (dLuma.length) {
      const L = stats(dLuma), C = stats(dClock);
      console.log(`  hairball frame-to-frame luma change: median ${L.med.toFixed(2)}, max ${L.max.toFixed(2)}`);
      console.log(`  hairball clock step: median ${C.med}s, max ${C.max}s, stalled frames ${C.zero}\n`);
    }
    console.log('  frames drawn per part:');
    for (const [p, e] of byPart) console.log(`    ${String(p).padEnd(16)} ${String(e.n).padStart(5)} frames, ${e.lit} with anything on screen`);
    const hb = rows.filter((r) => r.part === 'hairball');
    console.log('\n  first 30 hairball frames:');
    console.log('  wall    frame-dt   showClock   luma   part');
    for (const r of hb.slice(0, 30)) {
      console.log(`  ${String(r.wall).padStart(5)}s  ${String(r.dt).padStart(7)}ms  ` +
                  `${String(r.t).padStart(8)}  ${String(r.luma).padStart(7)}  ${r.part}`);
    }
    if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 3));
  });
