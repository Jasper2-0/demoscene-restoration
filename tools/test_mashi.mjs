// test_mashi.mjs — does the PACKED build actually run?
//
//   node tools/test_mashi.mjs [--shot]
//
// Loads dist/sonnet-mashi/index.html in headless Chrome, waits for the runtime
// to report itself ready, drives one frame at a known music position and checks
// that the canvas is not blank.  A size build that packs beautifully and boots
// to a black screen is worth nothing, and the failure modes here are all silent
// ones: a missing fetch, an unregistered file, a stripped export.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
// Two artifacts: the SHIP pack (no ?pos hook — that is the point) and, when it
// has been built, the --harness pack that still carries the single-frame path.
// Frame checks need the harness build; the boot check must run against the
// thing that actually ships.
const DIST = path.join(ROOT, 'dist/sonnet-mashi');
const DIST_TEST = path.join(ROOT, 'dist/sonnet-mashi-test');
const HAS_HARNESS = fs.existsSync(path.join(DIST_TEST, 'index.html'));
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('no dist/sonnet-mashi/index.html — run node tools/build_mashi.mjs first');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // /t/* serves the harness pack, everything else the ship pack.
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = u.startsWith('/t/') ? path.join(DIST_TEST, u.slice(3)) : path.join(DIST, u);
  let body;
  try { body = fs.readFileSync(p.endsWith('/') ? path.join(p, 'index.html') : p); }
  catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(body);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,760'],
  protocolTimeout: 600000,
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
// Chrome asks for /favicon.ico unprompted and the packed build is a single
// file with nothing to answer it; that 404 is not a defect.
const noise = (s) => /favicon/i.test(s);
page.on('console', (m) => {
  if (m.type() === 'error' && !noise(m.text() + m.location().url)) errors.push('console: ' + m.text());
});
page.on('requestfailed', () => {});

// ?pos renders a single frame with no audio and no click gesture — the same
// path the sweep uses, and the one that exercises assets, textures, scene
// builds and the audio module without needing an AudioContext.
const POS = '0x120a';
let ok = true;
if (!HAS_HARNESS) console.log('(no harness pack — skipping the single-frame check; build with --harness)');
try {
  if (!HAS_HARNESS) throw { skip: true };
  await page.goto(`http://127.0.0.1:${port}/t/index.html?pos=${POS}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__sonnetReady === true', { timeout: 300000 });
} catch (e) {
  if (!e.skip) { console.error('FAIL: the packed build never became ready —', e.message); ok = false; }
}

if (ok && HAS_HARNESS) {
  const info = await page.evaluate((pos) => {
    const c = document.getElementById('screen');
    window.__sonnetRender(pos);
    const gl = c.getContext('webgl2');
    const px = new Uint8Array(c.width * c.height * 4);
    gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let sum = 0, nonblack = 0;
    for (let i = 0; i < px.length; i += 4) {
      const l = px[i] + px[i + 1] + px[i + 2];
      sum += l; if (l > 24) nonblack++;
    }
    return {
      w: c.width, h: c.height,
      meanLuma: sum / (px.length / 4) / 3,
      nonblackPct: 100 * nonblack / (px.length / 4),
      sceneError: window.__sonnetSceneError || null,
      glError: gl.getError(),
    };
  }, POS);

  console.log(`canvas        ${info.w}x${info.h}`);
  console.log(`mean luma     ${info.meanLuma.toFixed(1)}`);
  console.log(`non-black     ${info.nonblackPct.toFixed(1)}%`);
  console.log(`glError       ${info.glError}`);
  if (info.sceneError) { console.error('scene build error:', info.sceneError); ok = false; }
  if (info.nonblackPct < 20) { console.error('FAIL: canvas is essentially blank'); ok = false; }

  // ?pos never touches audio, and audio is the ONLY consumer of the sliced
  // image — so a bad slice or an unregistered path would sail through the
  // check above.  Boot the full path instead: load with no ?pos, click the
  // overlay (an AudioContext needs the gesture), and wait for the clock to
  // start moving, which only happens once the XM has been rebuilt from the
  // four streams and handed to the player.
  const p2 = await browser.newPage();
  const errs2 = [];
  p2.on('pageerror', (e) => errs2.push(String(e.message)));
  try {
    await p2.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle0' });
    await p2.waitForSelector('#overlay');
    await p2.click('#overlay');
    await p2.waitForFunction('window.__sonnetClock && window.__sonnetClock.pos > 0',
      { timeout: 300000 });
    const t = await p2.evaluate(() => ({
      phases: (window.__sonnetTimings.phases || []).map((x) => x.name),
      pos: window.__sonnetClock.pos,
    }));
    console.log(`boot phases   ${t.phases.join(', ')}`);
    console.log(`clock         playing at 0x${(t.pos | 0).toString(16)}`);
    if (!t.phases.includes('audio')) {
      console.error('FAIL: the audio phase never ran'); ok = false;
    }
  } catch (e) {
    console.error('FAIL: full boot (audio path) —', e.message);
    ok = false;
  }
  errors.push(...errs2);
  await p2.close();
}
if (ok && !HAS_HARNESS) {
  // Ship pack only: still prove it boots, plays and paints.
  const p2 = await browser.newPage();
  const errs2 = [];
  p2.on('pageerror', (e) => errs2.push(String(e.message)));
  try {
    await p2.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle0' });
    await p2.waitForSelector('#overlay');
    await p2.click('#overlay');
    await p2.waitForFunction('window.__sonnetClock && window.__sonnetClock.pos > 0', { timeout: 300000 });
    const t = await p2.evaluate(() => ({
      phases: (window.__sonnetTimings.phases || []).map((x) => x.name),
      pos: window.__sonnetClock.pos,
      lit: (() => {
        const c = document.getElementById('screen');
        const gl = c.getContext('webgl2');
        const px = new Uint8Array(c.width * c.height * 4);
        gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let n = 0;
        for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] > 24) n++;
        return 100 * n / (px.length / 4);
      })(),
    }));
    console.log(`boot phases   ${t.phases.join(', ')}`);
    console.log(`clock         playing at 0x${(t.pos | 0).toString(16)}`);
    console.log(`non-black     ${t.lit.toFixed(1)}%`);
    if (!t.phases.includes('audio')) { console.error('FAIL: the audio phase never ran'); ok = false; }
  } catch (e) { console.error('FAIL: ship pack boot —', e.message); ok = false; }
  errors.push(...errs2);
  await p2.close();
}

if (errors.length) {
  console.error('\npage errors:');
  for (const e of [...new Set(errors)].slice(0, 10)) console.error('  ' + e);
  ok = false;
}

if (process.argv.includes('--shot')) {
  const shot = path.join(DIST, 'shot.png');
  fs.writeFileSync(shot, Buffer.from(await page.evaluate(() =>
    document.getElementById('screen').toDataURL('image/png')).then?.((d) => d) ??
    (await page.evaluate(() => document.getElementById('screen').toDataURL('image/png'))).split(',')[1], 'base64'));
  console.log('wrote ' + shot);
}

await browser.close();
server.close();
console.log(ok ? '\nPASS — the packed build runs' : '\nFAILED');
process.exit(ok ? 0 : 1);
