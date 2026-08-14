import { withPage } from '../../../../tools/harness/index.mjs';
const SECS = parseFloat(process.argv[2] ?? '12');
await withPage(
  { root: 'productions/lapsus', path: '/web/index.html', width: 640, height: 480,
    viewport: { width: 640, height: 480 } },
  async ({ page, errors }) => {
    await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
    await page.mouse.click(320, 240);
    const seek = parseFloat(process.argv[3] ?? 'NaN');
    if (!Number.isNaN(seek)) {
      // Wait for phase 1 to actually be playing, then jump near the loader.
      await page.waitForFunction('window.__lapsusNow && window.__lapsusNow.phase === 1', { timeout: 90000 });
      // Seeking a media element that has not buffered that far is silently
      // ignored, so keep asking until it sticks.
      const landed = await page.evaluate(async (s) => {
        const a = window.__lapsusAudio;
        for (let i = 0; i < 60; i++) {
          a.currentTime = s;
          await new Promise((r) => setTimeout(r, 100));
          if (a.currentTime > s - 2) break;
        }
        return a.currentTime;
      }, seek);
      console.log(`  seeked to ${landed.toFixed(2)}s`);
    }
    const rows = await page.evaluate(async (SECS) => {
      const gl = document.getElementById('c').getContext('webgl2');
      const out = [];
      const t0 = performance.now();
      while (performance.now() - t0 < SECS * 1000) {
        await new Promise((r) => setTimeout(r, 500));
        const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let sum = 0;
        for (let p = 0; p < px.length; p += 4) sum += 0.299*px[p] + 0.587*px[p+1] + 0.114*px[p+2];
        const now = window.__lapsusNow;
        out.push({ wall: +((performance.now() - t0) / 1000).toFixed(1),
                   luma: +(sum / (px.length / 4)).toFixed(2),
                   part: now?.part ?? '(boot)', t: now ? +now.t.toFixed(2) : null });
      }
      return out;
    }, SECS);
    console.log(`(seek ${process.argv[3] ?? 'none'})`);
    for (const r of rows) console.log(`  wall ${String(r.wall).padStart(5)}s  luma ${String(r.luma).padStart(7)}  part ${String(r.part).padEnd(14)} t=${r.t}`);
    if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 3));
  });
