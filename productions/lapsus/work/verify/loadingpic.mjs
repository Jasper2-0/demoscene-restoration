// loadingpic.mjs — is the loading screen blitted 1:1, or squashed?
//
// Both loading screens are 640x512: 640x480 of artwork padded to a power-of
// -two height. Drawing all 512 rows into 480 squashes everything by 6.7%,
// which is the mistake already found and fixed for the backdrops. Reading the
// code cannot settle which one is on screen, so this compares the rendered
// canvas against BOTH hypotheses and reports which it matches.
import { withPage } from '../../../../tools/harness/index.mjs';

await withPage(
  { root: 'productions/lapsus', path: '/web/index.html', width: 640, height: 480,
    viewport: { width: 640, height: 480 } },
  async ({ page }) => {
    await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
    await page.mouse.click(320, 240);
    // Wait for the boot fade to finish but stay before phase 1 starts.
    await page.waitForFunction(
      'window.__lapsusNow === undefined || window.__lapsusNow === null', { timeout: 5000 })
      .catch(() => {});
    const out = await page.evaluate(async () => {
      // Let the boot screen come fully up (fade completes at t=2.5 after the
      // 4s sleep), then grab it before phase 1 replaces it.
      const gl = document.getElementById('c').getContext('webgl2');
      const shot = () => {
        const p = new Uint8Array(640 * 480 * 4);
        gl.readPixels(0, 0, 640, 480, gl.RGBA, gl.UNSIGNED_BYTE, p);
        return p;
      };
      let px = null;
      for (let i = 0; i < 400; i++) {
        await new Promise((r) => setTimeout(r, 50));
        if (window.__lapsusNow) break;             // phase 1 began; stop
        const p = shot();
        let sum = 0;
        for (let k = 0; k < p.length; k += 64) sum += p[k];
        if (sum / (p.length / 64) > 100) { px = p; break; }   // fade is up
      }
      if (!px) return { error: 'never caught the boot screen' };

      // The source, decoded at its true size.
      const img = new Image();
      img.src = '/work/unpacked/lapsus_dat/data/pics/loading.jpg';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      const c = document.createElement('canvas');
      const cx = c.getContext('2d', { willReadFrequently: true });

      const lumaOf = (d) => {
        const a = new Float64Array(d.length / 4);
        for (let i = 0, j = 0; i < d.length; i += 4, j++)
          a[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        return a;
      };
      // WebGL reads bottom-up; flip to match the 2D canvas.
      const ours = new Float64Array(640 * 480);
      {
        const l = lumaOf(px);
        for (let y = 0; y < 480; y++)
          for (let x = 0; x < 640; x++) ours[y * 640 + x] = l[(479 - y) * 640 + x];
      }
      const corr = (a, b) => {
        let ma = 0, mb = 0;
        for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
        ma /= a.length; mb /= b.length;
        let sa = 0, sb = 0, sab = 0;
        for (let i = 0; i < a.length; i++) {
          const da = a[i] - ma, db = b[i] - mb;
          sa += da * da; sb += db * db; sab += da * db;
        }
        return sab / Math.sqrt(sa * sb);
      };
      // Hypothesis A: 1:1, top 480 rows of the 512.
      c.width = 640; c.height = 480;
      cx.drawImage(img, 0, 0, 640, 480, 0, 0, 640, 480);
      const oneToOne = corr(ours, lumaOf(cx.getImageData(0, 0, 640, 480).data));
      // Hypothesis B: all 512 rows squashed into 480.
      cx.clearRect(0, 0, 640, 480);
      cx.drawImage(img, 0, 0, 640, 512, 0, 0, 640, 480);
      const squashed = corr(ours, lumaOf(cx.getImageData(0, 0, 640, 480).data));
      return { source: [img.naturalWidth, img.naturalHeight], oneToOne, squashed };
    });
    if (out.error) { console.error(out.error); process.exit(1); }
    console.log(`  source loading.jpg  ${out.source[0]}x${out.source[1]}`);
    console.log(`  correlation vs 1:1 (top 480 rows) : ${out.oneToOne.toFixed(5)}`);
    console.log(`  correlation vs squashed (512->480): ${out.squashed.toFixed(5)}`);
    console.log(out.oneToOne > out.squashed
      ? '\n  -> blitted 1:1, the pad falls off the bottom. Correct.'
      : '\n  -> SQUASHED. The picture is compressed by 6.7%.');
  });
