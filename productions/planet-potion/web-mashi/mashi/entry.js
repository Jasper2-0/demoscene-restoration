// entry.js — the single-file entry point for the MASHI size build.
//
// Built by tools/build_planet_mashi.mjs; NOT loaded by web/index.html and not
// part of the readable dist.
//
// WHAT MASHI DOES TO THIS FILE. `mashi pack` compresses one JS file into a
// self-extracting .html whose loader ends with `new Function(source)(payload)`,
// so the packed script is a FUNCTION BODY: no `import`, no `export`, no
// `import.meta` survives, and the payload arrives as `arguments[0]`. esbuild
// bundles the whole graph to an IIFE and the build's banner captures
// `arguments[0]` before it runs, because an arrow IIFE has no `arguments`.
//
// NOTHING UNDER web/js/ IS FORKED FOR THIS TARGET. The runtime asks for its
// seven files exactly as it does on the readable dist and this shim answers
// them out of memory. A size build that quietly diverges is a second port to
// verify, and this port has thirty-five suites pointed at the first one.
//
// WHAT IS IN THE PAYLOAD, and why it is not simply "the segments":
//
//   seg0 is 46,960 bytes and 40,752 of them are POWERPC CODE that this port
//   replaced with JavaScript. What the runtime still reads out of seg0 is the
//   small-data area — the float pool, the glyph table, the scene and program
//   and texture tables, and the synth's 42 parameter blocks — which all sit
//   above 0xa334. Shipping the slice instead of the segment saves 41,780 raw
//   bytes and, because compiled PowerPC is far less compressible than the data
//   around it, 23,667 packed ones. That is more than a third of the budget.
//
//   The slice is pasted back at its own offset in a full-length zero-filled
//   array, so every displacement in the port keeps working untouched. That
//   costs 47 KB of RAM and nothing in the file.

// The payload the loader handed us, and the little index the build wrote.
const P = __MASHI_PAYLOAD__;
const dv = new DataView(P.buffer, P.byteOffset, P.byteLength);
const COUNT = dv.getUint32(0, true);
const parts = [];
{
  let off = 4 + COUNT * 4;
  for (let i = 0; i < COUNT; i++) {
    const n = dv.getUint32(4 + i * 4, true);
    parts.push(P.subarray(off, off + n));
    off += n;
  }
}
const [seg0Slice, seg3, seg4, showorder, renderState, texPrograms, texKernels]
  = parts;

// seg0, reassembled. __SEG0_LEN__ and __SEG0_OFF__ are build-time constants.
const seg0 = new Uint8Array(__SEG0_LEN__);
seg0.set(seg0Slice, __SEG0_OFF__);

const text = new TextDecoder();
const json = (u8) => JSON.parse(text.decode(u8));

// --------------------------------------------------------------- 1. the page
// web/index.html's <style> and <body>, verbatim in effect.
document.head.insertAdjacentHTML('beforeend',
  '<meta name=viewport content="width=device-width,initial-scale=1">'
  + '<style>'
  + 'html,body{width:100%;height:100%;margin:0;background:#000;overflow:hidden}'
  + 'body{display:grid;place-items:center;color:#fff;font:14px system-ui,sans-serif}'
  + 'canvas{width:min(100vw,calc(100vh*4/3));height:min(100vh,calc(100vw*3/4))}'
  + '#status{position:fixed;inset:auto 1rem 1rem;opacity:.75}'
  + '#start{position:fixed;inset:1rem 1rem auto auto;padding:.6rem 1rem;color:#fff;'
  + 'border:1px solid #777;background:#111c;cursor:pointer}'
  + '#start[hidden]{display:none}'
  + '</style>');
document.title = 'planet potion — Potion (2002)';
document.body.innerHTML =
  '<canvas id=screen width=640 height=480></canvas>'
  + '<button id=start type=button>Start with sound</button>'
  + '<div id=status>planet potion</div>';

// --------------------------------------------- 2. answer the runtime's fetches
// main.js asks for seven files by relative path and there is no server here.
// Anything else gets a clean 404, which is what the page already handles: it is
// how `draws.json` being absent is reported rather than crashed on, and on this
// build it is absent on purpose.
const FILES = new Map([
  ['./data/seg0.bin', seg0],
  ['./data/seg3.bin', seg3],
  ['./data/seg4.bin', seg4],
  ['./data/showorder.json', showorder],
  ['./data/render_state.json', renderState],
  ['./data/tex_programs.json', texPrograms],
  ['./data/tex_kernels.json', texKernels],
]);
globalThis.fetch = (input) => {
  const url = String(input && input.url !== undefined ? input.url : input);
  const hit = FILES.get(url);
  if (!hit) {
    return Promise.resolve({ ok: false, status: 404,
      json: () => Promise.reject(new Error('404')),
      arrayBuffer: () => Promise.reject(new Error('404')) });
  }
  return Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve(json(hit)),
    arrayBuffer: () => Promise.resolve(
      hit.buffer.slice(hit.byteOffset, hit.byteOffset + hit.byteLength)),
  });
};

// ------------------------------------------------------------------- 3. boot
// DYNAMIC, and that is load-bearing: a static import would hoist main.js above
// the fetch override, and main.js fetches while it initialises.
import('../../web/js/main.js');
