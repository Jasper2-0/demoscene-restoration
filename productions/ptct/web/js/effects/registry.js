// Effect registry: effectId → effect object {init?, render(t, pos), trigger?}.
// Ids and layers come from the shipped script (work/re/engine/TIMELINE.txt).
// Overlays 0x32–0x37 and 0x46 are fully implemented; the 3D effects are
// stubs to be filled in against the Renderer API (see API.md).

import { make32, make33, make34, make35, make36, make37 } from './overlays.js';
import { makeEffect as eff0a } from './eff0a_landscape.js';
import { makeEffect as eff0c } from './eff0c_tubes.js';
import { makeEffect as eff0d } from './eff0d_lightgrid.js';
import { makeEffect as eff10 } from './eff10_pool.js';
import { makeEffect as eff11 } from './eff11_twintubes.js';
import { makeEffect as eff12 } from './eff12_titleboard.js';
import { makeEffect as eff13 } from './eff13_credits.js';
import { makeEffect as eff15 } from './eff15_tubeworm.js';
import { makeEffect as eff18 } from './eff18_blob.js';
import { makeEffect as eff19 } from './eff19_ribbon.js';
import { makeEffect as eff1a } from './eff1a_flower.js';
import { makeEffect as eff1c } from './eff1c_streaks.js';
import { makeEffect as eff1d } from './eff1d_greetings.js';
import { makeEffect as eff1e } from './eff1e_rings.js';
import { makeEffect as eff1f } from './eff1f_cylinder.js';
import { makeEffect as eff20 } from './eff20_domes.js';
import { makeEffect as eff21 } from './eff21_blobsphere.js';
import { makeEffect as eff3c } from './eff3c_pleaseit.js';
import { makeEffect as eff46 } from './eff46_endlogo.js';

export function buildRegistry(R) {
  const m = new Map();
  // 3D scenes
  m.set(0x0a, eff0a(R)); // landscape flyover
  m.set(0x0c, eff0c(R)); // triple-tube flight
  m.set(0x0d, eff0d(R)); // lightgrid floor + ceiling
  m.set(0x10, eff10(R)); // radial-wave pool
  m.set(0x11, eff11(R)); // twin warped tri-tubes
  m.set(0x12, eff12(R)); // title board
  m.set(0x13, eff13(R)); // credits pixel-spray
  m.set(0x15, eff15(R)); // swinging tube-worm
  m.set(0x18, eff18(R)); // marching-squares blob shells
  m.set(0x19, eff19(R)); // Lissajous tunnel ribbon
  m.set(0x1a, eff1a(R)); // spiky blob flower
  m.set(0x1c, eff1c(R)); // streak field
  m.set(0x1d, eff1d(R)); // greetings typewriter
  m.set(0x1e, eff1e(R)); // rotating-rings bounce
  m.set(0x1f, eff1f(R)); // morphing cylinder
  m.set(0x20, eff20(R)); // jumping cloth-domes
  m.set(0x21, eff21(R)); // pulsating cos-blob sphere
  m.set(0x3c, eff3c(R)); // "p l e a s e   i t" flashes
  // 2D overlays
  m.set(0x32, make32(R)); // white flash 1.0−0.0002t
  m.set(0x33, make33(R)); // black fade-in 1.0−0.0002t
  m.set(0x34, make34(R)); // additive grid-cross zoom flash
  m.set(0x35, make35(R)); // black slow veil 1.0−0.00001t
  m.set(0x36, make36(R)); // black flash 0.7−0.0002t
  m.set(0x37, make37(R)); // white flash 0.7−0.0002t
  m.set(0x46, eff46(R)); // end logo fade
  return m;
}
