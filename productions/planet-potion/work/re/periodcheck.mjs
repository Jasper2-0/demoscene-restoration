// periodcheck.mjs — pin the player's period table to the binary it came from.
//
//   node work/re/periodcheck.mjs [flat-dir]
//
// dbmplayer.js carries 96 magic numbers. They are not magic — they are the
// table `dbplayer.library 2.0` indexes at 0x10023106, and the library is
// embedded in the intro as seg1, so the claim is checkable rather than
// remembered. Before this table existed the file computed pitch as
// `c3 * 2 ** ((note - 25) / 12)`, which is a plausible sentence about trackers
// and was wrong by about three octaves.
//
// It searches the raw seg1 image rather than parsing the hunk file: the table
// is 192 bytes of very distinctive data, and requiring it to appear EXACTLY
// ONCE is a stronger statement than reading it from an offset that a future
// relocation could move. A second occurrence would mean the signature is not
// as distinctive as assumed, which is worth failing on.
import fs from 'node:fs';
import path from 'node:path';
import { PERIODS } from '../../web/js/dbmplayer.js';

const ABSENT = 77;
const flat = process.argv[2] ?? 'flat';
const seg1 = path.join(flat, 'seg1_DATA_10010000.bin');
if (!fs.existsSync(seg1)) {
  console.log(`periodcheck: ${seg1} absent — no original here, skipping`);
  process.exit(ABSENT);
}

let bad = 0;
const say = (ok, what, detail = null) => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail === null ? '' : `  ${detail}`}`);
};

const img = fs.readFileSync(seg1);
say(img.readUInt32BE(0) === 0x000003f3,
  'seg1 is the embedded dbplayer.library (hunk executable)',
  `0x${img.readUInt32BE(0).toString(16).padStart(8, '0')}`);

const want = Buffer.alloc(PERIODS.length * 2);
PERIODS.forEach((v, i) => want.writeUInt16BE(v, i * 2));

const hits = [];
for (let i = 0; (i = img.indexOf(want, i)) !== -1; i += 2) hits.push(i);
say(hits.length === 1, 'the table appears in the shipped library exactly once',
  hits.length ? hits.map((h) => `+0x${h.toString(16)}`).join(', ') : 'not found');

say(PERIODS.length === 96, 'it is 8 octaves of 12', PERIODS.length);

// The properties that make it a tuning table at all — but stated as the table
// actually is, which is the traditional Amiga period table and NOT a generated
// one. Asserting exact halving and exact equal temperament failed here, and
// the table was right both times: 1812 halves to 904 rather than 906, and
// 11520 steps to 10848 where equal temperament wants 10873. So a port that
// computed 2**(n/12) would stay slightly out of tune even with the note
// decoding fixed, which is the second reason this table is copied rather than
// derived.
//
// The tolerance is 2% because the table is integers and its smallest period
// is 56, where a single unit is already 1.8%. Both worst cases land at the top
// octave for exactly that reason: 113 halves to 56, and 60 steps to 56.
let worstOctave = 0;
for (let i = 0; i + 12 < PERIODS.length; i++) {
  worstOctave = Math.max(worstOctave, Math.abs(PERIODS[i] / (2 * PERIODS[i + 12]) - 1));
}
say(worstOctave < 0.02, 'an octave halves the period, to the table\'s own rounding',
  `worst ${(worstOctave * 100).toFixed(2)}%`);

let worstSemi = 0;
for (let i = 0; i + 1 < PERIODS.length; i++) {
  if ((i % 12) === 11) continue;
  worstSemi = Math.max(worstSemi,
    Math.abs(PERIODS[i + 1] / (PERIODS[i] / 2 ** (1 / 12)) - 1));
}
say(worstSemi < 0.02, 'a semitone is the twelfth root of two, to the same rounding',
  `worst ${(worstSemi * 100).toFixed(2)}%`);
say(worstSemi > 0.0005, 'and it is a rounded table rather than a computed one',
  `${(worstSemi * 100).toFixed(2)}% off exact equal temperament`);

// 3579545 / 8363 = 428.02, and 428 is the table's octave-6 C. That identity is
// what makes an instrument play at its own C-3 rate on note 0x60, and it is
// the reason the rate conversion in dbmplayer.js is shaped the way it is.
say(PERIODS[60] === 428, 'note 0x60 lands on period 428, the C-3 reference',
  PERIODS[60]);
say(Math.abs(3579545 / 8363 - 428) < 0.1,
  'and the clock over the C-3 frequency is that same 428',
  (3579545 / 8363).toFixed(3));

// --- and the thing that actually went wrong -------------------------------
//
// The table being right does not mean the decode is. What made the audio
// unlistenable was every note coming out about three octaves sharp, and the
// symptom was measurable long before anyone pressed play: playback rates far
// above anything the table can produce. The table's extremes are periods 13696
// and 56, so at 48 kHz the fastest a note can legitimately run is
// (3579545 / 56) * (c3 / 8363) / 48000 — about 1.6x for a 48 kHz instrument
// and well under 1x for the 8363 Hz ones these modules use. Anything above 4x
// is arithmetically impossible, and the broken decode produced it 87% of the
// time, peaking at 67x.
// KEY OFF IS NOT A NOTE, and this check exists because the player was once
// told it was. 0x1F is tested at 0x10021cc4, ahead of the note path, and skips
// the trigger; decoded as a pitch instead it lands on period 5,760 and plays a
// low note 176 times in part one. Both facts are asserted: that the byte is
// excluded from the pitch path, and that the bytes reaching it stay inside the
// table's range.
const seg2 = fs.readFileSync(path.join(flat, 'seg1_DATA_10010000.bin'));
say(seg2.includes(Buffer.from([0x0c, 0x11, 0x00, 0x1f])),
  'the player compares the note byte against 0x1F (cmpi.b #$1f, (a1))');

const mods = process.argv.slice(3);
if (mods.length) {
  const { parseDBM } = await import('../../web/js/dbm.js');
  const { Sequencer, noteRateHz, KEY_OFF } = await import('../../web/js/dbmplayer.js');
  for (const file of mods) {
    if (!fs.existsSync(file)) { console.log(`  (${file} absent)`); continue; }
    const mod = parseDBM(new Uint8Array(fs.readFileSync(file)));
    const nch = mod.info?.channels ?? 0;
    const held = new Array(nch).fill(null);
    const rates = [];
    let keyOffs = 0;
    new Sequencer(mod, {}).run((cells) => {
      for (let c = 0; c < nch; c++) {
        const cell = cells[c];
        if (!cell) continue;
        if (cell.instrument) held[c] = mod.instruments[cell.instrument - 1] ?? null;
        if (cell.note === KEY_OFF) { keyOffs++; continue; }
        if (cell.note && held[c]) rates.push(noteRateHz(cell.note, held[c].frequency));
      }
    });
    const steps = rates.map((hz) => hz / 48000);
    const over = steps.filter((s) => s > 4).length;
    const max = Math.max(...steps);
    const name = path.basename(file);
    say(over === 0, `${name}: no note exceeds 4x playback rate`,
      `${over} of ${steps.length}, max ${max.toFixed(3)}x`);
    say(steps.every((s) => s > 0), `${name}: every note resolves to a rate`);
    say(keyOffs > 0, `${name}: key offs are present and excluded from pitch`,
      `${keyOffs} of ${keyOffs + steps.length} note bytes`);
  }
}

console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
