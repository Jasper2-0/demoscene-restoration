// node_compat.js — just enough Node for `audio/*.mjs` to run in a browser.
//
// The audio port (module.mjs / synth.mjs / codec0.mjs / writexm.mjs) synthesises
// every sample of the module from the intro's own four embedded streams, and it was
// written for Node: it reads the unpacked image with `fs.readFileSync` and does all
// its binary work through `Buffer`. Those files are owned by the audio work and are
// not ours to change, so instead of porting them we give the browser the two Node
// facilities they use.
//
// The prize is the download: `extracted/sonnet.xm` is 1,552,564 bytes (708 KB
// gzipped) and is large only because it carries PCM. `unpacked/sonnet_img.bin` is
// 541,299 bytes — 69 KB gzipped — and `buildXm()` reconstructs the XM from it
// BYTE-FOR-BYTE (verified: `Buffer.compare(buildXm(), extracted/sonnet.xm) === 0`).
//
// Wiring, in index.html:
//   <script type="importmap">{"imports":{"node:fs":"./js/node_fs.js"}}</script>
// and `installBuffer()` must have run before any audio module is evaluated, which
// is why they are only ever pulled in with a dynamic `import()`.

// --------------------------------------------------------------------- Buffer
// Subclassing Uint8Array gives `subarray`/`slice` the right species for free, so
// `img.subarray(p)` keeps its read* methods — which module.mjs relies on.
export class BrowserBuffer extends Uint8Array {
  get _dv() {
    let d = this.__dv;
    if (!d) { d = new DataView(this.buffer, this.byteOffset, this.byteLength); this.__dv = d; }
    return d;
  }

  readUInt8(o = 0) { return this[o]; }
  readInt8(o = 0) { return (this[o] << 24) >> 24; }
  readUInt16LE(o = 0) { return this._dv.getUint16(o, true); }
  readInt16LE(o = 0) { return this._dv.getInt16(o, true); }
  readUInt32LE(o = 0) { return this._dv.getUint32(o, true); }
  readInt32LE(o = 0) { return this._dv.getInt32(o, true); }
  readFloatLE(o = 0) { return this._dv.getFloat32(o, true); }
  readDoubleLE(o = 0) { return this._dv.getFloat64(o, true); }

  writeUInt8(v, o = 0) { this[o] = v & 0xff; return o + 1; }
  writeInt8(v, o = 0) { this[o] = v & 0xff; return o + 1; }
  writeUInt16LE(v, o = 0) { this._dv.setUint16(o, v & 0xffff, true); return o + 2; }
  writeInt16LE(v, o = 0) { this._dv.setInt16(o, v << 16 >> 16, true); return o + 2; }
  writeUInt32LE(v, o = 0) { this._dv.setUint32(o, v >>> 0, true); return o + 4; }
  writeInt32LE(v, o = 0) { this._dv.setInt32(o, v | 0, true); return o + 4; }

  /** Only latin1 is ever asked for, and only for fixed-width ASCII tags. */
  write(str, offset = 0, _enc = 'latin1') {
    for (let i = 0; i < str.length; i++) this[offset + i] = str.charCodeAt(i) & 0xff;
    return str.length;
  }

  toString(_enc = 'latin1', start = 0, end = this.length) {
    let s = '';
    for (let i = start; i < end; i++) s += String.fromCharCode(this[i]);
    return s;
  }

  copy(target, targetStart = 0, sourceStart = 0, sourceEnd = this.length) {
    target.set(this.subarray(sourceStart, sourceEnd), targetStart);
    return sourceEnd - sourceStart;
  }

  equals(other) {
    if (this.length !== other.length) return false;
    for (let i = 0; i < this.length; i++) if (this[i] !== other[i]) return false;
    return true;
  }

  static alloc(n) { return new BrowserBuffer(n); }
  static allocUnsafe(n) { return new BrowserBuffer(n); }
  static isBuffer(b) { return b instanceof BrowserBuffer; }

  static from(src, enc) {
    if (typeof src === 'string') {
      if (enc === 'base64') {
        const bin = atob(src);
        const b = new BrowserBuffer(bin.length);
        for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
        return b;
      }
      const b = new BrowserBuffer(src.length);
      for (let i = 0; i < src.length; i++) b[i] = src.charCodeAt(i) & 0xff;
      return b;
    }
    if (src instanceof ArrayBuffer) return new BrowserBuffer(src);
    // Uint8Array / Int16Array / plain array — Buffer.from COPIES, byte-wise for a
    // typed array of another element type, which is what `push(pcmChunk)` wants.
    if (ArrayBuffer.isView(src)) {
      return new BrowserBuffer(
        src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength));
    }
    return new BrowserBuffer(Uint8Array.from(src));
  }

  static concat(list, total) {
    let n = total;
    if (n === undefined) { n = 0; for (const b of list) n += b.length; }
    const out = new BrowserBuffer(n);
    let o = 0;
    for (const b of list) { out.set(b, o); o += b.length; }
    return out;
  }

  static compare(a, b) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    return a.length === b.length ? 0 : (a.length < b.length ? -1 : 1);
  }
}

let installed = false;
export function installBuffer() {
  if (installed) return globalThis.Buffer;
  if (!globalThis.Buffer) globalThis.Buffer = BrowserBuffer;
  // Every audio module ends with the standard `if (import.meta.url ===
  // \`file://${process.argv[1]}\`)` CLI guard, which is evaluated at import time and
  // would throw a ReferenceError here. An empty argv makes the guard simply false.
  if (!globalThis.process) globalThis.process = { argv: [], env: {}, platform: 'browser' };
  installed = true;
  return globalThis.Buffer;
}

// ----------------------------------------------------------------- the fs shim
// `readModule(path)` is handed a filesystem-looking string; in the browser that is
// `new URL('../unpacked/sonnet_img.bin', import.meta.url).pathname`. Pre-register
// the bytes under exactly that key and the Node code needs no edit at all.
const FILES = new Map();

export function registerFile(pathOrUrl, bytes) {
  const b = bytes instanceof BrowserBuffer ? bytes : BrowserBuffer.from(bytes);
  FILES.set(pathOrUrl, b);
  try { FILES.set(new URL(pathOrUrl, location.href).pathname, b); } catch { /* not a URL */ }
  return b;
}

export function readFileSyncShim(p) {
  const b = FILES.get(String(p)) || FILES.get(new URL(String(p), location.href).pathname);
  if (!b) throw new Error(`node_compat: ${p} was not registered before readFileSync`);
  return b;
}

export function hasFile(p) {
  return FILES.has(String(p));
}

/** Fetch a URL and register it under both the URL and its pathname. */
export async function preloadFile(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`node_compat: cannot fetch ${url} (${r.status})`);
  return registerFile(url, new Uint8Array(await r.arrayBuffer()));
}
