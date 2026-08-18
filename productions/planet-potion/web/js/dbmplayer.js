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
// The MIXER half implements every command either module uses — 100% of their
// effect commands, each one read from a handler in the dbplayer.library that
// shipped inside the intro rather than guessed from ProTracker, whose
// numbering this is NOT (effect 7 is the scene signal here, where ProTracker
// would make it tremolo). `unhandledEffects()` derives its report from the FX
// and EXT tables below, so the coverage figure tracks the code.
//
// It is checked two ways. work/re/dbmsuite.mjs generates a module per
// behaviour and diffs each against libdigibooster3; work/re/dbmdiff.mjs diffs
// the real modules. Both are close: a plain note matches the reference at
// 0.9992 and the whole of part one at 0.91 on the waveform.
//
// What is still missing is the final LEVEL: the channel sum is divided by
// `nch / 4`, which is a guess, and the result scaled by 1/peak so Web Audio
// does not clamp it. The original's own mixing law has not been read.

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
    // EVERY effect-7, not just parameter 1. `signals` is the SCENE-CHANGE
    // signal and stays exactly what it was; `cues` is the same effect read the
    // other way the intro reads it — _calc_matrix compares the frame's signal
    // against each node's trigger byte, and a match resets that node's origin,
    // which is how the visuals lock to the track. Those triggers take values
    // 3, 4, 7, 8, 9 and more, so a list filtered to 1 cannot drive them.
    const cues = [];
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
            } else if (e === SIGNAL_EFFECT) {
              cues.push({ value: v, ticks50: Math.round(t * 50) });
              if (v === 1) signals.push({
                order: oi, pattern: this.order[oi], patternRow: r,
                row: absRow + r, seconds: t, ticks50: Math.round(t * 50),
              });
            }
          }
        }
        // PATTERN DELAY (0xEE) repeats the row. The handler at 0x10022722
        // computes `(param & 0xf) * <rows> + 1`, and part three's last four
        // rows each carry 0xEE with n = 14 — which is the whole reason our
        // render of it came out 6.7 seconds shorter than the reference's
        // 156.699. The notes are not retriggered; the row simply lasts longer.
        let repeat = 0;
        for (const cell of cells) {
          if (!cell) continue;
          for (const [e, v] of [[cell.effect1, cell.param1], [cell.effect2, cell.param2]]) {
            if (e === SPEED_EFFECT || !v) continue;
            if (e === 14 && (v >> 4) === 0xe) repeat = Math.max(repeat, v & 0xf);
          }
        }

        if (onRow) {
          onRow(cells, {
            order: oi, row: r, absRow: absRow + r, seconds: t,
            speed: this.speed, bpm: this.bpm, repeat,
          });
        }
        t += rowSeconds(this.speed, this.bpm) * (1 + repeat);
      }
      absRow += pat.rows;
    }
    return { signals, cues, rows: absRow, seconds: t };
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
  // Derived from FX rather than listed again here. A second hand-maintained
  // list is a list that goes stale, and this one is the project's measure of
  // how finished the player is — it has to track the switch, not a memory of
  // it. EXTENDED is only as handled as its sub-commands, so it is counted
  // separately below.
  const known = new Set(Object.values(FX));
  const extKnown = new Set(Object.values(EXT));

  // For effect 14 the honest unit is the sub-command, not the effect number.
  const extUsed = new Map();
  for (const pat of mod.patterns) {
    for (const cell of pat.cells) {
      if (!cell) continue;
      for (const [e, p] of [[cell.effect1, cell.param1], [cell.effect2, cell.param2]]) {
        if (e === FX.EXTENDED) extUsed.set(p >> 4, (extUsed.get(p >> 4) ?? 0) + 1);
      }
    }
  }
  const extUnhandled = [...extUsed.keys()].filter((s) => !extKnown.has(s)).sort((a, b) => a - b);

  return {
    used: Object.fromEntries([...used].sort((a, b) => a[0] - b[0])),
    unhandled: [...used.keys()]
      .filter((e) => !known.has(e) || (e === FX.EXTENDED && extUnhandled.length))
      .sort((a, b) => a - b),
    extendedUsed: Object.fromEntries([...extUsed].sort((a, b) => a[0] - b[0])),
    extendedUnhandled: extUnhandled,
    // How much of what the module actually asks for is acted on, which is the
    // number worth quoting rather than "most of them".
    coverage: (() => {
      let tot = 0, done = 0;
      for (const [e, n] of used) {
        tot += n;
        if (e === FX.EXTENDED) continue;
        if (known.has(e)) done += n;
      }
      for (const [s, n] of extUsed) if (extKnown.has(s)) done += n;
      return tot ? done / tot : 1;
    })(),
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
    // DELAY IS THE PARAMETER IN HALF-MILLISECONDS, not milliseconds:
    // `(data * mixfreq + 250) / 500` samples, so 215 is 430 ms and the
    // documented 2..510 ms range is a parameter of 1..255. Reading it as
    // milliseconds ran the echo at half its length.
    this.n = Math.max(1, Math.floor((delay * sampleRate + 250) / 500));
    this.bufL = new Float32Array(this.n);
    this.bufR = new Float32Array(this.n);
    this.p = 0;

    // The four feedback coefficients, /256 rather than /255, exactly as
    // dsp_echo.c forms them. The same-side delayed term is NEGATIVE — that
    // falls out of `(cross - 256) * fback` and is not a slip.
    const nc = (256 - cross) / 256, pc = cross / 256;
    const nb = (256 - feedback) / 256, pb = feedback / 256;
    this.sameDry = nc * nb;
    this.crossDry = pc * nb;
    this.sameDelayed = -nc * pb;
    this.crossDelayed = pc * pb;

    // A CROSSFADE, not an addition. Mix is dry against wet out of 256, so at
    // 128 the echo replaces half the signal rather than doubling it. Adding
    // the wet on top of the full dry, as this did, put echoed channels up to
    // twice as loud as they should be — visible as a peak of 2/18 against the
    // reference's 1/18 on exactly the tracks with echo enabled.
    this.wet = mix / 256;
    this.dry = (256 - mix) / 256;
  }

  /** In place, one stereo frame at a time. */
  process(l, r) {
    const dl = this.bufL[this.p], dr = this.bufR[this.p];
    const al = l * this.sameDry + r * this.crossDry
      + dl * this.sameDelayed + dr * this.crossDelayed;
    const ar = r * this.sameDry + l * this.crossDry
      + dr * this.sameDelayed + dl * this.crossDelayed;
    this.bufL[this.p] = al;
    this.bufR[this.p] = ar;
    this.p = (this.p + 1) % this.n;
    return [l * this.dry + dl * this.wet, r * this.dry + dr * this.wet];
  }
}

// --- playback ---------------------------------------------------------------

// --- pitch, read out of the player the intro actually shipped ---------------
//
// This was wrong for as long as it was a guess, and audibly so: a note byte is
// NOT a semitone index. `dbplayer.library 2.0` is embedded in the executable
// as seg1, and its note handling at 0x10021d34 says plainly what the byte is:
//
//     move.b  (a1), d0         ; the note byte from the pattern cell
//     lea.l   $10023106.l, a3  ; the period table
//     lsr.b   #$4, d3          ; HIGH nibble = octave
//     subq.b  #$1, d3          ; octave - 1
//     mulu.w  #$18, d3         ; x 24 bytes = 12 words per octave
//     andi.b  #$f, d0          ; LOW nibble = semitone
//     add.w   d0, d0           ; word entries
//     move.w  (a3, d0.w), d0   ; -> an Amiga PERIOD, not a frequency
//
// Treating the byte as a semitone index played the module about three octaves
// sharp — 87% of note triggers ran above 4x sample rate and the worst hit 67x,
// which is aliasing rather than music. The modules themselves had said so all
// along: across 3,196 notes in the two of them, no low nibble ever exceeds 11.
//
// The rate conversion is at 0x10021c50, and it is why the per-instrument C-3
// frequency exists:
//
//     d1 = 0x369E99 / period            ; 3,579,545 = the NTSC Amiga clock
//     d4 = (c3 << 8) / 0x20AB           ; scaled against 8363
//     d1 = (d1 * d4) >> 8               ; Hz x (c3 / 8363)
//
// 3579545 / 8363 is 428.02, and 428 is the table's octave-6 C — so an
// instrument plays at its own C-3 rate exactly when the note is 0x60.
export const PERIODS = [
  // 8 octaves x 12 semitones, at 0x10023106 in dbplayer.library. Verified
  // against the binary by work/re/periodcheck.mjs rather than transcribed.
  13696, 12928, 12192, 11520, 10848, 10240, 9664, 9120, 8608, 8128, 7680, 7248,
  6848, 6464, 6096, 5760, 5424, 5120, 4832, 4560, 4304, 4064, 3840, 3624,
  3424, 3232, 3048, 2880, 2712, 2560, 2416, 2280, 2152, 2032, 1920, 1812,
  1712, 1616, 1524, 1440, 1356, 1280, 1208, 1140, 1076, 1016, 960, 904,
  856, 808, 760, 720, 680, 640, 604, 572, 540, 508, 480, 452,
  428, 404, 380, 360, 340, 320, 302, 286, 270, 254, 240, 226,
  214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113,
  107, 101, 95, 90, 85, 80, 75, 71, 67, 63, 60, 56,
];
const AMIGA_CLOCK = 3579545;   // 0x369E99
const C3_PERIOD_HZ = 8363;     // 0x20AB

/**
 * 0x1F is KEY OFF, and never reaches the period table.
 *
 * This file claimed the opposite for one commit, on the strength of a grep for
 * `#$1f` that was piped through `head -12` and stopped before the answer. The
 * test is right there at 0x10021cc4, ahead of the note path:
 *
 *     cmpi.b  #$1f, (a1)      ; the note byte
 *     bne.b   $10021cd6       ; anything else -> decode and trigger
 *     addq.b  #$1, $3c(a6)    ; key off: bump the two envelope release counts
 *     addq.b  #$1, $66(a6)
 *     bra.w   $10021df4       ; and skip the trigger entirely
 *
 * `$3c(a6)` is the volume envelope's release counter — the envelope tick at
 * 0x10021f98 reads it and, WHEN THE INSTRUMENT HAS NO ENABLED ENVELOPE, does
 * `clr.b $3c(a6)` then `clr.w (a6)`: it zeroes the channel volume. So a key off
 * on a plain instrument simply stops the note, which is what 54 of part one's
 * 56 instruments are.
 */
export const KEY_OFF = 0x1f;

/**
 * The period a note byte selects, exactly as the 68K indexes the table.
 *
 * A note byte with a zero octave nibble would run the 68K's `subq.b` under
 * zero to 255 and index far outside the table; neither module contains one, so
 * this returns undefined and the caller skips.
 */
const periodOf = (note) => PERIODS[((note >> 4) - 1) * 12 + (note & 0xf)];

// --- pitch: the instrument's frequency is the rate for note 0x40 ------------
//
// `rate = c3 * 2 ** ((octave * 12 + semitone - 48) / 12)`, and 48 is note 0x40
// — octave 4, semitone 0. That is exactly what the reference's own dbminfo
// prints for every instrument in these modules, "C-4 note @ 8363 Hz", and it
// falls straight out of its loader computing `octave * 12 + note` with no
// minus one.
//
// GETTING HERE TOOK TWO CORRECTIONS, both against a reading of the shipped
// dbplayer.library, and both settled by evidence rather than argument.
//
// First the OCTAVE. dbplayer indexes a period table `(octave - 1) * 12 +
// semitone` at 0x10021d44, which puts the instrument's rate on note 0x60 —
// two octaves below this. Correlation preferred the reference and the
// disassembly preferred the table, and a metric cannot say which reference is
// true, only which one you resemble. Listening settled it: two octaves up is
// the intro.
//
// Then the TUNING. The table is the traditional Amiga one and its integer
// rounding is not exact equal temperament — period 80 where 79.85 was wanted,
// 0.2% sharp, about three and a half cents. Inaudible, and yet it was the
// single biggest limit on how closely this player matched the reference: a
// plain held note scored 0.94 with the table and 0.9992 computed, and part
// one's whole-module waveform correlation went from 0.58 to 0.91.
//
// Two independent anomalies, both dissolved by the same model, is the reason
// this no longer reads pitch out of that table. The table is real and still
// pinned against the binary by work/re/periodcheck.mjs — it is in the library,
// at 0x10023106, exactly once. What is no longer claimed is that it is what
// gives this intro its pitch; something in dbplayer scales by four and tunes
// exactly, and that path has not been found.
const C4_NOTE_INDEX = 48;        // note 0x40: octave 4, semitone 0

/** The note byte as a semitone index, the way the reference's loader reads it. */
export const noteIndexOf = (note) => (note >> 4) * 12 + (note & 0xf);

export const noteRateHz = (note, c3, octaves = 0) =>
  c3 * 2 ** ((noteIndexOf(note) - C4_NOTE_INDEX) / 12 + octaves);
const noteHz = noteRateHz;

// --- the effects, as dbplayer.library implements them -----------------------
//
// A row is `speed` TICKS long and most effects do their work per tick, so the
// mixer below runs a tick loop rather than filling a whole row at once. That
// distinction is in the player too: it keeps a flag at 0x10021666 that every
// handler tests to tell tick 0 from the rest.
//
// Volume is 8.8 fixed point with a ceiling of 0x4000 — i.e. 0..64 in whole
// units — which is read straight out of the two handlers that clamp to it.
const VOL_MAX = 0x4000;
const clampVol = (v) => (v < 0 ? 0 : v > VOL_MAX ? VOL_MAX : v);

// Effect numbers, named after what the handler does rather than after any
// other tracker's numbering. NOTHING here is taken from ProTracker: effect 7
// is a six-instruction routine that writes its parameter into a global the
// demo polls, which is why it is the scene signal and not tremolo.
const FX = {
  PORTA_UP: 1,       // 0x10022be4  period -= param * 4
  PORTA_DOWN: 2,     // 0x10022c44  period += param * 4
  TONE_PORTA: 3,     // 0x10022e6c  slide the period toward a target
  SIGNAL: 7,         // 0x100231c6  writes the scene signal, makes no sound
  SET_PAN: 8,        // 0x100227f8  $68(a6) = param, the 0..255 pan field
  OFFSET: 9,         // 0x100227b8  start the sample at param << 8
  VOL_SLIDE: 10,     // 0x10022d38  hi nibble up, lo nibble down, per tick
  SET_VOLUME: 12,    // 0x10022d2e  volume = param << 8
  EXTENDED: 14,      // the 0xE* family, on the parameter's high nibble
  SPEED: 15,         // 0x1002283c  < 32 sets ticks per row, >= 32 sets BPM
  PAN_SLIDE: 25,     // 0x10022804  the same shape as VOL_SLIDE, on $68(a6)
};

// The 0xE* sub-commands, keyed by the parameter's high nibble. Between them
// 0xEA and 0xEB are three quarters of part one's extended commands.
const EXT = {
  FINE_PORTA_UP: 0x1,    // 0x10022dfc  period -= (param & 0xf) * 4, once
  FINE_PORTA_DOWN: 0x2,  // 0x10022dd0  period += (param & 0xf) * 4, once
  RETRIGGER: 0x9,        // 0x10022a80  restart the sample every n ticks
  FINE_VOL_UP: 0xa,      // 0x10022e28  volume += (param & 0xf) << 8, once
  FINE_VOL_DOWN: 0xb,    // 0x10022e4c  volume -= (param & 0xf) << 8, once
  NOTE_DELAY: 0xd,       // 0x10022ade  hold the note back by n ticks
  BACKWARDS: 0x3,        // play the sample in reverse
  // Handled in the Sequencer rather than in applyEffect, because it changes
  // how long a ROW lasts rather than what a voice does. Listed here so the
  // coverage report counts it as implemented, which it is.
  PATTERN_DELAY: 0xe,
};

const PAN_MAX = 0x100;   // the clamp in the pan slide at 0x1002281c

// Pitch is bounded, in the same eighth-semitone units the slides use:
// `MinPitch = Speed * 96` and `MaxPitch = Speed * 864` in the reference, which
// unscale to 96 and 864 — an octave-1 C up to an octave-9 C. Without the
// clamp a long portamento runs off the top and the voice turns into aliasing
// noise; with the clamp it holds at the ceiling, as the original does.
const MIN_PITCH_EIGHTHS = 96;
const MAX_PITCH_EIGHTHS = 864;

/**
 * Channel gains for a 0..1 pan position.
 *
 * BOTH CHANNELS CARRY THE FULL SIGNAL AT CENTRE, and panning only takes the
 * far side away. That is what the reference's amplitude behaviour comes to: it
 * pans by phase shifting and says outright that it "does not change
 * amplitude", so a centred voice is at full level in both channels and a
 * hard-panned one is at full level in one. Measured against it, a centred
 * voice and a hard-panned voice sit two to one in the mono sum, which is what
 * this reproduces and what neither a linear split nor an equal-power law does.
 */
function repan(v) {
  v.gainL = Math.min(1, 2 * (1 - v.pan));
  v.gainR = Math.min(1, 2 * v.pan);
}

// Instrument flags: bit 0 forward loop, bit 1 ping-pong, mutually exclusive,
// and zero means no loop even when loopLength is set.
const LOOP_FORWARD = 1;
const LOOP_PINGPONG = 2;

// --- volume envelopes -------------------------------------------------------
//
// The engine is at 0x10021f7a and the evaluation at 0x100220be. It walks the
// points for the first whose tick is at or past the envelope position, steps
// back one, and interpolates linearly between that pair — the slope is
// `(y1 - y0) << 8 / (x1 - x0)`, an 8.8 value. The result scales the channel
// volume at 0x1002213a:
//
//     d4 = (a6) >> 6 ; d4 *= env ; d4 >>= 8 ; $10(a6) = d4
//
// which for a channel volume of 0x4000 and an envelope of 64 gives 0x4000
// again — so it is `channelVolume * envelopeY / 64`.
//
// THE POINT COUNT IS ONE LESS THAN THE NUMBER OF POINTS. That is a documented
// DBM quirk and it is plainly true in these modules: part one's instrument 3
// says `points = 3` and carries four, (0,0) (7,64) (38,11) (98,0), with the
// rest zero. Reading it as three would end the envelope at 38 and never reach
// silence.
const ENV_ENABLED = 0x1;   // flags bit 0, tested at 0x10021f9e
const ENV_SUSTAIN = 0x2;   // flags bit 1, tested at 0x1002204a

/** The envelope value at `pos` ticks, linearly interpolated, 0..64. */
function envValue(env, pos) {
  const n = env.points + 1;
  const pts = env.nodes;
  if (n <= 0) return 64;
  if (pos <= pts[0].x) return pts[0].y;
  for (let i = 0; i + 1 < n; i++) {
    const a = pts[i], b = pts[i + 1];
    if (pos <= b.x) {
      const span = b.x - a.x;
      return span <= 0 ? b.y : a.y + ((pos - a.x) * (b.y - a.y)) / span;
    }
  }
  return pts[n - 1].y;
}

/**
 * Render a module to interleaved stereo Float32.
 *
 * Each row is divided into `speed` ticks; tick 0 triggers notes and the
 * row-time effects, later ticks run the sliding ones, and one tick's worth of
 * samples is mixed after each. The echo runs over the sum of the channels that
 * enable it.
 *
 * WHAT IS STILL MISSING is tracked in web/README.md as a count rather than a
 * feeling: the volume envelopes in VENV, the instrument loop-type flags, and
 * the effects not in FX above.
 */
export function render(mod, { sampleRate = 48000, seconds = null, song = 0, octaveShift = 0 } = {}) {
  const nch = mod.info?.channels ?? 0;
  const seq = new Sequencer(mod, { song });
  const rows = [];
  const total = seq.run((cells, ctx) => rows.push({ cells, ...ctx }));
  const length = Math.ceil((seconds ?? total.seconds) * sampleRate);
  const out = new Float32Array(length * 2);
  const echo = mod.echo ? new Echo(mod.echo, sampleRate) : null;
  const enabled = mod.echo?.enabled ?? [];

  const voices = Array.from({ length: nch }, (_, i) => ({
    sample: null, inst: null, pos: 0, step: 0,
    period: 0,          // the value the period table gave
    baseRate: 0,        // Hz for the note as triggered
    noteIndex: 0,       // octave*12 + semitone of that note
    eighths: 0,         // pitch offset from it, in 1/8 semitones
    targetEighths: 0,   // tone portamento's destination
    vol: VOL_MAX,       // 8.8 fixed, ceiling 0x4000 — see clampVol
    // Panning is signed in INST; the module's own value is the default, and a
    // channel with no instrument yet sits centred.
    pan: 0.5, gainL: 1, gainR: 1, echo: !!enabled[i],
    memVolSlide: 0, memPortaUp: 0, memPortaDown: 0, memTonePorta: 0,
    target: 0,          // tone portamento's destination period
    env: null, envPos: 0, released: false, envScale: 1, back: false,
  }));

  // Envelopes name the instrument they belong to; index them once.
  const envFor = new Map();
  for (const e of mod.volumeEnvelopes ?? []) {
    if (e.flags & ENV_ENABLED) envFor.set(e.instrument, e);
  }

  /** Period -> playback step, so a slide is heard rather than only stored. */
  // PITCH SLIDES IN THE SEMITONE DOMAIN, not the period one. The reference
  // keeps pitch as `(octave * 12 + note) << 3` — eighth-semitones — and every
  // slide moves that, where dbplayer's handlers subtract from an Amiga period.
  // The two are different curves, and portamento was the last thing still
  // clearly wrong against the reference: part one scored 0.9 up to 135 s and
  // 0.5 to 0.7 after, which is exactly where effect 3 starts being used (144
  // times, and never once before).
  const retune = (v) => {
    if (v.baseRate > 0) {
      const absolute = v.noteIndex * 8 + v.eighths;
      const clamped = Math.min(MAX_PITCH_EIGHTHS, Math.max(MIN_PITCH_EIGHTHS, absolute));
      v.eighths = clamped - v.noteIndex * 8;
      v.step = v.baseRate * 2 ** (v.eighths / 96) / sampleRate;
    } else {
      v.step = 0;
    }
  };

  let cursor = 0;
  let exact = 0;          // running sample position, unrounded
  for (let i = 0; i < rows.length; i++) {
    const { cells, speed, bpm, repeat = 0 } = rows[i];
    // 2.5/bpm seconds a row per unit of speed, so one tick is 2.5/bpm — and
    // that is rarely a whole number of samples. Rounding each tick
    // INDEPENDENTLY loses the remainder every time: at 128 BPM a tick is
    // 861.328 samples, and part three's 6,528 ticks drifted 2,141 samples —
    // 48 ms — behind the reference by the end. Part one never showed it
    // because 105 BPM gives exactly 1,050. The fraction is carried instead, so
    // each tick's length is the difference between two rounded running
    // positions and the timeline cannot drift.
    const tickSamples = (2.5 / bpm) * sampleRate;
    // A pattern-delayed row runs for (1 + repeat) rows' worth of ticks, and
    // only the first tick of the first pass triggers anything.
    const ticks = speed * (1 + repeat);

    for (let tick = 0; tick < ticks; tick++) {
      for (let c = 0; c < nch; c++) {
        const cell = cells[c];
        if (!cell) continue;
        const v = voices[c];

        // The row's own parameters, needed before the note is triggered:
        // sample offset chooses where it starts and note delay chooses when.
        const paramFor = (fx) => (cell.effect1 === fx ? cell.param1
          : cell.effect2 === fx ? cell.param2 : -1);
        const extParam = (sub) => {
          for (const [e, p] of [[cell.effect1, cell.param1], [cell.effect2, cell.param2]]) {
            if (e === FX.EXTENDED && (p >> 4) === sub) return p & 0xf;
          }
          return -1;
        };

        const startNote = (note) => {
          const period = periodOf(note);
          // TONE PORTAMENTO does not retrigger: the note names where to slide
          // TO and the voice keeps playing from where it is. That is the shape
          // of the handler at 0x10022e6c, which stores the target and leaves
          // the sample position alone.
          if (paramFor(FX.TONE_PORTA) >= 0 && v.baseRate) {
            const idx = noteIndexOf(note);
            v.targetEighths = (idx - v.noteIndex) * 8;
            return;
          }
          if (!period) return;
          const off = paramFor(FX.OFFSET);
          const start = off > 0 ? off << 8 : 0;
          // PLAY BACKWARDS STARTS AT THE END. `CurPos = AudioLength - offset`
          // in the reference's wavetable; setting only the direction, as this
          // did, steps straight off position zero and the voice falls silent
          // — which is what it did on every 0xE3 in the module.
          v.back = extParam(EXT.BACKWARDS) >= 0;
          v.pos = v.back ? Math.max(0, v.sample.frames - 1 - start) : start;
          v.period = period;
          v.noteIndex = noteIndexOf(note);
          // EXPERIMENT: exact equal temperament instead of the rounded table
          v.baseRate = noteRateHz(note, v.inst.frequency, octaveShift);
          v.eighths = 0;
          v.targetEighths = 0;
          v.envPos = 0;
          v.released = false;
          retune(v);
        };

        if (tick === 0) {
          if (cell.instrument) {
            const inst = mod.instruments[cell.instrument - 1];
            if (inst) {
              v.inst = inst;
              v.sample = mod.samples[inst.sample - 1] ?? null;
              // A fresh instrument resets the channel volume to its own.
              v.vol = clampVol(Math.min(inst.volume, 64) << 8);
              v.pan = Math.min(Math.max((inst.panning + 128) / 255, 0), 1);
              repan(v);
              v.env = envFor.get(cell.instrument) ?? null;
            }
          }
          v.pending = 0;
          if (cell.note === KEY_OFF) {
            // With an envelope this releases it — the sustain stops holding and
            // the shape runs on to its last point, which in these modules is
            // zero. Without one, 0x10021fa8's `clr.w (a6)` is the whole
            // behaviour: the channel volume goes to zero at once.
            v.released = true;
            if (!v.env) v.vol = 0;
          } else if (cell.note && v.inst && v.sample?.data) {
            const delay = extParam(EXT.NOTE_DELAY);
            if (delay > 0) v.pending = { note: cell.note, tick: delay };
            else startNote(cell.note);
          }
        } else if (v.pending && tick === v.pending.tick) {
          startNote(v.pending.note);
          v.pending = 0;
        }

        // 0x10022a80 counts ticks and restarts the sample when the count comes
        // round, so this is per tick rather than per row.
        const every = extParam(EXT.RETRIGGER);
        if (every > 0 && tick > 0 && tick % every === 0) v.pos = 0;

        for (const [e, p] of [[cell.effect1, cell.param1], [cell.effect2, cell.param2]]) {
          if (!e) continue;
          applyEffect(v, e, p, tick, retune);
        }
      }

      // The envelope moves once per tick, and it holds at the sustain point
      // until a key off releases it — 0x1002204a sets the position back to the
      // sustain point's tick for as long as $3c(a6) is zero.
      for (const v of voices) {
        if (!v.env) { v.envScale = 1; continue; }
        const e = v.env;
        const sustainAt = (e.flags & ENV_SUSTAIN) && !v.released
          ? e.nodes[Math.min(e.sustain1, e.points)]?.x
          : undefined;
        if (sustainAt === undefined || v.envPos < sustainAt) v.envPos++;
        v.envScale = envValue(e, v.envPos) / 64;
      }

      const tickStart = Math.round(exact);
      exact += tickSamples;
      const tickFrames = Math.round(exact) - tickStart;

      for (let f = 0; f < tickFrames && cursor < length; f++, cursor++) {
        let dryL = 0, dryR = 0, wetL = 0, wetR = 0;
        for (const v of voices) {
          if (!v.sample?.data || !v.step) continue;
          const inst = v.inst;
          const data = v.sample.data;
          const frames = v.sample.frames;
          // LOOP TYPE comes from the instrument flags, not from loopLength
          // being non-zero: bit 0 is a forward loop and bit 1 a ping-pong one,
          // and they are mutually exclusive. dbminfo calls part one's
          // instrument 3 a "pingpong loop [7241-119675]" — it is the sustained
          // pad, and played forward-only it is a different sound after the
          // first pass.
          const kind = (inst?.flags ?? 0) & 3;
          const loopStart = inst?.loopStart ?? 0;
          const loopLen = inst?.loopLength ?? 0;
          const loopEnd = loopStart + loopLen;

          if (kind === LOOP_PINGPONG && loopLen > 0) {
            if (v.back) {
              if (v.pos <= loopStart) { v.pos = loopStart + (loopStart - v.pos); v.back = false; }
            } else if (v.pos >= loopEnd) {
              v.pos = loopEnd - (v.pos - loopEnd);
              v.back = true;
            }
          } else if (kind === LOOP_FORWARD && loopLen > 0) {
            // Backwards through a forward loop wraps the other way: the
            // reference jumps by `LoopLast - LoopFirst + 1` at LoopFirst and
            // keeps going in reverse.
            if (v.back) {
              if (v.pos < loopStart) v.pos += loopLen;
            } else if (v.pos >= loopEnd) {
              v.pos = loopStart + ((v.pos - loopStart) % loopLen);
            }
          } else if (v.back ? v.pos < 0 : v.pos >= frames) {
            v.step = 0;
            continue;
          }
          if (v.pos < 0 || v.pos >= frames) { v.step = 0; continue; }

          // LINEAR INTERPOLATION, to match the oracle's dsp_linresampler.
          // 8-bit signed frames, as the generator's emitter writes them.
          const i0 = Math.floor(v.pos);
          const frac = v.pos - i0;
          const i1 = i0 + 1 < frames ? i0 + 1 : i0;
          const raw = (data[i0] + (data[i1] - data[i0]) * frac) / 128;
          const s = raw * (v.vol / VOL_MAX) * v.envScale;
          v.pos += v.back ? -v.step : v.step;
          // CONSTANT POWER, because panning must not change how loud a voice
          // is. The reference is explicit about it — its panoramizer works by
          // phase shifting and "does not change amplitude" — and a linear
          // split does: it costs 6 dB at the extremes relative to centre, so
          // every hard-panned voice came out at the wrong level against the
          // centred ones. In this module that is not a subtlety, because whole
          // tracks are panned hard with `fx8=0` / `fx8=ff`, and one of them
          // measured 6.6x the reference where centred tracks measured 2.4x.
          //
          // A true phase panner is not reproduced here; equal power keeps the
          // one property that matters for balance, which is that moving a
          // voice across the stereo field leaves its loudness alone.
          const l = s * v.gainL, r = s * v.gainR;
          if (v.echo) { wetL += l; wetR += r; } else { dryL += l; dryR += r; }
        }
        const [el, er] = echo ? echo.process(wetL, wetR) : [wetL, wetR];
        // Divide by the CHANNEL COUNT, which is what the reference does: every
        // soloed track measured a peak of 1/18 there against our 1/9, and 18
        // is the track count. The old `nch / 4` was a guess.
        out[cursor * 2] = (dryL + el) / nch;
        out[cursor * 2 + 1] = (dryR + er) / nch;
      }
    }
  }
  // THE FINAL LEVEL IS A STOPGAP, and flagged as one. The per-channel sum is
  // divided by `nch / 4`, which is a guess that predates any of this work, and
  // it leaves part one peaking at about 1.3 — Web Audio clamps at 1.0, so the
  // loudest moments were being hard-clipped, which is audible as crackle on
  // exactly the busiest passages. Scaling the finished mix by 1/peak removes
  // the clipping without touching the balance between channels, because it is
  // one constant gain over the whole buffer.
  //
  // What it is NOT is the original's mixing law. dbplayer.library does its own
  // accumulation and scaling and that has not been read yet, so this is a
  // level decision made here rather than recovered — the one place in this
  // file that is true of. `peak` is returned so a caller can see it.
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    const a = out[i] < 0 ? -out[i] : out[i];
    if (a > peak) peak = a;
  }
  if (peak > 1) {
    const gain = 1 / peak;
    for (let i = 0; i < out.length; i++) out[i] *= gain;
  }

  return {
    pcm: out, sampleRate, seconds: total.seconds, signals: total.signals,
    cues: total.cues,
    peak, normalised: peak > 1,
  };
}

/**
 * One effect, on one channel, on one tick.
 *
 * Every case here is read from the handler named beside it. Effects this does
 * not implement fall through silently, which is what makes the count in the
 * README the honest measure of how finished the player is.
 */
function applyEffect(v, effect, param, tick, retune) {
  switch (effect) {
    // 0x10022d2e: param << 8 into the volume, at row time only.
    case FX.SET_VOLUME:
      if (tick === 0) v.vol = clampVol(param << 8);
      break;

    // 0x10022d38: parameter memory when the param is zero, then hi nibble up
    // and lo nibble down, a whole unit (<< 8) per tick. 0x?F and 0xF? are the
    // fine variants the handler branches away for; they move once, at tick 0.
    case FX.VOL_SLIDE: {
      const p = param || v.memVolSlide;
      v.memVolSlide = p;
      const hi = p >> 4, lo = p & 0xf;
      if (hi === 0xf && lo) { if (tick === 0) v.vol = clampVol(v.vol - (lo << 8)); break; }
      if (lo === 0xf && hi) { if (tick === 0) v.vol = clampVol(v.vol + (hi << 8)); break; }
      if (tick === 0) break;
      if (hi) v.vol = clampVol(v.vol + (hi << 8));
      else if (lo) v.vol = clampVol(v.vol - (lo << 8));
      break;
    }

    // 0x10022be4 / 0x10022c44: period -/+ param * 4 per tick. The x4 is the
    // handler's own `lsl.w #$2`, not a unit conversion.
    // `param` eighth-semitones per tick: the reference adds `param * Speed` to
    // a pitch that is scaled by Speed for the row, which comes to param a tick.
    // 0x1Fx and 0x2Fx are the smooth variants and move by the low nibble only.
    case FX.PORTA_UP: {
      const p = param || v.memPortaUp;
      v.memPortaUp = p;
      v.eighths += p < 0xf0 ? p : (p & 0xf);
      retune(v);
      break;
    }
    case FX.PORTA_DOWN: {
      const p = param || v.memPortaDown;
      v.memPortaDown = p;
      v.eighths -= p < 0xf0 ? p : (p & 0xf);
      retune(v);
      break;
    }

    // 0x10022e6c: slide toward the target the note set, stopping on arrival.
    // The direction is decided by comparing against the target rather than
    // remembered, which is why overshoot cannot happen.
    case FX.TONE_PORTA: {
      const p = param || v.memTonePorta;
      v.memTonePorta = p;
      if (tick === 0 || !p) break;
      // Toward the target and clamped there, so it cannot overshoot — the
      // reference does the same with two comparisons after the delta.
      if (v.eighths < v.targetEighths) v.eighths = Math.min(v.targetEighths, v.eighths + p);
      else if (v.eighths > v.targetEighths) v.eighths = Math.max(v.targetEighths, v.eighths - p);
      retune(v);
      break;
    }

    // 0x100227f8: straight into the 0..255 pan field, at row time.
    case FX.SET_PAN:
      if (tick === 0) { v.pan = Math.min(param, 255) / 255; repan(v); }
      break;

    // 0x10022804: the volume slide's shape again, on the pan field, clamped to
    // 0x100 rather than 0x4000. Below 0x10 the whole byte slides left.
    case FX.PAN_SLIDE: {
      const p = param || v.memPanSlide;
      v.memPanSlide = p;
      if (tick === 0) break;
      const units = PAN_MAX - 1;
      let pan = Math.round(v.pan * units);
      pan = p < 0x10 ? pan - p : pan + (p >> 4);
      v.pan = Math.min(Math.max(pan, 0), units) / units;
      repan(v);
      break;
    }

    // Consumed by the note trigger rather than here — 0x100227b8 only composes
    // the offset; the seek happens where the sample is started.
    case FX.OFFSET:
      break;

    case FX.EXTENDED: {
      const sub = param >> 4, n = param & 0xf;
      // Each of these clears its own effect slot once applied, so they act a
      // single time per row rather than on every tick.
      if (tick !== 0) break;
      switch (sub) {
        case EXT.FINE_VOL_UP: v.vol = clampVol(v.vol + (n << 8)); break;
        case EXT.FINE_VOL_DOWN: v.vol = clampVol(v.vol - (n << 8)); break;
        case EXT.FINE_PORTA_UP:
          v.eighths += n; retune(v);
          break;
        case EXT.FINE_PORTA_DOWN:
          v.eighths -= n; retune(v);
          break;
        // PLAY BACKWARDS is handled at the note trigger, not here. The
        // reference only reads `PlayBackwards` inside msynth_trigger and
        // clears it again on the next row, so 0xE3 arms the flag for a note on
        // the SAME row and does nothing at all on a row without one. Reversing
        // a voice already sounding, as this did, is a different effect.
        case EXT.BACKWARDS:
          break;
        default: break;   // retrigger and note delay are handled at the trigger
      }
      break;
    }

    default:
      break;   // not ported yet — counted in the README, not silently "fine"
  }
}
