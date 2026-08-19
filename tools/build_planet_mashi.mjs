// build_planet_mashi.mjs — Planet Potion's SIZE build: one self-extracting
// .html, packed with Mashi.
//
//   node tools/build_planet_mashi.mjs [--no-pack]
//
// The readable build is `productions/planet-potion/web/` — sixteen ES modules,
// nothing minified, and what all thirty-five suites drive. This produces a
// single compressed .html the way a 64k intro actually ships.
//
// IT DOES NOT FORK THE RUNTIME. Everything under web/js/ is compiled exactly as
// tested; the only build-specific code is web-mashi/mashi/entry.js, which
// supplies what index.html used to and answers the runtime's seven fetches out
// of memory.
//
// THE ONE MEASUREMENT THAT DECIDES THIS BUILD. The plan assumed the intro's own
// bytecode would be nearly free, on sonnet's finding that data packs 14-36:1
// against code's 3:1. It is not: these segments are the payload of an already
// crunched executable and gzip only manages 2.4:1 on them. What IS free is
// noticing that 40,752 of seg0's 46,960 bytes are POWERPC CODE this port
// replaced — everything still read from seg0 lives above 0xa334 — so the build
// ships a 5,180-byte slice instead of the segment and the three segments drop
// from 47,142 packed bytes to 23,487.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const PROD = path.join(ROOT, 'productions/planet-potion');
const DATA = path.join(PROD, 'web/data');
const OUT = path.join(ROOT, 'dist/planet-potion-mashi');
const MASHI = path.join(HERE, 'bin/mashi-aarch64-apple-darwin/mashi');
const NO_PACK = process.argv.includes('--no-pack');
const BUDGET = 65536;

// The synthetic base every `import.meta.url` resolves against. Nothing is
// fetched from it; it only has to sit where main.js really lives so that any
// relative URL the runtime builds comes out the same as it does on the
// readable dist.
const MASHI_BASE = 'https://planet-potion.invalid/web/js/main.js';

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const need = (p) => {
  if (!fs.existsSync(p)) {
    console.error(`missing ${path.relative(ROOT, p)} — run work/re/export.py `
      + 'and copy out/ to web/data/.');
    process.exit(1);
  }
  return fs.readFileSync(p);
};
fs.mkdirSync(OUT, { recursive: true });

// ===========================================================================
// 1. THE PAYLOAD
// ===========================================================================
// WHERE THE SLICE BOUNDARY COMES FROM, rather than a number typed in once and
// never re-derived: seg0's PowerPC ends at 0xa334 and everything above it is
// globals and the float pool. The port reaches that region three ways and all
// three are bounded by it — `r2` displacements (r2 is seg0+0x7ffe, and the
// largest displacement any ported code uses is 0x342a, or 0xb428), the glyph
// table at 0xa8e4, and the scene/program tables at 0x25aa..0x27fe. The assert
// below fails if the segment ever grows past what the slice covers.
const SEG0_OFF = 0xa334;
const seg0 = need(path.join(DATA, 'seg0.bin'));
const seg0Slice = seg0.subarray(SEG0_OFF);
if (seg0.length < 0xb428) throw new Error('seg0 shorter than the pool it holds');

// AND A SECOND SLICE, BECAUSE THE ENUMERATION ABOVE WAS INCOMPLETE. There is a
// fourth way the port reads seg0 and it is the only one that reads CODE:
// `decodeScript` walks the two softsynth call scripts instruction by
// instruction, because the script is the faithful thing to read and it "is
// already in the bytes we have to carry anyway" — which was true of the
// segment and not of the slice. Those scripts sit at 0x6b6c..0x6ef0, far below
// 0xa334, so the packed build had them as zeros: `decodeScript` returned an
// empty array, `script[0].call` threw, and the pack has never made a sound.
// Nothing caught it because the size test renders one frame and never presses
// Start.
//
// Derived from the runtime's own table so it cannot drift, and it is 900 bytes.
const { SCRIPTS } = await import(
  pathToFileURL(path.join(PROD, 'web/js/synth.js')).href);
const CODE_BASE = 0x10000000;
const SCRIPT_OFF = Math.min(...Object.values(SCRIPTS).map((x) => x.lo)) - CODE_BASE;
const SCRIPT_END = Math.max(...Object.values(SCRIPTS).map((x) => x.hi)) - CODE_BASE;
if (SCRIPT_END > SEG0_OFF) throw new Error('the synth scripts reach into the slice');
const seg0Scripts = seg0.subarray(SCRIPT_OFF, SCRIPT_END);

const files = [
  ['seg0 slice', seg0Slice],
  ['seg0 synth scripts', seg0Scripts],
  // 2 KB of 1bpp font mask. `_init_txtgen` expands it into the atlas every
  // glyph in the intro is drawn from; without it the pack renders no text.
  ['seg2.bin', need(path.join(DATA, 'seg2.bin'))],
  ['seg3.bin', need(path.join(DATA, 'seg3.bin'))],
  ['seg4.bin', need(path.join(DATA, 'seg4.bin'))],
  // The JSON goes in MINIFIED — these are exports written for a human to read
  // and the packer should not have to carry their whitespace.
  ...['showorder.json', 'render_state.json', 'tex_programs.json',
    'tex_kernels.json'].map((f) => [f,
    Buffer.from(JSON.stringify(JSON.parse(need(path.join(DATA, f)))))]),
];

// [u32 count][u32 length x count][bytes...]
const index = Buffer.alloc(4 + files.length * 4);
index.writeUInt32LE(files.length, 0);
files.forEach(([, b], i) => index.writeUInt32LE(b.length, 4 + i * 4));
const payload = Buffer.concat([index, ...files.map(([, b]) => b)]);

console.log('payload:');
for (const [name, b] of files) console.log(`  ${name.padEnd(18)} ${kb(b.length)}`);
console.log(`  ${'total'.padEnd(18)} ${kb(payload.length)}`);

// `mashi pack --wasm` validates the magic number, so raw bytes cannot be handed
// over directly; the smallest legal container is a module with one custom
// section and an empty name. Going through --wasm rather than base64 in the JS
// avoids the 33% inflation and keeps the bytes byte-aligned for the context
// model, which is what Mashi is built to exploit.
const leb = (n) => {
  const o = [];
  do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; o.push(b); } while (n);
  return o;
};
const header = Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0,
  0x00, ...leb(payload.length + 1), 0x00]);
const WASM_PATH = path.join(OUT, 'payload.wasm');
fs.writeFileSync(WASM_PATH, Buffer.concat([header, payload]));

// ===========================================================================
// 2. THE BUNDLE
// ===========================================================================
const esbuild = await import('esbuild');

// THE WORKER IS ITS OWN BUNDLE, INLINED AS A STRING.
//
// The synth and the mixer run in a worker so the part boundary is not three
// seconds of stopped show — see web/js/audioworker.js. A worker needs a URL,
// and `new Worker(url)` is loaded by the BROWSER rather than through the
// runtime's `fetch`, so entry.js's in-memory file table cannot serve it: on
// this build the only way to start one is a Blob URL over its own source.
//
// So it is bundled first, on its own, and handed to the main pass as
// `__WORKER_SRC__`. IIFE rather than ESM because a Blob worker started without
// `{type:'module'}` is a classic worker — the readable build loads the very
// same file as a module worker instead, which is the only place these two
// builds differ in how web/js/ is loaded rather than what it contains.
//
// IT IS NOT A SECOND COPY. main.js imports none of dbm.js, synth.js or
// dbmplayer.js any more, so this bundle is where that code lives on this build
// rather than an extra of it.
const workerBundle = await esbuild.build({
  entryPoints: [path.join(PROD, 'web/js/audioworker.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2022',
  drop: ['console', 'debugger'],
  write: false,
  logLevel: 'warning',
});
const workerJs = Buffer.from(workerBundle.outputFiles[0].contents).toString('utf8');
console.log(`\n  audioworker.js (minified, inlined)  ${String(workerJs.length).padStart(7)} B`);

const result = await esbuild.build({
  entryPoints: [path.join(PROD, 'web-mashi/mashi/entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2022',
  drop: ['console', 'debugger'],
  define: {
    'import.meta.url': JSON.stringify(MASHI_BASE),
    __SEG0_LEN__: String(seg0.length),
    __SEG0_OFF__: String(SEG0_OFF),
    __SEG0_SCRIPT_OFF__: String(SCRIPT_OFF),
    // Folds out the recorded paths: the oracle player, the PNG texture loader
    // and the stage switch are all dead on a build that ships no recording.
    // ALSO the worker seam — audio.js reads it to decide between a Blob URL
    // and a path, and it is the first thing in web/js/ to read it at all.
    __SIZE__: 'true',
    __WORKER_SRC__: JSON.stringify(workerJs),
  },
  banner: {
    js: 'var __MASHI_PAYLOAD__=typeof arguments!="undefined"&&arguments[0]?'
      + `arguments[0].subarray(${header.length}):new Uint8Array(0);`,
  },
  write: false,
  metafile: true,
  logLevel: 'warning',
});

const js = Buffer.from(result.outputFiles[0].contents);
const JS_PATH = path.join(OUT, 'intro.js');
fs.writeFileSync(JS_PATH, js);

{
  const inputs = Object.entries(result.metafile.outputs)[0][1].inputs;
  const rows = Object.entries(inputs)
    .map(([f, v]) => [f.replace(/^.*planet-potion\//, ''), v.bytesInOutput])
    .sort((a, b) => b[1] - a[1]);
  console.log('\nbundled bytes by module (post-minify):');
  for (const [f, n] of rows.slice(0, 12)) {
    console.log(`  ${String(n).padStart(7)}  ${f}`);
  }
  const rest = rows.slice(12).reduce((s, r) => s + r[1], 0);
  if (rest) console.log(`  ${String(rest).padStart(7)}  (${rows.length - 12} more)`);
}

// ===========================================================================
// 3. THE PACK
// ===========================================================================
const HTML = path.join(OUT, 'index.html');
if (NO_PACK) {
  console.log('\n--no-pack: stopped after the bundle.');
  process.exit(0);
}
if (!fs.existsSync(MASHI)) {
  console.error(`\nno mashi at ${path.relative(ROOT, MASHI)} — run ./tools/fetch_mashi.sh`);
  process.exit(1);
}
execFileSync(MASHI, ['pack', JS_PATH, '--wasm', WASM_PATH, HTML], { stdio: 'inherit' });

const bytes = fs.statSync(HTML).size;
console.log(`\n  intro.js (minified)   ${String(js.length).padStart(7)} B`);
console.log(`  payload.wasm          ${String(payload.length).padStart(7)} B`);
console.log(`  index.html (packed)   ${String(bytes).padStart(7)} B`);
console.log(`  budget                ${String(BUDGET).padStart(7)} B`
  + `   ${bytes <= BUDGET ? `under by ${BUDGET - bytes}` : `OVER by ${bytes - BUDGET}`}`);
if (bytes > BUDGET) {
  console.error('\nover the 64k budget — the gate fails here, on the day it lands.');
  process.exit(1);
}
