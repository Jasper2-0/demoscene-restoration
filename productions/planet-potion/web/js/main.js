// main.js — Planet Potion, browser restoration.
//
// STATE: the Warp3D shim exists and is verified; the engine does not. What this
// page can do today is play back the ORIGINAL's recorded draw stream through the
// shim, which is deliberately the first milestone: it tests the WebGL2
// translation on its own, with no reimplemented engine to confuse a difference
// with. See ../../work/re/PORT_SPEC.md and tools/inspect/ADAPTER.md.
//
//   (no query)       the engine: everything computed, nothing recorded
//   ?scene=N&tick=M  one COMPUTED frame, deterministically
//   ?oracle=1        play recorded frames from data/draws.json
//   ?scene=N&t=M     one recorded frame, deterministically
//   ?inspect=1       install window.__demo and draw nothing on its own
//   ?octave=N        transpose the soundtrack, to settle the pitch question by ear
//   ?<stage>=computed|recorded   pick a side per pipeline stage — see stages.js
//                    for the list. Asking for a side that does not exist is an
//                    error on the status line, not a silent fallback.
//
// AUDIO is the one subsystem that is ported rather than recorded, so "Start
// with sound" plays the real soundtrack: dbm.js reads the module the softsynth
// built and dbmplayer.js sequences and mixes it, echo included. The visuals
// follow the AUDIO CLOCK rather than requestAnimationFrame — METHOD.md §8 —
// which is also the only clock that means anything here, since the show's
// schedule is defined by effect-7 signals in the music.
//
// THE ENGINE EXISTS NOW. On the default path this page does not download a draw
// stream at all: engine.js decodes the scene graph and the geometry out of seg3
// and seg4, runs the three animation passes once per tick with the replayer's
// own effect-7 cues driving the beat sync, walks the nodes, clips and projects,
// and hands the result to the same Warp3D shim the recording used to feed. The
// schedule comes from showorder.json, 11 KB against draws.json's 20 MB, and it
// is the richer of the two — 26 part-one entries against 18 scenes, because a
// scene replays under a different camera, and it says which.
//
// draws.json is still the ORACLE. work/re/pipeline.mjs compares 140 frames and
// 45,327 primitives against it, and `?oracle=1` and `?scene=N` still play it.
// It is no longer an input to the picture.

import { Warp3D, SCREEN_W, SCREEN_H } from './warp3d.js';
import { buildTextures, loadTextures, installFont } from './textures.js';
import { resolveStages, provenance } from './stages.js';
import { createEngine } from './engine.js';
import { flattenDraws } from './render.js';
import { sinus } from './tables.js';
import { glyphTable, layoutText } from './font.js';
import { cached, hashBytes, clearCache } from './cache.js';
// THE SOFTSYNTH AND THE MIXER LIVE IN A WORKER. Nothing on this thread imports
// synth.js, dbm.js or dbmplayer.js any more — see audioworker.js for why, and
// audio.js for how the size build starts one without a server to load it from.
import { createAudio } from './audio.js';

const canvas = document.getElementById('screen');
const statusEl = document.getElementById('status');
const startEl = document.getElementById('start');
const params = new URLSearchParams(location.search);

const fadeEl = document.getElementById('fade');
const barEl = document.getElementById('bar');
const say = (s) => {
  if (!statusEl) return;
  statusEl.hidden = false;
  statusEl.textContent = s;
};
/**
 * The precalc readout.
 *
 * The intro builds about nine megabytes of textures, geometry and audio before
 * it can draw anything, and on a cold cache that is several seconds of a black
 * screen. This says WHICH of them is running and what it is working on, and
 * stamps each finished step with how long it took — so a slow load reads as
 * progress rather than as a hang.
 */
let stageAt = 0;
let stageLog = [];
const stage = (text, detail = '') => {
  const now = performance.now();
  if (stageAt) stageLog[stageLog.length - 1] += ` — ${((now - stageAt) / 1000).toFixed(1)}s`;
  stageAt = now;
  stageLog.push(text);
  if (stageLog.length > 3) stageLog.shift();
  if (barEl) barEl.hidden = false;
  say(`Planet Potion\n${stageLog.join('\n')}${detail ? `\n${detail}` : ''}`);
};
/** Nothing on screen but the intro. */
const hideChrome = () => {
  if (statusEl) statusEl.hidden = true;
  if (startEl) startEl.hidden = true;
  if (barEl) barEl.hidden = true;
};

/**
 * The per-frame readout, on '§'.
 *
 * The status line used to carry scene, time and draw count on every frame of
 * the intro, and it was taken off because the intro is not being debugged while
 * somebody watches it. That is right for the default and wrong for the half
 * hour after a change, when the question is which scene is on screen and how
 * many primitives it just cost. So the numbers are back, behind a key, off
 * until asked for and gone again on the next press.
 *
 * READABLE BUILD ONLY, and by construction rather than by a flag: #debug lives
 * in web/index.html and the size build writes its own page without it, so
 * `debugEl` is null there and the listener is never bound. `hideChrome` does
 * not touch it either — the whole point is a readout that survives the intro
 * taking the screen.
 */
const debugEl = document.getElementById('debug');
let debugOn = false;
let debugPaintedAt = 0, debugFps = 0, debugFrameMs = 0;
// How many ticks the last painted frame had to step through to catch up. 0 or 1
// is healthy; a number that climbs is the display losing a race with the audio
// clock, which is the shape of every "it gets progressively worse" report.
let debugCaught = 0, debugCaughtMax = 0;

/** The lines themselves. `info` is null when the tick rendered nothing. */
const debugText = (label, hit, info, tick, elapsed, signal) => {
  const sp = hit.span;
  return [
    `\u00a7 ${label}${info ? '' : '  (no frame this tick)'}`,
    `slot ${sp.slot}${sp.over ? ` + ${sp.over.slot}` : ''}`
      + `  entry ${hit.scene}  cam ${sp.camera ?? 0}  ${sp.driver ?? '\u2014'}`,
    `show ${elapsed.toFixed(2)}s  tick ${tick}  scene t ${hit.local}`,
    info ? `draws ${info.objects}  tris ${info.triangles}`
      + `  glError ${info.glError}` : 'draws \u2014',
    // The beat sync, which is invisible until it is wrong: -1 is "no effect-7
    // landed on this tick", and every other value is the byte the nodes match
    // their trigger against.
    `fog ${sp.fog ?? '\u2014'}  beat ${signal < 0 ? '\u2014' : signal}`
      + `  ${debugFps.toFixed(0)} fps`,
    `caught up ${debugCaught} tick(s), worst ${debugCaughtMax}`,
  ].join('\n');
};

if (debugEl) {
  addEventListener('keydown', (e) => {
    // '\u00a7' and '\u00b1' are the same physical key, shifted and not, so the
    // toggle does not silently die under caps lock or a held shift.
    if (e.key !== '\u00a7' && e.key !== '\u00b1') return;
    debugOn = !debugOn;
    debugEl.hidden = !debugOn;
    // Something to look at straight away. Outside playback nothing else ever
    // writes here, and a box that stayed empty would read as a broken key
    // rather than as a show that is not running.
    if (debugOn) debugEl.textContent = '\u00a7 debug \u2014 waiting for a frame';
  });
}

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

async function loadBytes(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/**
 * seg0 and seg4, fetched once and kept: the softsynth's entire input.
 *
 * 99 KB, in place of the 8.3 MB of .dbm this page used to download. seg0 holds
 * the two generator scripts, the float pool and the 42 parameter blocks; seg4
 * holds the module header blobs and the tapes.
 */
let segments = null;
const loadSegments = async () => (segments ??= {
  seg0: await loadBytes('./data/seg0.bin'),
  // 2 KB of 1bpp font mask. Small, and every glyph in the intro depends on it.
  seg2: await loadBytes('./data/seg2.bin').catch(() => null),
  // SEG3 IS THE ENGINE'S, not the synth's: every part-one scene and geometry
  // program is at 0x1003xxxx, so without it eighteen of the twenty-nine scenes
  // cannot be decoded at all.
  seg3: await loadBytes('./data/seg3.bin'),
  seg4: await loadBytes('./data/seg4.bin'),
});

/**
 * Textures are GENERATED, not loaded: the VM in texturevm.js runs the intro's
 * own bytecode and reproduces all 69 shipped programs byte for byte. The PNGs
 * under data/textures/ are the oracle those were checked against, not an input.
 *
 * A draw's `texture` field is an index into the order W3D_AllocTexObj was
 * called, and _calculate_txt walks ONE part's table — so the two parts have
 * different sets under the same indices, and the live set has to be swapped
 * when the part changes. Uploading is cheap; regenerating is not, so the pixels
 * are built once and kept.
 */
async function textureBinder(w3d, programs, kernels, side, cache, pointSampled) {
  // 69 programs of texture VM is the second-biggest thing between a reload and
  // a picture. The pixels are a pure function of the bytecode, so they cache.
  const built = side === 'recorded'
    ? { value: await loadTextures(programs), hit: false, ms: 0 }
    : await cached(`tex:${cache.key}`, 'v1',
      async () => buildTextures(programs, kernels), { skip: cache.skip });
  const { byPart, failures } = built.value;
  // The atlas goes in AFTER the cache, not into it: it is 64 KB the VM did not
  // make, and caching a doctored set would make the cached and uncached paths
  // differ in a way nothing would notice.
  const fontSlots = installFont(byPart, cache.seg2);
  cache.report.push(`textures ${built.hit ? 'cached' : 'built'} `
    + `${(built.ms / 1000).toFixed(1)}s`
    + (fontSlots ? `, font into ${fontSlots} slots` : ', NO FONT'));
  let live = null;
  return {
    failures, side,
    counts: Object.fromEntries(Object.entries(byPart).map(([k, v]) => [k, v.length])),
    use(part) {
      if (part === live || !byPart[part]) return;
      // The textures W3D_SetFilter is never called on keep AllocTexObj's
      // default, which is point sampling — see uploadTexture. The list comes
      // out of the recorded library log, in render_state.json.
      const point = new Set(pointSampled?.[part]?.point_sampled ?? []);
      byPart[part].forEach((rgba, i) => {
        if (rgba) w3d.uploadTexture(i, rgba, point.has(i));
      });
      live = part;
    },
  };
}

async function main() {
  let w3d;
  try {
    // ?depth16=0 — draw straight to the canvas's 24-bit depth buffer
    // instead of the 16 bits the hardware had. See warp3d.js.
    w3d = new Warp3D(canvas, { depth16: params.get('depth16') !== '0' });
  } catch (e) {
    say(`WebGL2 unavailable: ${e.message}`);
    return;
  }
  w3d.clear([0, 0, 0]);
  // ?texenv=0|1|2 — replace, modulate, decal. Undecided; see warp3d.js.
  if (params.has('texenv')) w3d.texEnv = Number(params.get('texenv'));
  // ?texalpha=1 — put the texture's alpha back into the blend; see warp3d.js.
  if (params.has('texalpha')) w3d.texAlpha = Number(params.get('texalpha'));
  // ?filter=linear — bilinear instead of the original's point sampling.
  if (params.has('filter')) w3d.filter = params.get('filter');

  // Which side of each pipeline stage to run. Reported through __demo.state()
  // whatever happens, so an inspector sweep records the provenance of the
  // picture it is looking at rather than assuming it.
  const { choice: stages, errors: stageErrors } = resolveStages(params);

  // ?oracle and ?scene ASK FOR A RECORDED FRAME by name. Deciding that up here
  // matters for more than the fetch below: it is also what keeps those modes
  // from paying for the engine's setup — the segments, the cache key, the scene
  // decode — none of which a recorded frame uses.
  const wantsRecorded = params.has('oracle')
    || (params.has('scene') && !params.has('tick'));

  // THE CACHE, and its key. The segments are the only input to any generator
  // here, so hashing them means a re-export invalidates everything that came
  // out of them without anyone having to remember. `?nocache=1` skips the read
  // and rewrites; `?clearcache=1` throws the store away first, for the case
  // where a generator changed and its version constant did not.
  if (params.has('clearcache')) await clearCache();
  const cache = { key: '0', skip: params.has('nocache'), report: [] };
  if (!wantsRecorded) {
    stage('reading the intro\u2019s own bytecode', 'seg0, seg2, seg3, seg4');
    try {
      const seg = await loadSegments();
      cache.key = hashBytes(seg.seg0, seg.seg3, seg.seg4);
      cache.seg2 = seg.seg2;
    } catch { /* the fetches below report their own failure */ }
  }

  let dataset = null;
  let textures = null;
  // The four fog presets. `setFog` has existed in the shim since it was written
  // and had never been called by anything — the intro turns linear fog on for
  // four of part one's scenes and the page was rendering all of them clear.
  let fogPresets = [];
  // Which textures W3D_SetFilter is never called on, per part — they keep
  // AllocTexObj's point sampling. See uploadTexture in warp3d.js.
  let texFilter = null;
  try {
    const rs = await loadJSON('./data/render_state.json');
    fogPresets = rs.fog_presets ?? [];
    texFilter = rs.texture_filter ?? null;
  } catch {
    // Older dataset: no presets, so no fog. Not worth a message of its own.
  }
  // THE 20 MB IS ONLY FETCHED IF SOMETHING STILL NEEDS IT. On the computed path
  // the schedule comes from showorder.json — 11 KB, and RICHER: it has 26
  // part-one entries against draws.json's 18 scenes, because a scene replays
  // under a different camera, and it carries which camera. draws.json stays the
  // oracle and stops being a download.
  let schedule = null;
  try {
    schedule = await loadJSON('./data/showorder.json');
  } catch { /* the computed path says so below */ }
  // A recorded frame gets the recording even when the emit stage is computed —
  // otherwise the mode whose whole purpose is to show it silently shows nothing.
  if (stages.emit !== 'computed' || !schedule || wantsRecorded) {
    try {
      dataset = await loadJSON('./data/draws.json');
    } catch {
      // The dataset is regenerable, not committed — see work/re/export.py.
      say('Warp3D shim ready. No recorded stream present: '
        + 'run work/re/export.py and copy out/ to web/data/.');
    }
  }
  try {
    const [programs, kernels] = await Promise.all([
      loadJSON('./data/tex_programs.json'), loadJSON('./data/tex_kernels.json')]);
    stage('generating textures',
      `${programs.length ?? 69} programs through the texture VM`);
    textures = await textureBinder(w3d, programs, kernels, stages.textures,
      cache, texFilter);
  } catch {
    // Without the bytecode there is nothing to generate FROM. The draw stream
    // still replays, untextured, which is worth saying rather than showing.
  }

  // THE ENGINE, when the emit stage is computed. It reads the scene graph and
  // the geometry out of the segments and runs the three animation passes, the
  // node walk, the clipper and the projection — everything draws.json used to
  // hold. Built once and STEPPED: `anim.origin` is the beat sync, so the state
  // it accumulates tick by tick is part of the answer.
  /**
   * A fog preset, from either spelling of the field.
   *
   * draws.json carries an INDEX because export.py resolved it; showorder.json
   * carries the small-data DISPLACEMENT the schedule actually names, and the
   * presets carry theirs. Indexing the preset array with an address gives
   * undefined, which reads on screen as no fog at all.
   */
  const fogFor = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return fogPresets[v] ?? null;
    return fogPresets.find((p) => p.disp === v) ?? null;
  };

  let engine = null;
  if (stages.emit === 'computed' && !wantsRecorded) {
    try {
      const seg = await loadSegments();
      const glyphs = glyphTable(seg.seg0);
      engine = createEngine({
        seg0: seg.seg0, seg3: seg.seg3, seg4: seg.seg4, table: sinus(),
        layoutText: (text) => layoutText(glyphs, text),
      });
    } catch (e) {
      say(`the engine could not start: ${e.message}`);
    }
  }

  /**
   * Draw one COMPUTED frame: the scene at `slot`, at this tick, with the
   * music's current signal.
   *
   * The overlay is drawn on top for every part-one scene but itself. It is not
   * a scene to the schedule — the original draws it INTO each one — which is
   * why it has a slot of its own and never a span.
   */
  /** 0-255 bytes as the shim's 0..1 floats; missing means the old black. */
  const clearOf = (rgb) => (rgb ? [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]
    : [0, 0, 0]);

  // `showTick` IS THE PART'S CLOCK AND IS NOT OPTIONAL. It used to default to
  // null, and the two calls in the live playback loop below did not pass it —
  // so during actual playback the overlay was stepped on each SCENE's local
  // tick and restarted at every scene boundary. All ten of its drawing nodes
  // are beat-triggered (mode 0, triggers 2-11), and restarting them replays
  // their opening full-screen quads, so part one ran the whole way through
  // under a repeating halftone layer. Nothing measured it, because every
  // harness reached the engine through `sweep`, which did pass the argument.
  // Required rather than defaulted, so the next caller cannot omit it quietly.
  /**
   * Step one skipped tick's ANIMATION, and build nothing.
   *
   * The same three layers `renderComputed` draws — the scene, a transition
   * scene over it, and part one's overlay — stepped through `engine.advance`,
   * which runs the keyframe evaluation and skips the vertices, meshes, cameras,
   * clipping and projection whose only consumer is a frame nobody will see.
   *
   * WHY THERE IS A CHEAP PATH AT ALL. A dropped frame has to be made up tick by
   * tick or the animation loses the movement in between — `work/re/catchupcheck.mjs`
   * measures that 4 of 36 spans genuinely depend on it — but the old catch-up
   * did it by running the WHOLE pipeline per skipped tick and throwing the
   * picture away. On a machine that cannot hold 50 Hz that is a spiral: each
   * dropped frame makes the next frame more expensive, which drops more frames.
   * Measured under an 8x CPU throttle it reached 675 ticks in one frame and was
   * still climbing.
   *
   * `catchupcheck.mjs` holds this to being bit-identical to the expensive path.
   */
  const advanceComputed = (span, tick, signal, showTick) => {
    const order = engine.orderOfSlot(span.part, span.slot);
    if (order == null) return;
    if (span.driver === 'new_camera'
      && tick === span.start - (span.sceneStart ?? span.start)) {
      engine.restartScene(span.part, order, tick);
    }
    engine.advance(span.part, order, tick, signal);
    if (span.over) {
      const o = engine.orderOfSlot(span.part, span.over.slot);
      if (o != null) {
        engine.advance(span.part, o,
          tick - (span.over.since - (span.sceneStart ?? span.start)), signal);
      }
    }
    const ov = engine.overlay;
    if (span.part === ov.part && order !== ov.order) {
      engine.advance(ov.part, ov.order, showTick ?? tick, signal);
    }
  };

  const renderComputed = (span, tick, signal, showTick, paint = true) => {
    if (typeof showTick !== 'number') {
      throw new TypeError('renderComputed: showTick must be the part clock');
    }
    const order = engine.orderOfSlot(span.part, span.slot);
    if (order == null) return null;
    // WHICH CAMERA, from the schedule. `_play_scene_new_camera` sets a global
    // the renderer compares against each camera node's ordinal, and three of
    // part one's scenes carry four cameras and play three times over.
    const cam = span.camera ?? 0;
    // ENTERING A `new_camera` ENTRY RESTARTS THE SCENE'S CLOCK. That is what
    // `_play_scene_new_camera` does before it renders anything — see
    // engine.restartScene — and without it the second and third cameras of
    // 0x25da, 0x25d6 and 0x25de sit past the end of their 300-tick tracks and
    // do not move at all.
    //
    // Keyed on the tick rather than on having seen the span before, so that a
    // sweep which rewinds and replays the same span gets the same answer.
    if (span.driver === 'new_camera'
      && tick === span.start - (span.sceneStart ?? span.start)) {
      engine.restartScene(span.part, order, tick);
    }
    let draws = engine.frame(span.part, order, tick, signal, cam);
    // THE SCENE'S clear colour, taken before the overlay is appended — and
    // taken from the scene rather than the overlay on purpose. The original
    // runs `_calc_matrix` over the overlay first and the scene head second,
    // and each run overwrites the same global, so the scene head is the one
    // that survives to W3D_ClearDrawRegion. (It also has to be read here
    // because `concat` returns a fresh array and would drop the property.)
    const clear = draws.clear;
    // THE TRANSITION SCENE, and the reason a transition outlives its own entry.
    // `_play_scene_p_start` and `_play_scene_p_end` are the only drivers that
    // keep TWO graphs alive: the original holds the main scene at `r2+0x289a`
    // and a second at `r2+0x289e`, `p_start` generates into the second and
    // `p_end` into the first, and BOTH loops then run `_show_scene` on 0x289a
    // and again on 0x289e over the top of it, every frame.
    //
    // So part three's 0x2796 is not an 0.8-second scene of its own. It is drawn
    // over the OUTGOING 0x2786 for its own `p_start` entry and over the INCOMING
    // 0x277e for the `p_end` that follows — two seconds, with the picture
    // underneath it swapped halfway through. That IS the transition. Modelling
    // one pointer drew it alone against nothing for a fifth of the time, which
    // is the flicker this fixes. Checked frame by frame against the reference
    // capture at 349.3\u2013351.2 s, where the wordmark sits first over the green
    // scene and then over the orange one before leaving with the `dalej`.
    //
    // ITS OWN CLOCK, expressed as an offset from the main scene's rather than
    // read off `showTick`, so a sweep that rewinds still gets the same answer.
    if (span.over) {
      const o = engine.orderOfSlot(span.part, span.over.slot);
      if (o != null) {
        draws = draws.concat(engine.frame(span.part, o,
          tick - (span.over.since - (span.sceneStart ?? span.start)),
          signal, cam));
      }
    }
    // THE OVERLAY RUNS ON THE PART'S CLOCK, not the scene's — it fades once at
    // the start of part one and is invisible for the rest of it. Given the
    // scene's tick instead it restarts at every scene, and its quads are
    // full-screen.
    const ov = engine.overlay;
    if (span.part === ov.part && order !== ov.order) {
      draws = draws.concat(
        engine.frame(ov.part, ov.order, showTick ?? tick, signal));
    }
    // `paint` false steps the engine and skips the GL entirely. A sweep needs
    // the ANIMATION at every tick and the pixels only at the ones it samples,
    // and under swiftshader the draw is what costs.
    if (!paint) {
      return { objects: draws.length, triangles: 0, glError: 0,
        slot: span.slot, part: span.part, t: tick };
    }
    textures?.use(span.part);
    w3d.setFog(fogFor(span.fog));
    // The state `_show_scene` opens every frame in; each draw then carries the
    // one its own node asked for. See showScene in render.js.
    w3d.setZBuffer(false, false);
    // The engine computes the clear colour as the last thing `_calc_matrix`
    // does, and it is NOT black: part one opens on white and part three's
    // backgrounds are coloured and animated. See anim.js `clearColour`.
    w3d.clear(clearOf(clear));
    const info = w3d.drawFrame({ draws: flattenDraws(draws) });
    return { ...info, slot: span.slot, part: span.part, t: tick };
  };

  /** Draw one recorded frame. Deterministic and order-independent by design. */
  const renderRecorded = (sceneIndex, frameIndex) => {
    if (!dataset) return null;
    const scene = dataset.scenes[sceneIndex];
    if (!scene?.frames?.length) return null;
    const frame = scene.frames[Math.min(frameIndex, scene.frames.length - 1)];
    textures?.use(scene.part);
    // Set UNCONDITIONALLY, including back to null. The original sets a preset
    // once and lets it persist, which is fine playing start to finish; this
    // page draws scenes out of order, so `export.py` resolves each scene's
    // EFFECTIVE fog and the renderer applies exactly that. Carrying it as state
    // here would make `?scene=N` depend on which scenes had been drawn before.
    w3d.setFog(scene.fog === null || scene.fog === undefined
      ? null : fogPresets[scene.fog]);
    w3d.setZBuffer(false, false);
    // Recorded frames carry the clear colour too, as of the drawlog change that
    // reads r2+0x2846 into the frame marker — but a draws.json written before
    // that has no `clear` field, and falling back to black there is what the
    // page did for every frame until now.
    w3d.clear(frame.clear === undefined ? [0, 0, 0]
      : clearOf([(frame.clear >> 16) & 0xff, (frame.clear >> 8) & 0xff,
        frame.clear & 0xff]));
    const info = w3d.drawFrame(frame);
    return { ...info, slot: scene.slot, part: scene.part, t: frame.t };
  };

  // --- the show, driven by the audio clock ---------------------------------
  //
  // THE MODULES ARE GENERATED HERE. synth.js runs all 32 of the softsynth's
  // primitives over the intro's own seed data and builds both DigiBooster
  // modules at load time — 8.3 MB of samples out of 99 KB of segments, and
  // byte-identical to what the original produces: work/re/synthdiff.mjs checks
  // all 94 samples individually and both module digests against audio.json.
  const audio = createAudio(loadSegments);

  /**
   * Get one part's module into the worker, built or remembered.
   *
   * 8.3 MB of samples out of 99 KB of segments, and about two seconds of
   * straight-line arithmetic for part one. Byte-identical every time, which is
   * exactly what makes it worth keeping.
   *
   * THE CACHE STAYS ON THIS THREAD. IndexedDB is reachable from a worker, but
   * `cache.report` and the readout are the page's, and splitting one store
   * across two threads to save a copy of something already being copied is not
   * a trade worth making. So: a miss builds in the worker and the bytes come
   * back to be stored; a hit sends them the other way. Either way the worker
   * ends up holding the parsed module and the bytes cross exactly once.
   *
   * -> { channels, instruments }, which is all the readout wants.
   */
  const moduleReady = async (part) => {
    let built = null;
    const got = await cached(`mod:${part}:${cache.key}`, 'v1',
      async () => {
        built = await audio.generate(part);
        return built.bytes;
      }, { skip: cache.skip });
    cache.report.push(`${part} module ${got.hit ? 'cached' : 'built'} `
      + `${(got.ms / 1000).toFixed(1)}s`);
    // A HIT MEANS THE WORKER NEVER MADE IT, so it has to be given one before
    // anything can be mixed against it.
    return built ?? audio.have(part, got.value);
  };

  /**
   * Everything a part needs before it can be heard, off-thread and memoised.
   *
   * MEMOISED BECAUSE OF THE PREFETCH. `playPart` starts the NEXT part's job the
   * moment the current one begins playing, so by the time the show asks for it
   * the work is usually finished and this returns a settled promise. That is
   * the whole point of the worker: the part boundary used to be three seconds
   * of blocked main thread with the last frame of part one frozen on it.
   */
  const prepared = new Map();
  const prepareAudio = (spec, ctx, loud = false) => {
    if (!prepared.has(spec.part)) {
      prepared.set(spec.part, (async () => {
        // THE READOUT AND THE BREADCRUMB BELONG TO THE FOREGROUND PART. A
        // background job runs while another part is on screen, so letting it
        // write `where` would make an error from the part being watched name
        // the stage of the part being built.
        const step = (at, text, detail) => {
          if (!loud) return;
          where = at;
          stage(text, detail);
        };
        step(`${spec.label}: generating the soundtrack`,
          `generating ${spec.label}'s soundtrack`);
        const info = await moduleReady(spec.part);
        step(`${spec.label}: mixing`, `mixing ${spec.label}`,
          `${info.channels ?? '?'} channels, `
          + `${info.instruments ?? '?'} instruments`);
        // ?octave=N transposes playback, for settling by ear the one thing the
        // two reference implementations disagree about. dbplayer.library puts
        // the instrument's own rate on note 0x60; libdigibooster3 puts it two
        // octaves lower, so it plays this module two octaves higher than we do.
        // The disassembly favours dbplayer and the correlation favours the
        // oracle, which is a disagreement an ear can settle and a metric cannot.
        return audio.mix(spec.part, ctx.sampleRate,
          Number(params.get('octave') ?? 0) || 0);
      })());
    }
    return prepared.get(spec.part);
  };

  // Which stage the show is in, for the error path. See the catch below.
  let where = 'startup';
  const SHOW = [
    { part: 'p1', label: 'part one' },
    { part: 'p3', label: 'part three' },
  ];
  const TICKS_PER_SECOND = 50;

  /** One part's scenes in schedule order, with the tick span each occupies. */
  const spansFor = (part) => (schedule && engine
    // A SLOTLESS SCHEDULE ENTRY CONTINUES THE ONE BEFORE IT, and eleven of the
    // thirty-nine are: nine `new_camera`, which change which camera renders and
    // nothing else, and two `dalej`, which just carry on. Reading `slot` alone
    // leaves those spans with no scene at all — a fifth of part one's back half
    // frozen — and the scene's own clock has to keep running from the entry
    // that INTRODUCED the slot, not restart at each continuation.
    ? (() => {
      // TWO SCENE POINTERS, because the original keeps two. `r2+0x289a` holds
      // the scene on screen and `r2+0x289e` holds a second one; every driver
      // generates into the first EXCEPT `_play_scene_p_start`, which generates
      // into the second. See the `over` note in renderComputed for what that
      // costs a port that models only one.
      let slot = null, sceneStart = 0;
      let over = null, overStart = 0;
      return (schedule[part]?.schedule ?? []).map((e, i) => {
        const at = e.startTick ?? 0;
        if (e.driver === 'p_start') { over = e.slot; overStart = at; }
        else if (e.slot) { slot = e.slot; sceneStart = at; }
        return {
          scene: i, frames: [], slot, fog: e.fog, camera: e.camera, sceneStart,
          // `new_camera` does not merely select a camera: it restarts the
          // scene's animation clock. See engine.restartScene.
          driver: e.driver,
          // BOTH POINTERS GET DRAWN, and only by these two drivers — every
          // other one shows `0x289a` alone and leaves `0x289e` set but unseen.
          over: (e.driver === 'p_start' || e.driver === 'p_end') && over
            ? { slot: over, since: overStart } : null,
          start: at, end: at + (e.durTicks ?? 0),
          part,
        };
      });
    })()
    : (dataset?.scenes ?? []).map((s, i) => ({
      scene: i, frames: s.frames ?? [], slot: s.slot, fog: s.fog,
      start: s.startTick ?? 0, end: (s.startTick ?? 0) + (s.durTicks ?? 0),
      part: s.part,
    })).filter((s) => s.part === part && s.frames.length))
    .sort((a, b) => a.start - b.start);

  /**
   * The recorded frame to show at `tick`, or null to hold the previous one.
   *
   * Null happens in the sub-second tail after the last scene of a part, and
   * would happen in any schedule slot that reuses an already-exported scene.
   * Holding beats blanking: a black frame would read as a rendering failure.
   */
  const frameAt = (spans, tick) => {
    for (const s of spans) {
      if (tick < s.start) break;
      if (tick < s.end) {
        const local = tick - s.start;
        let k = 0;
        for (let j = 1; j < s.frames.length; j++) if (s.frames[j].t <= local) k = j;
        // The scene's OWN clock: from where the scene started, not where this
        // schedule entry did.
        return { scene: s.scene, frame: k, slot: s.slot, span: s,
          local: tick - (s.sceneStart ?? s.start) };
      }
    }
    return null;
  };

  /** Sequence and mix one part, then show it against its own clock. */
  async function playPart(ctx, spec) {
    // THE PRECALC READOUT BELONGS TO THE FIRST PART ONLY. Part three is built
    // too, but by the time it is wanted the screen is the intro's and part
    // one's last frame is still on the canvas — pushing “generating part
    // three’s soundtrack” and the progress bar back over it would turn a
    // transition into a load screen. `where` still names the stage for the
    // error path; only the telling is dropped.
    //
    // AND IT IS USUALLY FINISHED BEFORE IT IS ASKED FOR: the part before this
    // one started the job in the worker as soon as it began playing.
    const { L, R, sampleRate, seconds, cues } =
      await prepareAudio(spec, ctx, spec === SHOW[0]);
    where = `${spec.label}: queueing the audio`;
    // THE BEAT SYNC, as a lookup. Every effect-7 in the module, by the tick it
    // lands on; _calc_matrix compares it against each node's trigger byte and a
    // match restarts that node's animation. Without it a computed frame is
    // arithmetically right and out of time with the music.
    const cueAt = new Map();
    for (const c of cues ?? []) cueAt.set(c.ticks50, c.value);

    // TWO MEMCPYS. The worker deinterleaves, so what used to be 12.7 million
    // iterations of main-thread JS on the tail of the mix is now a pair of
    // buffer copies.
    const buf = ctx.createBuffer(2, L.length, sampleRate);
    buf.copyToChannel(L, 0);
    buf.copyToChannel(R, 1);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const spans = spansFor(spec.part);
    const t0 = ctx.currentTime + 0.06;   // a beat of slack so frame 0 is not late
    src.start(t0);
    // THE NEXT PART, BUILT WHILE THIS ONE PLAYS. This is the reason the synth
    // moved off-thread: three seconds of arithmetic at the part boundary used
    // to stop the show dead with part one's last frame frozen on screen. In the
    // worker it overlaps ninety seconds of playback and nothing can see it.
    //
    // NOT AWAITED — the `catch` is only there so a failure here is not an
    // unhandled rejection. `prepareAudio` memoises the promise, so the real
    // error still surfaces from the `await` in the next `playPart`.
    const next = SHOW[SHOW.indexOf(spec) + 1];
    if (next) prepareAudio(next, ctx).catch(() => {});
    where = `${spec.label}: playing`;
    // From here the screen is the intro and nothing else.
    hideChrome();
    // THE FADE AT THE END. Two seconds of black over the tail of the last part,
    // so the show closes rather than stopping mid-frame. It is the viewport
    // rather than the canvas so the letterbox goes with it, and it is CSS
    // rather than a drawn quad so it is independent of which framebuffer the
    // shim is rendering into.
    const FADE = 2;
    const isLast = spec === SHOW[SHOW.length - 1];

    await new Promise((done) => {
      let shown = '';
      let lastTick = -1;
      const step = () => {
        // THE DISPLAY RATE, sampled per animation frame and not per tick. The
        // tick loop runs at a flat 50 Hz off the audio clock whatever the
        // screen manages, so counting ticks would cheerfully report 50 on a
        // machine dropping half its frames — the exact case the number is there
        // to catch. Smoothed, because a raw frame delta is unreadable.
        if (debugOn) {
          const now = performance.now();
          if (debugPaintedAt) {
            // SMOOTH THE INTERVAL, NOT THE RATE. Averaging rates buries the
            // case worth seeing: one seven-second frame contributes a rate of
            // 0.14 to a running mean sitting at 120 and moves it almost not at
            // all, so the readout said "100 fps" while the show was visibly
            // frozen. Averaging the interval instead lets a long frame dominate
            // immediately, which is what it should do.
            const dt = Math.max(1, now - debugPaintedAt);
            debugFrameMs = debugFrameMs ? debugFrameMs * 0.8 + dt * 0.2 : dt;
            debugFps = 1000 / debugFrameMs;
          }
          debugPaintedAt = now;
        } else { debugPaintedAt = 0; debugFrameMs = 0; }
        const elapsed = ctx.currentTime - t0;
        if (isLast && fadeEl) {
          const into = elapsed - (seconds - FADE);
          fadeEl.style.opacity = into <= 0 ? 0 : Math.min(1, into / FADE);
        }
        if (elapsed >= seconds) {
          if (isLast && fadeEl) fadeEl.style.opacity = 1;
          src.stop(); src.disconnect(); done(); return;
        }
        if (elapsed >= 0) {
          const tick = Math.floor(elapsed * TICKS_PER_SECOND);
          const hit = frameAt(spans, tick);
          if (hit && engine) {
            // EVERY TICK, not only when the scene changes. The recorded path
            // has five stills a scene and nothing between them; a computed one
            // has a new answer each tick, and stepping is also how the loop
            // modes and the beat sync accumulate their state.
            if (tick !== lastTick) {
              // A HARD CEILING ON MAKING UP TIME, which is not about slow
              // machines: a BACKGROUNDED TAB stops requestAnimationFrame while
              // the audio clock keeps running, so coming back after two minutes
              // asks for six thousand ticks in one frame. Nothing that steps
              // per tick can survive that, however cheap each step is.
              //
              // Past the ceiling the loop stops making up time and jumps, which
              // costs the accumulated part of the animation for the ticks it
              // skipped. That is a real loss and it is the right trade: the
              // alternative is a frame that never finishes, and the beat cues
              // re-trigger those nodes within a bar anyway.
              const CATCHUP_MAX = 100;      // two seconds of show
              const behind = tick - lastTick - 1;
              debugCaught = Math.max(0, behind);
              if (debugCaught > debugCaughtMax) debugCaughtMax = debugCaught;
              const from = behind > CATCHUP_MAX ? tick - CATCHUP_MAX : lastTick + 1;
              for (let t = from; t < tick; t++) {
                // Catch up any tick a dropped frame skipped, so the animation
                // state is stepped once per tick whatever the display does.
                //
                // RESOLVED PER TICK, AND ON THE SCENE'S OWN CLOCK. This used to
                // step `hit.span` at `t - hit.span.start`, which is wrong twice
                // over: a skipped tick can belong to an earlier span than the
                // one now on screen, and `start` is where this SCHEDULE ENTRY
                // began rather than where the scene did. Three of part one's
                // scenes are replayed four times over by `new_camera` entries,
                // so across those boundaries the two differ by hundreds of
                // ticks and the engine was handed a clock that jumped backwards
                // every frame — the keyframe cursors and loop origins accumulate
                // forward, so what came out was a camera that would not move.
                const h = frameAt(spans, t);
                if (!h) continue;
                // ANIMATION ONLY — an intermediate tick is overdrawn before
                // anyone sees it, so it needs the state stepped and none of the
                // geometry, let alone the GL.
                try { advanceComputed(h.span, h.local, cueAt.get(t) ?? -1, t); }
                catch { /* reported below */ }
              }
              lastTick = tick;
              let info = null;
              try {
                info = renderComputed(hit.span, hit.local,
                  cueAt.get(tick) ?? -1, tick);
              } catch (e) {
                say(`${spec.label} ${hit.slot} — engine: ${e.message}`);
              }
              // NOTHING SAID PER FRAME, unless '\u00a7' asked for it. The status
              // line was a running readout of scene, time and draw count in the
              // corner of every frame of the intro; it is a debugging aid and
              // the intro is not being debugged while somebody watches it.
              // `?inspect=1` and the check suites read the same numbers off
              // `__demo` and the tick loop. #debug is the same numbers again,
              // for the case where the thing being debugged is the picture and
              // the only way to see it is to watch it go past.
              if (debugOn && debugEl) {
                debugEl.textContent = debugText(spec.label, hit, info, tick,
                  elapsed, cueAt.get(tick) ?? -1);
              }
            }
          } else if (hit) {
            const key = `${hit.scene}:${hit.frame}`;
            if (key !== shown) {
              shown = key;
              renderRecorded(hit.scene, hit.frame);
            }
          }
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // THE BUTTON IS HIDDEN EVERYWHERE IT CANNOT WORK, and these three modes are
  // all such places: the inspector must draw only what it is asked to draw, and
  // the single-frame modes render one still and stop, so starting five minutes
  // of music over them would be a lie about what the page is doing. Until now
  // the only line touching #start hid it on the DEFAULT path — the one mode
  // where it now does something — leaving a control that promised sound and had
  // no click handler at all visible in exactly the modes that render.
  const soundless = params.has('inspect') || params.has('oracle') || params.has('scene');
  if (startEl && soundless) startEl.hidden = true;

  if (params.has('inspect')) {
    // The shared inspector contract. Assign __demo LAST, then the ready flag.
    window.__demo = {
      // The depth precision actually in force. The original's z buffer was 16
      // bits; WebGL's default framebuffer is usually 24 and cannot be asked for
      // less, so the shim renders into its own target and blits.
      depth: { target: w3d.fbo ? 'fbo' : 'canvas',
        bits: w3d.fbo ? w3d.depthBits : w3d.gl.getParameter(w3d.gl.DEPTH_BITS) },
      id: 'planet-potion',
      schedule: () => (dataset?.scenes ?? []).map((s, i) => ({
        name: `${s.part} ${s.slot}`, phase: s.part, start: 0,
        dur: (s.durTicks ?? 0) / 50, captureStart: (s.startTick ?? 0) / 50,
      })),
      plan: () => (dataset?.scenes ?? []).flatMap((s, i) =>
        (s.frames ?? []).map((f, k) => ({
          part: `${s.part} ${s.slot}`, phase: s.part, local: f.t / 50,
          captureTime: ((s.startTick ?? 0) + f.t) / 50, _scene: i, _frame: k,
        }))),
      render: async (e) => renderRecorded(e._scene ?? 0, e._frame ?? 0),
      // EVERY STAGE, not two of them. An inspector comparing a frame against
      // the capture needs to know which halves of the pipeline produced it,
      // and `draws: 'recorded'` said that for one stage and implied nothing
      // about the other six.
      state: () => ({
        ...provenance(stages, {
          textures: textures
            ? `${JSON.stringify(textures.counts)}` +
              (textures.failures.length ? `, ${textures.failures.length} failed` : '')
            : 'absent',
        }),
        stageErrors,
        // The fog plumbing, which is otherwise invisible: it needs
        // render_state.json AND a resolved `fog` on each scene in draws.json,
        // and either one missing leaves every scene clear with nothing to see.
        // FROM WHICHEVER SOURCE IS LOADED. draws.json is not fetched at all on
        // the computed path, so reading the scenes only from there reported no
        // fog on the very path that now draws it.
        fog: {
          presets: fogPresets.length,
          scenes: (dataset?.scenes
            ?? ['p1', 'p3'].flatMap((part) => (schedule?.[part]?.schedule ?? [])
              .map((e) => ({ part, slot: e.slot, fog: e.fog }))))
            .filter((s) => s.fog !== null && s.fog !== undefined)
            .map((s) => `${s.part}/${s.slot}=${s.fog}`),
        },
      }),
    };
    window.__demoReady = true;
    say('inspect mode — recorded stream only');
    return;
  }

  // ?show=p1&at=SECONDS — one computed frame at an absolute SHOW time, with
  // the schedule resolved here rather than by the caller. This is what a
  // comparison against the video capture needs: the capture has a clock and a
  // frame rate and no idea what a scene index is.
  if (engine && params.has('show')) {
    const part = params.get('show');
    // THE CUES, so the beat sync is right. Generating the module costs a couple
    // of seconds and is the whole reason this mode installs a function on
    // `window` rather than rendering once and stopping: a sweep over the
    // capture wants forty frames out of one page load, not forty page loads.
    // THE CUES ONLY, so no PCM is mixed. `Sequencer.run()` walks the pattern
    // data and reports every effect-7 with its tick; `render()` does that too
    // and then spends a second mixing 438 seconds of audio nobody is going to
    // hear. The module itself comes out of the cache.
    let cues = [];
    try {
      await moduleReady(part);
      cues = (await audio.cues(part)).cues ?? [];
    } catch (e) {
      say(`could not read the music's cues: ${e.message}`);
    }
    // ONE FORWARD PASS, which is how the show runs and the only way the state
    // is right. Two things made a per-sample render wrong:
    //
    //   * `anim.origin` is not a pure function of the cue list. A looping mode
    //     SUBTRACTS the track length from it as it wraps, which is where the
    //     arena's negative origins come from, so it cannot be reconstructed by
    //     scanning the cues — it has to be arrived at.
    //   * THE OVERLAY'S CLOCK IS THE PART'S, not the scene's. Rewinding it at
    //     every scene restarts its fade, and its quads are full-screen: every
    //     frame past the first scene came out as a flat wash. In the original
    //     it fades once at the start of part one and is invisible thereafter,
    //     which is exactly what the recording shows — 3 draws at tick 23, 2 at
    //     46, 0 at 92.
    //
    // So `sweep` walks the part from tick zero with the replayer's cues, and
    // hands back a frame at each tick asked for. Fourteen thousand ticks of
    // part one is about ninety seconds, once, for as many samples as wanted.
    const cueAt = new Map();
    for (const c of cues) cueAt.set(c.ticks50, c.value);
    const spans = spansFor(part);
    const lastTick = spans.reduce((m, s2) => Math.max(m, s2.end), 0);
    // ONLY THE SCENES ASKED FOR, and only as far as they are asked for.
    //
    // A scene's animation objects are created with origin 0 and pass 1 only
    // runs for the scene on screen, so a scene's clock genuinely starts at zero
    // when it starts — which means sampling it needs its own span stepped and
    // not the whole part. THE OVERLAY IS THE EXCEPTION: it runs on the PART's
    // clock, so it is stepped forward once across the sweep, in tick order,
    // and never rewound.
    //
    // Walking all 14,421 ticks of part one costs about 45 seconds. Looking at
    // one scene now costs its own span plus the overlay's lead-in, which is the
    // difference between iterating on the picture and waiting for it.
    const sweep = (ticks, grab) => {
      const want = [...ticks].sort((a, b) => a - b);
      const seen = new Map();
      engine.rewind();
      const ov = engine.overlay;
      const hasOverlay = part === ov.part;
      let ovAt = 0;      // how far the overlay has been stepped
      let lastScene = null;
      for (const k of want) {
        const h = frameAt(spans, k);
        if (!h) continue;
        const order = engine.orderOfSlot(h.span.part, h.span.slot);
        if (order == null) continue;
        const from = h.span.sceneStart ?? h.span.start;
        // The overlay first, forward only.
        if (hasOverlay && order !== ov.order) {
          for (; ovAt < k; ovAt++) {
            engine.frame(ov.part, ov.order, ovAt, cueAt.get(ovAt) ?? -1);
          }
        }
        // Then this scene, from its own beginning — unless the last sample was
        // in the same scene and earlier, in which case carry on from there.
        const key = `${h.span.part}/${h.span.slot}/${from}`;
        let start = from;
        if (lastScene && lastScene.key === key && lastScene.at <= k) {
          start = lastScene.at + 1;
        } else {
          engine.rewindScene(h.span.part, order);
        }
        let info = null;
        for (let t = start; t <= k; t++) {
          const hh = frameAt(spans, t) ?? h;
          info = renderComputed(hh.span, t - from, cueAt.get(t) ?? -1, t, t === k);
        }
        lastScene = { key, at: k };
        seen.set(k, grab ? grab(info) : info);
      }
      return ticks.map((t) => seen.get(t) ?? null);
    };
    const renderAt = (seconds) =>
      sweep([Math.round(seconds * TICKS_PER_SECOND)])[0];
    window.__pp = { renderAt, sweep, cues: cues.length, lastTick };
    // NOTHING IS RENDERED AT LOAD. A sweep walks the part from tick zero, so
    // doing one here to show a single frame would make the page take as long to
    // become ready as the sweep the caller is about to ask for.
    say(`${part} ready to sweep: ${lastTick} ticks, ${cues.length} cues, `
      + `textures ${textures ? `${textures.side} `
        + Object.entries(textures.counts).map(([k, v]) => `${k}:${v}`).join(',')
        : 'ABSENT'} — ${cache.report.join(', ')}`);
    window.__ppReady = true;
    return;
  }

  if (params.has('oracle') || params.has('scene')) {
    const s = Number(params.get('scene') ?? 1);
    const t = Number(params.get('t') ?? 0);
    // ONE COMPUTED FRAME, deterministically, when the emit stage is computed
    // and `?tick=` names an absolute tick. Without this the engine only ever
    // runs inside the audio loop, and nothing in a browser can look at a
    // computed frame without playing five minutes of music at it.
    if (engine && params.has('tick')) {
      const tick = Number(params.get('tick'));
      const span = spansFor(params.get('part') ?? 'p1')[s];
      // A one-shot render names a tick INSIDE the scene, so the part clock the
      // overlay needs is that plus where the scene starts.
      const info = span
        ? renderComputed(span, tick, -1, (span.start ?? 0) + tick) : null;
      say(info
        ? `computed ${info.part} ${info.slot} tick=${tick}: `
          + `${info.objects} draws, ${info.triangles} triangles, `
          + `glError ${info.glError}`
        : 'no scene at that index');
      window.__frameReady = true;
      return;
    }
    const info = renderRecorded(s, t);
    say(info
      ? `recorded ${info.part} ${info.slot} t=${info.t}: `
        + `${info.objects} draws, ${info.triangles} triangles, glError ${info.glError}`
      : 'no recorded stream for that scene');
    // A SIGNAL RATHER THAN AN ASSUMPTION. This used to render during module
    // init, so a harness could wait two animation frames and be sure. It now
    // awaits the dataset, the textures and the cache first, and a check that
    // waits on the old assumption reads a blank canvas and reports the shim
    // broken.
    window.__frameReady = true;
    return;
  }

  const tex = textures
    ? `textures ${textures.side === 'recorded' ? 'loaded from the exported PNGs'
      : 'generated from bytecode'} (${Object.entries(textures.counts)
      .map(([k, v]) => `${k}:${v}`).join(', ')}${textures.failures.length
      ? `, ${textures.failures.length} failed` : ''})`
    : 'no texture bytecode present';

  // A rejected stage request is said out loud. The page still renders — with
  // the side that exists — but it must not look as though it did what it was
  // asked, which is the one failure mode a switch like this can introduce.
  if (stageErrors.length) say(`stage request refused: ${stageErrors.join('; ')}`);

  if (startEl) {
    startEl.hidden = false;
    // `once` matters: a second AudioContext would play the show over itself.
    startEl.addEventListener('click', async () => {
      startEl.hidden = true;
      // The context has to be constructed inside the gesture, or the autoplay
      // policy starts it suspended and the whole show plays to a muted output
      // while the clock runs — silence that looks like a rendering bug.
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      try {
        for (const spec of SHOW) await playPart(ctx, spec);
        say('Planet Potion — Potion, 2002\nreload to run it again');
      } catch (e) {
        // WHERE, not just what. The packed build is minified and drops every
        // console call, so a thrown message on its own names nothing; the
        // breadcrumb is the only thing that says which stage it came from.
        say(`sound failed during ${where}\n${e.message}`);
      } finally {
        ctx.close();
      }
    }, { once: true });
  }

  // What it IS, not what it took to get here — the per-stage timings have
  // already been on screen while they ran and `cache.report` keeps them for the
  // inspector. The one thing worth carrying into the resting state is a stage
  // that came up EMPTY, because a missing font is not visible until text is.
  // Precalc is over until the button is pressed, so the bar stops.
  if (barEl) barEl.hidden = true;
  const missing = cache.report.filter((r) => r.includes('NO '));
  say(`Planet Potion — Potion, 2002${missing.length ? `\n${missing.join('\n')}` : ''}`
    + `\n${SCREEN_W}\u00d7${SCREEN_H}, generated from the intro\u2019s own bytecode`);
}

main();
