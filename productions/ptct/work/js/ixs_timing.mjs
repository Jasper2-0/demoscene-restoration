#!/usr/bin/env node
// ixs_timing.mjs — build the external sync map (time -> order,row) for PTCT
// from the IXS song data, replicating the timing semantics of the original
// player (PTCT_unpacked.exe), reverse-engineered from:
//   FUN_0040be10  IXS song-section parser        (re/out/ptct.c 5769)
//   FUN_0040c880  IT pattern unpacker            (re/out/ptct.c 6624)
//   FUN_0040a240  row advance / order walk       (re/out/ptct.c 4168)
//   FUN_0040ab20  row-tick command handler       (re/out/ptct.c 4634)
//   FUN_0040d360  driver setTempo: samplesPerTick = floor(rate * 2.5/tempo)
//
// Player timing facts (verified against the binary, see re/engine/SYNC.md):
//  * tickSeconds = 2.5 / tempo ; rowTicks = speed ; both come ONLY from the
//    song header. The player implements NO Axx (set speed), NO Bxx (jump),
//    NO Txx (tempo) — its command switch handles only:
//      3=Cxx pattern break, 4=Dxx volslide, 5/6=Exx/Fxx porta, 7=Gxx toneporta,
//      8=Hxx vibrato, 15=Oxx offset, 19=Sxx (only SDx note delay).
//  * Flow: row++ every `speed` ticks; when row >= patternRows OR a Cxx fired,
//    advance to next order (skip 0xFE, wrap to 0 on 0xFF / end) and continue
//    at row = Cxx parameter (0 otherwise).
//
// Usage: node ixs_timing.mjs [input.ixs] [output.json]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const inPath = resolve(process.argv[2] ?? resolve(here, "../webixs/world_of_noise.ixs"));
const outPath = resolve(process.argv[3] ?? resolve(here, "../baked/audio/sync_map.json"));

// ---------------------------------------------------------------- container
const raw = readFileSync(inPath);
if (raw.toString("latin1", 0, 4) !== "IXS!") throw new Error("not an IXS! file");
// 56-byte header: magic u32, ?, off_song, off_patches, off_3? (u32s), 4 bytes, 26.. name
const offSong = raw.readUInt32LE(4); // FUN_0040b7b0: first offset after magic (relative to +0x38)
let payload = raw.subarray(0x38);
if (payload[0] === 0x78) payload = inflateSync(payload); // .ixs = zlib; .ixx = raw
const song = payload.subarray(offSong);

// ------------------------------------------------------------ song section
// FUN_0040be10 stream layout (sequential):
let p = 0;
const u8 = () => song[p++];
const u16 = () => { const v = song.readUInt16LE(p); p += 2; return v; };
const u32 = () => { const v = song.readUInt32LE(p); p += 4; return v; };
const skip = (n) => { p += n; };

if (u8() !== 0x21) throw new Error("song section: missing '!' tag");
const numOrders = u16();
const numInstruments = u16();
const numSamples = u16();
const numPatterns = u16();
const globalVol = u8();
const mixVol = u8();
const initialSpeed = u8();   // -> synth+0x320d (ticks per row)
const initialTempo = u8();   // -> synth+0x320c
const name = song.toString("latin1", p, p + 26).replace(/\0.*$/, ""); skip(26);
skip(64); // channel table A (this+0x80)
skip(64); // channel table B (this+0x40)
const orderList = Array.from(song.subarray(p, p + numOrders)); skip(numOrders);

// instruments: tag 'i' = empty, else fixed header + optional notemap + 3 envelopes
for (let i = 0; i < numInstruments; i++) {
  const tag = u8();
  if (tag === 0x69 /* 'i' */) continue;
  skip(2 + 1 + 1 + 1);           // fadeout u16, +0x18, +0x19, +0x40
  const nm = u8();               // note-map mode
  if ((nm & 0x80) === 0) skip(0xee); // explicit 238-byte note/sample map
  for (let e = 0; e < 3; e++) {  // volume / pan / pitch envelopes
    const flags = u8();
    if (flags !== 0) { const npts = u8(); skip(4); skip(npts * 3); }
  }
}
// samples: tag 's' = empty, else header only (waveform is synthesized by name)
for (let s = 0; s < numSamples; s++) {
  const tag = u8();
  if (tag === 0x73 /* 's' */) continue;
  skip(3);            // +0x11,+0x12,+0x13
  skip(6 * 4);        // length, loopStart, loopEnd, susStart, susEnd, c5speed
  skip(4 + 1);        // vibrato bytes + 0x2f
  skip(13);           // name
}
// patterns: tag 'p' = empty, else u16 dataLen, u16 rows, packed IT data
const patterns = [];
for (let i = 0; i < numPatterns; i++) {
  const tag = u8();
  if (tag === 0x70 /* 'p' */) { patterns.push({ rows: 64, cells: null }); continue; }
  const dataLen = u16();
  const rows = u16();
  const data = song.subarray(p, p + dataLen); skip(dataLen);
  patterns.push({ rows, cells: unpackPattern(data, rows) });
}
if (p > song.length) throw new Error("song section overran payload");

// IT pattern unpack (FUN_0040c880). cells[row][ch] = {note,ins,vol,cmd,param}
function unpackPattern(data, rows) {
  const cells = Array.from({ length: rows }, () => new Array(64).fill(null));
  const lastMask = new Array(64).fill(0);
  const last = Array.from({ length: 64 }, () => ({ note: 0, ins: 0, vol: 0xff, cmd: 0, param: 0 }));
  let q = 0, row = 0;
  while (row < rows && q < data.length) {
    const chvar = data[q++];
    if (chvar === 0) { row++; continue; }
    const ch = (chvar - 1) & 0x3f;
    if (chvar & 0x80) lastMask[ch] = data[q++];
    const m = lastMask[ch];
    const cell = { note: -1, ins: -1, vol: -1, cmd: 0, param: 0 };
    if (m & 1) { cell.note = data[q++]; last[ch].note = cell.note; }
    if (m & 2) { cell.ins = data[q++]; last[ch].ins = cell.ins; }
    if (m & 4) { cell.vol = data[q++]; last[ch].vol = cell.vol; }
    if (m & 8) { cell.cmd = data[q++]; cell.param = data[q++]; last[ch].cmd = cell.cmd; last[ch].param = cell.param; }
    if (m & 0x10) cell.note = last[ch].note;
    if (m & 0x20) cell.ins = last[ch].ins;
    if (m & 0x40) cell.vol = last[ch].vol;
    if (m & 0x80) { cell.cmd = last[ch].cmd; cell.param = last[ch].param; }
    if (row < rows) cells[row][ch] = cell;
  }
  return cells;
}

// -------------------------------------------------------------- simulation
// FUN_0040a240 semantics. One pass: start at order 0, stop when the order
// walk wraps (0xFF terminator / end of list) — the demo quits on wrap.
const SAMPLE_RATE = 44100;
// FUN_0040d360 floors samples-per-tick (ftol) — and so does the webIXS wasm:
// the baked render length is an exact multiple of this. Sample-exact timing:
const samplesPerTick = Math.floor(SAMPLE_RATE * 2.5 / initialTempo);   // 822 @ tempo 134
const tickSec = samplesPerTick / SAMPLE_RATE;
const rowSec = initialSpeed * tickSec;              // ticks per row = speed
let unimplementedTiming = 0;                        // Axx/Bxx/Txx present but ignored by player

let orderIdx = 0;
while (orderList[orderIdx] === 0xfe) orderIdx++;    // playerStart skip
let row = 0, breakRow = 0, pendingBreak = false;
let t = 0;
const rowsOut = [];
const orderRowCounts = [];
let wrapped = false, playedOrders = 0;

outer: for (;;) {
  const pat = patterns[orderList[orderIdx]];
  const rows = pat.rows;
  playedOrders++;
  let startRow = row;
  for (row = startRow; ; ) {
    rowsOut.push([+t.toFixed(6), orderIdx, row]);
    // scan commands on this row (last channel wins, as in the 0..63 loop)
    const cellsRow = pat.cells && row < pat.cells.length ? pat.cells[row] : null;
    if (cellsRow) {
      for (let ch = 0; ch < 64; ch++) {
        const c = cellsRow[ch];
        if (!c || !c.cmd) continue;
        if (c.cmd === 3) { pendingBreak = true; breakRow = c.param; }        // Cxx
        else if (c.cmd === 1 || c.cmd === 2 || c.cmd === 20) unimplementedTiming++; // Axx/Bxx/Txx: NOPs in this player
      }
    }
    t += rowSec;
    row++;
    if (row >= rows || pendingBreak) {
      orderRowCounts.push({ order: orderIdx, pattern: orderList[orderIdx], rows: row - startRow });
      // advance order (FUN_0040a240): ++, skip 0xFE, wrap on 0xFF/end
      do {
        orderIdx++;
        if (orderIdx >= numOrders || orderList[orderIdx] === 0xff) { wrapped = true; break outer; }
      } while (orderList[orderIdx] === 0xfe);
      row = pendingBreak ? breakRow : 0;
      pendingBreak = false; breakRow = 0;
      continue outer;
    }
  }
}

const totalSeconds = t;

// ------------------------------------------------------------------ output
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({
  source: "world_of_noise.ixs (IXS song section)",
  name,
  sampleRate: SAMPLE_RATE, samplesPerTick,
  initialSpeed, initialTempo,
  tickSeconds: tickSec, rowSeconds: rowSec,
  orders: playedOrders,
  totalSeconds: +totalSeconds.toFixed(6),
  wrapped,
  rows: rowsOut,
}, null, 0) + "\n");

// --------------------------------------------------------------- validation
const at = (o, r) => { const e = rowsOut.find(([, oo, rr]) => oo === o && rr === r); return e ? e[0] : null; };
console.log(`song            : "${name}"`);
console.log(`orders list     : ${numOrders} entries, played ${playedOrders} orders (wrap=${wrapped})`);
console.log(`patterns        : ${numPatterns}, instruments ${numInstruments}, samples ${numSamples}`);
console.log(`speed/tempo     : ${initialSpeed} / ${initialTempo}  (row = ${rowSec.toFixed(6)} s, tick = ${tickSec.toFixed(6)} s)`);
console.log(`total rows      : ${rowsOut.length}`);
console.log(`totalSeconds    : ${totalSeconds.toFixed(3)}`);
console.log(`ignored Axx/Bxx/Txx occurrences: ${unimplementedTiming}`);
const short = orderRowCounts.filter(e => e.rows !== 64);
if (short.length) console.log("orders with != 64 rows:", short.map(e => `#${e.order}(pat${e.pattern})=${e.rows}`).join(" "));
for (const [o, r] of [[8, 0], [10, 0], [14, 0], [16, 0], [24, 0], [26, 0], [27, 0], [30, 0], [32, 0], [33, 0]]) {
  const v = at(o, r);
  console.log(`order ${String(o).padStart(2)}:${String(r).padStart(2)}  ->  ${v === null ? "N/A" : v.toFixed(3) + " s"}`);
}
console.log(`wrote ${outPath}`);
