// Offline bake: render an .ixs file to WAV using Wothke's webIXS backend
// (Emscripten build of the reverse-engineered Shortcut IXSPlayer 1.20).
//
// The player is split in two modules exactly like the website:
//   ixs.wasm / backend_ixs.js  — IT-style replayer, asks JS for "sample cache files"
//   wavegen_ixs.js             — the procedural-sample synthesizer (asm.js worker)
// We emulate the browser glue (Worker, indexedDB, window globals) in-process so
// the synth runs synchronously and the replayer can be retried once the
// generated samples land in the in-memory cache.
//
// Usage: node render_ixs.mjs <input.ixs> <output.wav>
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const [,, inFile, outFile] = process.argv;
const here = path.dirname(url.fileURLToPath(import.meta.url));

// ---- browser environment shims -------------------------------------------
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.location = { href: 'file://' + here + '/' };
globalThis.document = { currentScript: { src: 'file://' + here + '/backend_ixs.js' } };
globalThis.WASM_SEARCH_PATH = here + path.sep;

const nodeFetch = globalThis.fetch;
globalThis.fetch = async (u, opts) => {
  const s = String(u);
  if (s.startsWith('http')) return nodeFetch(u, opts);
  const p = s.replace(/^file:\/\//, '');
  const b = fs.readFileSync(p.startsWith('/') ? p : path.join(here, p));
  return new Response(b, { status: 200, headers: { 'Content-Type': 'application/wasm' } });
};

globalThis.XMLHttpRequest = class {
  open(_m, u) { this.url = u.replace(/^file:\/\//, ''); }
  send() {
    const p = this.url.startsWith('/') ? this.url : path.join(here, this.url);
    const b = fs.readFileSync(p);
    this.response = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    this.responseText = b.toString('latin1');
    this.status = 200;
    if (this.onload) this.onload();
  }
};

// ---- in-memory stand-ins for indexedDB and the sample cache ---------------
const cache = new Map(); // filename -> Uint8Array of generated sample data

globalThis.indexedDB = {
  open() {
    const req = {};
    queueMicrotask(() => {
      req.result = {
        transaction() {
          const tx = {
            objectStore: () => ({
              index: () => ({
                get(f) {
                  const r2 = {};
                  queueMicrotask(() => {
                    r2.result = cache.has(f) ? { filename: f, data: cache.get(f) } : undefined;
                    if (r2.onsuccess) r2.onsuccess();
                  });
                  return r2;
                },
              }),
              add(rec) {
                cache.set(rec.filename, rec.data);
                const r3 = {};
                queueMicrotask(() => {
                  if (r3.onsuccess) r3.onsuccess();
                  if (tx.oncomplete) tx.oncomplete();
                });
                return r3;
              },
            }),
          };
          return tx;
        },
      };
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  },
};

// cache hooks normally installed by IXSBackendAdapter
globalThis.ixs_getCached = (f) => (cache.has(f) ? cache.get(f) : null);
globalThis.ixs_asyncSetFileData = (f, d) => cache.set(f, d);

// ---- fake Worker running wavegen_ixs.js in-process ------------------------
globalThis.Worker = class {
  constructor(p) {
    const code = fs.readFileSync(p.startsWith('/') ? p : path.join(here, p), 'utf8');
    globalThis.postMessage = (msg) => { if (this.onmessage) this.onmessage({ data: msg }); };
    (0, eval)(code + '\n;globalThis.__workerOnMessage = onmessage;');
    this._handler = globalThis.__workerOnMessage;
  }
  postMessage(msg) { this._handler({ data: msg }); }
};

globalThis.AudioContext = class { constructor() { this.sampleRate = 44100; } };
globalThis.ScriptNodePlayer = { getInstance: () => ({ isReady: () => false }) };

// ---- load the two player modules ------------------------------------------
const playerSrc = fs.readFileSync(path.join(here, 'stdlib_player.js'), 'utf8');
const src = fs.readFileSync(path.join(here, 'backend_ixs.js'), 'utf8');
(0, eval)(playerSrc + '\n;\n' + src +
  '\n;globalThis.__backend = backend_IXS; globalThis.__Adapter = IXSBackendAdapter;');

// stdlib_player installs its own ScriptNodePlayer whose getInstance() is null
// before init; JS_printStatus dereferences it, so give it a safe stub.
globalThis.ScriptNodePlayer = { getInstance: () => ({ isReady: () => false }) };

const state = window.spp_backend_state_IXS;
await new Promise((resolve) => {
  if (!state.notReady) return resolve();
  state.adapterCallback = () => resolve();
});
const Module = globalThis.__backend.Module;
Object.defineProperty(globalThis, 'ixs_HEAP8', { get: () => Module.HEAP8 });

// spin up the wavegen worker like the adapter does
globalThis.wavegenWorker = new Worker('wavegen_ixs.js');
wavegenWorker.onmessage = (e) => {
  if (e.data && e.data.logMsg) console.log('[wavegen]', e.data.logMsg);
  if (e.data && e.data.cacheReady) console.log('[wavegen] cache ready:', e.data.cacheReady);
  if (e.data && e.data.error) console.error('[wavegen]', e.data.error);
};

// ---- load song, letting the synth generate sample caches on demand --------
const data = fs.readFileSync(inFile);
const name = path.basename(inFile);
const songPtr = Module._malloc(data.length);
Module.HEAPU8.set(data, songPtr);

const flush = () => new Promise((r) => setTimeout(r, 50));
let r = -1;
for (let attempt = 0; attempt < 40; attempt++) {
  r = Module.ccall('emu_load_file', 'number',
    ['string', 'number', 'number', 'number', 'number', 'number'],
    [name, songPtr, data.length, 44100, 4096, 0]);
  if (r === 0) break;
  await flush(); // let microtask chains (idb → worker → save) run
}
if (r !== 0) { console.error('emu_load_file failed after retries:', r); process.exit(1); }
console.log('song loaded; cache files:', [...cache.keys()]);

const sampleRate = Module.ccall('emu_get_sample_rate', 'number', [], []);
console.log('sampleRate', sampleRate);

const chunks = [];
let total = 0;
for (let i = 0; i < 200000; i++) {
  const done = Module.ccall('emu_compute_audio_samples', 'number', [], []);
  const len = Module.ccall('emu_get_audio_buffer_length', 'number', [], []);
  const ptr = Module.ccall('emu_get_audio_buffer', 'number', [], []);
  if (len > 0) {
    const s16 = new Int16Array(Module.HEAP16.buffer, ptr, len * 2);
    chunks.push(Int16Array.from(s16));
    total += len;
  }
  if (done !== 0) break;
}
console.log('rendered frames:', total, '=', (total / sampleRate).toFixed(1), 's');

const pcm = new Int16Array(total * 2);
let o = 0;
for (const c of chunks) { pcm.set(c, o); o += c.length; }
const dataSize = pcm.byteLength;
const buf = Buffer.alloc(44 + dataSize);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sampleRate, 24);
buf.writeUInt32LE(sampleRate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(dataSize, 40);
Buffer.from(pcm.buffer).copy(buf, 44);
fs.writeFileSync(outFile, buf);
console.log('wrote', outFile, 44 + dataSize, 'bytes');
process.exit(0);
