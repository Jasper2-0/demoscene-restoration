// warmstore.js — the precalc disk cache ("warm store").
//
// Boot regenerates every CPU artifact on every page load — textures 0.9–3.4 s,
// the 16-pass shadow bake ~2.7 s — and the harnesses boot the page several times
// per run (sweep.mjs three times, flare_live.mjs six).  This module lets a boot
// LOAD those artifacts from `baked/warm/<config>/` instead, with two guarantees
// that make loading provably equivalent to generating:
//
//   1. TEXTURES need no stream bookkeeping beyond `pendingStream`.  Verified
//      property (scene7.js `setPrewarming`, re/SHIM_AUDIT.md): of the 28 texgen
//      programs, 20 RESEED via op33 (exit state independent of entry — and the
//      six scale-dependent offenders RESTORE their scale-1 exit state, see
//      TREE_IMPOSTOR / "exit-state fix" 2026-08-11) and 8 CONSUME NOTHING.  So a
//      program's whole stream effect is "set the stream to its recorded exit at
//      first use", which is exactly the pendingStream mechanism the pre-warm
//      already uses.  A warm-loaded texture entry replays identically to a
//      lazily generated one BY CONSTRUCTION.
//
//   2. SHADOW BAKES carry `{streamEntry, streamExit}`.  The bake's 2·65536·16
//      draws per landscape are entry-DEPENDENT, so a stored bake is only valid
//      if the live stream arrives at the recorded entry state.  The provider
//      checks that, installs the bytes and jumps the stream to the exit state;
//      ANY mismatch (a code change that alters upstream draw order, a different
//      flag set, a scene added) is an automatic per-artifact cache miss and that
//      scene bakes live.  Stream-order changes therefore cannot be masked by the
//      cache — they invalidate it.
//
// Staleness: the manifest records a sha256 for every module the boot can
// execute (the modulegraph — written by test/bake_warmstore.mjs); the loader
// re-fetches and re-hashes them before trusting the store, so editing any
// generator source invalidates the store on the next reload without a rebake
// step.  Belt and braces: the equivalence guard in test/generate_test.mjs
// asserts warm and cold boots agree byte-for-byte and stream-for-stream.
//
// The store is a dev/harness artifact.  It is never shipped: build-sonnet.sh
// derives its file list from modulegraph.mjs, which cannot reach baked/warm/,
// and the loader fails soft (console.info, cold boot) when the manifest is
// absent.  The blessed baseline sweep runs with `?warm=0` (cold) by policy.
//
// Modes (main.js `?warm=`):
//   auto (default)   try to load; on miss/stale, boot cold and say so
//   0                cold boot, no recording (the blessed-baseline mode)
//   1                like auto but a miss is a loud warning, not an info
//   record           boot cold AND record; test/bake_warmstore.mjs extracts
//                    `window.__warmstore.exportStore()` and writes the files

const hex = (v) => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const unhex = (s) => (parseInt(s, 16) >>> 0);

/** One canonical name per artifact-relevant config. Everything else that could
 *  vary (?skip, ?bg, ?flare, ?pos) either cannot touch the CPU artifacts or is
 *  caught by the shadow entry-state check. */
export function warmDirName(config) {
  return `${config.quality}-ts${config.texscale}-${config.lighting}`;
}

async function sha256hex(buf) {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------- loading
/**
 * @returns {Promise<null | {
 *   manifest: object,
 *   textures: {id:number, scale:number, entry:object}[],
 *   shadowProvider: (sceneIdx:number, entryState:number) =>
 *       null | {shadow: Uint8Array, streamExit: number},
 * }>}
 */
export async function loadWarmStore({ root, config, loud = false }) {
  const dir = `${root}baked/warm/${warmDirName(config)}/`;
  const say = loud ? console.warn : console.info;
  let manifest;
  try {
    const r = await fetch(dir + 'manifest.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    manifest = await r.json();
  } catch (e) {
    say(`warmstore: no store for ${warmDirName(config)} (${e.message}) — cold boot. ` +
        `Bake one with: node web/test/bake_warmstore.mjs`);
    return null;
  }
  if (manifest.version !== 1) {
    say(`warmstore: manifest version ${manifest.version} unsupported — cold boot`);
    return null;
  }

  // Freshness: re-hash every recorded source. A store baked from different code
  // must not load — a texture entry has no entry-state check to catch it.
  const stale = [];
  await Promise.all(Object.entries(manifest.sources).map(async ([rel, want]) => {
    try {
      const buf = await fetch(root + rel, { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      });
      if (await sha256hex(buf) !== want) stale.push(rel);
    } catch { stale.push(rel + ' (unreadable)'); }
  }));
  if (stale.length) {
    say(`warmstore: STALE for ${warmDirName(config)} — ${stale.length} source(s) changed ` +
        `(${stale.slice(0, 4).join(', ')}${stale.length > 4 ? ', …' : ''}) — cold boot. ` +
        `Rebake with: node web/test/bake_warmstore.mjs`);
    return null;
  }

  let blob;
  try {
    blob = new Uint8Array(await fetch(dir + 'blob.bin', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); }));
  } catch (e) {
    say(`warmstore: blob.bin unreadable (${e.message}) — cold boot`);
    return null;
  }

  const textures = manifest.textures.map((t) => {
    const rgba = new Uint8ClampedArray(blob.buffer, t.offset, t.len);
    // argb is texgenImage's derived form of the same pixels (scene7.js) —
    // rebuild it here so the installed entry is shaped exactly like a live one.
    const argb = new Uint32Array(t.len / 4);
    for (let i = 0; i < argb.length; i++) {
      argb[i] = ((rgba[i * 4 + 3] << 24) | (rgba[i * 4] << 16)
        | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2]) >>> 0;
    }
    const entry = { w: t.w, h: t.h, argb, rgba };
    if (t.pendingStream !== null) entry.pendingStream = unhex(t.pendingStream);
    return { id: t.id, scale: t.scale, entry };
  });

  const shadows = manifest.shadows.map((s) => ({
    sceneIdx: s.sceneIdx,
    streamEntry: unhex(s.streamEntry),
    streamExit: unhex(s.streamExit),
    bytes: new Uint8Array(blob.buffer, s.offset, s.len),
  }));
  const shadowProvider = (sceneIdx, entryState) => {
    for (const s of shadows) {
      if (s.sceneIdx !== sceneIdx) continue;
      if (s.streamEntry === (entryState >>> 0)) {
        return { shadow: s.bytes, streamExit: s.streamExit };
      }
      console.warn(`warmstore: shadow bake scene ${sceneIdx} entry-state mismatch ` +
        `(live ${hex(entryState)}, stored ${hex(s.streamEntry)}) — baking live. ` +
        `A stream-order change upstream of this scene invalidated the entry.`);
    }
    return null;
  };

  return { manifest, textures, shadowProvider };
}

// ----------------------------------------------------------------- recording
/** Hooks shaped for scene7.setWarmHooks(); collect during a cold boot, then
 *  test/bake_warmstore.mjs pulls exportStore() and writes the files. */
export function beginRecord(config) {
  const textures = [];   // {id, scale, w, h, rgba, pendingStream|null}
  const shadows = [];    // {sceneIdx, streamEntry, streamExit, bytes}
  const rec = {
    config,
    textureObserver(id, scale, entry, streamBefore, streamAfter) {
      textures.push({
        id, scale, w: entry.w, h: entry.h,
        // copy: the live entry keeps using its own buffer
        rgba: new Uint8ClampedArray(entry.rgba),
        pendingStream: streamAfter !== streamBefore ? streamAfter : null,
      });
    },
    shadowObserver(sceneIdx, streamEntry, streamExit, shadow) {
      shadows.push({ sceneIdx, streamEntry, streamExit, bytes: new Uint8Array(shadow) });
    },
    /** @returns {{manifest: object, chunks: string[]}} manifest lacks `sources`
     *  (the Node side owns the file list) and offsets refer into the
     *  concatenation of the base64-decoded chunks. */
    exportStore() {
      const parts = [];
      let off = 0;
      const place = (bytes) => { const o = off; parts.push(bytes); off += bytes.length; return o; };
      const manifest = {
        version: 1,
        config,
        generated: new Date().toISOString(),
        textures: textures.map((t) => ({
          id: t.id, scale: t.scale, w: t.w, h: t.h,
          offset: place(new Uint8Array(t.rgba.buffer, t.rgba.byteOffset, t.rgba.byteLength)),
          len: t.rgba.byteLength,
          pendingStream: t.pendingStream === null ? null : hex(t.pendingStream),
        })),
        shadows: shadows.map((s) => ({
          sceneIdx: s.sceneIdx,
          streamEntry: hex(s.streamEntry), streamExit: hex(s.streamExit),
          offset: place(s.bytes), len: s.bytes.length,
        })),
      };
      const blob = new Uint8Array(off);
      let p = 0;
      for (const part of parts) { blob.set(part, p); p += part.length; }
      // base64 in bounded chunks: one 40 MB string through the devtools protocol
      // is asking for trouble; 4 MB slices are not.
      const chunks = [];
      const STEP = 4 << 20;
      for (let i = 0; i < blob.length; i += STEP) {
        let s = '';
        const end = Math.min(blob.length, i + STEP);
        for (let j = i; j < end; j += 0x8000) {
          s += String.fromCharCode.apply(null, blob.subarray(j, Math.min(end, j + 0x8000)));
        }
        chunks.push(btoa(s));
      }
      return { manifest, chunks };
    },
  };
  return rec;
}
