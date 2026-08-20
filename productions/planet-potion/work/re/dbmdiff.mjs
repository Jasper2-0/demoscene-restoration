// dbmdiff.mjs — the JS replayer against libdigibooster3, as a number.
//
//   node work/re/dbmdiff.mjs mods/part1_full.dbm [--min 0.42] [--keep out.wav]
//
// Until this existed the only test of whether the music was RIGHT was to listen
// to it, and that caught two real bugs (three octaves sharp, then key off
// played as a note) long after the structural checks had gone green. dbmcheck
// and dbmtime verify that every byte is claimed and every row lands on the
// right tick; neither has any opinion about what comes out of the speaker.
//
// THE ORACLE is libdigibooster3, written by the DBM format's own author and
// released BSD-2. `oracle.sh` fetches and builds it — the upstream GitHub
// account is gone, so it comes from Software Heritage's archive of it. That
// makes it a THIRD implementation next to ours and the shipped
// dbplayer.library, so a disagreement is a question rather than a verdict:
// where the two references differ, dbplayer.library wins, because that is the
// binary this intro actually ran.
//
// WHAT IS MEASURED. Pearson correlation between the two renders, overall and
// per second, on the channel sum. Correlation rather than sample difference
// because it is invariant to overall gain — our mixer's final level is a
// stopgap and would otherwise swamp every other signal. Per-second figures are
// the useful part: they say WHICH passage is wrong, which is what turns "still
// sounds off" into a place to look.
//
// The threshold is a RATCHET, not a target. Pass the current best with --min so
// the check fails on a regression; raise it as the player improves.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
// fileURLToPath, not `new URL().pathname`: this repository lives under a path
// with spaces in it, which the URL form percent-encodes into %20 and then
// fails to find.
import { fileURLToPath } from 'node:url';
import { parseDBM } from '../../web/js/dbm.js';
import { render } from '../../web/js/dbmplayer.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DBM2WAV = path.join(HERE, 'oracle', 'dbm2wav');

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : def;
};
const FLAGS_WITH_VALUES = ['--min', '--min-wave', '--keep', '--octaves'];
const modFile = argv.find((a, i) => !a.startsWith('--') && !FLAGS_WITH_VALUES.includes(argv[i - 1]));
const minCorr = Number(flag('--min', '0'));
const keep = flag('--keep', null);

if (!modFile || !fs.existsSync(modFile)) {
  console.log('dbmdiff: no module given — usage: dbmdiff.mjs <module.dbm> [--min r]');
  process.exit(ABSENT);
}
if (!fs.existsSync(DBM2WAV)) {
  console.log('dbmdiff: oracle not built — run work/re/oracle.sh first. Skipping.');
  process.exit(ABSENT);
}

/** Minimal RIFF reader: dbm2wav writes 44.1 kHz 16-bit stereo, nothing exotic. */
function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${file}: not a RIFF/WAVE file`);
  }
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') {
      fmt = { channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12),
        bits: b.readUInt16LE(p + 22) };
    } else if (id === 'data') {
      data = b.subarray(p + 8, p + 8 + size);
    }
    p += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`${file}: missing fmt or data chunk`);
  if (fmt.bits !== 16) throw new Error(`${file}: expected 16-bit, got ${fmt.bits}`);
  const frames = Math.floor(data.length / (2 * fmt.channels));
  // The channel SUM, which is what the correlation runs on: a pan difference
  // should not read as a wrong note.
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) s += data.readInt16LE((i * fmt.channels + c) * 2);
    mono[i] = s / (32768 * fmt.channels);
  }
  return { mono, rate: fmt.rate, frames, channels: fmt.channels };
}

/** Pearson correlation over a slice; 0 when either side is silent. */
function correlate(a, b, from, to) {
  let sa = 0, sb = 0, n = 0;
  for (let i = from; i < to; i++) { sa += a[i]; sb += b[i]; n++; }
  if (!n) return null;
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = from; i < to; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  if (da <= 0 || db <= 0) return null;
  return num / Math.sqrt(da * db);
}

const wav = keep ?? path.join(process.env.TMPDIR ?? '/tmp', `dbmdiff-${path.basename(modFile)}.wav`);
console.log(`rendering the oracle: dbm2wav ${path.basename(modFile)}`);
execFileSync(DBM2WAV, [modFile, wav], { stdio: ['ignore', 'ignore', 'inherit'] });
const ref = readWav(wav);

console.log(`rendering ours at ${ref.rate} Hz`);
const bytes = new Uint8Array(fs.readFileSync(modFile));

// --ref-echo: render OUR side with the echo parameters the reference actually
// applies, rather than the ones the module carries.
//
// libdigibooster3's "old" echo type never pushes a module's DSPE values into
// its DSP object — `msynth_change_echo_params` only does that for
// EchoType_New — so it plays every DBM at delay 0x40 and feedback 0x80. A
// generated module declaring 40 ms, which its own dbminfo prints as 40 ms,
// renders with taps 128 ms apart. Part one carries 430 ms and feedback 120,
// and 12 of its 18 tracks have echo, so the two players disagree across most
// of the mix for a reason that has nothing to do with this port.
//
// WE KEEP THE MODULE'S PARAMETERS, because they are the module's own data and
// what the intro's dbplayer.library would have used. This flag exists to
// measure everything else: with the echo aligned, part one matches the
// reference at 0.9955 on the envelope and 0.9858 on the waveform, and that is
// the honest figure for how close the player is.
if (argv.includes('--ref-echo')) {
  let p = 8;
  while (p + 8 <= bytes.length) {
    const id = String.fromCharCode(...bytes.slice(p, p + 4));
    const size = (bytes[p + 4] << 24 | bytes[p + 5] << 16 | bytes[p + 6] << 8 | bytes[p + 7]) >>> 0;
    if (id === 'DSPE') {
      const tracks = (bytes[p + 8] << 8) | bytes[p + 9];
      const at = p + 10 + tracks;
      bytes[at] = 0; bytes[at + 1] = 64;          // delay 0x40
      bytes[at + 2] = 0; bytes[at + 3] = 128;     // feedback 0x80
      console.log('echo: using the reference\'s own defaults (delay 64, feedback 128)');
      break;
    }
    p += 8 + size;
  }
}
const mod = parseDBM(bytes);
// No compensation: both players now pitch the module the same way, so this
// compares like with like. --octaves transposes for another A/B if the note
// base is ever in question again.
const octaves = Number(flag('--octaves', '0')) || 0;
const out = render(mod, { sampleRate: ref.rate, octaveShift: octaves });
if (octaves) console.log(`pitch: transposed ${octaves > 0 ? '+' : ''}${octaves} octaves`);
const ourFrames = out.pcm.length / 2;
const ours = new Float32Array(ourFrames);
for (let i = 0; i < ourFrames; i++) ours[i] = (out.pcm[i * 2] + out.pcm[i * 2 + 1]) / 2;

let bad = 0;
const say = (ok, what, detail = null) => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail === null ? '' : `  ${detail}`}`);
};

const refSec = ref.frames / ref.rate, ourSec = ourFrames / ref.rate;
console.log(`\n    oracle ${ref.frames} frames (${refSec.toFixed(3)}s), `
  + `ours ${ourFrames} frames (${ourSec.toFixed(3)}s), `
  + `difference ${((ourSec - refSec) * 1000).toFixed(0)} ms`);

// --- envelopes, because raw correlation measures alignment first -----------
//
// Sample-phase correlation is the wrong first metric for a player that is not
// yet close. These two renders differ in LENGTH by 310 ms, which is a tempo
// difference of about a tenth of a percent; a few samples of drift already
// drives waveform correlation to zero, so it reports ~0.09 whether the notes
// are perfect or nonsense, and it cannot tell those apart.
//
// The amplitude envelope can. RMS over short windows asks "is the same thing
// happening, as loudly, at the same moment" without demanding that the waves
// line up sample for sample — so it keeps working while the pitch, the
// effects and the tempo are still being fixed, and it degrades gracefully
// instead of flooring. Waveform correlation is still reported, at the best
// lag, because it is the metric that matters at the very end.
const WIN = 512;                        // ~11.6 ms at 44.1 kHz

function envelope(x, frames) {
  const n = Math.floor(frames / WIN);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < WIN; k++) { const v = x[i * WIN + k]; s += v * v; }
    e[i] = Math.sqrt(s / WIN);
  }
  return e;
}

/**
 * Best lag (in windows) and its correlation, searched over ±`span`.
 *
 * Returns r = null when neither side varies, which is usually BOTH BEING
 * SILENT — a passage where a soloed track simply does not play. That is
 * agreement, not disagreement, and reporting it as a correlation of -2 (the
 * initial value, as this did at first) puts perfect silence at the top of the
 * worst-segments list and drags the average down with it.
 */
function bestLag(a, b, from, to, span) {
  let best = { lag: 0, r: null };
  for (let lag = -span; lag <= span; lag++) {
    const f = Math.max(from, -lag), t = Math.min(to, b.length - lag, a.length);
    if (t - f < 8) continue;
    let sa = 0, sb = 0, n = 0;
    for (let i = f; i < t; i++) { sa += a[i]; sb += b[i + lag]; n++; }
    const ma = sa / n, mb = sb / n;
    let num = 0, da = 0, db = 0;
    for (let i = f; i < t; i++) {
      const x = a[i] - ma, y = b[i + lag] - mb;
      num += x * y; da += x * x; db += y * y;
    }
    if (da <= 0 || db <= 0) continue;
    const r = num / Math.sqrt(da * db);
    if (best.r === null || r > best.r) best = { lag, r };
  }
  return best;
}

const n = Math.min(ref.frames, ourFrames);
const envRef = envelope(ref.mono, ref.frames);
const envOur = envelope(ours, ourFrames);
const envN = Math.min(envRef.length, envOur.length);

const SPAN = Math.round(0.5 * ref.rate / WIN);        // ±500 ms
const global = bestLag(envRef, envOur, 0, envN, SPAN);
console.log(`    envelope correlation ${global.r === null ? 'n/a' : global.r.toFixed(4)} at lag `
  + `${(global.lag * WIN / ref.rate * 1000).toFixed(0)} ms`);

// Waveform correlation at the best small lag. The reference's resampler reads
// through an eight-sample lead-in (`buffer[(pos >> 16) + 8]`), so its output
// sits a sample or so behind ours — a fixed DSP latency, not a difference in
// the music, and one that costs about 0.05 of correlation if left in. The
// search is deliberately narrow: ±64 samples cannot hide a real timing error,
// which would be hundreds.
let raw = null, rawLag = 0;
for (let lag = -64; lag <= 64; lag++) {
  const from = Math.max(0, -lag), to = Math.min(n, ours.length - lag, ref.frames);
  let sa = 0, sb = 0, m = 0;
  for (let i = from; i < to; i++) { sa += ref.mono[i]; sb += ours[i + lag]; m++; }
  if (m < 1000) continue;
  const ma = sa / m, mb = sb / m;
  let num = 0, da = 0, db = 0;
  for (let i = from; i < to; i++) {
    const x = ref.mono[i] - ma, y = ours[i + lag] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  if (da <= 0 || db <= 0) continue;
  const r = num / Math.sqrt(da * db);
  if (raw === null || r > raw) { raw = r; rawLag = lag; }
}
console.log(`    waveform correlation ${raw === null ? 'n/a' : raw.toFixed(4)} at lag ${rawLag} samples`);

// Per ten seconds: the correlation AND the lag that achieved it. A lag that
// grows steadily is a tempo error; one that jumps is a missed row or a wrong
// pattern length.
const SEG = Math.round(10 * ref.rate / WIN);
const segs = [];
let silent = 0;
for (let i = 0; i + SEG <= envN; i += SEG) {
  const b = bestLag(envRef, envOur, i, i + SEG, SPAN);
  if (b.r === null) { silent++; continue; }   // both sides flat: nothing to score
  segs.push({ t: Math.round(i * WIN / ref.rate), r: b.r, ms: b.lag * WIN / ref.rate * 1000 });
}
const good = segs.filter((s) => s.r > 0.9).length;
const poor = segs.filter((s) => s.r < 0.5).length;
console.log(`    per 10s: ${segs.length} scored, ${good} above 0.9, ${poor} below 0.5`
  + (silent ? `, ${silent} skipped as silent on both sides` : ''));
console.log('    ' + segs.map((s) => `${s.t}s:${s.r.toFixed(2)}@${s.ms.toFixed(0)}ms`).join(' '));
const worst = segs.slice().sort((a, b) => a.r - b.r).slice(0, 5);
console.log(`    worst: ${worst.map((w) => `${w.t}s=${w.r.toFixed(2)}`).join(' ')}`);
if (segs.length > 1) {
  console.log(`    lag drift: ${segs[0].ms.toFixed(0)} ms at the start, `
    + `${segs[segs.length - 1].ms.toFixed(0)} ms at the end — `
    + `${Math.abs(segs[segs.length - 1].ms - segs[0].ms) > 50 ? 'TEMPO DIFFERS' : 'stable'}`);
}

say(Math.abs(ourSec - refSec) < 1.0, 'the two renders are the same length to within a second',
  `${((ourSec - refSec) * 1000).toFixed(0)} ms`);
say(global.r !== null && global.r >= minCorr,
  `envelope correlation is at or above the ratchet of ${minCorr}`,
  global.r === null ? 'n/a' : global.r.toFixed(4));
// The waveform is ratcheted too now that it is meaningful. It was 0.09 when
// this file was written, which is why only the envelope was asserted; at 0.9
// it is the stricter of the two and worth holding on to.
const minWave = Number(flag('--min-wave', '0'));
say(raw !== null && raw >= minWave,
  `waveform correlation is at or above the ratchet of ${minWave}`,
  raw === null ? 'n/a' : raw.toFixed(4));

if (!keep) fs.rmSync(wav, { force: true });
console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
