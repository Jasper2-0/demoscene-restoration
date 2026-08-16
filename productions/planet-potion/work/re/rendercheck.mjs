// rendercheck.mjs — boot the player in a real browser and look at the pixels.
//
//   node work/re/rendercheck.mjs [dataset-dir] [--png out-dir]
//
// Every other suite here checks a computation. This one checks that the thing
// actually runs: it serves web/, opens it in headless Chrome, replays recorded
// frames through the Warp3D shim and reads the framebuffer back. Until this
// existed, "the shim is ported" rested on the shim's source and on nothing
// having thrown in a browser nobody had opened.
//
// WHAT IT ASSERTS, and why each one is a real failure mode rather than a
// tautology:
//
//   * no page errors and no failed requests — a module that 404s or throws at
//     import time still leaves a canvas on screen, just an empty one;
//   * glError 0, reported by the shim itself after the draws;
//   * the frame is not uniform — a shim that binds nothing and clears to the
//     background produces a perfectly plausible flat image;
//   * a frame whose textures carry colour comes out in colour. This is the one
//     that catches a channel fault downstream of texbuildcheck: the reorder can
//     be right in the Uint8Array and still be wrong at `texImage2D`, and a
//     greyscale result looks deliberate rather than broken. Scene 18 was picked
//     by measuring every recorded frame's texture spread, not by eye.
//
// IT SKIPS RATHER THAN FAILS WITHOUT CHROME (exit 77, the same convention
// speccheck.py uses for a missing binary) — no browser is not a regression.
import fs from 'node:fs';
import path from 'node:path';
import { withPage, findChrome } from '../../../../tools/harness/index.mjs';
import { buildTextures } from '../../web/js/textures.js';

const ABSENT = 77;
const argv = process.argv.slice(2);
const pngIdx = argv.indexOf('--png');
const pngDir = pngIdx >= 0 ? argv[pngIdx + 1] : null;
// `pngIdx` is -1 when --png is absent, so a naive `i !== pngIdx + 1` drops
// argv[0] instead of the flag's value — which silently discarded the dataset
// argument and fell back to the default. It passed anyway from the one
// directory where the default is right, which is how it survived being written.
const positional = argv.filter((a, i) =>
  !a.startsWith('--') && !(pngIdx >= 0 && i === pngIdx + 1));
const dir = positional[0] ?? 'web/data';

try {
  findChrome(null);
} catch {
  console.error('rendercheck: no Chrome or Chromium found.\n'
    + '  Set CHROME_PATH to a Chrome/Chromium binary, or install one.\n'
    + '  Playwright images have it at /opt/pw-browsers/chromium-*/chrome-linux/chrome.');
  process.exit(ABSENT);
}

// --no-sandbox and --disable-dev-shm-usage are NOT here: tools/harness adds them
// when it detects it is running as root, which is the only time they are needed.
// This file had its own copy first and that is one copy too many — the same
// duplication that put `fma` in two modules.
//
// SwiftShader is this file's own business, though. A container has no GPU, so
// WebGL2 falls back to software, and current Chrome requires this flag to opt in
// to that fallback rather than failing the context outright.
const EXTRA = ['--enable-unsafe-swiftshader'];

let bad = 0;
const say = (ok, what, detail = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

// --- which recorded frames to render, chosen from the data ------------------
//
// Not hand-picked: the most colourful frame is found by running the texture
// bytecode and measuring each recorded frame's maximum channel spread, so this
// keeps pointing at a colour-bearing frame even if the scene numbering moves.
const draws = JSON.parse(fs.readFileSync(`${dir}/draws.json`, 'utf8'));
const programs = JSON.parse(fs.readFileSync(`${dir}/tex_programs.json`, 'utf8'));
const kernels = JSON.parse(fs.readFileSync(`${dir}/tex_kernels.json`, 'utf8'));
const { byPart } = buildTextures(programs, kernels);

const spread = (rgba) => {
  if (!rgba) return -1;
  let m = 0;
  for (let p = 0; p < rgba.length; p += 4) {
    const s = Math.max(rgba[p], rgba[p + 1], rgba[p + 2])
      - Math.min(rgba[p], rgba[p + 1], rgba[p + 2]);
    if (s > m) m = s;
  }
  return m;
};

const cand = [];
draws.scenes.forEach((sc, si) => sc.frames.forEach((f, fi) => {
  let best = 0;
  for (const d of f.draws) best = Math.max(best, spread(byPart[sc.part]?.[d.texture]));
  cand.push({ si, fi, part: sc.part, slot: sc.slot, t: f.t, n: f.draws.length, best });
}));
const colourful = [...cand].sort((a, b) => b.best - a.best || b.n - a.n)[0];
const busiest = [...cand].sort((a, b) => b.n - a.n)[0];

// THE INPUT SIDE IS ASSERTED BEFORE ANYTHING IS RENDERED, and it has to be.
// The first version of this file picked the colour frame by sort and deduped it
// against the busiest one — so when a sabotage flattened every texture to grey,
// the two collapsed onto the same frame, the colour target was deduped away,
// and the whole colour assertion silently STOPPED EXISTING. It reported "all
// checks passed" against textures with no colour in them at all. That is the
// exact defect METHOD.md's "a check that cannot exit non-zero is a report"
// section is about, rebuilt three commits later while writing a check.
//
// So: the dataset must contain a colour-bearing frame, stated as a check. If it
// does not, that is the finding — not a reason to render one frame instead of
// two.
say(colourful.best > 64, 'the dataset has a frame whose textures carry colour',
  `best channel spread ${colourful.best} (scene ${colourful.si} frame ${colourful.fi})`);

const targets = [{ ...busiest, label: 'busiest frame', wantColour: false }];
if (colourful.si !== busiest.si || colourful.fi !== busiest.fi) {
  targets.push({ ...colourful, label: 'most colourful frame', wantColour: true });
} else {
  // Same frame: keep the colour assertion, do not drop it on the floor.
  targets[0].wantColour = true;
  targets[0].best = colourful.best;
  targets[0].label = 'busiest frame (also the most colourful)';
}

console.log(`${cand.length} recorded scene-frames; rendering ${targets.length}`);

/** Read the framebuffer back and describe it. preserveDrawingBuffer is on. */
const PROBE = `(() => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2');
  const px = new Uint8Array(c.width * c.height * 4);
  gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const seen = new Set();
  let lit = 0, maxSpread = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] || px[i+1] || px[i+2]) lit++;
    const s = Math.max(px[i],px[i+1],px[i+2]) - Math.min(px[i],px[i+1],px[i+2]);
    if (s > maxSpread) maxSpread = s;
    if (seen.size < 8192) seen.add((px[i]<<16)|(px[i+1]<<8)|px[i+2]);
  }
  return { lit, total: px.length / 4, distinct: seen.size, maxSpread, glError: gl.getError() };
})()`;

for (const t of targets) {
  const query = `?scene=${t.si}&t=${t.fi}`;
  await withPage({
    root: 'productions/planet-potion/web', path: '/index.html', query,
    extraArgs: EXTRA,
  }, async ({ page, errors, failedRequests }) => {
    // The oracle path renders synchronously during module init, but the canvas
    // is only guaranteed populated once a frame has been presented.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const status = await page.$eval('#status', (e) => e.textContent).catch(() => '');
    const px = await page.evaluate(PROBE);

    console.log(`\n--- ${t.label}: scene ${t.si} frame ${t.fi} (${t.part} ${t.slot} t=${t.t})`);
    console.log(`    ${status}`);
    console.log(`    ${px.lit}/${px.total} lit, ${px.distinct} distinct colours, `
      + `max channel spread ${px.maxSpread}`);

    // favicon.ico is the browser asking, not the page — it is not a broken link.
    const real = failedRequests.filter((f) => !f.includes('favicon.ico'));
    say(errors.length === 0, `${t.label}: no page errors`, errors.slice(0, 3).join('; '));
    say(real.length === 0, `${t.label}: no failed requests`, real.slice(0, 3).join('; '));
    say(/glError 0\b/.test(status), `${t.label}: the shim reports glError 0`, status);
    say(px.distinct > 16, `${t.label}: the frame is not a flat fill`,
      `${px.distinct} distinct colours`);
    if (t.wantColour) {
      // The recorded textures for this frame reach a spread of `t.best`, so a
      // greyscale result means colour was lost between the bytecode and the GPU.
      say(px.maxSpread > 32, `${t.label}: colour survives to the framebuffer`,
        `texture spread ${t.best} in, ${px.maxSpread} out`);
    }

    if (pngDir) {
      fs.mkdirSync(pngDir, { recursive: true });
      const clip = await page.$eval('canvas', (c) => {
        const r = c.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      const out = path.join(pngDir, `scene${t.si}_${t.fi}.png`);
      fs.writeFileSync(out, await page.screenshot({ clip }));
      console.log(`    wrote ${out}`);
    }
  });
}

console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
