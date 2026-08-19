// audioworker.js — the softsynth and the mixer, off the main thread.
//
// These are the only two things this page does that block for seconds at a
// time. Generating one part's module is about two seconds of straight-line
// arithmetic over 99 KB of segments, and mixing it is another second on top;
// neither touches the DOM, GL or the audio graph, so neither has any business
// on the thread that draws.
//
// The point is not only that the precalc stops freezing. It is that PART THREE
// CAN BE BUILT WHILE PART ONE PLAYS. On the main thread that was impossible —
// three seconds of arithmetic in the middle of a show is three seconds of
// stopped animation — so the port paid for it in a stall at the part boundary.
// Off-thread it costs nothing anybody can see. See `prepareAudio` in main.js.
//
// THE WORKER KEEPS THE PARSED MODULE. Jobs are `generate` or `have` (get a
// module, one way or the other), then `mix` or `cues` against it. That is what
// keeps 8.3 MB from crossing the thread boundary twice per part.
//
// ⚠ THE MODULE BYTES ARE COPIED OUT, NEVER TRANSFERRED. `parseDBM` does not
// copy sample data — dbm.js builds each sample as `new Int8Array(b.buffer, …)`,
// a VIEW into the module bytes — so transferring that buffer to the main thread
// would detach every sample in the module this worker just kept. `bytes.slice()`
// is an independent copy, and THAT is what gets transferred. The PCM is
// different: `render` allocates it fresh and nothing aliases it, so it goes by
// transfer and costs nothing.
//
// LOADED TWO WAYS, from one source. The readable build loads this file directly
// as a module worker; the size build has no server to load it from, so the pack
// bundles it to an IIFE and starts it from a Blob URL as a classic worker. See
// `audio.js`. Nothing here may assume which.

import { parseDBM } from './dbm.js';
import { generateModule } from './synth.js';
import { render, Sequencer } from './dbmplayer.js';

let seg0 = null;
let seg4 = null;
/** part -> the parsed module, kept so the bytes cross once and no more. */
const held = new Map();

/** What the readout wants to say about a module before it is mixed. */
const describe = (mod) => ({
  channels: mod.info?.channels ?? null,
  instruments: mod.instruments?.length ?? mod.info?.instruments ?? null,
});

const need = (part) => {
  const mod = held.get(part);
  if (!mod) throw new Error(`audioworker: no module held for ${part}`);
  return mod;
};

const JOBS = {
  /** The softsynth's entire input, once. 99 KB, so a plain copy is fine. */
  init({ seg0: a, seg4: b }) {
    seg0 = a;
    seg4 = b;
    return {};
  },

  /** Build a part's module. The bytes go back so the page can cache them. */
  generate({ part }) {
    const bytes = generateModule(seg0, seg4, part);
    const mod = parseDBM(bytes);
    held.set(part, mod);
    // The copy, not the original — see the warning at the top of this file.
    const out = bytes.slice();
    return { reply: { bytes: out, ...describe(mod) }, transfer: [out.buffer] };
  },

  /** Take a module the page already had cached, so nothing is rebuilt. */
  have({ part, bytes }) {
    const mod = parseDBM(bytes);
    held.set(part, mod);
    return { reply: describe(mod) };
  },

  /**
   * Mix a whole part.
   *
   * DEINTERLEAVED HERE. `render` returns one interleaved Float32Array and an
   * AudioBuffer wants a plane per channel, so somebody has to split it — 12.7
   * million iterations for part one. That loop used to run on the main thread
   * immediately after the mix, which made it part of the same stall.
   */
  mix({ part, sampleRate, octaveShift }) {
    const mod = need(part);
    const out = render(mod, { sampleRate, octaveShift });
    const frames = out.pcm.length / 2;
    const L = new Float32Array(frames);
    const R = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      L[i] = out.pcm[i * 2];
      R[i] = out.pcm[i * 2 + 1];
    }
    return {
      reply: { L, R, sampleRate: out.sampleRate, seconds: out.seconds,
        cues: out.cues, ...describe(mod) },
      // Freshly allocated and unaliased, so these really can move.
      transfer: [L.buffer, R.buffer],
    };
  },

  /**
   * The cues alone, for `?show=`.
   *
   * `Sequencer.run()` walks the pattern data and reports every effect-7 with
   * its tick; `render` does that too and then spends a second mixing audio
   * nobody is going to hear.
   */
  cues({ part }) {
    return { reply: { cues: new Sequencer(need(part)).run().cues ?? [] } };
  },
};

// `self.onmessage`, not a bare `onmessage`. A module worker is strict-mode
// code, where assigning to an undeclared name is a ReferenceError rather than a
// global — and the size build wraps this same file in an IIFE, where a bare
// assignment would mean something different again. `self` is the one spelling
// that is the worker's global in both.
self.onmessage = (e) => {
  const { id, op, ...args } = e.data;
  try {
    const job = JOBS[op];
    if (!job) throw new Error(`audioworker: no job ${op}`);
    const { reply = {}, transfer = [] } = job(args) ?? {};
    self.postMessage({ id, ok: true, ...reply }, transfer);
  } catch (err) {
    // THE MESSAGE, NOT THE ERROR. A DOMException from a failed structured
    // clone is not itself cloneable, so posting the error object back can fail
    // in exactly the case worth reporting.
    self.postMessage({ id, ok: false, error: err?.message ?? String(err) });
  }
};
