// lwo.mjs — parser for the LightWave Object (LWO2, binary IFF) files in
// Lapsus.dat. All 50 shipped objects are FORM/LWO2, big-endian throughout.
//
// Scope is exactly the chunk vocabulary the archive actually uses (see
// re/LWO_INVENTORY.md): TAGS LAYR PNTS BBOX POLS PTAG VMAP SURF CLIP ENVL,
// and inside SURF the BLOK/COLR/DIFF/SPEC/REFL/TRAN/LUMI/GLOS/SIDE/SMAN/…
// sub-chunks. Anything unrecognised is retained verbatim in `unknown` rather
// than skipped silently, so a format surprise surfaces instead of vanishing.
//
// LWO2 structure rules that bite:
//   * top-level chunks are ID(4) + u32 length; sub-chunks are ID(4) + u16
//     length. Both pad to even byte boundaries.
//   * indices use the variable-length "VX" encoding: a leading 0xFF byte
//     means a 4-byte index, otherwise it is 2 bytes. Getting this wrong
//     appears to work on small meshes (< 65280 points) and then explodes.
//   * POLS vertex counts carry flags in the top 6 bits; only the low 10 bits
//     are the count.
//
// Coordinates are LightWave's: Y up, LEFT-handed (+Z into the screen). The
// parser does not convert — conversion is the renderer's decision and is
// recorded in re/RENDER.md.

// Byte access that works on BOTH Node Buffers and browser Uint8Arrays. The
// first version used Buffer.readUInt32BE/toString, which made the parser
// silently Node-only: it parsed all 50 files in a test script and then threw
// "not an LWO2 file" the moment a browser handed it the same bytes.
const dvCache = new WeakMap();
const DV = (b) => {
  let d = dvCache.get(b);
  if (!d) { d = new DataView(b.buffer, b.byteOffset, b.byteLength); dvCache.set(b, d); }
  return d;
};
const u32 = (b, o) => DV(b).getUint32(o, false);
const u16 = (b, o) => DV(b).getUint16(o, false);
const ID = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
const latin1 = (b, o, e) => { let s = ''; for (let i = o; i < e; i++) s += String.fromCharCode(b[i]); return s; };
const pad = (n) => n + (n & 1);

// Variable-length index. Returns [value, bytesConsumed].
function readVX(b, o) {
  return b[o] === 0xff
    ? [((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0, 4]
    : [u16(b, o), 2];
}

function readStr(b, o, end) {
  let e = o;
  while (e < end && b[e] !== 0) e++;
  return [latin1(b, o, e), pad(e - o + 1)];
}

// SURF/CLIP/BLOK sub-chunk walker: ID + u16 len.
function subChunks(b, o, end) {
  const out = [];
  while (o + 6 <= end) {
    const id = ID(b, o);
    const len = u16(b, o + 4);
    if (!/^[A-Z0-9 ]{4}$/.test(id) || o + 6 + len > end) break;
    out.push({ id, start: o + 6, len });
    o += 6 + pad(len);
  }
  return out;
}

const f32 = (b, o) => DV(b).getFloat32(o, false);

/**
 * An `ENVL` envelope: an animated scalar.
 *
 * Body is the index as a VX, then sub-chunks. `KEY ` is (time, value) and the
 * `SPAN` that follows a key describes the interpolation INTO it — for `TCB`
 * its three floats are tension, continuity and bias. Every span in this
 * archive is TCB with all three at zero, i.e. plain Kochanek-Bartels, which is
 * exactly what lws.mjs's evalEnvelope already computes for item motion.
 *
 * `PRE`/`POST` are the end behaviours; 1 is constant, which is what
 * evalEnvelope does at both ends anyway.
 */
function parseEnvelope(b, start, end) {
  const [index, n] = readVX(b, start);
  const env = { index, name: '', keys: [] };
  for (const c of subChunks(b, start + n, end)) {
    const o = c.start;
    switch (c.id) {
      case 'NAME': env.name = readStr(b, o, o + c.len)[0]; break;
      case 'KEY ': env.keys.push({ t: f32(b, o), v: f32(b, o + 4), ten: 0, con: 0, bia: 0 }); break;
      case 'SPAN': {
        // Parameters belong to the key this span arrives at — the last one
        // pushed. Guarded because a span can precede any key in a malformed
        // file, and every one here is zero regardless.
        const k = env.keys[env.keys.length - 1];
        if (k && c.len >= 16) { k.ten = f32(b, o + 4); k.con = f32(b, o + 8); k.bia = f32(b, o + 12); }
        break;
      }
      default: break;
    }
  }
  env.keys.sort((a, z) => a.t - z.t);
  return env;
}

function parseSurface(b, start, len) {
  const end = start + len;
  const [name, n1] = readStr(b, start, end);
  const [source, n2] = readStr(b, start + n1, end);
  const surf = { name, source, blocks: [], unknown: [] };
  for (const c of subChunks(b, start + n1 + n2, end)) {
    const o = c.start;
    switch (c.id) {
      case 'COLR': surf.color = [f32(b, o), f32(b, o + 4), f32(b, o + 8)]; break;
      case 'DIFF': surf.diffuse = f32(b, o); break;
      case 'SPEC': surf.specular = f32(b, o); break;
      case 'REFL': surf.reflection = f32(b, o); break;
      // TRAN carries a value AND an optional envelope index: the engine's
      // surface parser reads both (F4 then VX, storing the envelope handle at
      // surface+0x54). kekkuli2.lwo's transparency is animated by a 5-key TCB
      // envelope literally named "Transparency", and reading only the static
      // float renders turska's mesh at a flat 11% opacity throughout.
      case 'TRAN': {
        surf.transparency = f32(b, o);
        const [env] = readVX(b, o + 4);
        if (env) surf.transparencyEnv = env;
        break;
      }
      case 'LUMI': surf.luminosity = f32(b, o); break;
      case 'GLOS': surf.glossiness = f32(b, o); break;
      case 'SMAN': surf.smoothingAngle = f32(b, o); break;          // radians
      case 'ADTR': surf.additiveTransparency = f32(b, o); break;
      case 'SIDE': surf.sides = u16(b, o); break;            // 1 or 3(=double)
      case 'RFOP': surf.reflectionOptions = u16(b, o); break;
      case 'TROP': surf.refractionOptions = u16(b, o); break;
      case 'RIMG': surf.reflectionImage = readVX(b, o)[0]; break;
      case 'RSAN': surf.reflectionSeamAngle = f32(b, o); break;
      case 'CLRF': surf.colorFilter = f32(b, o); break;
      case 'CLRH': surf.colorHighlights = f32(b, o); break;
      case 'SHRP': surf.diffuseSharpness = f32(b, o); break;
      case 'BUMP': surf.bumpIntensity = f32(b, o); break;
      case 'LINE': surf.lineFlags = u16(b, o); break;
      case 'LSIZ': surf.lineSize = f32(b, o); break;
      case 'LCOL': surf.lineColor = [f32(b, o), f32(b, o + 4), f32(b, o + 8)]; break;
      case 'BLOK': surf.blocks.push(parseBlock(b, o, c.len)); break;
      default: surf.unknown.push({ id: c.id, len: c.len });
    }
  }
  return surf;
}

// BLOK = a texture layer. Its first sub-chunk is a header block whose own id
// gives the type (IMAP = image map, PROC = procedural, …); the rest describe
// projection, the CLIP it references and the channel it drives.
function parseBlock(b, start, len) {
  const end = start + len;
  const blk = { type: null, ordinal: null, channel: null, opacity: null,
    imageIndex: null, projection: null, wrap: null, uvMap: null, unknown: [] };
  const top = subChunks(b, start, end);
  if (!top.length) return blk;
  const head = top[0];
  blk.type = head.id;                                    // IMAP / PROC / SHDR
  const [ord] = readStr(b, head.start, head.start + head.len);
  blk.ordinal = ord;
  const walk = (list, blockLevel = false) => {
    for (const c of list) {
      const o = c.start;
      switch (c.id) {
        case 'CHAN': blk.channel = ID(b, o); break;       // COLR/DIFF/BUMP/TRAN…
        case 'OPAC': blk.opacity = { type: u16(b, o), value: f32(b, o + 2) }; break;
        case 'ENAB': blk.enabled = !!u16(b, o); break;
        case 'IMAG': blk.imageIndex = readVX(b, o)[0]; break;
        case 'PROJ': blk.projection = u16(b, o); break;
        case 'WRAP': blk.wrap = [u16(b, o), u16(b, o + 2)]; break;
        case 'VMAP': blk.uvMap = readStr(b, o, o + c.len)[0]; break;
        case 'SIZE': blk.size = [f32(b, o), f32(b, o + 4), f32(b, o + 8)]; break;
        case 'CNTR': blk.center = [f32(b, o), f32(b, o + 4), f32(b, o + 8)]; break;
        // AXIS appears TWICE per block and the two mean different things: the
        // one inside the IMAP header/TMAP is the texture-space axis, while the
        // one at BLOK level beside PROJ is the PROJECTION axis. Taking the
        // first one gave every surface axis=Y, which projects a face texture
        // top-down and smears it vertically down the model — a very
        // recognisable artifact once seen. Only the block-level one counts.
        case 'AXIS': if (blockLevel) blk.axis = u16(b, o); else blk.texAxis = u16(b, o); break;
        case 'NEGA': blk.negative = !!u16(b, o); break;
        case 'WRPW': blk.wrapW = f32(b, o); break;   // cylindrical/spherical
        case 'WRPH': blk.wrapH = f32(b, o); break;   // wrap counts
        case 'ROTA': blk.rotation = [f32(b, o), f32(b, o + 4), f32(b, o + 8)]; break;
        case 'TMAP': walk(subChunks(b, o, o + c.len), false); break;   // nested
        default: blk.unknown.push({ id: c.id, len: c.len });
      }
    }
  };
  walk(subChunks(b, head.start + pad(ord.length + 1), end), false);  // IMAP header
  walk(top.slice(1), true);                                         // BLOK level (has PROJ)
  return blk;
}

export function parseLWO(buf) {
  if (ID(buf, 0) !== 'FORM' || ID(buf, 8) !== 'LWO2') {
    throw new Error(`not an LWO2 file (${ID(buf, 0)}/${ID(buf, 8)})`);
  }
  const obj = { tags: [], layers: [], surfaces: [], clips: [], envelopes: [], unknown: [] };
  let layer = null;
  const newLayer = () => ({ number: 0, name: '', pivot: [0, 0, 0],
    points: null, bbox: null, polygons: [], polygonSurface: null, uvMaps: {} });

  let o = 12;
  while (o + 8 <= buf.length) {
    const id = ID(buf, o);
    const len = u32(buf, o + 4);
    const s = o + 8, end = s + len;
    switch (id) {
      case 'TAGS': {
        let p = s;
        while (p < end) { const [t, n] = readStr(buf, p, end); if (!n) break; obj.tags.push(t); p += n; }
        break;
      }
      case 'LAYR': {
        layer = newLayer();
        layer.number = u16(buf, s);
        layer.flags = u16(buf, s + 2);
        layer.pivot = [f32(buf, s + 4), f32(buf, s + 8), f32(buf, s + 12)];
        layer.name = readStr(buf, s + 16, end)[0];
        obj.layers.push(layer);
        break;
      }
      case 'PNTS': {
        const n = len / 12;
        const pts = new Float32Array(n * 3);
        for (let i = 0; i < n * 3; i++) pts[i] = f32(buf, s + i * 4);
        (layer ??= (obj.layers.push(newLayer()), obj.layers[0])).points = pts;
        break;
      }
      case 'BBOX':
        if (layer) layer.bbox = [[f32(buf, s), f32(buf, s + 4), f32(buf, s + 8)],
                                 [f32(buf, s + 12), f32(buf, s + 16), f32(buf, s + 20)]];
        break;
      case 'POLS': {
        const type = ID(buf, s);
        let p = s + 4;
        const polys = [];
        while (p < end) {
          const hdr = u16(buf, p); p += 2;
          const count = hdr & 0x03ff;
          const idx = new Array(count);
          for (let i = 0; i < count; i++) { const [v, n] = readVX(buf, p); idx[i] = v; p += n; }
          polys.push(idx);
        }
        if (layer) { layer.polygons = polys; layer.polygonType = type; }
        break;
      }
      case 'PTAG': {
        const type = ID(buf, s);
        let p = s + 4;
        const map = new Int32Array(layer?.polygons.length ?? 0).fill(-1);
        while (p < end) {
          const [poly, n] = readVX(buf, p); p += n;
          const tag = u16(buf, p); p += 2;
          if (poly < map.length) map[poly] = tag;
        }
        if (layer && type === 'SURF') layer.polygonSurface = map;
        else if (layer) (layer.ptags ??= {})[type] = map;
        break;
      }
      case 'VMAP': {
        const type = ID(buf, s);
        const dim = u16(buf, s + 4);
        const [name, nn] = readStr(buf, s + 6, end);
        let p = s + 6 + nn;
        const entries = [];
        while (p < end) {
          const [pt, n] = readVX(buf, p); p += n;
          const vals = new Array(dim);
          for (let i = 0; i < dim; i++) { vals[i] = f32(buf, p); p += 4; }
          entries.push([pt, vals]);
        }
        if (layer) (layer.uvMaps[name] ??= { type, dim, entries }).entries = entries;
        break;
      }
      case 'SURF': obj.surfaces.push(parseSurface(buf, s, len)); break;
      case 'CLIP': {
        const clip = { index: u32(buf, s), file: null };
        for (const c of subChunks(buf, s + 4, end)) {
          if (c.id === 'STIL') clip.file = readStr(buf, c.start, c.start + c.len)[0];
        }
        obj.clips.push(clip);
        break;
      }
      case 'ENVL': obj.envelopes.push(parseEnvelope(buf, s, s + len)); break;
      default: obj.unknown.push({ id, len });
    }
    o = s + pad(len);
  }
  return obj;
}

// Convenience: flatten a layer to triangles with per-vertex UVs, resolving
// each polygon's surface by name. LWO polygons are n-gons and are wound
// CLOCKWISE when viewed from the front in LightWave's left-handed space —
// the renderer decides what to do about that (see re/RENDER.md).
export function triangulate(layer, obj) {
  const tris = [];
  const uv = Object.values(layer.uvMaps ?? {}).find((m) => m.type === 'TXUV');
  const uvByPoint = new Map(uv?.entries ?? []);
  layer.polygons.forEach((poly, pi) => {
    const surfName = obj.tags[layer.polygonSurface?.[pi] ?? -1] ?? null;
    for (let i = 1; i + 1 < poly.length; i++) {
      tris.push({ v: [poly[0], poly[i], poly[i + 1]], surface: surfName,
        uv: [uvByPoint.get(poly[0]), uvByPoint.get(poly[i]), uvByPoint.get(poly[i + 1])] });
    }
  });
  return tris;
}
