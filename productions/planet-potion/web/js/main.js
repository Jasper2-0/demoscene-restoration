// main.js — Planet Potion, browser restoration.
//
// STATE: the Warp3D shim exists and is verified; the engine does not. What this
// page can do today is play back the ORIGINAL's recorded draw stream through the
// shim, which is deliberately the first milestone: it tests the WebGL2
// translation on its own, with no reimplemented engine to confuse a difference
// with. See ../../work/re/PORT_SPEC.md and tools/inspect/ADAPTER.md.
//
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
// What that gets you is the intro at FIVE FRAMES PER SCENE. The recorded stream
// samples each scene's own span five times; real playback of the 438-second
// show would be 21,915 frames, and draws.json is already 19 MB for 140. The
// stills step in time with the music because the engine does not exist yet.

import { Warp3D, SCREEN_W, SCREEN_H } from './warp3d.js';
import { buildTextures, loadTextures } from './textures.js';
import { parseDBM } from './dbm.js';
import { render } from './dbmplayer.js';
import { generateModule } from './synth.js';
import { resolveStages, provenance } from './stages.js';

const canvas = document.getElementById('screen');
const statusEl = document.getElementById('status');
const startEl = document.getElementById('start');
const params = new URLSearchParams(location.search);

const say = (s) => { if (statusEl) statusEl.textContent = s; };

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
async function textureBinder(w3d, programs, kernels, side) {
  const { byPart, failures } = side === 'recorded'
    ? await loadTextures(programs)
    : buildTextures(programs, kernels);
  let live = null;
  return {
    failures, side,
    counts: Object.fromEntries(Object.entries(byPart).map(([k, v]) => [k, v.length])),
    use(part) {
      if (part === live || !byPart[part]) return;
      byPart[part].forEach((rgba, i) => { if (rgba) w3d.uploadTexture(i, rgba); });
      live = part;
    },
  };
}

async function main() {
  let w3d;
  try {
    w3d = new Warp3D(canvas);
  } catch (e) {
    say(`WebGL2 unavailable: ${e.message}`);
    return;
  }
  w3d.clear([0, 0, 0]);
  // ?texenv=0|1|2 — replace, modulate, decal. Undecided; see warp3d.js.
  if (params.has('texenv')) w3d.texEnv = Number(params.get('texenv'));

  // Which side of each pipeline stage to run. Reported through __demo.state()
  // whatever happens, so an inspector sweep records the provenance of the
  // picture it is looking at rather than assuming it.
  const { choice: stages, errors: stageErrors } = resolveStages(params);

  let dataset = null;
  let textures = null;
  try {
    dataset = await loadJSON('./data/draws.json');
  } catch {
    // The dataset is regenerable, not committed — see work/re/export.py.
    say('Warp3D shim ready. No recorded stream present: '
      + 'run work/re/export.py and copy out/ to web/data/.');
  }
  try {
    const [programs, kernels] = await Promise.all([
      loadJSON('./data/tex_programs.json'), loadJSON('./data/tex_kernels.json')]);
    textures = await textureBinder(w3d, programs, kernels, stages.textures);
  } catch {
    // Without the bytecode there is nothing to generate FROM. The draw stream
    // still replays, untextured, which is worth saying rather than showing.
  }

  /** Draw one recorded frame. Deterministic and order-independent by design. */
  const renderRecorded = (sceneIndex, frameIndex) => {
    if (!dataset) return null;
    const scene = dataset.scenes[sceneIndex];
    if (!scene?.frames?.length) return null;
    const frame = scene.frames[Math.min(frameIndex, scene.frames.length - 1)];
    textures?.use(scene.part);
    w3d.setZBuffer(false, false);
    w3d.clear([0, 0, 0]);
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
  const SHOW = [
    { part: 'p1', label: 'part one' },
    { part: 'p3', label: 'part three' },
  ];
  const TICKS_PER_SECOND = 50;

  /** One part's scenes in schedule order, with the tick span each occupies. */
  const spansFor = (part) => (dataset?.scenes ?? [])
    .map((s, i) => ({
      scene: i, frames: s.frames ?? [], slot: s.slot,
      start: s.startTick ?? 0, end: (s.startTick ?? 0) + (s.durTicks ?? 0),
      part: s.part,
    }))
    .filter((s) => s.part === part && s.frames.length)
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
        return { scene: s.scene, frame: k, slot: s.slot };
      }
    }
    return null;
  };

  /** Generate, sequence and mix one part, then show it against its own clock. */
  async function playPart(ctx, spec) {
    say(`${spec.label}: running the softsynth …`);
    const { seg0, seg4 } = await loadSegments();
    // Yield so the line above paints: generating part one is about 1.6 seconds
    // of straight-line arithmetic and it blocks the thread.
    await new Promise((r) => setTimeout(r, 0));
    const mod = parseDBM(generateModule(seg0, seg4, spec.part));
    say(`${spec.label}: mixing ${mod.info?.channels ?? '?'} channels …`);
    // render() is synchronous and takes about a second for part one, so yield
    // once and let the line above actually paint before the thread blocks.
    await new Promise((r) => setTimeout(r, 0));
    // ?octave=N transposes playback, for settling by ear the one thing the two
    // reference implementations disagree about. dbplayer.library puts the
    // instrument's own rate on note 0x60; libdigibooster3 puts it two octaves
    // lower, so it plays this module two octaves higher than we do. The
    // disassembly favours dbplayer and the correlation favours the oracle,
    // which is a disagreement an ear can settle and a metric cannot.
    const octaveShift = Number(params.get('octave') ?? 0) || 0;
    const { pcm, sampleRate, seconds } = render(mod,
      { sampleRate: ctx.sampleRate, octaveShift });

    const frames = pcm.length / 2;
    const buf = ctx.createBuffer(2, frames, sampleRate);
    const [L, R] = [buf.getChannelData(0), buf.getChannelData(1)];
    for (let i = 0; i < frames; i++) { L[i] = pcm[i * 2]; R[i] = pcm[i * 2 + 1]; }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const spans = spansFor(spec.part);
    const t0 = ctx.currentTime + 0.06;   // a beat of slack so frame 0 is not late
    src.start(t0);

    await new Promise((done) => {
      let shown = '';
      const step = () => {
        const elapsed = ctx.currentTime - t0;
        if (elapsed >= seconds) { src.stop(); src.disconnect(); done(); return; }
        if (elapsed >= 0) {
          const hit = frameAt(spans, elapsed * TICKS_PER_SECOND);
          const key = hit && `${hit.scene}:${hit.frame}`;
          if (hit && key !== shown) {
            shown = key;
            const info = renderRecorded(hit.scene, hit.frame);
            say(`${spec.label} ${hit.slot} — ${elapsed.toFixed(1)}s / `
              + `${seconds.toFixed(0)}s, ${info?.objects ?? 0} draws`);
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
      }),
    };
    window.__demoReady = true;
    say('inspect mode — recorded stream only');
    return;
  }

  if (params.has('oracle') || params.has('scene')) {
    const s = Number(params.get('scene') ?? 1);
    const t = Number(params.get('t') ?? 0);
    const info = renderRecorded(s, t);
    say(info
      ? `recorded ${info.part} ${info.slot} t=${info.t}: `
        + `${info.objects} draws, ${info.triangles} triangles, glError ${info.glError}`
      : 'no recorded stream for that scene');
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
        say('the show is over — reload to run it again');
      } catch (e) {
        say(`sound failed: ${e.message}`);
      } finally {
        ctx.close();
      }
    }, { once: true });
  }

  say(`Warp3D shim ready (${SCREEN_W}x${SCREEN_H}); ${tex}. `
    + 'Press “Start with sound” for the real soundtrack with the recorded '
    + 'frames locked to it, or add ?scene=N&t=M for one frame.');
}

main();
