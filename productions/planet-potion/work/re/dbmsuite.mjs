// dbmsuite.mjs — one synthetic module per behaviour, each diffed alone.
//
//   node work/re/dbmsuite.mjs            # every case
//   node work/re/dbmsuite.mjs finevoldn  # just the ones whose name matches
//
// dbmdiff tells you the whole module is wrong. This tells you WHICH BEHAVIOUR
// is wrong, by generating the smallest module that uses one of them and
// rendering it through both players. Each case is four rows of nothing plus
// the thing under test, so a disagreement has one plausible cause.
//
// TWO metrics, because correlation alone is BLIND TO LEVEL. Pearson is
// scale-invariant, so a voice rendered at three times the right volume scores
// a perfect 1.0 — every case here passed while the real modules were audibly
// too loud with the balance between voices wrong. The RMS ratio against the
// reference is reported and asserted alongside it.
//
// WAVEFORM correlation is the other metric, not the envelope. These modules are
// a few seconds long and identical in length, so there is no drift for it to
// trip over, and it is far more sensitive than the envelope.
//
// THE BAR IS 0.9. Matching cases now land at 0.97 to 1.00, so the bar has
// plenty of room; it was set when the rounded period table held everything
// down to about 0.94.
//
// Cases marked `differs` are known not to match and say why. They are still
// run, and it is reported as news if one of them starts matching, which has
// happened three times: when the slides moved into the semitone domain, when
// tuning stopped coming from the rounded table, and when the pitch estimator
// stopped quantising. There are none left.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildDBM, saw } from './dbmgen.mjs';
import { parseDBM } from '../../web/js/dbm.js';
import { render } from '../../web/js/dbmplayer.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DBM2WAV = path.join(HERE, 'oracle', 'dbm2wav');
if (!fs.existsSync(DBM2WAV)) {
  console.log('dbmsuite: oracle not built — run work/re/oracle.sh first. Skipping.');
  process.exit(ABSENT);
}

const NOTE = 0x60;                 // the table's C, period 428
const held = (extra = {}) => ({ 0: { 0: { note: NOTE, instrument: 1, ...extra } } });

// A long sample so a note sustains for the whole case and volume changes have
// something to act on; the default C plays it at 8363 Hz.
const LONG = saw(8363 * 4);

const CASES = [
  { name: 'note', cells: held() },
  { name: 'note-low', cells: { 0: { 0: { note: 0x40, instrument: 1 } } } },
  // This one used to be the worst case in the suite, at 0.055, because the
  // period table's integer rounding detuned it 0.2% from the reference. It
  // matches now that pitch is computed rather than looked up.
  { name: 'note-high', cells: { 0: { 0: { note: 0x65, instrument: 1 } } } },
  { name: 'setvolume', cells: held({ e1: 12, p1: 0x20 }) },
  { name: 'volslide-down', cells: { ...held(), 1: { 0: { e1: 10, p1: 0x02 } } } },
  { name: 'volslide-up', cells: { ...held({ e1: 12, p1: 0x08 }), 1: { 0: { e1: 10, p1: 0x20 } } } },
  { name: 'finevol-up', cells: { ...held({ e1: 12, p1: 0x08 }), 1: { 0: { e1: 14, p1: 0xa4 } } } },
  { name: 'finevol-down', cells: { ...held(), 1: { 0: { e1: 14, p1: 0xb4 } } } },
  { slide: true, name: 'porta-up', cells: { ...held(), 1: { 0: { e1: 1, p1: 0x08 } } } },
  // The same slide from a low note, where it stays well under Nyquist: if this
  // one matches and the high one does not, the difference is the resampler at
  // high playback rates rather than the portamento.
  { slide: true, name: 'porta-up-low', cells: { 0: { 0: { note: 0x40, instrument: 1 } }, 1: { 0: { e1: 1, p1: 0x08 } } } },
  { slide: true, name: 'porta-down', cells: { ...held(), 1: { 0: { e1: 2, p1: 0x08 } } } },
  { slide: true, name: 'fineporta-up', cells: { ...held(), 1: { 0: { e1: 14, p1: 0x14 } } } },
  { slide: true, name: 'toneporta', cells: { ...held(), 2: { 0: { note: 0x68, e1: 3, p1: 0x10 } } } },
  { name: 'offset', cells: held({ e1: 9, p1: 0x10 }) },
  { name: 'notedelay', cells: held({ e1: 14, p1: 0xd6 }) },
  { name: 'retrigger', cells: held({ e1: 14, p1: 0x93 }) },
  { name: 'keyoff', cells: { ...held(), 2: { 0: { note: 0x1f } } } },
  { name: 'panning', cells: held({ e1: 8, p1: 0x00 }) },
  { name: 'loop-forward',
    cells: held(),
    instruments: [{ volume: 64, frequency: 8363, sample: 1, flags: 1, loopStart: 1000, loopLength: 2000 }] },
  { name: 'loop-pingpong',
    cells: held(),
    instruments: [{ volume: 64, frequency: 8363, sample: 1, flags: 2, loopStart: 1000, loopLength: 2000 }] },
  { name: 'no-loop-flag-zero',
    cells: held(),
    instruments: [{ volume: 64, frequency: 8363, sample: 1, flags: 0, loopStart: 1000, loopLength: 2000 }] },
  { name: 'instvolume-half',
    cells: held(),
    instruments: [{ volume: 32, frequency: 8363, sample: 1 }] },
  // Volume envelopes: the two instruments that carry them in part one are the
  // sustained voices, and 164 of its 176 key offs land on them.
  { name: 'envelope-decay',
    cells: held(),
    envelopes: [{ instrument: 1, flags: 1, points: [[0, 64], [40, 20], [120, 0]] }] },
  { name: 'envelope-sustain',
    cells: held(),
    envelopes: [{ instrument: 1, flags: 3, sustain1: 1, points: [[0, 0], [10, 64], [80, 8], [200, 0]] }] },
  { name: 'envelope-keyoff',
    cells: { ...held(), 3: { 0: { note: 0x1f } } },
    envelopes: [{ instrument: 1, flags: 3, sustain1: 1, points: [[0, 0], [10, 64], [80, 8], [200, 0]] }] },
  // Sustained over several rows, which is how the module actually uses them —
  // a single row of an effect can match while the running form does not.
  { slide: true, name: 'toneporta-long',
    cells: { ...held(), 2: { 0: { note: 0x68, e1: 3, p1: 0x08 } },
      3: { 0: { e1: 3, p1: 0x08 } }, 4: { 0: { e1: 3, p1: 0x08 } },
      5: { 0: { e1: 3, p1: 0x08 } } } },
  { name: 'pan-slide',
    cells: { ...held({ e1: 8, p1: 0x00 }), 1: { 0: { e1: 25, p1: 0x20 } },
      2: { 0: { e1: 25, p1: 0x20 } }, 3: { 0: { e1: 25, p1: 0x20 } } } },
  { name: 'volslide-long',
    cells: { ...held(), 1: { 0: { e1: 10, p1: 0x02 } }, 2: { 0: { e1: 10, p1: 0x02 } },
      3: { 0: { e1: 10, p1: 0x02 } }, 4: { 0: { e1: 10, p1: 0x02 } } } },
  // Play backwards (0xE3), and the combinations the module actually uses: the
  // weak tracks in part one's late section all pair it, or tone portamento,
  // with a LOOPING instrument.
  { name: 'backwards', cells: held({ e1: 14, p1: 0x30 }) },
  { name: 'backwards-loop',
    cells: held({ e1: 14, p1: 0x30 }),
    instruments: [{ volume: 64, frequency: 8363, sample: 1, flags: 1, loopStart: 1000, loopLength: 4000 }] },
  { name: 'backwards-later',
    cells: { ...held(), 2: { 0: { e1: 14, p1: 0x30 } } } },
  { name: 'toneporta-loop',
    slide: true,
    cells: { ...held(), 2: { 0: { note: 0x68, e1: 3, p1: 0x08 } }, 3: { 0: { e1: 3, p1: 0x08 } } },
    instruments: [{ volume: 64, frequency: 8363, sample: 1, flags: 1, loopStart: 1000, loopLength: 4000 }] },
  { name: 'loop-envelope',
    cells: held(),
    instruments: [{ volume: 64, frequency: 8363, sample: 1, flags: 1, loopStart: 1000, loopLength: 4000 }],
    envelopes: [{ instrument: 1, flags: 3, sustain1: 1, points: [[0, 0], [10, 64], [80, 8], [200, 0]] }] },
  // THE ECHO, which nothing here covered until the real modules showed a
  // 25% level deficit on exactly the tracks that have it.
  // THE PARAMETERS ARE THE REFERENCE'S OWN DEFAULTS, deliberately. Its "old"
  // echo type never pushes the module's DSPE values into the DSP object —
  // `msynth_change_echo_params` only does that for EchoType_New — so it runs
  // every DBM at delay 0x40 and feedback 0x80 whatever the file says. Measured:
  // a module declaring 20 (40 ms, and dbminfo prints 40 ms) rendered with taps
  // 128 ms apart, which is exactly the default. Matching those parameters here
  // compares the echo's STRUCTURE rather than an argument about its settings.
  { name: 'echo', cells: held(), echo: { tracks: [0], delay: 64, feedback: 128 } },
  { name: 'echo-panned', cells: held({ e1: 8, p1: 0xff }), echo: { tracks: [0], delay: 64, feedback: 128 } },
  { name: 'echo-two-tracks',
    cells: { 0: { 0: { note: NOTE, instrument: 1 }, 1: { note: 0x48, instrument: 1 } } },
    echo: { tracks: [0], delay: 64, feedback: 128 } },
  { name: 'speed', cells: { ...held(), 1: { 0: { e1: 15, p1: 3 } } } },
];

function readWavMono(file) {
  const b = fs.readFileSync(file);
  let p = 12, data = null, rate = 44100, ch = 2;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(p + 10); rate = b.readUInt32LE(p + 12); }
    else if (id === 'data') data = b.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size & 1);
  }
  const frames = Math.floor(data.length / (2 * ch));
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < ch; c++) s += data.readInt16LE((i * ch + c) * 2);
    mono[i] = s / (32768 * ch);
  }
  return { mono, rate, frames };
}

/**
 * The PITCH TRAJECTORY, which is what a slide should actually be judged on.
 *
 * Neither of the other two metrics works here. Waveform phase drifts apart
 * from a fraction of a semitone, so a slide that tracks the reference almost
 * exactly scores 0.28. And the envelope of a held note is nearly CONSTANT, so
 * correlating it measures noise and returns whatever — 0.75 for a case whose
 * measured pitch matched the reference at every point.
 *
 * Zero crossings per window give the dominant frequency directly. The score is
 * the MEDIAN deviation in semitones, turned into a 0..1 number so it can share
 * a bar with the others: 1.0 is exact, 0.9 is a tenth of a semitone out.
 * Median rather than worst, because a 60 ms window that straddles a fast slide
 * measures the average of two pitches and is coarse by construction — taking
 * the worst window scored 0 for trajectories that matched everywhere else.
 */
function pitchTrack(a, b, n, rate) {
  // 60 ms. A longer window resolves frequency more finely but spans more of a
  // slide, and widening it to 200 ms made the other cases worse rather than
  // better — at which point the tuning is of the measurement, not the player,
  // and worth stopping.
  const W = Math.floor(rate * 0.06);
  // Sub-sample crossing times, not a count. Counting whole crossings resolves
  // to one per window — 16.7 Hz at 60 ms, which is 0.34 of a semitone at
  // 833 Hz, and that quantum WAS the error this reported on trajectories that
  // agreed. Interpolating where each crossing actually falls, and measuring
  // from the first to the last, is finer by orders of magnitude.
  const rateOf = (x, i) => {
    let first = -1, last = -1, n = 0;
    for (let k = i; k < i + W - 1; k++) {
      if (x[k] < 0 && x[k + 1] >= 0) {
        const t = k + (-x[k] / (x[k + 1] - x[k]));
        if (first < 0) first = t;
        else { last = t; n++; }
      }
    }
    return n < 1 ? 0 : (rate * n) / (last - first);
  };
  const devs = [];
  let prevA = null;
  for (let i = 0; i + W < n; i += W) {
    const fa = rateOf(a, i), fb = rateOf(b, i);
    if (fa < 20 || fb < 20) { prevA = null; continue; }   // silence
    // SKIP WINDOWS WHERE THE PITCH IS SWEEPING. A 60 ms window that spans a
    // fast slide reports the average of everything in it, so a half-tick
    // difference in when the slide starts reads as a whole semitone of error
    // that is not there — the steady stretches on either side agree exactly.
    // Only windows where the reference itself is holding still are compared.
    const sweeping = prevA !== null && Math.abs(12 * Math.log2(fa / prevA)) > 0.5;
    prevA = fa;
    if (sweeping) continue;
    devs.push(Math.abs(12 * Math.log2(fb / fa)));
  }
  if (!devs.length) return null;
  devs.sort((x, y) => x - y);
  return Math.max(0, 1 - devs[devs.length >> 1]);   // semitones off, as a score
}

/**
 * Envelope correlation, for the cases where waveform phase is the wrong thing
 * to measure. A pitch slide that tracks the reference to within a fraction of
 * a semitone still walks out of phase — `toneporta-long` scored 0.28 on the
 * waveform while its measured trajectory matched to 0.75 of a semitone and
 * converged on the same note. Amplitude over time is what a slide should be
 * judged on until the resampler itself is exact.
 */
function envCorrelate(a, b, n) {
  const W = 512, m = Math.floor(n / W);
  const ea = new Float32Array(m), eb = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    let sa = 0, sb = 0;
    for (let k = 0; k < W; k++) { sa += a[i * W + k] ** 2; sb += b[i * W + k] ** 2; }
    ea[i] = Math.sqrt(sa / W); eb[i] = Math.sqrt(sb / W);
  }
  return correlate(ea, eb, m);
}

function correlate(a, b, n) {
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  if (da <= 0 && db <= 0) return 1;          // both silent: agreement
  if (da <= 0 || db <= 0) return 0;          // one silent, one not: total miss
  return num / Math.sqrt(da * db);
}

const filter = process.argv[2];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dbmsuite-'));
let bad = 0;
const results = [];

for (const c of CASES) {
  if (filter && !c.name.includes(filter)) continue;
  const mod = buildDBM({
    cells: c.cells, rows: c.rows ?? 8, channels: 4,
    instruments: c.instruments, samples: [LONG], envelopes: c.envelopes,
    echo: c.echo,
  });
  const file = path.join(tmp, `${c.name}.dbm`);
  fs.writeFileSync(file, mod);
  const wav = path.join(tmp, `${c.name}.wav`);
  execFileSync(DBM2WAV, [file, wav], { stdio: ['ignore', 'ignore', 'ignore'] });
  const ref = readWavMono(wav);

  const out = render(parseDBM(new Uint8Array(mod)), { sampleRate: ref.rate });
  const ourFrames = out.pcm.length / 2;
  const ours = new Float32Array(ourFrames);
  for (let i = 0; i < ourFrames; i++) ours[i] = (out.pcm[i * 2] + out.pcm[i * 2 + 1]) / 2;

  const n = Math.min(ref.frames, ourFrames);
  const r = c.slide
    ? pitchTrack(ref.mono, ours, n, ref.rate)
    : correlate(ref.mono, ours, n);
  const rms = (x) => { let s2 = 0; for (let i = 0; i < n; i++) s2 += x[i] * x[i]; return Math.sqrt(s2 / n); };
  const refRms = rms(ref.mono), ourRms = rms(ours);
  const level = refRms > 0 ? ourRms / refRms : (ourRms > 0 ? Infinity : 1);
  const lenMs = ((ourFrames - ref.frames) / ref.rate) * 1000;
  results.push({ name: c.name, r, lenMs, level, differs: c.differs });
  // The length is REPORTED, not asserted: the oracle renders a tail past the
  // last row (about 140 ms here, 310 ms on part one) to flush its DSP chain,
  // and that is a property of dbm2wav rather than a disagreement about the
  // music. The correlation runs over the common prefix.
  // The level bar is generous because the reference's own per-channel gain is
  // still being matched; what matters is that every case sits at the SAME
  // ratio. One case out of line with the others is a volume bug in that
  // behaviour, which is exactly what a correlation cannot show.
  const ok = r !== null && (c.differs ? r < 0.9 : r > 0.9) && level > 0.5 && level < 8;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${c.name.padEnd(20)} r=${r.toFixed(4)}`
    + `  level x${level.toFixed(2)}`
    + `  length ${lenMs >= 0 ? '+' : ''}${lenMs.toFixed(0)} ms`
    + (c.slide ? '  [pitch]' : '')
    + (c.differs ? `  (expected to differ: ${c.differs})` : ''));
}

fs.rmSync(tmp, { recursive: true, force: true });
const levels = results.map((x) => x.level).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
const median = levels[levels.length >> 1];
const offLevel = results.filter((x) => Math.abs(x.level / median - 1) > 0.1);
console.log(`\nlevel: median x${median.toFixed(2)} against the reference`
  + (offLevel.length ? `; OUT OF LINE: ${offLevel.map((x) => `${x.name} x${x.level.toFixed(2)}`).join(' ')}`
    : '; every case at the same ratio'));
const worst = results.slice().sort((a, b) => a.r - b.r).slice(0, 5);
console.log(`\nworst: ${worst.map((w) => `${w.name}=${w.r.toFixed(3)}`).join(' ')}`);
const matched = results.filter((r) => !r.differs).length;
console.log(bad === 0
  ? `all ${matched} comparable behaviours match the reference, and the `
    + `${results.length - matched} known-different ones still differ`
  : `${bad} of ${results.length} behaviours are not as expected`);
process.exit(bad ? 1 : 0);
