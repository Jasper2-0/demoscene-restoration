// dbmplayer.js — a DigiBooster Pro 2 replayer, in two halves.
//
// The SEQUENCER half is decidable and checked. Row timing is
// `2.5 * speed / bpm` seconds a row, effect 15 sets speed below 32 and BPM at
// or above it, and effect 7 parameter 1 is the signal that ends a scene — which
// is what drives the whole show, because nothing in the PowerPC code ever sets
// that flag itself (PORT_SPEC §8k). work/re/dbmtime.mjs walks both modules with
// this class and requires the signal ticks to equal the ones showorder.py
// derived, which were pinned by an independent count of scene-driver calls in
// the code: 26 for part one, 13 for part three.
//
// The MIXER half is honest rather than complete. Note triggering, the
// instrument's C-3 frequency, volume, panning, volume envelopes and the DSP
// echo are implemented from the module's own data. The EFFECT SET IS NOT.
// DigiBooster's numbering is NOT ProTracker's — effect 7 is the scene signal
// here, where ProTracker numbering would make it tremolo — so guessing the rest
// from ProTracker would be inventing behaviour, not porting it. Only 7 and 15
// are read, so only 7 and 15 are acted on; `unhandledEffects()` reports what
// each module actually uses so the gap is a measurement rather than a surprise.

/** Row duration in seconds. ProTracker's rule, and DigiBooster keeps it. */
export const rowSeconds = (speed, bpm) => (2.5 / bpm) * speed;

export const SIGNAL_EFFECT = 7;      // parameter 1 = advance the show
export const SPEED_EFFECT = 15;      // < 32 sets ticks per row, >= 32 sets BPM

/**
 * Walk a song's order list row by row.
 *
 * `onRow(cells, ctx)` sees each row's cells before its duration is added, which
 * is the order the original runs in: an effect 15 on a row changes that row's
 * own length.
 */
export class Sequencer {
  constructor(mod, { song = 0, speed = 6, bpm = 125 } = {}) {
    this.mod = mod;
    this.order = mod.songs[song]?.order ?? [];
    this.speed = speed;
    this.bpm = bpm;
  }

  /** -> { signals, rows, seconds }. `onRow` is optional. */
  run(onRow) {
    const { mod } = this;
    const channels = mod.info?.channels ?? 0;
    const signals = [];
    let absRow = 0, t = 0;
    for (let oi = 0; oi < this.order.length; oi++) {
      const pat = mod.patterns[this.order[oi]];
      if (!pat) continue;
      for (let r = 0; r < pat.rows; r++) {
        const cells = pat.cells.slice(r * channels, (r + 1) * channels);
        for (const cell of cells) {
          if (!cell) continue;
          for (const [e, v] of [[cell.effect1, cell.param1],
            [cell.effect2, cell.param2]]) {
            if (e === SPEED_EFFECT && v) {
              if (v < 32) this.speed = v; else this.bpm = v;
            } else if (e === SIGNAL_EFFECT && v === 1) {
              signals.push({
                order: oi, pattern: this.order[oi], patternRow: r,
                row: absRow + r, seconds: t, ticks50: Math.round(t * 50),
              });
            }
          }
        }
        if (onRow) onRow(cells, { order: oi, row: r, absRow: absRow + r, seconds: t, speed: this.speed, bpm: this.bpm });
        t += rowSeconds(this.speed, this.bpm);
      }
      absRow += pat.rows;
    }
    return { signals, rows: absRow, seconds: t };
  }
}

/** Which effects a module uses, and which of them this file acts on. */
export function unhandledEffects(mod) {
  const used = new Map();
  for (const pat of mod.patterns) {
    for (const cell of pat.cells) {
      if (!cell) continue;
      for (const e of [cell.effect1, cell.effect2]) {
        if (e) used.set(e, (used.get(e) ?? 0) + 1);
      }
    }
  }
  const known = new Set([SIGNAL_EFFECT, SPEED_EFFECT]);
  return {
    used: Object.fromEntries([...used].sort((a, b) => a[0] - b[0])),
    unhandled: [...used.keys()].filter((e) => !known.has(e)).sort((a, b) => a - b),
  };
}

// --- the DSP echo -----------------------------------------------------------
//
// PORT_SPEC §8j: `DSPE` is a channel count, one enable byte per channel, then
// delay, feedback, mix and cross. Both modules run cross at 255, which is full
// left/right ping-pong — an audible, specific character rather than a subtle
// tail, and the reason this cannot be deferred to "later".
//
// The parameter units are DigiBooster's, not seconds and not a fraction:
// delay is in milliseconds, and feedback, mix and cross are 0..255. The one
// documented original bug — delay 0 giving about 334 ms rather than the minimum
// — does not bite here, because neither module uses 0; the guard is kept anyway
// so a port fed a different module behaves like the original rather than
// dividing by nothing.

export class Echo {
  constructor({ delay, feedback, mix, cross }, sampleRate) {
    const ms = delay === 0 ? 334 : delay;
    this.n = Math.max(1, Math.round((ms / 1000) * sampleRate));
    this.bufL = new Float32Array(this.n);
    this.bufR = new Float32Array(this.n);
    this.p = 0;
    this.feedback = feedback / 255;
    this.wet = mix / 255;
    this.cross = cross / 255;
  }

  /** In place, one stereo frame at a time. */
  process(l, r) {
    const dl = this.bufL[this.p], dr = this.bufR[this.p];
    // Cross feeds each side's delay from the OTHER side. At cross = 1 the taps
    // swap outright, which is the ping-pong; at 0 the two delays are independent.
    const inL = l + (dr * this.cross + dl * (1 - this.cross)) * this.feedback;
    const inR = r + (dl * this.cross + dr * (1 - this.cross)) * this.feedback;
    this.bufL[this.p] = inL;
    this.bufR[this.p] = inR;
    this.p = (this.p + 1) % this.n;
    return [l + dl * this.wet, r + dr * this.wet];
  }
}

// --- playback ---------------------------------------------------------------

/** DigiBooster note numbers are 1-based semitones; 1 is C-1, so C-3 is 25. */
const C3_NOTE = 25;
const noteHz = (note, c3) => c3 * 2 ** ((note - C3_NOTE) / 12);

/**
 * Render a module to interleaved stereo Float32.
 *
 * This is a straightforward mixer over the sequencer above: each row triggers
 * notes, each channel steps through its sample at the instrument's own rate,
 * and the echo runs over the sum. It reproduces the module's NOTES and TIMING,
 * which is what the sequencer check guarantees, and not its dynamics — see the
 * effect note at the top of the file.
 */
export function render(mod, { sampleRate = 48000, seconds = null, song = 0 } = {}) {
  const nch = mod.info?.channels ?? 0;
  const seq = new Sequencer(mod, { song });
  const rows = [];
  const total = seq.run((cells, ctx) => rows.push({ cells, ...ctx }));
  const length = Math.ceil((seconds ?? total.seconds) * sampleRate);
  const out = new Float32Array(length * 2);
  const echo = mod.echo ? new Echo(mod.echo, sampleRate) : null;
  const enabled = mod.echo?.enabled ?? [];

  const voices = Array.from({ length: nch }, (_, i) => ({
    sample: null, pos: 0, step: 0, vol: 1,
    // Panning is signed in INST; the module's own value is the default, and a
    // channel with no instrument yet sits centred.
    pan: 0.5, echo: !!enabled[i],
  }));

  let cursor = 0;
  for (let i = 0; i < rows.length; i++) {
    const { cells, speed, bpm } = rows[i];
    for (let c = 0; c < nch; c++) {
      const cell = cells[c];
      if (!cell) continue;
      const v = voices[c];
      if (cell.instrument) {
        const inst = mod.instruments[cell.instrument - 1];
        if (inst) {
          v.inst = inst;
          v.sample = mod.samples[inst.sample - 1] ?? null;
          v.vol = Math.min(inst.volume, 64) / 64;
          v.pan = Math.min(Math.max((inst.panning + 128) / 255, 0), 1);
        }
      }
      if (cell.note && v.inst && v.sample?.data) {
        v.pos = 0;
        v.step = noteHz(cell.note, v.inst.frequency) / sampleRate;
      }
    }
    const frames = Math.round(rowSeconds(speed, bpm) * sampleRate);
    for (let f = 0; f < frames && cursor < length; f++, cursor++) {
      let dryL = 0, dryR = 0, wetL = 0, wetR = 0;
      for (const v of voices) {
        if (!v.sample?.data || !v.step) continue;
        const idx = Math.floor(v.pos);
        if (idx >= v.sample.frames) {
          const loopLen = v.inst?.loopLength ?? 0;
          if (loopLen > 0) v.pos = (v.inst.loopStart ?? 0) + (v.pos - idx);
          else { v.step = 0; continue; }
        }
        // 8-bit signed frames, as the generator's emitter writes them.
        const s = (v.sample.data[Math.floor(v.pos)] / 128) * v.vol;
        v.pos += v.step;
        const l = s * (1 - v.pan), r = s * v.pan;
        if (v.echo) { wetL += l; wetR += r; } else { dryL += l; dryR += r; }
      }
      let [el, er] = echo ? echo.process(wetL, wetR) : [wetL, wetR];
      out[cursor * 2] = (dryL + el) / Math.max(1, nch / 4);
      out[cursor * 2 + 1] = (dryR + er) / Math.max(1, nch / 4);
    }
  }
  return { pcm: out, sampleRate, seconds: total.seconds, signals: total.signals };
}
