// Dump the in-memory IT module that the IXS player synthesizes on load.
// The player (same code lineage as PTCT's embedded player) turns the .ixs
// into a complete Impulse Tracker module image before playing it; we scan the
// wasm heap for the IMPM magic and reconstruct the module's true extent from
// its own header offsets.
// Usage: node dump_it.mjs <input.ixs> <output.it>
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const [,, inFile, outFile] = process.argv;
const here = path.dirname(url.fileURLToPath(import.meta.url));

// reuse the render harness environment by importing its shims via eval of self
// (kept standalone: duplicate the minimal shims)
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

const cache = new Map();
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
globalThis.ixs_getCached = (f) => (cache.has(f) ? cache.get(f) : null);
globalThis.ixs_asyncSetFileData = (f, d) => cache.set(f, d);
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

const playerSrc = fs.readFileSync(path.join(here, 'stdlib_player.js'), 'utf8');
const src = fs.readFileSync(path.join(here, 'backend_ixs.js'), 'utf8');
(0, eval)(playerSrc + '\n;\n' + src + '\n;globalThis.__backend = backend_IXS;');
globalThis.ScriptNodePlayer = { getInstance: () => ({ isReady: () => false }) };

const state = window.spp_backend_state_IXS;
await new Promise((resolve) => {
  if (!state.notReady) return resolve();
  state.adapterCallback = () => resolve();
});
const Module = globalThis.__backend.Module;
Object.defineProperty(globalThis, 'ixs_HEAP8', { get: () => Module.HEAP8 });
globalThis.wavegenWorker = new Worker('wavegen_ixs.js');
wavegenWorker.onmessage = () => {};

const data = fs.readFileSync(inFile);
const songPtr = Module._malloc(data.length);
Module.HEAPU8.set(data, songPtr);
const flush = () => new Promise((r) => setTimeout(r, 50));
let r = -1;
for (let attempt = 0; attempt < 40; attempt++) {
  r = Module.ccall('emu_load_file', 'number',
    ['string', 'number', 'number', 'number', 'number', 'number'],
    [path.basename(inFile), songPtr, data.length, 44100, 4096, 0]);
  if (r === 0) break;
  await flush();
}
if (r !== 0) { console.error('load failed'); process.exit(1); }

// scan heap for IMPM
const heap = Module.HEAPU8;
const magic = [0x49, 0x4d, 0x50, 0x4d]; // IMPM
const hits = [];
for (let i = 0; i < heap.length - 4; i++) {
  if (heap[i] === 0x49 && heap[i+1] === 0x4d && heap[i+2] === 0x50 && heap[i+3] === 0x4d) hits.push(i);
}
console.log('IMPM candidates at heap offsets:', hits);

function analyze(base) {
  const dv = new DataView(heap.buffer, base, Math.min(0x10000, heap.length - base));
  const ordNum = dv.getUint16(0x20, true);
  const insNum = dv.getUint16(0x22, true);
  const smpNum = dv.getUint16(0x24, true);
  const patNum = dv.getUint16(0x26, true);
  if (ordNum > 512 || insNum > 200 || smpNum > 200 || patNum > 300) return null;
  // parameter block offsets follow header + orders
  const off = 0xc0 + ordNum;
  let maxEnd = off + (insNum + smpNum + patNum) * 4;
  const u32 = (o) => new DataView(heap.buffer, base + o, 4).getUint32(0, true);
  const insOfs = [], smpOfs = [], patOfs = [];
  for (let i = 0; i < insNum; i++) insOfs.push(u32(off + i * 4));
  for (let i = 0; i < smpNum; i++) smpOfs.push(u32(off + insNum * 4 + i * 4));
  for (let i = 0; i < patNum; i++) patOfs.push(u32(off + (insNum + smpNum) * 4 + i * 4));
  // module size: max over sample headers (each points to sample data) and patterns
  for (const so of smpOfs) {
    if (so === 0 || base + so + 0x50 > heap.length) return null;
    const sdv = new DataView(heap.buffer, base + so, 0x50);
    const len = sdv.getUint32(0x30, true);        // length in samples
    const flags = sdv.getUint8(0x12);
    const bytes = len * ((flags & 2) ? 2 : 1) * ((flags & 4) ? 2 : 1);
    const smpPtr = sdv.getUint32(0x48, true);     // sample pointer
    maxEnd = Math.max(maxEnd, smpPtr + bytes);
  }
  for (const po of patOfs) {
    if (po === 0) continue;
    const pdv = new DataView(heap.buffer, base + po, 8);
    const dlen = pdv.getUint16(0, true);
    maxEnd = Math.max(maxEnd, po + 8 + dlen);
  }
  return { ordNum, insNum, smpNum, patNum, size: maxEnd };
}

for (const h of hits) {
  const a = analyze(h);
  if (a) {
    console.log('valid IT at', h, a);
    const out = Buffer.from(heap.buffer, h, a.size);
    fs.writeFileSync(outFile, out);
    console.log('wrote', outFile, a.size, 'bytes');
    process.exit(0);
  }
}
console.error('no valid IT module found');
process.exit(1);
