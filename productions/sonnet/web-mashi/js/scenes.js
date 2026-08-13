// scenes.js — the seam between main.js and the effect objects.
//
// `buildScenes(d3d, { atlas, params })` returns an array indexed 2..10 exactly
// as the original's object array.  Anything left null is skipped by timeline.js,
// so the demo still runs with only some of the objects ported.
//
//   2      the ragged border      (scene_camera.js — see the header there:
//                                  it is NOT the camera, ENGINE.md guessed wrong)
//   3..6   scenes 0..3            (scene3.js .. scene6.js)
//   7..10  scenes 4,5,7,8         (scene7.js .. scene10.js)
//
// Objects 3..10 are eight instances of ONE class in the original (class id 3 in
// the table at 0x41a038).  They were briefly two independent ports; they are one
// again — scene7.js holds the class, the other seven files pick a sceneIdx.
// See re/scenes/CONSOLIDATION.md.

import { Border } from './scene_camera.js';
import { makeScene3 } from './scene3.js';
import { makeScene4 } from './scene4.js';
import { makeScene5 } from './scene5.js';
import { makeScene6 } from './scene6.js';
import { buildScene7, Landscape, texgenImage } from './scene7.js';
import { buildScene8 } from './scene8.js';
import { buildScene9 } from './scene9.js';
import { buildScene10 } from './scene10.js';

// ---------------------------------------------------------------------------
// THE ONLY EDIT THE LENS FLARE NEEDS.  flare.js owns FUN_00405082 / FUN_0040520d
// / FUN_004050ed / FUN_004051ac and the 4x4 software occlusion query; it attaches
// itself to the shared `Landscape` class by wrapping build / reset / tick /
// render, so scene7.js stays untouched by it.  Since the consolidation that
// class is shared by ALL EIGHT scene objects, so objects 3..6 now get the
// authentic occlusion-gated sprite too, in place of the always-visible one
// scene3.js used to draw early in the frame.  `?flare=0` turns it off.
// See re/scenes/FLARE.md and re/scenes/CONSOLIDATION.md §3.
import { installFlare } from './flare.js';
installFlare(Landscape, texgenImage);
// ---------------------------------------------------------------------------

/**
 * @param {object} d3d
 * @param {object} opts
 * @param {(done:number,total:number)=>Promise<void>|void} [onProgress] called
 *        after each object's `build()`, so the caller can repaint the loading
 *        screen.  **Yielding here does not change anything the demo generates:**
 *        the constructors still run in their original order, and so do the
 *        builds — only the event loop gets a breath between them.  That matters
 *        because the shared RNG stream (js/rng.mjs) makes build ORDER part of
 *        the spec (re/scenes/TREE_IMPOSTOR.md).
 */
export async function buildScenes(d3d, opts = {}, onProgress = null) {
  const objects = new Array(11).fill(null);
  objects[2] = new Border(d3d);
  objects[3] = makeScene3(d3d, opts);
  objects[4] = makeScene4(d3d, opts);
  objects[5] = makeScene5(d3d, opts);
  objects[6] = makeScene6(d3d, opts);
  objects[7] = buildScene7(d3d, opts);
  objects[8] = buildScene8(d3d, opts);
  objects[9] = buildScene9(d3d, opts);
  objects[10] = buildScene10(d3d, opts);
  // Every scene now builds SYNCHRONOUSLY off `runTexgen`, so by the time this
  // returns the geometry exists.  (Objects 3..6 used to await baked PNG decodes
  // and set `globalThis.__scenesReady` to the pending Promise.all — which
  // main.js then overwrote with its own status object a few lines later, so
  // nothing ever awaited it.  See CONSOLIDATION.md §4.)  `m3` at t = 0xffff
  // builds each object anyway; this is belt and braces, and it makes a build
  // failure throw out of buildScenes where main.js reports it loudly.
  //   Each `build()` is a long synchronous chunk — with `?lighting=fixed` it
  // also runs FUN_0040e923's ~200 ms shadow bake per terrain scene (several
  // times that on Safari's JavaScriptCore).  Nine of those back to back read as
  // a HANG after the preloader, which is why the lighting fix could not be the
  // default.  Awaiting between them lets the loading screen repaint.
  const buildable = objects.filter((o) => o && typeof o.build === 'function');
  let done = 0;
  for (const o of objects) {
    if (!o || typeof o.build !== 'function') continue;
    o.build();
    done++;
    if (onProgress) await onProgress(done, buildable.length);
  }
  return objects;
}

export default buildScenes;
