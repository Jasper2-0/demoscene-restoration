// poem_decode.js — the text-item table, straight out of the image.
//
// `re/text/poem.json` is a DECODE of bytes the packed build already ships: the
// table is at VA 0x418328..0x418dd7 and the payload slice starts at 0x4170da,
// so shipping the JSON as well cost 1,204 packed bytes for data already
// present.  This is a JS port of re/text/parse_poem.py, which is itself a
// transcription of `FUN_004067c0` @ 0x4067c0.
//
// tools/build_mashi.mjs imports THIS module to assert, at build time, that it
// reproduces poem.json field-for-field — so the shipped decoder is the one that
// is verified, not a second implementation of it.
//
// Layout: u16 count, then `count` variable-length records:
//   u16 mask
//   mask&0x001 u16 flags | 0x002 f32 rot   | 0x004 f32 x       | 0x008 f32 y
//        0x010 f32 tracking | 0x020 f32 lineadv | 0x040 f32 scale
//        0x080 u32 color (D3DCOLOR ARGB)   | 0x100 f32 speed
//   u8  len
//   mask&0x200 char text[len]   else inherit the previous item's text, truncated
//   mask&0x400 u8   attr[len]   else inherit the previous item's attr/size
//
// ⚠ EVERY absent field is INHERITED from the previous item: the original
// memcpy()s the whole 0x40-byte previous item over the new one before decoding,
// so this is a running state, not a per-record default.
//
// attr[i] decodes to two values: size[i] = (attr[i] >> 2) / 63, attr[i] &= 3
// (bit 0 BOLD, bit 1 fake ITALIC).
export const POEM_VA = 0x418328;
const IMG_BASE = 0x401000;

export function decodePoem(img) {
  const dv = new DataView(img.buffer, img.byteOffset, img.byteLength);
  let o = POEM_VA - IMG_BASE;
  const count = dv.getUint16(o, true); o += 2;
  const f32 = () => { const v = dv.getFloat32(o, true); o += 4; return v; };
  const items = [];
  let cur = { flags: 0, rot: 0, x: 0, y: 0, tracking: 0, lineadv: 0,
              scale: 0, color: 0, speed: 0, text: '', attr: [], size: [] };
  for (let n = 0; n < count; n++) {
    const mask = dv.getUint16(o, true); o += 2;
    const it = { ...cur };
    if (mask & 0x001) { it.flags = dv.getUint16(o, true); o += 2; }
    if (mask & 0x002) it.rot = f32();
    if (mask & 0x004) it.x = f32();
    if (mask & 0x008) it.y = f32();
    if (mask & 0x010) it.tracking = f32();
    if (mask & 0x020) it.lineadv = f32();
    if (mask & 0x040) it.scale = f32();
    if (mask & 0x080) { it.color = dv.getUint32(o, true); o += 4; }
    if (mask & 0x100) it.speed = f32();
    const len = img[o++];
    if (mask & 0x200) {
      let t = '';
      for (let i = 0; i < len; i++) t += String.fromCharCode(img[o + i]);
      o += len; it.text = t;
    } else it.text = cur.text.slice(0, len);
    if (mask & 0x400) {
      const attr = [], size = [];
      for (let i = 0; i < len; i++) {
        const b = img[o + i];
        attr.push(b & 3); size.push((b >> 2) / 63);
      }
      o += len; it.attr = attr; it.size = size;
    } else {
      it.attr = cur.attr.concat(Array(len).fill(0)).slice(0, len);
      it.size = cur.size.concat(Array(len).fill(0)).slice(0, len);
    }
    items.push(it);
    cur = it;
  }
  return { items };
}
