// Scene registry. Each scene module exports `makeScene(ctx)` returning
// { init?(), render(pos, extra) } where pos is the normalized music position
// (see ../timeline.js) and extra.ms is wall-clock ms since start (the original
// uses timeGetTime for smooth per-frame motion alongside the music clock).
import { makeScene as introTitles } from './eff_intro.js';
import { makeScene as sceneA } from './eff_a.js';
import { makeScene as sceneB } from './eff_b.js';
import { makeScene as sceneC } from './eff_c.js';
import { makeScene as sceneD } from './eff_d.js';
import { makeScene as sceneE } from './eff_e.js';
import { makeScene as sceneF } from './eff_f.js';
import { makeScene as credits } from './eff_credits.js';
import { makeScene as finale } from './eff_finale.js';

export function buildRegistry(K, d3d, textures) {
  const ctx = { K, d3d, textures };
  const m = new Map();
  m.set('intro_titles', introTitles(ctx));
  m.set('sceneA', sceneA(ctx));
  m.set('sceneB', sceneB(ctx));
  m.set('sceneC', sceneC(ctx));
  m.set('sceneD', sceneD(ctx));
  m.set('sceneE', sceneE(ctx, 0));
  m.set('sceneF', sceneF(ctx));
  m.set('sceneE2', sceneE(ctx, 1));
  m.set('credits', credits(ctx));
  m.set('finale', finale(ctx));
  return m;
}
