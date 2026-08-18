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

// ---------------------------------------------------------------------------
// AND IT HAS TO MAKE A SOUND.
//
// Everything above renders one frame with `?scene=&tick=`, which is a path that
// never touches the softsynth — so the pack shipped SILENT and passed. seg0's
// PowerPC was sliced away at 0xa334 on the reasoning that the port only reads
// the small-data area above it, and that enumeration missed `decodeScript`,
// which walks the two call scripts at 0x6b6c as INSTRUCTIONS. They came through
// as zeros, the walk returned nothing, and pressing Start threw
// `undefined.call` out of minified code.
//
// So this presses Start. It is slow — the synth is a couple of seconds and the
// mix a couple more — and it is the only assertion here that exercises the
// payload rather than the picture.
if (findChrome()) {
  await withPage({
    root: 'dist/planet-potion-mashi', path: '/index.html', query: '',
    extraArgs: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
      '--autoplay-policy=no-user-gesture-required'],
  }, async ({ page }) => {
    const read = () => page
      .evaluate("document.getElementById('status')?.textContent ?? ''")
      .catch(() => '');
    // The generators block the main thread, so this polls rather than waiting
    // on a function the page has no cycles to evaluate.
    const until = async (re, ms) => {
      for (let i = 0; i < ms / 2000; i++) {
        const t = await read();
        if (re.test(t)) return t;
        await new Promise((r) => setTimeout(r, 2000));
      }
      return read();
    };
    const ready = await until(/Potion, 2002|failed/, 240000);
    ok('the pack finishes its precalc', /Potion, 2002/.test(ready),
      ready.replace(/\n/g, ' · ').slice(0, 90));
    ok('and it has a font', !/NO FONT/.test(ready),
      /NO FONT/.test(ready) ? 'seg2 is missing from the payload' : 'seg2 present');
    await page.evaluate("document.getElementById('start')?.click()").catch(() => {});
    const after = await until(/failed|mixing|playing/, 240000);
    ok('and pressing Start reaches the soundtrack without throwing',
      !/failed/.test(after), after.replace(/\n/g, ' · ').slice(0, 110));
  });
}

if (failed) process.exit(1);
console.log('\nthe 64k pack runs, and draws what the readable build draws');
