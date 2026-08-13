// mxm2xm.mjs - reconstruct a standard FastTracker II .xm from "Lost Vegas"'s
// MXM module (vegas.mxm) plus the procedurally synthesized instrument samples.
//
// MXM here = Niklas Beisert's MXMPlay format, repacked for a software (DirectSound)
// mixer by threestate. Format learned from MXMPLAY.ASM and the exe's software-GUS
// mixer (FUN_00410000 / FUN_00410488 / FUN_00410dc0 in re/out/lv.c). See
// re/audio/MXM_NOTES.md for the full spec and the MXM->XM mapping.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { synthesize } from './synth.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------ MXM parsing

function parseMxm(d) {
  const u32 = (o) => d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24);
  const u16 = (o) => d[o] | (d[o + 1] << 8);
  const s16 = (o) => (u16(o) << 16) >> 16;

  if (d[0] !== 0x4d || d[1] !== 0x58 || d[2] !== 0x4d) throw new Error('not MXM');
  const h = {
    nOrders: u32(4), ordLoopStart: u32(8), nChannels: u32(12),
    nPatterns: u32(16), nInstruments: u32(20),
    tempo: d[24], bpm: d[25], options: u16(26),
    sampStart: u32(28), sampMem8: u32(32), sampMem16: u32(36),
  };
  h.linear = (h.options & 1) !== 0;
  h.panPos = Array.from({ length: 32 }, (_, i) => d[48 + i]);
  h.order = Array.from({ length: h.nOrders }, (_, i) => d[80 + i]);
  const instrTable = Array.from({ length: h.nInstruments }, (_, i) => u32(336 + 4 * i));
  const patTable = Array.from({ length: h.nPatterns }, (_, i) => u32(848 + 4 * i));

  // instruments (each: 256-byte instrument struct + one 16-byte sample header)
  const instruments = instrTable.map((io) => {
    const keymap = d.subarray(io + 4, io + 4 + 96);
    const volFade = u16(io + 100);
    const vib = { type: d[io + 102], sweep: d[io + 103], depth: d[io + 104], rate: d[io + 105] };
    const readEnv = (base, numOff, susOff, lsOff, leOff) => {
      const num = d[io + numOff];               // last-point index
      const sus = d[io + susOff], ls = d[io + lsOff], le = d[io + leOff];
      const pts = [];
      let frame = 0;
      for (let k = 0; k <= num && k < 12; k++) {
        const span = u16(io + base + 4 * k);      // ticks in this segment
        const val = u16(io + base + 4 * k + 2);
        pts.push({ frame, val });
        frame += span;
      }
      return { num: pts.length, points: pts, sustain: sus, loopStart: ls, loopEnd: le };
    };
    const volEnv = readEnv(110, 106, 107, 108, 109);
    const panEnv = readEnv(162, 158, 159, 160, 161);

    // Vegas repacked 16-byte sample header at instrument+256
    const s = io + 256;
    const smp = {
      loopStart: u32(s),
      end: u32(s + 4),               // = sample length in bytes
      mode: d[s + 8],                // GUS voice ctrl: bit3=loop, bit4=bidirectional
      defVol: d[s + 9],
      defPan: d[s + 10],
      normNote: s16(s + 11),         // relative pitch, 256 units / semitone
      sampleIndex: u16(s + 13),
    };
    return { keymap, volFade, vib, volEnv, panEnv, smp };
  });

  // patterns: dword numRows, then packed rows terminated by a 0 flag byte
  const patterns = patTable.map((po) => {
    const numRows = u32(po);
    let p = po + 4;
    const rows = [];
    for (let r = 0; r < numRows; r++) {
      const row = Array.from({ length: h.nChannels }, () => ({ note: 0, inst: 0, vol: 0, cmd: 0xff, dat: 0 }));
      for (;;) {
        const flag = d[p++];
        if (flag === 0) break;
        const ch = flag & 0x1f;
        const cell = ch < h.nChannels ? row[ch] : { note: 0, inst: 0, vol: 0, cmd: 0xff, dat: 0 };
        if (flag & 0x20) { cell.note = d[p++]; cell.inst = d[p++]; }
        if (flag & 0x40) { cell.vol = d[p++]; }
        if (flag & 0x80) { cell.cmd = d[p++]; cell.dat = d[p++]; }
      }
      rows.push(row);
    }
    return { numRows, rows };
  });

  return { h, instruments, patterns };
}

// MXM linearized command (0..51) -> XM (effect, param).
// 0..33 are the XM effect numbers directly; 36..51 are the expanded E-subcommands.
function mxmCmdToXm(cmd, dat) {
  if (cmd === 0xff) return null;
  if (cmd <= 33) {
    if (cmd === 0 && dat === 0) return null;    // arpeggio 0 = no effect
    return { fx: cmd, param: dat & 0xff };
  }
  if (cmd >= 36 && cmd <= 51) {
    return { fx: 0x0e, param: (((cmd - 36) & 0x0f) << 4) | (dat & 0x0f) };
  }
  return null; // 34, 35, >51: no XM equivalent
}

// -------------------------------------------------------------- XM assembly

class ByteWriter {
  constructor() { this.a = []; }
  u8(v) { this.a.push(v & 0xff); }
  u16(v) { this.u8(v); this.u8(v >> 8); }
  u32(v) { this.u16(v & 0xffff); this.u16((v >>> 16) & 0xffff); }
  str(s, len) { for (let i = 0; i < len; i++) this.u8(i < s.length ? s.charCodeAt(i) : 0); }
  bytes(arr) { for (const b of arr) this.u8(b & 0xff); }
  bytesTo(offset) { while (this.a.length < offset) this.u8(0); }
  get length() { return this.a.length; }
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Quality options (see synth.mjs). The defaults reproduce the authentic 2000 build
// byte-for-byte; the remaster raises them.
//   bits       8 | 16   sample word width (16 sets XM sample type bit 4)
//   oversample 1 | 2 | 4  PCM generated at N x rate; sample length, loop points and
//                         warm-up gaps all scale by N and relativeNote gains
//                         12*log2(N) semitones so the sounding pitch is unchanged.
function buildXm({ h, instruments, patterns }, pcm, { bits = 8, oversample = 1 } = {}) {
  if (bits !== 8 && bits !== 16) throw new Error(`bits must be 8 or 16 (got ${bits})`);
  const OS = oversample | 0;
  const relShift = Math.round(Math.log2(OS) * 12);
  if (!Number.isInteger(Math.log2(OS))) throw new Error('oversample must be a power of 2');
  const bytesPerSample = bits >> 3;
  const sixteen = bits === 16;

  const w = new ByteWriter();
  // --- module header ---
  w.str('Extended Module: ', 17);
  w.str('3state - Lost Vegas', 20);
  w.u8(0x1a);
  w.str(bits === 8 && OS === 1 ? 'MXM->XM (restoration)' : `MXM->XM rst ${bits}b ${OS}x`, 20);
  w.u16(0x0104);                 // version
  w.u32(276);                    // header size
  w.u16(h.nOrders);              // song length
  w.u16(h.ordLoopStart);         // restart position
  w.u16(h.nChannels);
  w.u16(h.nPatterns);
  w.u16(h.nInstruments);
  w.u16(h.linear ? 1 : 0);       // flags (bit0 = linear frequency)
  w.u16(h.tempo);                // default speed (ticks/row)
  w.u16(h.bpm);                  // default BPM
  const orderTable = new Array(256).fill(0);
  for (let i = 0; i < h.nOrders; i++) orderTable[i] = h.order[i];
  w.bytes(orderTable);

  // --- patterns ---
  for (const pat of patterns) {
    const packed = new ByteWriter();
    for (let r = 0; r < pat.numRows; r++) {
      const row = pat.rows[r];
      for (let c = 0; c < h.nChannels; c++) {
        const cell = row[c];
        const xm = mxmCmdToXm(cell.cmd, cell.dat);
        const note = cell.note, inst = cell.inst, vol = cell.vol;
        const fx = xm ? xm.fx : 0, param = xm ? xm.param : 0;
        const hasNote = note !== 0, hasInst = inst !== 0, hasVol = vol !== 0;
        const hasFx = fx !== 0 || param !== 0;
        if (!hasNote && !hasInst && !hasVol && !hasFx) {
          packed.u8(0x80);           // empty cell (packing bit, no fields)
          continue;
        }
        let mask = 0x80;
        if (hasNote) mask |= 1;
        if (hasInst) mask |= 2;
        if (hasVol) mask |= 4;
        if (fx !== 0) mask |= 8;
        if (param !== 0) mask |= 16;
        packed.u8(mask);
        if (hasNote) packed.u8(note);
        if (hasInst) packed.u8(inst);
        if (hasVol) packed.u8(vol);
        if (fx !== 0) packed.u8(fx);
        if (param !== 0) packed.u8(param);
      }
    }
    w.u32(9);            // pattern header length
    w.u8(0);             // packing type
    w.u16(pat.numRows);
    w.u16(packed.length);
    w.bytes(packed.a);
  }

  // --- instruments (+ samples) ---
  // Sample layout in the synth PCM stream (verified against the oracle XM for all 17):
  // each instrument is synthesized as its own run of 32-sample steps, and every run
  // begins with 15 steps (0x1e0 = 480 bytes) of filter warm-up that is NOT part of the
  // sample. Runs are aligned to the 32-sample step grid. The driver drops only the
  // first run's warm-up globally, so the later ones stay embedded in the stream:
  //     off[0]   = 0
  //     off[i+1] = ceil32(off[i] + len[i] + 480)
  // At oversample OS every length in the stream (sample, warm-up, step grid) is
  // scaled by OS, so the whole offset rule is simply the 1x rule times OS.
  const WARMUP = 0x1e0 * OS;
  const GRID = 32 * OS;
  const ceil32 = (x) => Math.ceil(x / GRID) * GRID;
  const order = instruments.map((_, i) => i).sort(
    (a, b) => instruments[a].smp.sampleIndex - instruments[b].smp.sampleIndex);
  const offsetByIndex = {};
  let cursor = 0;
  for (const i of order) {
    offsetByIndex[instruments[i].smp.sampleIndex] = cursor;
    cursor = ceil32(cursor + instruments[i].smp.end * OS + WARMUP);
  }

  for (const inst of instruments) {
    const { smp, volEnv, panEnv, vib, volFade } = inst;
    const len = smp.end * OS;                // frames
    const off = offsetByIndex[smp.sampleIndex];
    const raw = pcm.subarray(off, off + len);

    // Relative note / finetune from normNote (256 units/semitone; XM finetune is 128
    // units/semitone, i.e. half). The (rel, finetune) split is ambiguous -- only
    // rel + finetune/128 is the real pitch -- so when the nearest rel falls outside
    // XM's legal [-48, 71] we borrow the remainder into finetune instead of clamping
    // rel (which would detune by a whole semitone; this is what broke ins5).
    // Oversampling by OS stores OS x as many frames, so the sample must sound
    // 12*log2(OS) semitones higher to play back at the same pitch and duration.
    // (This also lifts ins5's -49.0 off XM's -48 relativeNote floor.)
    const normNote = smp.normNote + relShift * 256;
    let rel = Math.round(normNote / 256);
    if (rel < -48) rel = -48; else if (rel > 71) rel = 71;
    const finetune = clamp(Math.round((normNote - rel * 256) / 2), -128, 127);

    // loop type from GUS mode bits
    let loopType = 0;
    if (smp.mode & 0x08) loopType = (smp.mode & 0x10) ? 2 : 1;
    const loopStart = loopType ? smp.loopStart * OS : 0;
    const loopLength = loopType ? (len - smp.loopStart * OS) : 0;

    // instrument header (263 bytes)
    const ih = new ByteWriter();
    ih.u32(263);
    ih.str('inst', 22);
    ih.u8(0);                    // type
    ih.u16(1);                   // numSamples
    ih.u32(40);                  // sample header size
    // keymap (all point to sample 0)
    for (let k = 0; k < 96; k++) ih.u8(clamp(inst.keymap[k] || 0, 0, 0));
    // volume envelope points (12 x (word frame, word val)) at 129
    ih.bytesTo(129);
    const volPts = volEnv.points;
    for (let k = 0; k < 12; k++) {
      ih.u16(k < volPts.length ? Math.min(32767, volPts[k].frame) : 0);
      ih.u16(k < volPts.length ? Math.min(64, volPts[k].val) : 0);
    }
    // pan envelope points at 177
    const panPts = panEnv.points;
    for (let k = 0; k < 12; k++) {
      ih.u16(k < panPts.length ? Math.min(32767, panPts[k].frame) : 0);
      ih.u16(k < panPts.length ? Math.min(63, panPts[k].val) : 0);
    }
    // envelope descriptors at 225
    const volNum = volPts.length, panNum = panPts.length;
    const volSustain = clamp(volEnv.sustain, 0, Math.max(0, volNum - 1));
    const volLoop = volEnv.loopStart !== volEnv.loopEnd;
    ih.bytesTo(225);
    ih.u8(volNum);               // 225 num vol points
    ih.u8(panNum);               // 226 num pan points
    ih.u8(volSustain);           // 227
    ih.u8(clamp(volEnv.loopStart, 0, 11)); // 228
    ih.u8(clamp(volEnv.loopEnd, 0, 11));   // 229
    ih.u8(0);                    // 230 pan sustain
    ih.u8(0);                    // 231 pan loop start
    ih.u8(0);                    // 232 pan loop end
    // vol env flags: bit0 on, bit1 sustain, bit2 loop
    ih.u8(volNum > 0 ? (1 | 2 | (volLoop ? 4 : 0)) : 0);   // 233 volType
    ih.u8(0);                    // 234 panType (pan env disabled)
    ih.u8(vib.type & 3);         // 235
    ih.u8(vib.sweep);            // 236
    ih.u8(vib.depth & 15);       // 237
    ih.u8(vib.rate & 63);        // 238
    ih.u16(Math.min(0xffff, volFade)); // 239 fadeout
    ih.bytesTo(263);
    w.bytes(ih.a);

    // sample header (40 bytes). XM expresses length and loop points in BYTES, so
    // a 16-bit sample doubles all three.
    w.u32(len * bytesPerSample);           // length (bytes)
    w.u32(loopStart * bytesPerSample);
    w.u32(loopLength * bytesPerSample);
    w.u8(Math.min(64, smp.defVol));
    w.u8(finetune & 0xff);
    w.u8(loopType | (sixteen ? 16 : 0));   // type (bits0-1 loop, bit4 = 16-bit)
    w.u8(smp.defPan);
    w.u8(rel & 0xff);                      // relative note (signed)
    w.u8(0);                               // reserved (0 = plain, not ADPCM)
    w.str('smp', 22);

    // sample data: XM stores deltas, in the sample's own word width.
    let prev = 0;
    if (sixteen) {
      for (let k = 0; k < len; k++) {
        const cur = raw[k] | 0;            // signed 16-bit sample
        w.u16((cur - prev) & 0xffff);
        prev = cur;
      }
    } else {
      for (let k = 0; k < len; k++) {
        const cur = raw[k] | 0;            // signed 8-bit sample
        w.u8((cur - prev) & 0xff);
        prev = cur;
      }
    }
  }

  return Uint8Array.from(w.a);
}

// ------------------------------------------------------------------------ main

// The two shipped builds. `vegas.xm` is the authentic 2000 artefact and must stay
// byte-for-byte as the intro produced it; `vegas_remaster.xm` is the additive
// quality layer (see re/audio/MXM_NOTES.md sec.9).
const BUILDS = [
  { name: 'vegas.xm', bits: 8, oversample: 1 },
  { name: 'vegas_remaster.xm', bits: 16, oversample: 2 },
  // Conservative variant: 16-bit precision WITHOUT oversampling. Keeps the
  // player's linear-interpolation imaging — the high-frequency "grit" that is
  // part of how the original actually sounded — while still dropping the 8-bit
  // quantisation noise floor. Measured 0.999984 NCC vs the authentic build.
  { name: 'vegas_16bit_1x.xm', bits: 16, oversample: 1 },
];

function main() {
  const mxm = new Uint8Array(readFileSync(join(HERE, '..', 'extracted', 'vegas.mxm')));
  const parsed = parseMxm(mxm);
  const { h } = parsed;
  console.log(`MXM: orders=${h.nOrders} channels=${h.nChannels} patterns=${h.nPatterns} `
    + `instruments=${h.nInstruments} speed=${h.tempo} bpm=${h.bpm} linear=${h.linear}`);

  const results = [];
  for (const { name, bits, oversample } of BUILDS) {
    const { pcm } = synthesize(undefined, { bits, oversample });
    const xm = buildXm(parsed, pcm, { bits, oversample });
    const outPath = join(HERE, '..', 'extracted', name);
    writeFileSync(outPath, xm);
    console.log(`${name}: bits=${bits} oversample=${oversample}x  `
      + `synth frames=${pcm.length}  frames used=${
        parsed.instruments.reduce((s, i) => s + i.smp.end, 0) * oversample}  `
      + `-> ${xm.length} bytes`);
    results.push({ name, bits, oversample, xm, outPath });
  }
  return { parsed, builds: results, xm: results[0].xm, outPath: results[0].outPath };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
export { parseMxm, buildXm, main };
