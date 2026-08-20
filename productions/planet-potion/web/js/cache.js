// cache.js — keep the generators' output between page loads.
//
// This page generates everything: 69 textures out of the texture VM, both
// DigiBooster modules out of the softsynth, the geometry out of seg3 and seg4.
// That is the point of it. It also means every reload pays for the whole
// precalc before anything can be looked at, and once the work turns to GETTING
// THE PICTURE RIGHT — reload, look, change one line, reload — the precalc is
// most of the time spent.
//
// So the expensive artefacts go in IndexedDB. Not the cheap ones: the geometry
// builds in milliseconds and the engine already caches it per scene, and
// caching what is fast only adds a way to be wrong.
//
// ⚠ A STALE CACHE IS WORSE THAN A SLOW ONE. Three things guard against it:
//
//   * the key carries a VERSION that has to be bumped by hand when a generator
//     changes — there is no way to hash a function's behaviour from inside it,
//     and pretending otherwise is how a cache starts lying;
//   * it also carries a hash of the INPUT BYTES, so a re-exported segment
//     invalidates itself without anyone remembering to;
//   * every hit and miss is reported to the caller, and main.js puts it on the
//     status line. A cache you cannot see is a cache you cannot distrust.
//
// `?nocache=1` skips reading (and rewrites what it computes), which is the
// escape hatch for the case the guards miss.

// BUMP THIS when synth.js, texturevm.js or textures.js changes in a way that
// changes their output. It is the one thing here that a human has to remember.
const VERSION = 3;

const DB = 'planet-potion', STORE = 'generated';

/** FNV-1a over the bytes, 32-bit, as hex. Fast enough on 112 KB, and this is
 *  an identity check rather than a security one. */
export function hashBytes(...arrays) {
  let h = 0x811c9dc5;
  for (const a of arrays) {
    for (let i = 0; i < a.length; i++) {
      h ^= a[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, '0');
}

const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => {
    if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
  };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

const tx = async (mode, fn) => {
  const db = await open();
  try {
    return await new Promise((res, rej) => {
      const t = db.transaction(STORE, mode);
      const rq = fn(t.objectStore(STORE));
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  } finally { db.close(); }
};

/**
 * Get `key` or compute it. `make` is only called on a miss.
 *
 * Returns `{ value, hit, ms }` — the caller is expected to SAY which it was.
 */
export async function cached(key, version, make, { skip = false } = {}) {
  const full = `${VERSION}:${version}:${key}`;
  const t0 = performance.now();
  if (!skip && typeof indexedDB !== 'undefined') {
    try {
      const got = await tx('readonly', (s) => s.get(full));
      if (got !== undefined) {
        return { value: got, hit: true, ms: performance.now() - t0 };
      }
    } catch { /* no IndexedDB, or a private window: just compute */ }
  }
  const value = await make();
  try {
    if (typeof indexedDB !== 'undefined') await tx('readwrite', (s) => s.put(value, full));
  } catch { /* over quota, or blocked: the value is still good */ }
  return { value, hit: false, ms: performance.now() - t0 };
}

/** Throw the whole store away. `?nocache=1` does not need this — it overwrites
 *  — but a generator that changed without the version being bumped does. */
export async function clearCache() {
  try { await tx('readwrite', (s) => s.clear()); return true; } catch { return false; }
}
