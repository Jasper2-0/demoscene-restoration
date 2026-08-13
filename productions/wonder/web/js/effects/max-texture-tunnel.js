const TIME_RATE = 0.9;
const DEPTH_RATE = 0.4;
const DEPTH_START = -100;
const DEPTH_STEP = 80;
const DEPTH_SWING = 90;
const ROTATION_RATE = 25;
const TILT_RATE = 0.5;
const TILT_LIMIT = 1.57;
const CARD_ALPHA = 0.19;

export function wonderMaxTextureAlpha(localTime) {
  const time = Math.fround(localTime);
  let alpha = time < 2 ? Math.min(time, 1) : 1;
  if (time >= Math.fround(16.1)) {
    alpha = 1 - Math.min((time - Math.fround(16.1)) * 0.6, 1);
  }
  return Math.max(0, alpha) * CARD_ALPHA;
}

export function wonderMaxTextureCards(localTime) {
  const phase = Math.fround(Math.fround(localTime) * TIME_RATE);
  const tiltPhase = Math.min(phase * TILT_RATE, TILT_LIMIT);
  const tilt = Math.sin(tiltPhase) ** 2 * DEPTH_SWING + DEPTH_SWING;
  const cards = [];
  for (let strand = 0; strand < 2; strand++) {
    for (let plane = 0; plane < 8; plane++) {
      cards.push({
        translation: [
          0,
          strand * 70,
          Math.fround(Math.sin(phase * DEPTH_RATE) * DEPTH_SWING
            + DEPTH_START - plane * DEPTH_STEP),
        ],
        rotationZ: phase * ROTATION_RATE + plane * 16,
        tilt,
      });
    }
  }
  return cards;
}

/** Reimplementation of Wonder class 0x40d060's constructed mode-zero path. */
export class MaxTextureTunnelEffect {
  constructor(mgl, texture) {
    this.mgl = mgl;
    this.texture = texture;
  }

  drawCard() {
    const { mgl } = this;
    mgl.begin(mgl.QUADS);
    mgl.texCoord2(0, 0); mgl.vertex3(-100, 100, 0);
    mgl.texCoord2(1, 0); mgl.vertex3(100, 100, 0);
    mgl.texCoord2(1, 1); mgl.vertex3(100, -100, 0);
    mgl.texCoord2(0, 1); mgl.vertex3(-100, -100, 0);
    mgl.end();
  }

  render(localTime) {
    const { mgl } = this;
    const alpha = wonderMaxTextureAlpha(localTime);
    const cards = wonderMaxTextureCards(localTime);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableCullFace(false);
    mgl.enableLighting(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.bindTexture(this.texture);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-0.5, 0.5, -0.375, 0.375, 1, 5000);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.color4(1, 1, 1, alpha);
    for (const card of cards) {
      mgl.loadIdentity();
      mgl.translate(...card.translation);
      mgl.rotate(card.rotationZ, 0, 0, 1);
      mgl.rotate(card.tilt, 1, 0, 0);
      this.drawCard();
    }
    mgl.depthMask(true);
    return { alpha, cards };
  }
}
