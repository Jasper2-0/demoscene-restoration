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

/** Textures are exported as PNGs by work/re/export.py; index by table order. */
async function loadTextures(w3d, manifest) {
  const bitmaps = await Promise.all(manifest.map(async (name) => {
    const blob = await (await fetch(`./data/textures/${name}`)).blob();
    return createImageBitmap(blob);
  }));
  const c = new OffscreenCanvas(128, 128);
  const ctx = c.getContext('2d');
  bitmaps.forEach((bm, i) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.drawImage(bm, 0, 0);
    w3d.uploadTexture(i, new Uint8Array(ctx.getImageData(0, 0, 128, 128).data.buffer));
  });
  return bitmaps.length;
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

  let dataset = null;
  try {
    dataset = await loadJSON('./data/draws.json');
    if (dataset.textures) await loadTextures(w3d, dataset.textures);
  } catch {
    // The dataset is regenerable, not committed — see work/re/export.py.
    say('Warp3D shim ready. No recorded stream present: '
      + 'run work/re/export.py and copy out/ to web/data/.');
  }

  /** Draw one recorded frame. Deterministic and order-independent by design. */
  const renderRecorded = (sceneIndex, frameIndex) => {
    if (!dataset) return null;
    const scene = dataset.scenes[sceneIndex];
    if (!scene?.frames?.length) return null;
    const frame = scene.frames[Math.min(frameIndex, scene.frames.length - 1)];
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
      state: () => ({ source: 'recorded draw stream, not a reimplementation' }),
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
  say(`Warp3D shim ready (${SCREEN_W}x${SCREEN_H}). `
    + 'No engine yet — add ?oracle=1 to replay the original’s recorded stream.');
}

main();
