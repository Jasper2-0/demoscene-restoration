const EXIT_START = Math.fround(29.990999221801758);
const QUAD = Object.freeze([
  Object.freeze({ uv: [0, 0], position: [-100, 100, 0] }),
  Object.freeze({ uv: [1, 0], position: [100, 100, 0] }),
  Object.freeze({ uv: [1, 1], position: [100, -100, 0] }),
  Object.freeze({ uv: [0, 1], position: [-100, -100, 0] }),
]);

/** Exact card transforms recovered from Wonder method 0x40db40. */
export function wonderDustTunnelState(localTime) {
  const time = Math.fround(localTime);
  let alpha = 1;
  if (time >= EXIT_START) {
    const fade = Math.min(Math.fround(time - EXIT_START), 1);
    alpha = Math.fround(1 - fade);
  }
  const halfTime = Math.fround(time * 0.5);
  const cappedHalfTime = Math.min(halfTime, 1.57);
  const pitchSine = Math.sin(cappedHalfTime);
  const pitch = Math.fround(pitchSine * pitchSine * 90 + 90);
  const cards = [];
  for (let strand = 0; strand < 2; strand++) {
    let phase = 0;
    let depth = 0;
    let longitudinal = -100;
    for (let index = 0; index < 8; index++) {
      const translation = strand === 0
        ? [0, 0, Math.fround(longitudinal + Math.sin(time * 0.4) * 90)]
        : [Math.fround(Math.sin(time * 0.242) * 50), 50, depth];
      cards.push({
        strand,
        index,
        translation,
        roll: Math.fround(time * Math.fround(25) + phase),
        pitch,
      });
      longitudinal -= 80;
      depth -= 34;
      phase += 16;
    }
  }
  return { alpha, drawAlpha: Math.fround(alpha * 0.19), cards };
}

/** Reimplementation of Wonder class 0x40dab0 / render method 0x40db40. */
export class DustTunnelEffect {
  constructor(mgl, texture) {
    this.mgl = mgl;
    this.texture = texture;
  }

  render(localTime) {
    const state = wonderDustTunnelState(localTime);
    const { mgl } = this;
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.bindTexture(this.texture);
    mgl.texEnv({ mode: 'modulate' });
    mgl.enableLighting(false);
    mgl.enableDepthTest(false);
    mgl.enableCullFace(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-0.5, 0.5, -0.375, 0.375, 1, 5000);
    mgl.color4(1, 1, 1, state.drawAlpha);
    for (const card of state.cards) {
      mgl.matrixMode(mgl.MODELVIEW);
      mgl.loadIdentity();
      mgl.translate(...card.translation);
      mgl.rotate(card.roll, 0, 0, 1);
      mgl.rotate(card.pitch, 1, 0, 0);
      mgl.begin(mgl.QUADS);
      for (const vertex of QUAD) {
        mgl.texCoord2(...vertex.uv);
        mgl.vertex3(...vertex.position);
      }
      mgl.end();
    }
    return state;
  }
}
