// dbmgen.mjs — build a minimal DBM0 module, one behaviour at a time.
//
// The audio equivalent of texops.py. A whole module mixes eighteen tracks and
// every effect at once, so a correlation against the reference says "wrong"
// without saying "wrong where". This writes the smallest module that exercises
// ONE thing — a note, a volume slide, a loop — so the comparison has a single
// possible cause.
//
// Layouts are as the reference loader reads them (oracle/src/loader.c), and
// the output is checked by running dbminfo over it. Everything is big-endian.
import fs from 'node:fs';

const be16 = (v) => { const b = Buffer.alloc(2); b.writeUInt16BE(v & 0xffff); return b; };
const be32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(v >>> 0); return b; };
const str = (s, n) => { const b = Buffer.alloc(n); b.write(s.slice(0, n), 'latin1'); return b; };
const chunk = (id, body) => Buffer.concat([Buffer.from(id, 'ascii'), be32(body.length), body]);

/**
 * A sawtooth, which is the useful shape here: broadband, so resampling and
 * interpolation differences show up, and perfectly steady, so any amplitude
 * change in the render comes from the player rather than the material.
 */
export function saw(frames, period = 64) {
  const d = Buffer.alloc(frames);
  for (let i = 0; i < frames; i++) {
    const t = (i % period) / period;
    d[i] = (Math.round(t * 254) - 127) & 0xff;
  }
  return d;
}

/**
 * @param cells  rows of `{ [track]: {note, instrument, e1, p1, e2, p2} }`
 * @param opts   { channels, rows, instruments: [{volume, frequency, loopStart,
 *                 loopLength, panning, flags, sample}], samples: [Buffer] }
 */
export function buildDBM({ cells, channels = 4, rows = 16, instruments, samples, envelopes, echo }) {
  const insts = instruments ?? [{ volume: 64, frequency: 8363, sample: 1 }];
  const smps = samples ?? [saw(8363)];

  const info = Buffer.concat([
    be16(insts.length), be16(smps.length), be16(1), be16(1), be16(channels),
  ]);

  // One song: a name and one order entry pointing at pattern 0.
  const song = Buffer.concat([str('test', 44), be16(1), be16(0)]);

  const instBody = Buffer.concat(insts.map((i) => Buffer.concat([
    str(i.name ?? 'inst', 30),
    be16(i.sample ?? 1),          // 1-based into SMPL
    be16(i.volume ?? 64),         // 0..64
    be32(i.frequency ?? 8363),    // Hz at the reference note
    be32(i.loopStart ?? 0),
    be32(i.loopLength ?? 0),
    be16(i.panning ?? 0),
    be16(i.flags ?? 0),           // bit0 forward loop, bit1 ping-pong
  ])));

  // Packed pattern: track byte (1-based, 0 ends the row), bitmask, then the
  // present fields in the fixed order note/instr/cmd1/param1/cmd2/param2.
  const bytes = [];
  for (let r = 0; r < rows; r++) {
    const row = cells[r] ?? {};
    for (const key of Object.keys(row)) {
      const t = Number(key), c = row[key];
      let m = 0; const vals = [];
      if (c.note) { m |= 0x01; vals.push(c.note); }
      if (c.instrument) { m |= 0x02; vals.push(c.instrument); }
      if (c.e1) { m |= 0x04; vals.push(c.e1); }
      if (c.p1) { m |= 0x08; vals.push(c.p1); }
      if (c.e2) { m |= 0x10; vals.push(c.e2); }
      if (c.p2) { m |= 0x20; vals.push(c.p2); }
      if (!m) continue;
      bytes.push(t + 1, m, ...vals);
    }
    bytes.push(0);                       // end of row
  }
  if (bytes.length & 1) bytes.push(0);   // 16-bit alignment pad
  const patt = Buffer.concat([be16(rows), be32(bytes.length), Buffer.from(bytes)]);

  // Each sample: flags then FRAME count, then the frames. Bit 0 of the flags
  // is 8-bit, which is all these need.
  const smplBody = Buffer.concat(smps.map((s) => Buffer.concat([
    be32(1), be32(s.length), s,
  ])));

  // VENV: a count, then 136 bytes each — instrument, flags, point count,
  // sustain, loop start, loop end, second sustain, then 32 (tick, value)
  // pairs. THE POINT COUNT IS ONE LESS than the number of points, which is a
  // DBM quirk and true in the shipped modules: instrument 3 declares 3 and
  // carries four.
  const chunks = [
    chunk('NAME', str('gen', 44)),
    chunk('INFO', info),
    chunk('SONG', song),
    chunk('INST', instBody),
  ];
  if (envelopes?.length) {
    const body = [be16(envelopes.length)];
    for (const e of envelopes) {
      const pts = e.points;
      const head = Buffer.alloc(8);
      head.writeUInt16BE(e.instrument, 0);
      head.writeUInt8(e.flags ?? 1, 2);
      head.writeUInt8(pts.length - 1, 3);       // one less, deliberately
      head.writeUInt8(e.sustain1 ?? 0, 4);
      head.writeUInt8(e.loopStart ?? 0, 5);
      head.writeUInt8(e.loopEnd ?? 0, 6);
      head.writeUInt8(e.sustain2 ?? 0, 7);
      const nodes = Buffer.alloc(128);
      pts.forEach(([x, y], i) => { nodes.writeUInt16BE(x, i * 4); nodes.writeUInt16BE(y, i * 4 + 2); });
      body.push(head, nodes);
    }
    chunks.push(chunk('VENV', Buffer.concat(body)));
  }
  // DSPE: a track count, one mask byte per track, then delay, feedback, mix
  // and cross as u16s. THE MASK IS INVERTED — a track has echo where its byte
  // is ZERO, which is what the reference loader tests.
  if (echo) {
    const on = echo.tracks ?? [];
    const mask = Buffer.alloc(channels, 1);
    for (const t of on) mask[t] = 0;
    chunks.push(chunk('DSPE', Buffer.concat([
      be16(channels), mask,
      be16(echo.delay ?? 215), be16(echo.feedback ?? 120),
      be16(echo.mix ?? 128), be16(echo.cross ?? 255),
    ])));
  }
  chunks.push(chunk('PATT', patt), chunk('SMPL', smplBody));

  return Buffer.concat([
    Buffer.from('DBM0', 'ascii'), be16(0x0221), be16(0),
    ...chunks,
  ]);
}

// Not `import.meta.url === file://${process.argv[1]}`: this repo's path has
// spaces, so import.meta.url percent-encodes them and the comparison silently
// fails — the script then writes nothing and the next tool reports a missing
// file, which looks like a different bug entirely.
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = process.argv[2] ?? '/tmp/gen.dbm';
  // A plain note, held, with nothing acting on it.
  fs.writeFileSync(out, buildDBM({ cells: { 0: { 0: { note: 0x60, instrument: 1 } } } }));
  console.log(`wrote ${out}`);
}
