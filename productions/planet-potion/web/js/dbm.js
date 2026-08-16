// dbm.js — DigiBooster Pro 2 module reader.
//
// The intro does not ship its music: two generators inside the executable build
// a complete DBM0 module each, at run time, and hand it to dbplayer.library.
// A port therefore needs both halves — the generators (PORT_SPEC §8b–8h) and a
// replayer for what they produce. This is the reader the replayer sits on.
//
// Read from the two modules the original's own generators build, and checked
// against them byte for byte by work/re/dbmcheck.mjs. What that check enforces
// is coverage, not plausibility: every byte of the file has to be claimed by a
// chunk, every chunk's declared length has to match what parsing it consumes,
// and the chunk sizes have to equal the ones work/re/synthhash.py measured
// independently.
//
// FOUR THINGS THAT ARE NOT THE OBVIOUS READING, all from PORT_SPEC §8i:
//
//   * chunk order here is NAME, INFO, SONG, INST, VENV, DSPE, PATT, SMPL —
//     legal, but not the traditional save order, so key off the ID and never
//     off position;
//   * the reserved word after the version is 0xfc18, not 0. A parser that
//     asserts on it rejects both modules;
//   * there is no PENV chunk in either module, so panning envelopes are absent
//     rather than empty;
//   * sample lengths count FRAMES, not bytes, and these samples are 8-bit.
//     DigiBooster 3 converts to 16-bit on load, which makes "2 bytes a frame"
//     an easy and wrong assumption.

const ID = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

class Reader {
  constructor(bytes, pos = 0, end = bytes.length) {
    this.b = bytes; this.p = pos; this.end = end;
  }

  get left() { return this.end - this.p; }

  u8() { return this.b[this.p++]; }

  u16() { const v = (this.b[this.p] << 8) | this.b[this.p + 1]; this.p += 2; return v; }

  u32() {
    const v = ((this.b[this.p] << 24) | (this.b[this.p + 1] << 16)
      | (this.b[this.p + 2] << 8) | this.b[this.p + 3]) >>> 0;
    this.p += 4;
    return v;
  }

  /** Fixed-width, NUL-padded. DigiBooster pads with zeros, not spaces. */
  str(n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const c = this.b[this.p + i];
      if (c) s += String.fromCharCode(c);
    }
    this.p += n;
    return s;
  }
}

/** INFO: five u16 counts. Everything downstream is sized from these. */
function readInfo(r) {
  return {
    instruments: r.u16(),
    samples: r.u16(),
    songs: r.u16(),
    patterns: r.u16(),
    channels: r.u16(),
  };
}

/** SONG: name, then an order list of u16 pattern numbers. */
function readSongs(r, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const name = r.str(44);
    const len = r.u16();
    const order = [];
    for (let k = 0; k < len; k++) order.push(r.u16());
    out.push({ name, order });
  }
  return out;
}

/** INST: 50 bytes each. `sample` is 1-based; 0 means the slot is unused. */
function readInstruments(r, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      name: r.str(30),
      sample: r.u16(),
      volume: r.u16(),
      // Frequency is in Hz for the note C-3, not a period.
      frequency: r.u32(),
      loopStart: r.u32(),
      loopLength: r.u32(),
      panning: (r.u16() << 16) >> 16,
      flags: r.u16(),
    });
  }
  return out;
}

/** VENV / PENV: a u16 count, then 136 bytes per envelope. */
function readEnvelopes(r) {
  const count = r.u16();
  const out = [];
  for (let i = 0; i < count; i++) {
    const e = {
      instrument: r.u16(),
      flags: r.u8(),
      points: r.u8(),
      sustain1: r.u8(),
      loopStart: r.u8(),
      loopEnd: r.u8(),
      sustain2: r.u8(),
      nodes: [],
    };
    for (let k = 0; k < 32; k++) e.nodes.push({ x: r.u16(), y: r.u16() });
    out.push(e);
  }
  return out;
}

/**
 * DSPE — the echo, and it is not optional. `2 + N + 8` bytes: a channel count,
 * one enable byte per channel, then four u16s. Cross is 255 in both modules,
 * which is full ping-pong; see PORT_SPEC §8j.
 */
function readDspEcho(r) {
  const maskLength = r.u16();
  const enabled = [];
  for (let i = 0; i < maskLength; i++) enabled.push(r.u8());
  return {
    channels: maskLength,
    enabled,
    delay: r.u16(),
    feedback: r.u16(),
    mix: r.u16(),
    cross: r.u16(),
  };
}

/**
 * PATT: per pattern a u16 row count, a u32 packed size, then the packed data.
 *
 * The packing is a per-cell bitmask following a 1-based channel byte, with a
 * zero byte ending the row. THE MASK HAS SIX BITS, NOT FOUR — effect and
 * parameter are flagged separately:
 *
 *   1 note   2 instrument   4 effect1   8 param1   16 effect2   32 param2
 *
 * Pairing them (effect+param under one bit) desynchronises the stream from the
 * first cell that carries an effect without its parameter, and the damage is
 * invisible to a coverage check because each pattern is resynchronised at its
 * declared end. What catches it is the effect-7 count below.
 */
function readPatterns(r, count, channels) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const rows = r.u16();
    const size = r.u32();
    const stop = r.p + size;
    const cells = new Array(rows * channels).fill(null);
    let row = 0;
    while (r.p < stop && row < rows) {
      const ch = r.u8();
      if (ch === 0) { row++; continue; }
      const mask = r.u8();
      const cell = { note: 0, instrument: 0, effect1: 0, param1: 0, effect2: 0, param2: 0 };
      if (mask & 0x01) cell.note = r.u8();
      if (mask & 0x02) cell.instrument = r.u8();
      if (mask & 0x04) cell.effect1 = r.u8();
      if (mask & 0x08) cell.param1 = r.u8();
      if (mask & 0x10) cell.effect2 = r.u8();
      if (mask & 0x20) cell.param2 = r.u8();
      // A channel index past the declared width is corrupt data, not a cell we
      // can silently place somewhere else.
      if (ch - 1 < channels) cells[row * channels + (ch - 1)] = cell;
    }
    // Trust the declared size over the walk: a pattern that ends early is still
    // followed by the next one at `stop`.
    r.p = stop;
    out.push({ rows, cells });
  }
  return out;
}

/**
 * SMPL: per sample a u32 flags and a u32 frame count, then the frames.
 *
 * flags 1 = 8-bit, 2 = 16-bit, 3 = 32-bit; 0 means an EMPTY sample, and the
 * length field is then 0 with no data at all. Part three contains exactly two
 * of those, which is one of the two independent counts in PORT_SPEC §8c.
 */
function readSamples(r, count) {
  const BYTES = { 0: 0, 1: 1, 2: 2, 3: 4 };
  const out = [];
  for (let i = 0; i < count; i++) {
    const flags = r.u32();
    const frames = r.u32();
    const width = BYTES[flags];
    if (width === undefined) throw new Error(`sample ${i}: unknown flags ${flags}`);
    let data = null;
    if (width === 1) {
      // Signed 8-bit, which is what the generator's emitter produces: it
      // clamps to [-128, 127] and stores one byte per frame.
      data = new Int8Array(r.b.buffer, r.b.byteOffset + r.p, frames);
      r.p += frames;
    } else if (width) {
      r.p += frames * width;
    }
    out.push({ flags, frames, bits: width * 8, data });
  }
  return out;
}

/**
 * Parse a DBM0 module. Returns the chunks it understood plus a `coverage`
 * report — which bytes were claimed, and by what — because "it parsed" is a
 * much weaker statement than "every byte is accounted for".
 */
export function parseDBM(bytes) {
  let b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // THE GENERATOR'S OUTPUT IS PREFIXED. `0x10006ef0(size, blob, dest)` writes a
  // u32 size and only then the literal DBM0 header, so a module taken straight
  // out of the intro's arena starts four bytes early. A module saved by a
  // tracker does not. Accept both, and remember which this was.
  let prefix = 0, beyond = null;
  if (ID(b, 0) !== 'DBM0' && ID(b, 4) === 'DBM0') {
    prefix = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    b = b.subarray(4);
    // The prefix is the authority on where the module ends. A dump taken out of
    // the intro's arena can carry a few bytes past it — part one's carries four
    // zeros — and those are not module content. Keep them, so a caller can see
    // whether they are really padding, but do not walk them.
    if (prefix <= b.length) {
      beyond = b.subarray(prefix);
      b = b.subarray(0, prefix);
    }
  }
  if (ID(b, 0) !== 'DBM0') throw new Error('not a DBM0 module');
  // Version is BCD: 0x0221 is 2.21. The word after it is 0xfc18 in both of the
  // intro's modules, NOT zero — reserved means reserved, so it is reported and
  // never asserted on.
  const version = (b[4] << 8) | b[5];
  const reserved = (b[6] << 8) | b[7];

  const mod = {
    sizePrefix: prefix || null,
    version: `${version >> 8}.${(version & 0xff).toString(16).padStart(2, '0')}`,
    versionRaw: version,
    reserved,
    chunks: [],
    info: null, songs: [], instruments: [], volumeEnvelopes: [],
    panEnvelopes: [], echo: null, patterns: [], samples: [],
  };

  let p = 8;
  while (p + 8 <= b.length) {
    const id = ID(b, p);
    const size = ((b[p + 4] << 24) | (b[p + 5] << 16) | (b[p + 6] << 8) | b[p + 7]) >>> 0;
    const start = p + 8;
    const end = start + size;
    if (end > b.length) throw new Error(`chunk ${id} runs past the end of the file`);
    const r = new Reader(b, start, end);
    switch (id) {
      case 'NAME': mod.name = r.str(size); break;
      case 'INFO': mod.info = readInfo(r); break;
      case 'SONG': mod.songs = readSongs(r, mod.info?.songs ?? 0); break;
      case 'INST': mod.instruments = readInstruments(r, mod.info?.instruments ?? 0); break;
      case 'VENV': mod.volumeEnvelopes = readEnvelopes(r); break;
      case 'PENV': mod.panEnvelopes = readEnvelopes(r); break;
      case 'DSPE': mod.echo = readDspEcho(r); break;
      case 'PATT': mod.patterns = readPatterns(r, mod.info?.patterns ?? 0,
        mod.info?.channels ?? 0); break;
      case 'SMPL': mod.samples = readSamples(r, mod.info?.samples ?? 0); break;
      default: break;                       // unknown chunks are skipped, not fatal
    }
    mod.chunks.push({ id, size, start, consumed: r.p - start });
    p = end;
  }

  mod.coverage = {
    fileBytes: b.length,
    sizePrefix: prefix || null,
    // Bytes past the declared end, and whether they are all zero. Non-zero
    // here would mean the prefix is wrong or the dump is short — worth failing
    // on rather than trimming quietly.
    beyondDeclared: beyond ? beyond.length : 0,
    beyondIsPadding: beyond ? beyond.every((v) => v === 0) : true,
    claimed: mod.chunks.reduce((a, c) => a + c.size + 8, 8),
    trailing: b.length - p,
  };
  return mod;
}
