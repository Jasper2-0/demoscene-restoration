// Render consecutive frames of one part through the live path and compare
// them, which is the only way a per-frame artefact shows up at all — the
// single-frame harnesses render one instant and can never see it.
import { withPage, fromRepo } from '../../../../tools/harness/index.mjs';

const part = process.argv[2] ?? 'hairball';
const from = parseFloat(process.argv[3] ?? '3');
const n = parseInt(process.argv[4] ?? '8', 10);

await withPage(
  { root: 'productions/lapsus', path: '/web/index.html',
    query: `?inspect=1`, width: 640, height: 480,
    viewport: { width: 640, height: 480 } },
  async ({ page }) => {
    await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
    const out = await page.evaluate(async (part, from, n, process_jitter) => {
      const gl = document.getElementById('c').getContext('webgl2');
      const rows = [];
      for (let i = 0; i < n; i++) {
        // A 1ms backward step every other frame — exactly the jitter
        // audio.currentTime produces between rAF frames.
        const jitter = process_jitter && (i % 2 === 1) ? -0.02 : 0;   // larger than one 1/60 step, so time truly goes BACK
        const local = +(from + i / 60 + jitter).toFixed(4);
        await window.__demo.render({ part, local });
        const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight,
                      gl.RGBA, gl.UNSIGNED_BYTE, px);
        let sum = 0, nonBlack = 0;
        for (let p = 0; p < px.length; p += 4) {
          const l = 0.299*px[p] + 0.587*px[p+1] + 0.114*px[p+2];
          sum += l; if (l > 8) nonBlack++;
        }
        rows.push({ local, meanLuma: +(sum / (px.length / 4)).toFixed(2), nonBlack });
      }
      return rows;
    }, part, from, n, process.argv.includes('--jitter'));
    console.log(`${part}, ${n} consecutive frames from ${from}s:\n`);
    for (const r of out) console.log(`  t=${String(r.local).padEnd(8)} luma ${String(r.meanLuma).padStart(7)}   lit px ${r.nonBlack}`);
  });
