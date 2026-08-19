// depthcheck.mjs — is the z buffer really 16 bits, in every browser we can run?
//
//   node work/re/depthcheck.mjs
//
// The original renders to a 16-bit z buffer, and part one's 0x25ee depends on
// it: surfaces that interpenetrate within 0.2% of each other quantise to the
// same value there, W3D_Z_GEQUAL takes the later one, and the picture is
// stable. Given more bits the differences resolve and those surfaces show
// through each other. So warp3d.js renders into its own framebuffer with a
// 16-bit depth attachment instead of taking whatever the canvas offers.
//
// ⚠ WHY THIS IS A RENDERING CHECK AND NOT A QUERY. There is no query that
// answers "how many depth bits did the driver actually give me":
//
//   * `getParameter(DEPTH_BITS)` returned **16** in Firefox for an attachment
//     Firefox itself describes as 32-bit. It reports what was asked for.
//   * `getRenderbufferParameter(RENDERBUFFER_DEPTH_SIZE)` is honest for
//     renderbuffers — and it is how the promotion was found — but there is no
//     equivalent for a texture attachment, which is what we now use.
//
// The first fix here asked for a 16-bit depth RENDERBUFFER and was checked with
// `getParameter`, which agreed it had worked. It had not: Firefox promotes every
// depth renderbuffer to 32 bits — DEPTH_COMPONENT16, 24 and 32F alike — so the
// framebuffer built to REDUCE precision below the canvas's 24 was quietly
// running at more than the canvas would have given. Chrome and Safari honoured
// the request, which is why it looked fixed for a year of looking at it.
//
// So this measures the only thing that cannot lie: the picture. Every browser
// on the machine renders the same four frames of 0x25ee, and they must agree
// pixel for pixel. Depth precision is the one thing that differs between them
// here, so a disagreement IS a precision disagreement.
//
// AND IT CHECKS THAT IT CAN FAIL. `?depth16=0` renders to the canvas depth
// buffer instead. If that does not change 0x25ee, this check is measuring
// nothing and says so — which matters more than the pass, because a
// cross-browser check that cannot detect the bug it was written for is exactly
// the kind of green that hid this one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, fromRepo } from '../../../../tools/harness/index.mjs';
import puppeteer from 'puppeteer-core';

const WEB = 'productions/planet-potion/web';
const TIMES = [265, 270, 275, 280];       // inside 0x25ee, 260.7..288.4 s
const DIFF = 8;                            // per-channel, to ignore nothing real

const CANDIDATES = [
  ['chrome', ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium']],
  ['firefox', ['/Applications/Firefox.app/Contents/MacOS/firefox',
    '/usr/bin/firefox']],
];

let failures = 0;
const say = (ok, what, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

const found = CANDIDATES
  .map(([name, paths]) => [name, paths.find((p) => fs.existsSync(p))])
  .filter(([, p]) => p);

if (found.length < 2) {
  console.error('depthcheck: needs two browsers on the machine to compare; '
    + `found ${found.map(([n]) => n).join(', ') || 'none'} — skipping`);
  process.exit(77);
}

const server = await serve(fromRepo(WEB));

/** The four frames of 0x25ee, as raw RGBA, from one browser. */
async function shoot(name, exe, query) {
  const browser = await puppeteer.launch({
    browser: name, executablePath: exe, headless: true,
    args: name === 'chrome' ? ['--use-angle=metal'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 640, height: 480 });
    await page.goto(`${server.url}/index.html?show=p1${query}`,
      { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.__ppReady === true', { timeout: 300000 });
    const out = [];
    for (const t of TIMES) {
      await page.evaluate(`window.__pp.renderAt(${t})`);
      // Off the canvas itself rather than a screenshot: no CSS scaling, no
      // compositor, and nothing between the shim's pixels and the comparison.
      out.push(await page.evaluate(`(() => {
        const c = document.getElementById('screen');
        const o = document.createElement('canvas');
        o.width = c.width; o.height = c.height;
        o.getContext('2d').drawImage(c, 0, 0);
        return Array.from(o.getContext('2d')
          .getImageData(0, 0, c.width, c.height).data); })()`));
    }
    return out;
  } finally {
    await browser.close();
  }
}

const differing = (a, b) => {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) > DIFF || Math.abs(a[i + 1] - b[i + 1]) > DIFF
      || Math.abs(a[i + 2] - b[i + 2]) > DIFF) n++;
  }
  return n;
};

try {
  console.log(`comparing ${found.map(([n]) => n).join(' and ')} `
    + `on ${TIMES.length} frames of p1 0x25ee\n`);

  const shots = new Map();
  for (const [name, exe] of found) shots.set(name, await shoot(name, exe, ''));

  const [base, ...rest] = [...shots.keys()];
  for (const other of rest) {
    let worst = 0;
    TIMES.forEach((t, i) => {
      const n = differing(shots.get(base)[i], shots.get(other)[i]);
      worst = Math.max(worst, n);
      say(n === 0, `t=${t}s — ${base} and ${other} agree pixel for pixel`,
        n ? `${n} pixels differ` : '');
    });
    say(worst === 0, `${base} vs ${other}: the z buffer resolves the same way`,
      worst ? `worst frame ${worst} pixels` : 'no browser-dependent depth');
  }

  // The control: the check has to be able to see the thing it exists for.
  const canvasDepth = await shoot(found[0][0], found[0][1], '&depth16=0');
  let moved = 0;
  TIMES.forEach((t, i) => {
    moved = Math.max(moved, differing(shots.get(found[0][0])[i], canvasDepth[i]));
  });
  say(moved > 0, 'the control: ?depth16=0 visibly changes 0x25ee',
    moved ? `${moved} pixels at the worst frame — so this check can fail`
      : 'IT DOES NOT — this check is measuring nothing');
} finally {
  await server.close();
}

console.log(failures
  ? `\n${failures} FAILED — the depth buffer is not the same everywhere`
  : '\nthe 16-bit z buffer is 16 bits in every browser on this machine');
process.exit(failures ? 1 : 0);
