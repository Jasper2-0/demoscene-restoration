// demo.mjs — open a production behind its adapter and render single instants.
//
// The one-instant tools (score1, frame, channels, phase) all need the same four
// things: a page with the adapter installed, the part schedule, a way to render
// one instant, and the matching reference frame. That was written four times in
// productions/lapsus/work/verify/, each with the LAPSUS SCHEDULE COMPILED IN —
// `score1.mjs` carried a literal two-phase part table. So the tools were useful
// to exactly one production and drifted from the sweep independently.
//
// Everything production-specific now comes from `window.__demo` (ADAPTER.md),
// which already publishes `captureStart` per part, so `captureTime` needs no
// per-production offset arithmetic here.
//
// TWO THINGS THIS DELIBERATELY SHARES WITH THE SWEEP, because splitting them is
// how the harnesses drifted before:
//   * the same page query (`?inspect=1` plus caller extras), so a one-instant
//     check and a sweep sample are the same frame;
//   * the same reference-frame extraction and cache directory, so a tool and
//     the sweep never disagree about what the reference at time T is.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, fromRepo } from '../harness/index.mjs';
import { W, H } from './compare.mjs';

/** prod.json's first capture, with the file existence check every tool needs. */
export function captureOf(prodName) {
  const prod = JSON.parse(
    fs.readFileSync(fromRepo('productions', prodName, 'prod.json'), 'utf8'));
  const cap = prod.captures?.[0];
  if (!cap?.path) throw new Error(`${prodName}: prod.json has no captures[0].path`);
  const file = fromRepo(cap.path);
  if (!fs.existsSync(file)) {
    throw new Error(`no capture at ${file}\n  fetch it: node tools/fetch/capture.mjs ${prodName}`);
  }
  return { ...cap, file };
}

/** Reference frame at capture time T, cached beside the sweep's own frames. */
export function refFrame(prodName, captureFile, t) {
  const dir = fromRepo('productions', prodName, 'work/verify/inspect/frames');
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `ref_${t.toFixed(3)}.png`);
  if (!fs.existsSync(f)) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', captureFile,
      '-frames:v', '1', '-vf', `scale=${W}:${H}`, f]);
  }
  return f;
}

/**
 * Open <production> with its adapter and hand the caller a small API.
 *
 * @param {string} prodName
 * @param {string[]} extra   raw `k=v` renderer params, appended to ?inspect=1
 * @param {(api) => Promise<any>} fn
 *
 * api.schedule                  the adapter's schedule()
 * api.partOf(name)              schedule entry, or throws with the valid names
 * api.captureTime(name, local)  captureStart + local
 * api.render(name, local)       -> { pngPath, info }
 * api.page                      escape hatch for tool-specific evaluates
 */
export async function withDemo(prodName, extra, fn) {
  const query = `?inspect=1${extra?.length ? `&${extra.join('&')}` : ''}`;
  const tmp = path.join(process.env.TMPDIR ?? '/tmp', `inspect-${prodName}`);
  fs.mkdirSync(tmp, { recursive: true });

  return withPage({ root: `productions/${prodName}`, path: '/web/index.html', query,
    width: W, height: H, viewport: { width: W, height: H } }, async ({ page, errors }) => {
    await page.waitForFunction('window.__demoReady === true || !!window.__demo',
      { timeout: 600000 });
    const ok = await page.evaluate(() => typeof window.__demo === 'object' && !!window.__demo);
    if (!ok) throw new Error(
      `${prodName} does not expose window.__demo — see tools/inspect/ADAPTER.md`);

    const schedule = await page.evaluate(() => window.__demo.schedule());
    const partOf = (name) => {
      const p = schedule.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
      if (!p) throw new Error(`${prodName} has no part "${name}"\n  parts: ` +
        schedule.map((x) => x.name).join(', '));
      return p;
    };

    let n = 0;
    const api = {
      page, errors, schedule, partOf, query,
      captureTime: (name, local) => partOf(name).captureStart + local,
      async render(name, local) {
        const p = partOf(name);
        // RENDER AND READ BACK IN ONE EVALUATE. Screenshotting in a later call
        // races compositing and can hand back a black or stale frame with NO
        // error — sonnet once measured RMSE 136 where the truth was 26 from
        // exactly this, and it is why sweep.mjs does it this way.
        //
        // Doing it the other way here was not hypothetical: rendering then
        // calling shootCanvas separately scored lapsus flu2 @5.59s at r 0.9551
        // against the sweep's 0.9559 — close enough to look like rounding and
        // wrong enough to make this tool disagree with the gate.
        const out = await page.evaluate(async (a) => {
          const info = await window.__demo.render(a);
          return { png: document.querySelector('canvas').toDataURL('image/png'), info };
        }, { part: p.name, local });
        const png = path.join(tmp, `ours_${n++}.png`);
        fs.writeFileSync(png, Buffer.from(out.png.split(',')[1], 'base64'));
        return { pngPath: png, info: out.info };
      },
    };
    return fn(api);
  });
}
