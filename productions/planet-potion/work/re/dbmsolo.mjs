// dbmsolo.mjs — rewrite a module so only one track plays.
//
//   node work/re/dbmsolo.mjs in.dbm out.dbm 5      # keep track 5 (0-based)
//   node work/re/dbmsolo.mjs in.dbm out.dbm 5 --keep-speed
//
// A whole-module correlation says the player is wrong; it does not say WHERE.
// Eighteen tracks mixed together hide which one is at fault, so this drops
// every pattern entry that does not belong to the chosen track and leaves the
// rest of the file alone. Rendering the result through both players compares
// one voice at a time, which is the same trick texops.py plays on the texture
// VM: synthesise the smallest input that exercises one thing.
//
// SPEED AND TEMPO ARE KEPT BY DEFAULT, wherever they live. Effect 15 sets the
// row length for the whole module, so dropping another track's `fx15` would
// change the timing of the track under test and every comparison would then be
// measuring the tempo difference instead of the voice. Pattern delay (0xEE) is
// kept for the same reason. `--keep-speed` is therefore the default and the
// flag only exists to turn it OFF for the rare case where the timing itself is
// what is being isolated.
import fs from 'node:fs';

const [inFile, outFile, trackArg, ...rest] = process.argv.slice(2);
if (!inFile || !outFile || trackArg === undefined) {
  console.error('usage: dbmsolo.mjs <in.dbm> <out.dbm> <track> [--no-keep-speed]');
  process.exit(2);
}
const track = Number(trackArg);
const keepTiming = !rest.includes('--no-keep-speed');

const buf = fs.readFileSync(inFile);
if (buf.toString('ascii', 0, 4) !== 'DBM0') {
  console.error(`${inFile}: not a DBM0 module`);
  process.exit(2);
}

// Walk the chunks, and rebuild only PATT.
const out = [buf.subarray(0, 8)];       // 'DBM0' + version word
let p = 8, channels = 0, patterns = 0, kept = 0, dropped = 0;

while (p + 8 <= buf.length) {
  const id = buf.toString('ascii', p, p + 4);
  const size = buf.readUInt32BE(p + 4);
  const body = buf.subarray(p + 8, p + 8 + size);

  if (id === 'INFO') {
    patterns = body.readUInt16BE(6);
    channels = body.readUInt16BE(8);
  }

  if (id !== 'PATT') {
    out.push(buf.subarray(p, p + 8 + size));
    p += 8 + size;
    continue;
  }

  // Unpack, filter, repack. The stream is: track byte (0 = next row), then a
  // bitmask, then the present fields in a fixed order.
  const packed = [];
  let q = 0;
  for (let i = 0; i < patterns; i++) {
    const rows = body.readUInt16BE(q);
    const psize = body.readUInt32BE(q + 2);
    const stop = q + 6 + psize;
    let r = q + 6;
    const bytes = [];
    while (r < stop) {
      const ch = body[r++];
      if (ch === 0) { bytes.push(0); continue; }
      const mask = body[r++];
      const f = { note: 0, instrument: 0, e1: 0, p1: 0, e2: 0, p2: 0 };
      if (mask & 0x01) f.note = body[r++];
      if (mask & 0x02) f.instrument = body[r++];
      if (mask & 0x04) f.e1 = body[r++];
      if (mask & 0x08) f.p1 = body[r++];
      if (mask & 0x10) f.e2 = body[r++];
      if (mask & 0x20) f.p2 = body[r++];

      const mine = ch - 1 === track;
      // A tempo command on any track governs the whole module.
      const timing = keepTiming && [f.e1, f.e2].some((e, k) => {
        const v = k === 0 ? f.p1 : f.p2;
        return e === 15 || (e === 14 && (v >> 4) === 0xe);
      });
      if (!mine && !timing) { dropped++; continue; }
      kept++;

      // A kept-for-timing entry from another track loses everything but the
      // command that earned it a place.
      const w = mine ? f : {
        note: 0, instrument: 0,
        e1: f.e1 === 15 || (f.e1 === 14 && (f.p1 >> 4) === 0xe) ? f.e1 : 0,
        p1: f.e1 === 15 || (f.e1 === 14 && (f.p1 >> 4) === 0xe) ? f.p1 : 0,
        e2: f.e2 === 15 || (f.e2 === 14 && (f.p2 >> 4) === 0xe) ? f.e2 : 0,
        p2: f.e2 === 15 || (f.e2 === 14 && (f.p2 >> 4) === 0xe) ? f.p2 : 0,
      };
      let m = 0;
      const vals = [];
      if (w.note) { m |= 0x01; vals.push(w.note); }
      if (w.instrument) { m |= 0x02; vals.push(w.instrument); }
      if (w.e1) { m |= 0x04; vals.push(w.e1); }
      if (w.p1) { m |= 0x08; vals.push(w.p1); }
      if (w.e2) { m |= 0x10; vals.push(w.e2); }
      if (w.p2) { m |= 0x20; vals.push(w.p2); }
      if (!m) continue;
      bytes.push(ch, m, ...vals);
    }
    // 16-bit alignment: an odd packed length gets one pad byte, which the
    // loader must not process.
    if (bytes.length & 1) bytes.push(0);
    const head = Buffer.alloc(6);
    head.writeUInt16BE(rows, 0);
    head.writeUInt32BE(bytes.length, 2);
    packed.push(head, Buffer.from(bytes));
    q = stop;
  }

  const bodyOut = Buffer.concat(packed);
  const head = Buffer.alloc(8);
  head.write('PATT', 0, 'ascii');
  head.writeUInt32BE(bodyOut.length, 4);
  out.push(head, bodyOut);
  p += 8 + size;
}

fs.writeFileSync(outFile, Buffer.concat(out));
console.log(`${outFile}: track ${track} of ${channels}, kept ${kept} entries, dropped ${dropped}`);
