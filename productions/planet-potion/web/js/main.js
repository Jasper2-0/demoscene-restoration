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

import { Warp3D, SCREEN_W, SCREEN_H } from './warp3d.js';
import { buildTextures } from './textures.js';

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
function textureBinder(w3d, programs, kernels) {
  const { byPart, failures } = buildTextures(programs, kernels);
  let live = null;
  return {
    failures,
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
    textures = textureBinder(w3d, programs, kernels);
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
      state: () => ({
        draws: 'recorded',
        textures: textures
          ? `generated from bytecode (${JSON.stringify(textures.counts)})`
          : 'absent',
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

  if (startEl) startEl.hidden = true;
  const tex = textures
    ? `textures generated from bytecode (${Object.entries(textures.counts)
      .map(([k, v]) => `${k}:${v}`).join(', ')}${textures.failures.length
      ? `, ${textures.failures.length} failed` : ''})`
    : 'no texture bytecode present';
  say(`Warp3D shim ready (${SCREEN_W}x${SCREEN_H}); ${tex}. `
    + 'No engine yet — add ?oracle=1 to replay the original’s recorded stream.');
}

main();
