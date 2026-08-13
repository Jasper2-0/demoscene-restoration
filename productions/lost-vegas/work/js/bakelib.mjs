/*
 * bakelib.mjs — the two things every baker in this directory needs: a minimal
 * PNG encoder (node:zlib only, no npm) and a PE image mapper.
 *
 * Both were originally inline in bake_dr.mjs; they are unchanged, just shared
 * so bake_remaster.mjs does not duplicate them.
 */

import zlib from 'node:zlib';

/* ----------------------------- PNG ------------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** RGBA8 PNG.  `rgba` is any typed array of bytes, row-major, 4 bytes/pixel. */
export function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const src = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.length);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    src.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* -------------------------- PE mapping ---------------------------- */

/** Map a PE file's sections to their virtual addresses.
 *  Returns `{ imageBase, image, secs, read(va, n) }`. */
export function mapPe(buf) {
  const peOff = buf.readUInt32LE(0x3c);
  const nSec = buf.readUInt16LE(peOff + 6);
  const optSize = buf.readUInt16LE(peOff + 20);
  const imageBase = buf.readUInt32LE(peOff + 24 + 28);
  const secTab = peOff + 24 + optSize;
  const secs = [];
  let end = 0;
  for (let i = 0; i < nSec; i++) {
    const o = secTab + i * 40;
    const s = {
      name: buf.toString('latin1', o, o + 8).replace(/\0+$/, ''),
      vsize: buf.readUInt32LE(o + 8),
      vaddr: buf.readUInt32LE(o + 12),
      rsize: buf.readUInt32LE(o + 16),
      raddr: buf.readUInt32LE(o + 20),
    };
    secs.push(s);
    end = Math.max(end, s.vaddr + s.vsize);
  }
  const image = Buffer.alloc(end);
  for (const s of secs) buf.copy(image, s.vaddr, s.raddr, s.raddr + Math.min(s.rsize, s.vsize));
  return {
    imageBase, image, secs,
    read: (va, n) => image.subarray(va - imageBase, va - imageBase + n),
  };
}
