// entry.js — the single-file entry point for the MASHI size build.
//
// See re/MASHI.md.  Built by tools/build_mashi.mjs; NOT loaded by index.html and
// not part of the readable dist.
//
// WHAT MASHI DOES TO THIS FILE.  `mashi pack` compresses one JS file into a
// self-extracting .html whose loader ends with
//
//     new Function(source)(payloadBytes)
//
// so the packed script is a FUNCTION BODY, not a module: no `import` /
// `export` / `import.meta` survive to runtime, and the WASM payload arrives as
// `arguments[0]`.  esbuild therefore bundles the whole import graph to an IIFE
// and substitutes `import.meta.url` with one fixed synthetic URL (see
// MASHI_BASE in the build script).  The build's banner captures `arguments[0]`
// into `__MASHI_PAYLOAD__` before the IIFE runs, because an arrow-function IIFE
// has no `arguments` of its own.
//
// WHY THIS FILE EXISTS AT ALL.  index.html carries three things the runtime
// needs and a packed build has nowhere to put: the markup (#screen, #overlay,
// #stats), the stylesheet, and the `node:fs` import map.  esbuild resolves the
// import map at build time; the other two are reproduced below.
//
// ⚠ NOTHING UNDER web/js/, work/js/ OR work/audio/ IS FORKED FOR THIS TARGET.
// The runtime still asks for `timeline.json`, `poem.json` and
// `sonnet_img.bin` exactly as it does on the readable dist — this shim just
// answers those three requests out of memory.  Keeping the packed build on the
// same code path as the tested one is the whole point; a size build that
// quietly diverges is a second port to verify.
import { registerFile } from '../js/node_compat.js';
import { decodePoem } from './poem_decode.js';
// The audio bytes, however the build chose to carry them: `--payload=wasm`
// (default) hands them over through Mashi's `--wasm` channel as raw bytes;
// `--payload=js` embeds them as base64 in this bundle and uses no payload
// channel at all.  A virtual module so entry.js has ONE code path either way —
// the comparison is in re/MASHI.md.
import { AUDIO } from 'mashi:payload';

// ---------------------------------------------------------------- 1. the page
// index.html's <style> and <body>, verbatim in effect.  `image-rendering` and
// the flex centring matter: the canvas is a fixed 640x480 backbuffer and the
// page is what scales and centres it.
document.head.insertAdjacentHTML('beforeend',
  '<meta name=viewport content="width=device-width,initial-scale=1">' +
  '<style>' +
  'html,body{margin:0;height:100%;background:#000;overflow:hidden}' +
  'body{display:flex;align-items:center;justify-content:center}' +
  '#screen{display:block;image-rendering:auto;background:#000}' +
  '#overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
  'color:#c9cdd0;background:#000;cursor:pointer;z-index:2;' +
  'font:300 1.1rem/1.4 "Times New Roman",Times,serif;letter-spacing:.35em}' +
  '#stats{position:fixed;left:8px;top:8px;z-index:3;color:#7fa7d7;' +
  'font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre;pointer-events:none}' +
  '</style>');
document.title = 'sonnet — threestate';
document.body.innerHTML =
  '<canvas id=screen width=640 height=480></canvas>' +
  '<div id=overlay>click to start</div>' +
  '<div id=stats></div>';

// ------------------------------------------------- 2. the four audio streams
// The only part of unpacked/sonnet_img.bin the runtime still reads: the audio
// port walks the XM header/instrument/synth/pattern streams, which sit in one
// contiguous block at VA 0x41aa80..0x47460e.  Everything else the demo needs —
// texture programs, meshes, camera splines, scene descriptors — is already
// base64 inside js/resources.mjs, so the other ~174 KB of the image is dead
// weight here and the build ships only the slice.
//
// `audio/module.mjs` indexes the image by ABSOLUTE file offset (VA 0x401000 ==
// offset 0), so the slice is pasted back at its original offset in a
// full-length, zero-filled array.  That costs half a megabyte of RAM and
// nothing at all in the packed file, and it keeps the audio port's arithmetic
// untouched.  __MASHI_IMG_LEN__ / __MASHI_AUDIO_OFF__ are build-time constants.
const img = new Uint8Array(__MASHI_IMG_LEN__);
img.set(AUDIO, __MASHI_AUDIO_OFF__);
// The build swaps js/resources.mjs for a decoder that walks the resource
// archive straight out of these bytes instead of carrying 52 base64 blobs of
// its own.  It reads the image from here.  Order is safe and not accidental:
// this file's BODY runs before its dynamic `import('../js/main.js')` below, and
// resources.mjs is only ever reached through that import.
globalThis.__IMG = img;

// Two keys, because two callers build the path differently from the same base:
// assets.js asks for the absolute URL, and audio/writexm.mjs asks for
// `new URL('../unpacked/sonnet_img.bin', import.meta.url).pathname`.  Both
// expressions are evaluated HERE against the same substituted base, so they
// cannot drift out of step with the runtime's own.
const IMG_URL = new URL('../../work/unpacked/sonnet_img.bin', import.meta.url).href;
const IMG_PATH = new URL('../unpacked/sonnet_img.bin', import.meta.url).pathname;
registerFile(IMG_URL, img);
registerFile(IMG_PATH, img);

// --------------------------------------------- 3. answer the runtime's fetches
// main.js fetches the timeline and the poem, and prefetches the image.  There
// is no server here, so a tiny Response stand-in serves the three it knows and
// reports a clean 404 for anything else — which is what warmstore.js expects
// when there is no baked store (it catches and cold-boots), and the only other
// fetch the runtime can make.
// ---- the timeline comes out of the IMAGE, not out of a JSON file ----------
// `assets/timeline.json` is a DECODE of bytes this build already ships: the
// event table is at VA 0x41a048..0x41a970 and the audio slice starts at
// 0x418278, so the JSON was a second copy of data already in the payload.
// Shipping it cost 993 packed bytes; this decoder costs a fraction of that.
//
// ENGINE.md: 293 time-sorted 8-byte records,
//     struct Event { u16 time; u8 objIndex; u8 method; f32 param; }
// `timeline.js` reads only `.events`, and each event's `f` is just the float
// reading of the same four bytes as `u32` — the JSON carried both.
// Verified: all 293 events decode byte-identically to the shipped JSON.
const TIMELINE_VA = 0x41a048, TIMELINE_N = 293, IMG_BASE = 0x401000;
const timelineData = (() => {
  const dv = new DataView(img.buffer, img.byteOffset, img.byteLength);
  const events = [];
  for (let i = 0, o = TIMELINE_VA - IMG_BASE; i < TIMELINE_N; i++, o += 8) {
    events.push({ t: dv.getUint16(o, true), obj: img[o + 2], m: img[o + 3],
                  u32: dv.getUint32(o + 4, true), f: dv.getFloat32(o + 4, true) });
  }
  return { events };
})();

// ---- the poem comes out of the IMAGE too ---------------------------------
// Same argument as the timeline: the text-item table is at VA 0x418328 and the
// slice already covers it, so shipping re/text/poem.json as well was 1,204
// packed bytes of duplicate.  The build asserts this decoder reproduces that
// file field-for-field.
const poem = decodePoem(img);

const ROOT = new URL('../../work/', import.meta.url).href;
const ASSETS = new URL('../assets/', import.meta.url).href;
const CANNED = new Map([
  [ASSETS + 'timeline.json', timelineData],
  [ROOT + 're/text/poem.json', poem],
]);
const respond = (body) => Promise.resolve({
  ok: true, status: 200,
  json: () => Promise.resolve(body),
  arrayBuffer: () => Promise.resolve(img.buffer),
});
globalThis.fetch = (input) => {
  const url = String(input && input.url !== undefined ? input.url : input);
  if (CANNED.has(url)) return respond(CANNED.get(url));
  if (url === IMG_URL) return respond(null);
  return Promise.resolve({ ok: false, status: 404,
    json: () => Promise.reject(new Error('404')),
    arrayBuffer: () => Promise.reject(new Error('404')) });
};

// ------------------------------------------------------------------- 4. boot
// DYNAMIC, and that is load-bearing: a static import would hoist main.js above
// everything above it, and main.js reads the file registry and calls fetch
// while it initialises.  esbuild keeps a dynamically imported module behind a
// lazy initialiser, so this runs strictly after the setup.
import('../js/main.js');
