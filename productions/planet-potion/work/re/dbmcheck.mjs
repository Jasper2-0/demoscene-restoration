// dbmcheck.mjs — does the JS reader account for every byte of a real module?
//
//   node work/re/dbmcheck.mjs part1.dbm part3.dbm [--audio out/audio.json]
//
// "It parsed" is a weak claim: a reader that skips a chunk it does not
// understand, or that walks a pattern with the wrong cell layout, still returns
// an object full of plausible numbers. So this checks the things that can
// actually fail:
//
//   * every byte of the file is claimed by a chunk, with nothing trailing;
//   * each chunk's declared length equals what parsing it consumed — a reader
//     that under-reads a chunk is wrong even though the next chunk still lands
//     in the right place, because the bytes it skipped were data;
//   * the chunk sizes match the ones synthhash.py measured from the generator's
//     own output, which is an independent walk of the same bytes;
//   * the counts INFO declares are the counts the later chunks produce;
//   * the DSPE parameters match the table in PORT_SPEC §8j.
import fs from 'node:fs';
import { parseDBM } from '../../web/js/dbm.js';
import { unhandledEffects } from '../../web/js/dbmplayer.js';

const argv = process.argv.slice(2);
const ai = argv.indexOf('--audio');
// Skip the flag AND its value: passing the JSON path through as a module to
// parse is how this first ran, and it reported a confident failure on it.
const files = argv.filter((a, k) => !a.startsWith('--') && k !== ai + 1);
const audio = ai >= 0 ? JSON.parse(fs.readFileSync(argv[ai + 1], 'utf8')).parts : null;

// PORT_SPEC §8j, read from the modules by the Python side.
const ECHO = {
  18: { delay: 215, feedback: 120, mix: 128, cross: 255 },
  16: { delay: 235, feedback: 96, mix: 105, cross: 255 },
};

let bad = 0;
const say = (ok, what, detail = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

for (const f of files) {
  const bytes = new Uint8Array(fs.readFileSync(f));
  console.log(`\n=== ${f}  (${bytes.length} bytes)`);
  let mod;
  try { mod = parseDBM(bytes); } catch (e) { say(false, 'parses', e.message); continue; }

  console.log(`    version ${mod.version}, reserved 0x${mod.reserved.toString(16)}, `
    + `chunks ${mod.chunks.map((c) => c.id).join(' ')}`);

  // HOW MUCH OF THE MUSIC IS ACTUALLY PLAYED, as a number in the output. The
  // player once acted on 2 of the 38 commands dbplayer.library dispatches —
  // 13% of what part one asks for — while every check here passed, because
  // they all test structure and none of them tests interpretation. The gap was
  // found by ear, which is the one instrument this suite does not have.
  const fx = unhandledEffects(mod);
  console.log(`    effect commands acted on: ${(fx.coverage * 100).toFixed(1)}%`
    + `  unhandled: ${JSON.stringify(fx.unhandled)}`
    + `  extended sub-commands unhandled: ${JSON.stringify(fx.extendedUnhandled)}`);
  say(fx.coverage > 0.95, 'the player acts on most of the effect commands used',
    `${(fx.coverage * 100).toFixed(1)}%`);
  say(mod.version === '2.21', 'version is 2.21', mod.version);
  say(mod.coverage.trailing === 0, 'no bytes between the last chunk and the end',
    `${mod.coverage.trailing}`);
  if (mod.sizePrefix) {
    console.log(`    size prefix ${mod.sizePrefix} (the generator's, see 0x10006ef0)`);
    say(mod.coverage.beyondIsPadding,
      'anything past the declared size is zero padding',
      `${mod.coverage.beyondDeclared} bytes`);
  }
  say(mod.coverage.claimed === mod.coverage.fileBytes,
    'every byte claimed by a chunk',
    `${mod.coverage.claimed} of ${mod.coverage.fileBytes}`);

  for (const c of mod.chunks) {
    // SMPL and PATT are read to their declared end deliberately; the rest must
    // consume exactly what they declare.
    if (c.id === 'PATT' || c.id === 'SMPL' || c.id === 'NAME') continue;
    say(c.consumed === c.size, `${c.id} consumed exactly its declared length`,
      `${c.consumed} of ${c.size}`);
  }

  const i = mod.info;
  say(!!i, 'INFO present');
  if (i) {
    console.log(`    ${i.instruments} instruments, ${i.samples} samples, `
      + `${i.songs} songs, ${i.patterns} patterns, ${i.channels} channels`);
    say(mod.instruments.length === i.instruments, 'INST count matches INFO');
    say(mod.patterns.length === i.patterns, 'PATT count matches INFO');
    say(mod.samples.length === i.samples, 'SMPL count matches INFO');
    say(mod.songs.length === i.songs, 'SONG count matches INFO');
  }

  // Samples: the emitter writes 8-bit frames, and an empty sample is flags 0
  // with length 0 — not flags 1 with no data.
  const eightBit = mod.samples.filter((s) => s.flags === 1).length;
  const empty = mod.samples.filter((s) => s.flags === 0).length;
  console.log(`    samples: ${eightBit} eight-bit, ${empty} empty, `
    + `${mod.samples.reduce((a, s) => a + s.frames, 0)} frames total`);
  say(eightBit + empty === mod.samples.length, 'every sample is 8-bit or empty');
  say(mod.samples.every((s) => s.flags !== 0 || s.frames === 0),
    'empty samples declare zero length');

  const e = mod.echo;
  say(!!e, 'DSPE present');
  if (e) {
    const want = ECHO[e.channels];
    console.log(`    echo: ${e.channels} channels, delay ${e.delay}, `
      + `feedback ${e.feedback}, mix ${e.mix}, cross ${e.cross}, `
      + `${e.enabled.filter(Boolean).length} channels enabled`);
    say(!!want, 'echo channel count is one of the two documented', `${e.channels}`);
    if (want) {
      say(e.delay === want.delay && e.feedback === want.feedback
        && e.mix === want.mix && e.cross === want.cross,
      'echo parameters match PORT_SPEC §8j');
    }
    say(e.cross === 255, 'cross is 255 — full ping-pong, not a subtle tail');
  }

  say(mod.panEnvelopes.length === 0, 'no PENV chunk, as documented');

  // THE CHECK THAT ACTUALLY TESTS THE PATTERN UNPACKING. Effect 7 parameter 1
  // is the signal that ends a scene (PORT_SPEC §8k), and showorder.py counted
  // those events independently against the number of scene-driver calls in the
  // part: 26 and 26 for part one, 13 and 13 for part three. Walking the order
  // list here has to find the same number. A mis-shaped cell mask desynchronises
  // the stream and this count moves; nothing else in this file would notice.
  const SIGNALS = { p1: 26, p3: 13 };
  const part = f.includes('part1') ? 'p1' : 'p3';
  const order = mod.songs[0]?.order ?? [];
  let signals = 0, effects = new Map();
  for (const pi of order) {
    const pat = mod.patterns[pi];
    if (!pat) continue;
    for (const cell of pat.cells) {
      if (!cell) continue;
      for (const [e, v] of [[cell.effect1, cell.param1], [cell.effect2, cell.param2]]) {
        if (!e) continue;
        effects.set(e, (effects.get(e) ?? 0) + 1);
        if (e === 7 && v === 1) signals++;
      }
    }
  }
  console.log(`    order list ${order.length} entries; effects used: `
    + [...effects.keys()].sort((a, b) => a - b).join(' '));
  say(signals === SIGNALS[part],
    `effect 7 param 1 fires ${SIGNALS[part]} times, once per scene-driver call`,
    `${signals}`);

  if (audio) {
    // The independent measurement: synthhash.py walked the generator's own
    // output. Matching it means two different walks agree on the layout.
    const part = f.includes('part1') ? 'p1' : 'p3';
    const want = audio[part]?.chunks;
    if (want) {
      let all = true;
      for (const [id, meta] of Object.entries(want)) {
        const got = mod.chunks.find((c) => c.id === id);
        const n = typeof meta === 'object' ? meta.bytes : meta;
        if (!got || got.size !== Number(n)) {
          all = false;
          console.log(`      ${id}: reader says ${got?.size}, synthhash says ${n}`);
        }
      }
      say(all, `chunk sizes agree with synthhash.py (${Object.keys(want).length} chunks)`);
    }
  }
}

// --- audio.json on its own, which needs no .dbm files ------------------------
//
// This runs whether or not the modules are here, because it is checkable from
// the JSON alone and it caught something: the committed dataset carries
// `sizeMatches: false` for part one, and the mismatch is in the EXPECTATION,
// not in the generator.
//
// `declaredSize` is the u32 prefix the generator itself writes; `expectedSize`
// is synthhash.py's constant. Summing the recorded chunks settles which is
// right without either — payload + an 8-byte module header + one 8-byte header
// per chunk. For part one that is exactly 5,324,378, the declared value.
// 5,324,890 is `0x513e5a` converted wrong, a figure this repo has now had to
// kill three times: it was corrected in NOTES.md, copied back out of the older
// paragraphs into synthhash.py's constant, corrected there too — and a dataset
// exported in between still carries it.
//
// So a `sizeMatches: false` whose chunk sum agrees with `declaredSize` is a
// STALE EXPORT, not a broken synth, and saying so is the difference between
// regenerating audio.json and going looking for a bug in 32 primitives.
if (audio) {
  console.log('\n=== audio.json, self-consistency');
  for (const [part, v] of Object.entries(audio)) {
    const ids = Object.keys(v.chunks ?? {});
    const payload = ids.reduce((n, id) => n + Number(v.chunks[id].bytes ?? v.chunks[id]), 0);
    const total = payload + 8 + 8 * ids.length;
    say(total === v.declaredSize,
      `${part}: the ${ids.length} chunks account for declaredSize exactly`,
      `sum ${total} vs declared ${v.declaredSize}`);
    if (v.sizeMatches === false && total === v.declaredSize) {
      console.log(`      ${part}: expectedSize ${v.expectedSize} disagrees with both `
        + `— this export predates the synthhash.py constant fix. Regenerate `
        + `audio.json; the generator is fine.`);
    } else {
      say(v.sizeMatches !== false, `${part}: declaredSize matches expectedSize`,
        `${v.declaredSize} vs ${v.expectedSize}`);
    }
  }
}

console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
