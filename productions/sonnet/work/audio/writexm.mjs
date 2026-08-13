// Sonnet — rebuild a standard XM 1.04 file entirely from the intro's own data:
// the four packed streams, the softsynth (22 instruments) and the mode-0 subband
// codec (instruments 13 and 14). Nothing is taken from reference/sonnet.xm; that
// file is used only to CHECK the result. See re/audio/SYNTH_NOTES.md.
//
//   node audio/writexm.mjs [--authentic-pan | --clamp-only] [out.xm]
//
// Default output is the CORRECTED module: panning bytes as the composer wrote
// them. `--authentic-pan` bakes in the party version's defect (see §7 of the
// notes) so a stock replayer reproduces what the .exe actually does — use it only
// if you cannot reproduce the defect in the player, because it is lossy: the
// defect clamps 22 of 24 instruments onto the same value and the original pan
// bytes are destroyed. `--clamp-only` is the hypothesis-test build (sign-extend
// and clamp, but do NOT mirror the pan axis); it is refuted by the reference
// capture and is kept only so the test is reproducible.
//
// Two systematic differences between the intro's streams and a normal XM, both
// deliberate on sagacity's part, both undone here:
//   * note 255 is key-off; standard XM uses 97.
//   * the volume fadeout word is stored pre-doubled, because this MiniFMOD build
//     subtracts it x1 per tick from a 65536 scale (FUN_00411113 sets channel+0x58
//     = 0x10000, FUN_00411196 subtracts instrument+0x152) whereas FT2 subtracts
//     x2. Halving it restores the FT2-convention value, which matches the oracle
//     byte-for-byte.

import { writeFileSync } from 'node:fs';
import { readModule } from './module.mjs';
import { generateSample, Rand } from './synth.mjs';
import { decodeMode0 } from './codec0.mjs';

const IMG = new URL('../unpacked/sonnet_img.bin', import.meta.url).pathname;

export const MODULE_KEYOFF = 255; // this build's key-off note
export const XM_KEYOFF = 97;

/** Generate every instrument's PCM from the intro's own data, in load order. */
export function synthesizeInstruments(m) {
  const rng = new Rand(); // SYNTH_RAND_SEED
  const out = [];
  for (let i = 0; i < m.header.numInstruments; i++) {
    const rec = m.synth.records[i];
    const smp = m.instruments[i].samples[0];
    const bits = smp.type & 0x10 ? 16 : 8;
    if (rec.mode === 1) {
      const pcm = generateSample(rec.params, bits, rng);
      out.push(bits === 8 ? Int16Array.from(pcm, (v) => (((v << 24) >> 24) << 8)) : pcm);
    } else {
      // mode 0 = the subband codec @0x00403ca6 (see codec0.mjs). Instruments 13
      // and 14 only. Its output is signed 8-bit; FUN_00411a95 widens 8-bit
      // samples to 16-bit with `<< 8` after the load callback returns.
      const pcm8 = decodeMode0(rec.payloadExtended, smp.length, m.img);
      out.push(Int16Array.from(pcm8, (v) => v << 8));
    }
  }
  return out;
}

function packPattern(cells, rows, channels, mirror8xx = false) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < channels; c++) {
      const o = (r * channels + c) * 5;
      let note = cells[o];
      if (note === MODULE_KEYOFF) note = XM_KEYOFF;
      const f = [note, cells[o + 1], cells[o + 2], cells[o + 3], cells[o + 4]];
      // 8xx (set panning) reads the param as an UNSIGNED byte in FUN_00411196
      // case 8 (`(&DAT_0047eab4)[ch*0x2b] = param`), so the sign-extension bug
      // does not touch it -- but the mixer's mirrored pan axis does.
      if (mirror8xx && f[3] === 8) f[4] = 255 - f[4];
      let mask = 0x80;
      for (let k = 0; k < 5; k++) if (f[k]) mask |= 1 << k;
      if (mask === 0x80) { out.push(0x80); continue; }
      out.push(mask);
      for (let k = 0; k < 5; k++) if (f[k]) out.push(f[k]);
    }
  }
  return Uint8Array.from(out);
}

export function buildXm(opts = {}) {
  // panMode: 'correct'  — the composer's panning, what the XM always meant
  //          'party'    — clamp + mirror: what the .exe actually produces
  //          'clamponly'— clamp but do not mirror (hypothesis test only)
  const { panMode = 'correct' } = opts;
  const m = readModule(IMG);
  const pcms = synthesizeInstruments(m);
  const h = m.header;
  const parts = [];
  const push = (b) => parts.push(Buffer.isBuffer(b) ? b : Buffer.from(b));

  // ---- header -----------------------------------------------------------
  const hdr = Buffer.alloc(60 + 276);
  hdr.write('Extended Module: ', 0, 'latin1');
  hdr.write('Sonnet'.padEnd(20, ' '), 17, 'latin1');
  hdr[37] = 0x1a;
  hdr.write('FastTracker v2.00   ', 38, 'latin1');
  hdr.writeUInt16LE(0x0104, 58);
  hdr.writeUInt32LE(276, 60);
  hdr.writeUInt16LE(h.songLength, 64);
  hdr.writeUInt16LE(h.restart, 66);
  hdr.writeUInt16LE(h.numChannels, 68);
  hdr.writeUInt16LE(h.numPatterns, 70);
  hdr.writeUInt16LE(h.numInstruments, 72);
  hdr.writeUInt16LE(h.flags, 74);
  hdr.writeUInt16LE(h.defaultSpeed, 76);
  hdr.writeUInt16LE(h.defaultBpm, 78);
  for (let i = 0; i < 256; i++) hdr[80 + i] = h.order[i];
  push(hdr);

  // ---- patterns ---------------------------------------------------------
  for (let p = 0; p < h.numPatterns; p++) {
    const rows = m.patterns.rows[p];
    const packed = packPattern(m.patterns.data[p], rows, h.numChannels, panMode === 'party');
    const ph = Buffer.alloc(9);
    ph.writeUInt32LE(9, 0);
    ph[4] = 0;
    ph.writeUInt16LE(rows, 5);
    ph.writeUInt16LE(packed.length, 7);
    push(ph);
    push(packed);
  }

  // ---- instruments ------------------------------------------------------
  for (let i = 0; i < h.numInstruments; i++) {
    const inst = m.instruments[i];
    const smp = inst.samples[0];
    const ih = Buffer.alloc(263);
    ih.writeUInt32LE(263, 0);
    ih.write(`inst ${i}`.padEnd(22, ' ').slice(0, 22), 4, 'latin1');
    ih[26] = 0;
    ih.writeUInt16LE(inst.numSamples, 27);
    ih.writeUInt32LE(40, 29);
    inst.keymap.copy(ih, 33);
    inst.volEnv.copy(ih, 129);
    inst.panEnv.copy(ih, 177);
    inst.tail.copy(ih, 225);
    ih.writeUInt16LE(ih.readUInt16LE(225 + 14) >> 1, 225 + 14); // fadeout: undo the x2
    push(ih);

    const pcm = pcms[i];
    const bits = smp.type & 0x10 ? 16 : 8;
    const bytes = bits === 16 ? pcm.length * 2 : pcm.length;
    const sh = Buffer.alloc(40);
    sh.writeUInt32LE(bytes, 0);
    sh.writeUInt32LE(smp.loopStart, 4);
    sh.writeUInt32LE(smp.loopLength, 8);
    sh[12] = smp.volume;
    sh.writeInt8(smp.finetune, 13);
    sh[14] = smp.type;
    sh[15] = panMode === 'correct' ? smp.panning
      : panMode === 'clamponly' ? clampPan(smp.panning)
      : buggyFinalPan(smp.panning);
    sh.writeInt8(smp.relativeNote, 16);
    sh[17] = 0;
    sh.write(''.padEnd(22, ' '), 18, 'latin1');
    push(sh);

    // XM sample data is delta encoded.
    if (bits === 16) {
      const d = Buffer.alloc(pcm.length * 2);
      let prev = 0;
      for (let k = 0; k < pcm.length; k++) {
        d.writeInt16LE(((pcm[k] - prev) << 16) >> 16, k * 2);
        prev = pcm[k];
      }
      push(d);
    } else {
      const d = Buffer.alloc(pcm.length);
      let prev = 0;
      for (let k = 0; k < pcm.length; k++) {
        const v = pcm[k] >> 8;
        d.writeInt8(((v - prev) << 24) >> 24, k);
        prev = v;
      }
      push(d);
    }
  }
  return Buffer.concat(parts);
}

/**
 * What the party build's mixer actually ends up using for a given XM pan byte.
 * `movsx` @0x00411E40 sign-extends it, FMUSIC_UpdateChannel @0x00411015 then
 * clamps the result to 0..255 (the pan-envelope term is zero by default), and
 * the mixer maps pan -> (left = vol*pan/255, right = vol*(255-pan)/255), which is
 * the mirror of the XM convention. So to make a *stock* replayer sound like the
 * party build we both clamp and mirror.
 */
export function clampPan(panByte) {
  const signed = (panByte << 24) >> 24;
  return Math.max(0, Math.min(255, signed));
}

export function buggyFinalPan(panByte) {
  return 255 - clampPan(panByte); // mirror the pan axis too
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const panMode = args.includes('--authentic-pan') ? 'party'
    : args.includes('--clamp-only') ? 'clamponly' : 'correct';
  const out = args.find((a) => !a.startsWith('--'))
    || new URL('../extracted/sonnet.xm', import.meta.url).pathname;
  const buf = buildXm({ panMode });
  writeFileSync(out, buf);
  console.log(`wrote ${out} (${buf.length} bytes) panMode=${panMode}`);
}
