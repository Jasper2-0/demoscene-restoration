// test_planet_mashi.mjs — does the packed build run, and does it draw?
//
//   node tools/test_planet_mashi.mjs
//
// The size build is a different DELIVERY of the same runtime, not a fork, so
// what can break here is the delivery: the payload index, the seg0
// reassembly, the fetch shim, and whether esbuild's IIFE survives being handed
// to `new Function`. All four fail the same way — a blank page — and none of
// them is visible to any suite that drives the readable dist.
//
// MASHI'S LOADER FETCHES ITS OWN DOCUMENT, so this has to be served over HTTP.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withPage, findChrome } from './harness/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const DIST = path.join(ROOT, 'dist/planet-potion-mashi');
const HTML = path.join(DIST, 'index.html');
const BUDGET = 65536;

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

if (!fs.existsSync(HTML)) {
  console.log('test_planet_mashi: no pack — run node tools/build_planet_mashi.mjs');
  process.exit(77);
}
const bytes = fs.statSync(HTML).size;
ok('the pack is inside the 64k budget', bytes <= BUDGET,
  `${bytes} B, ${BUDGET - bytes} to spare`);
// ONE FILE. A pack that quietly leaves its payload beside itself is not a 64k
// intro, and the directory holds the build's intermediates too — so this
// asserts the .html alone is the deliverable rather than that the folder is
// tidy.
ok('and it is one self-contained file',
  fs.readFileSync(HTML, 'utf8').length > 1000
  && !fs.readFileSync(HTML, 'utf8').includes('src="'),
  'no external script reference');

if (!findChrome()) {
  console.log('\nskipped the browser assertions — no Chrome');
  process.exit(failed ? 1 : 0);
}

await withPage({
  root: 'dist/planet-potion-mashi', path: '/index.html',
  query: '?scene=1&tick=92',
  extraArgs: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
}, async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message ?? e)));
  await page.waitForFunction(
    "/computed |no scene|engine could not/.test("
    + "document.getElementById('status')?.textContent ?? '')",
    { timeout: 40000 }).catch(() => {});
  const line = await page.evaluate(
    "document.getElementById('status')?.textContent ?? '(no status element)'");
  const m = /computed (\S+) (\S+) tick=(\d+): (\d+) draws, (\d+) triangles, glError (\d+)/
    .exec(line);
  ok('the packed build boots and renders', Boolean(m) && Number(m[4]) > 0,
    m ? `${m[1]} ${m[2]}: ${m[4]} draws, ${m[5]} triangles` : line.slice(0, 100));
  ok('with no GL error', Boolean(m) && m[6] === '0',
    m ? `glError ${m[6]}` : 'no frame');
  ok('and no page error', errors.length === 0,
    errors.length ? errors[0].slice(0, 120) : 'none');
  // The same frame the readable dist draws, from the same tick — so a payload
  // that decoded to the wrong bytes shows up as a different picture rather
  // than as a picture.
  //
  // 338 until the overlay's clock was fixed. This frame is a one-shot `?tick=`
  // render of part one's scene 1, which starts at part-tick 921, and the
  // overlay used to be stepped at the SCENE's tick here rather than the part's
  // — see renderComputed in main.js. At the right position it contributes one
  // primitive fewer.
  ok('and the same frame the readable build draws', Boolean(m) && m[4] === '337',
    m ? `${m[4]} draws (readable build: 337)` : 'no frame');
});

if (failed) process.exit(1);
console.log('\nthe 64k pack runs, and draws what the readable build draws');
