// tga.mjs — minimal Targa decoder for the 7 .tga textures in Lapsus.dat.
//
// Browsers decode JPEG natively but not TGA, so these silently failed to load
// and the surfaces using them rendered untextured. That was not a cosmetic
// loss: the DIFF and LUMI channels of every mask-7 object are TGA
// (KaivoalieniRadOut, rad_out, hirbiRadBack), so the three lowest-scoring
// parts were missing two thirds of their texture data.
//
// Scope is what the shipped files actually are — checked, not assumed:
// type 10 (RLE true-colour), 24bpp, no colour map, no ID field. Types 2
// (uncompressed true-colour) and 3/11 (greyscale) are handled too because
// they cost a few lines; anything else throws rather than returning garbage.
//
// TGA stores BGR(A), and with bit 5 of the image descriptor clear the origin
// is BOTTOM-left, so the first row in the file is the bottom row of the
// image. The output here is always top-down RGBA to match what an <img>
// would have produced, which keeps the renderer's "do not flip rows" upload
// rule (RENDER.md §8) correct for both paths.

export function decodeTGA(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const idLength = b[0];
  const colorMapType = b[1];
  const imageType = b[2];
  const width = dv.getUint16(12, true);
  const height = dv.getUint16(14, true);
  const depth = b[16];
  const descriptor = b[17];
  const topDown = (descriptor & 0x20) !== 0;

  if (colorMapType !== 0) throw new Error('TGA: colour-mapped images not supported');
  const rle = imageType === 10 || imageType === 11;
  const grey = imageType === 3 || imageType === 11;
  if (![2, 3, 10, 11].includes(imageType)) throw new Error(`TGA: unsupported image type ${imageType}`);
  const bpp = depth >> 3;
  if (![1, 3, 4].includes(bpp)) throw new Error(`TGA: unsupported depth ${depth}`);

  let p = 18 + idLength;
  const out = new Uint8Array(width * height * 4);
  const px = new Uint8Array(bpp);
  let n = 0;                                   // pixels written

  const emit = (src, o) => {
    // rows are written bottom-up unless the descriptor says top-down
    const i = n++;
    const x = i % width, y = (i / width) | 0;
    const row = topDown ? y : height - 1 - y;
    const d = (row * width + x) * 4;
    if (grey) { out[d] = out[d+1] = out[d+2] = src[o]; out[d+3] = 255; }
    else {                                     // BGR(A) -> RGBA
      out[d] = src[o+2]; out[d+1] = src[o+1]; out[d+2] = src[o];
      out[d+3] = bpp === 4 ? src[o+3] : 255;
    }
  };

  if (!rle) {
    for (; n < width * height; ) emit(b, p), p += bpp;
  } else {
    while (n < width * height) {
      const packet = b[p++];
      const count = (packet & 0x7f) + 1;
      if (packet & 0x80) {                     // run-length packet
        for (let k = 0; k < bpp; k++) px[k] = b[p + k];
        p += bpp;
        for (let i = 0; i < count && n < width * height; i++) emit(px, 0);
      } else {                                 // raw packet
        for (let i = 0; i < count && n < width * height; i++) { emit(b, p); p += bpp; }
      }
    }
  }
  return { width, height, data: out };
}
