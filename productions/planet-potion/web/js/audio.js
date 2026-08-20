// audio.js — the page's side of the softsynth worker.
//
// A promise per job over `postMessage`, and the one piece of build-awareness in
// web/js/: where the worker's code comes from.
//
// THE SIZE BUILD HAS NO SERVER. `entry.js` answers the runtime's `fetch` calls
// out of memory, but `new Worker(url)` is not a fetch — the browser loads that
// URL itself and never goes near the stub — so the packed page cannot point a
// worker at a path. It starts one from a Blob instead, built from the worker's
// own bundle inlined at `__WORKER_SRC__` by tools/build_planet_mashi.mjs.
//
// `__SIZE__` was already defined by that build and, until now, read by nothing.
// The readable build has no bundler at all, so both names are undeclared there:
// `typeof` guards the switch, and `__WORKER_SRC__` is only ever named inside the
// branch the readable build does not take.
//
// ONE SOURCE, TWO LOADERS. The bundled worker is an IIFE and starts as a
// classic worker; the readable one keeps its imports and starts as a module
// worker. audioworker.js is written so it cannot tell the difference.

/* global __SIZE__, __WORKER_SRC__ */

const packed = () => typeof __SIZE__ !== 'undefined' && __SIZE__;

const spawn = () => (packed()
  ? new Worker(URL.createObjectURL(
    new Blob([__WORKER_SRC__], { type: 'text/javascript' })))
  : new Worker(new URL('./audioworker.js', import.meta.url), { type: 'module' }));

/**
 * The worker, its jobs, and the segments it needs to do any of them.
 *
 * LAZY. Three of the page's modes — `?inspect=1`, `?oracle=1`, `?scene=N` — never
 * ask for a note, and a worker spun up for them is a thread and a copy of the
 * synth for nothing. Nothing starts until the first job.
 */
export function createAudio(loadSegments) {
  let worker = null;
  let seq = 0;
  const pending = new Map();

  /** Everything in flight fails together: a dead worker answers nothing. */
  const collapse = (message) => {
    const err = new Error(message);
    for (const p of pending.values()) p.reject(err);
    pending.clear();
    worker = null;
    started = null;
  };

  const boot = () => {
    if (worker) return worker;
    worker = spawn();
    worker.onmessage = (e) => {
      const m = e.data;
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.ok) p.resolve(m); else p.reject(new Error(m.error));
    };
    // `onerror` is the worker throwing on its own; `onmessageerror` is a reply
    // that could not be cloned back. Both leave every pending job unanswered
    // forever, which is the one failure a promise wrapper must not allow.
    worker.onerror = (e) => collapse(e.message || 'the audio worker failed');
    worker.onmessageerror = () => collapse('the audio worker sent a reply that could not be read');
    return worker;
  };

  const call = (op, args = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    boot().postMessage({ id, op, ...args });
  });

  // The segments go over once, on the first job that needs them.
  let started = null;
  const ready = () => (started ??= (async () => {
    const seg = await loadSegments();
    await call('init', { seg0: seg.seg0, seg4: seg.seg4 });
  })());

  const job = async (op, args) => {
    await ready();
    return call(op, args);
  };

  return {
    /** Build a part's module. -> { bytes, channels, instruments } */
    generate: (part) => job('generate', { part }),
    /** Hand over a module the page had cached. -> { channels, instruments } */
    have: (part, bytes) => job('have', { part, bytes }),
    /** Mix a part. -> { L, R, sampleRate, seconds, cues, channels, instruments } */
    mix: (part, sampleRate, octaveShift = 0) =>
      job('mix', { part, sampleRate, octaveShift }),
    /** The effect-7 cues alone, with no PCM mixed. -> { cues } */
    cues: (part) => job('cues', { part }),
  };
}
