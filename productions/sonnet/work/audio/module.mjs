// Sonnet (threestate, Assembly 2001) — embedded MiniFMOD module reader.
//
// The intro does NOT store a contiguous XM. sagacity split the module into four
// independent byte streams so each compresses better, and replaced MiniFMOD's
// file callbacks (0x402ea5/eef/ef2/ef9/efc) with stubs that just reset four
// stream cursors. The rewritten loader FMUSIC_LoadSongInternal @0x00411a95 then
// pulls straight from memory.
//
//   0x0041aa80  HEADER  stream  ( 276 bytes) — literally xm[60:336]
//   0x0041ab94  INSTRUMENT stream (5448 bytes)
//   0x0041c0dc  SYNTH   stream  (3928 bytes) — sample-load callback arguments
//   0x0041d034  PATTERN stream  (357850 bytes)
//
// Each stream ends exactly where the next begins, which is a strong check that
// the parse is right.
//
// VA 0x401000 == file offset 0 in unpacked/sonnet_img.bin.

import { readFileSync } from 'node:fs';

export const IMG_BASE = 0x401000;

export const STREAMS = {
  header: 0x0041aa80,
  instrument: 0x0041ab94,
  synth: 0x0041c0dc,
  pattern: 0x0041d034,
};

/** MiniFMOD's note-off marker in this build. Standard XM uses 97. */
export const MINIFMOD_KEYOFF = 255;

export function loadImage(path) {
  return readFileSync(path);
}

/** Read the 276-byte XM header block (loader @0x00411aa9..0x00411ae1). */
function readHeader(img) {
  const p = STREAMS.header - IMG_BASE;
  const headerSize = img.readUInt32LE(p); // 276 — skipped by the loader
  return {
    headerSize,
    songLength: img.readUInt16LE(p + 4),
    restart: img.readUInt16LE(p + 6),
    numChannels: img.readUInt16LE(p + 8),
    numPatterns: img.readUInt16LE(p + 10),
    numInstruments: img.readUInt16LE(p + 12),
    flags: img.readUInt16LE(p + 14),
    defaultSpeed: img.readUInt16LE(p + 16),
    defaultBpm: img.readUInt16LE(p + 18),
    order: Array.from(img.subarray(p + 20, p + 20 + 256)),
    end: STREAMS.header + 276,
  };
}

// Pattern stream (loader @0x00411b3a..0x00411caa).
//
//   +0  u32   unused (0x00019597)
//   +4  u16   rows[numPatterns]
//   then, fully de-interleaved so that each column of each channel is one run:
//     for ch in 0..numChannels-1
//       for field in 0..4                 // note, instrument, volume, effect, param
//         for pat in 0..numPatterns-1
//           for row in 0..rows[pat]-1
//             u8
//
// Destination layout is MiniFMOD's flat note array, 5 bytes per cell,
// pattern[row * numChannels * 5 + ch * 5 + field].
function readPatterns(img, hdr) {
  const base = STREAMS.pattern - IMG_BASE;
  const NP = hdr.numPatterns;
  const NCH = hdr.numChannels;
  const rows = [];
  for (let i = 0; i < NP; i++) rows.push(img.readUInt16LE(base + 4 + i * 2));

  const pats = rows.map((r) => new Uint8Array(r * NCH * 5));
  let q = base + 4 + NP * 2;
  for (let ch = 0; ch < NCH; ch++) {
    for (let field = 0; field < 5; field++) {
      for (let p = 0; p < NP; p++) {
        for (let r = 0; r < rows[p]; r++) {
          pats[p][r * NCH * 5 + ch * 5 + field] = img[q++];
        }
      }
    }
  }
  return { rows, data: pats, end: IMG_BASE + q };
}

// Instrument stream (loader @0x00411cc9..0x00411e0a).
//
//   u16 numSamples
//   if numSamples:
//     u8[96]  sampleNumberForNote      (XM instrument header bytes 33..128)
//     u16[24] volume envelope          (bytes 129..176)
//     u16[24] panning envelope         (bytes 177..224)
//     u8[16]  numVolPoints .. volFadeout (bytes 225..240)
//     then, again de-interleaved by field across the samples:
//       for s: u8[14]  length/loopStart/loopLength/volume/finetune  (XM bytes 0..13)
//       for s: u8      type                                         (XM byte 14)
//       for s: u8      panning                                      (XM byte 15)
//       for s: u8      relativeNote                                 (XM byte 16)
//
// NOTE the field order: the loader's pass 2 stores to sample+0x18 with `movsx`
// (0x00411E40) and pass 3 stores to sample+0x1f with a plain byte move
// (0x00411E57). +0x1f is the relative note — FUN_00411196 computes
// realnote = sample[0x1f] + note - 1 — so +0x18 is the panning, and the intro
// sign-extends it. That is the party version's panning bug; see
// re/audio/SYNTH_NOTES.md §7. This reader returns the CORRECT (unsigned) value.
function readInstruments(img, hdr) {
  let p = STREAMS.instrument - IMG_BASE;
  const out = [];
  for (let i = 0; i < hdr.numInstruments; i++) {
    const numSamples = img.readUInt16LE(p);
    p += 2;
    if (numSamples > 16) throw new Error(`instrument ${i}: numSamples ${numSamples} > 16`);
    const inst = { numSamples, samples: [] };
    if (numSamples === 0) {
      out.push(inst);
      continue;
    }
    inst.keymap = Buffer.from(img.subarray(p, p + 0x60));
    p += 0x60;
    inst.volEnv = Buffer.from(img.subarray(p, p + 0x30));
    p += 0x30;
    inst.panEnv = Buffer.from(img.subarray(p, p + 0x30));
    p += 0x30;
    inst.tail = Buffer.from(img.subarray(p, p + 0x10)); // points/sustains/flags/vib/fadeout
    p += 0x10;

    for (let s = 0; s < numSamples; s++) {
      inst.samples.push({
        length: img.readUInt32LE(p),
        loopStart: img.readUInt32LE(p + 4),
        loopLength: img.readUInt32LE(p + 8),
        volume: img[p + 12],
        finetune: img.readInt8(p + 13),
      });
      p += 14;
    }
    for (let s = 0; s < numSamples; s++) inst.samples[s].type = img[p++];
    for (let s = 0; s < numSamples; s++) {
      const pan = img[p++];
      inst.samples[s].panning = pan; // correct, unsigned — what the XM meant
      inst.samples[s].buggyPan = (pan << 24) >> 24; // what 0x00411E40's movsx produces
    }
    for (let s = 0; s < numSamples; s++) inst.samples[s].relativeNote = img[p++];
    out.push(inst);
  }
  return { instruments: out, end: IMG_BASE + p };
}

// Synth stream — the arguments consumed by the SAMPLELOADCALLBACK @0x00402f19,
// one record per (instrument, sample) in load order:
//
//   u32 mode        0 = compressed PCM (codec @0x00403ca6), 1 = softsynth (@0x00403580)
//   u32 argLength   bytes of payload that follow; cursor advances by exactly this
//   u8  payload[argLength]
export function parseSynthPayload(payload) {
  const A = payload.readUInt32LE(0); // never read by the generator
  const filterIsHighpass = payload[4] & 1;
  const echoDelay = payload.readFloatLE(5); // in samples
  const echoFeedback = payload.readFloatLE(9);
  const lengthUnits = payload.readUInt32LE(13); // N = lengthUnits * 0x0ac4
  const numSteps = payload.readUInt32LE(17);
  let o = 21;
  const seq = [];
  for (let k = 0; k < numSteps; k++) {
    seq.push({ note: payload.readInt8(o + k * 2), decay: payload[o + k * 2 + 1] });
  }
  o += numSteps * 2;
  const numFilterSteps = payload.readUInt32LE(o);
  o += 4;
  const filt = [];
  for (let k = 0; k < numFilterSteps; k++) {
    filt.push({ cutoff: payload[o + k * 2], resonance: payload[o + k * 2 + 1] });
  }
  o += numFilterSteps * 2;
  const wave = [payload[o], payload[o + 1], payload[o + 2]];
  o += 3;
  const amp = [payload.readFloatLE(o), payload.readFloatLE(o + 4), payload.readFloatLE(o + 8)];
  o += 12;
  const detune = [payload.readFloatLE(o), payload.readFloatLE(o + 4), payload.readFloatLE(o + 8)];
  o += 12;
  if (o !== payload.length) {
    throw new Error(`synth payload length mismatch: used ${o} of ${payload.length}`);
  }
  return {
    unusedWord: A, filterIsHighpass, echoDelay, echoFeedback,
    lengthUnits, numSteps, numFilterSteps, seq, filt, wave, amp, detune,
  };
}

function readSynth(img, count) {
  let p = STREAMS.synth - IMG_BASE;
  const out = [];
  for (let i = 0; i < count; i++) {
    const mode = img.readUInt32LE(p);
    const argLength = img.readUInt32LE(p + 4);
    const payload = Buffer.from(img.subarray(p + 8, p + 8 + argLength));
    // The mode-0 driver @0x00403ca6 decodes ceil((payload[0]+15)/16) groups, which
    // for both mode-0 records is ONE group more than argLength covers: it reads
    // straight on into whatever follows in the stream. Those blocks land past the
    // sample's `length` and are never copied, so the over-read is harmless -- but
    // the decoder has to be able to perform it. `payloadExtended` is the same
    // payload with no upper bound.
    const rec = {
      index: i, va: IMG_BASE + p, mode, argLength, payload,
      payloadExtended: img.subarray(p + 8),
    };
    if (mode === 1) rec.params = parseSynthPayload(payload);
    out.push(rec);
    p += 8 + argLength;
  }
  return { records: out, end: IMG_BASE + p };
}

export function readModule(imgPath) {
  const img = loadImage(imgPath);
  const header = readHeader(img);
  const patterns = readPatterns(img, header);
  const { instruments, end: instEnd } = readInstruments(img, header);
  const synth = readSynth(img, header.numInstruments);

  // Self-check: streams must butt up against each other exactly.
  const checks = [
    ['header', header.end, STREAMS.instrument],
    ['instrument', instEnd, STREAMS.synth],
    ['synth', synth.end, STREAMS.pattern],
  ];
  for (const [name, got, want] of checks) {
    if (got !== want) {
      throw new Error(`${name} stream ends at 0x${got.toString(16)}, expected 0x${want.toString(16)}`);
    }
  }
  return { img, header, patterns, instruments, synth };
}
