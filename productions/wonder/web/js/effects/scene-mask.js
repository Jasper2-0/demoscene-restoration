const ORTHO_LIMIT = 1.570795;
const ORTHO_CAP = Math.fround(1.5708450078964233);

function fmod(value, divisor) {
  return value % divisor;
}

/** Exact immediate-mode geometry recovered from Wonder method 0x40f3b0. */
export function wonderSceneMaskState(localTime) {
  const time = Math.fround(localTime);
  const capped = time >= ORTHO_LIMIT ? ORTHO_CAP : time;
  const slide = Math.sin(capped) * 5;
  const barTime = Math.fround(time * 0.61);
  const bars = [];
  for (let index = 0; index < 64; index++) {
    const phase = Math.fround(index * 0.064);
    const remainder = fmod(phase + barTime, 2);
    const storedRemainder = Math.fround(remainder);
    const firstWave = -(1 + Math.sin(remainder + barTime) * 0.53);
    const secondWave = Math.sin(storedRemainder * 2 + barTime) * 0.5;
    const wave = Math.fround(firstWave - secondWave);
    const x = Math.fround(wave + 1);
    bars.push({
      index,
      x,
      yTopLeft: Math.fround(storedRemainder - 0.911),
      yTopRight: Math.fround(storedRemainder - 0.91),
      yBottom: Math.fround(storedRemainder - 1),
    });
  }
  const strips = [];
  for (let index = 0; index < 6; index++) {
    const phase = Math.fround(index * 0.25012);
    const motion = Math.sin(time + index * 0.3213);
    const wave = Math.fround(motion * motion * motion * motion * motion);
    strips.push({
      index,
      phase,
      phaseEnd: Math.fround(phase + 1),
      alpha: Math.fround(phase * 0.1),
      // 0x40f7c7 raises sin(time + index*0.3213) to the fifth power;
      // time is not itself used as the horizontal translation.
      left: Math.fround(wave + 1.91),
      right: Math.fround(wave + 2.2),
    });
  }
  return {
    ortho: [4 - slide, 9 - slide, -1, 1, -1, 1],
    bars,
    strips,
  };
}

/** Reimplementation of Wonder class 0x40f2f0 / render method 0x40f3b0. */
export class SceneMaskEffect {
  constructor(mgl, texture) {
    this.mgl = mgl;
    this.texture = texture;
  }

  render(localTime) {
    const state = wonderSceneMaskState(localTime);
    const { mgl } = this;
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.bindTexture(this.texture);
    mgl.texEnv({ mode: 'modulate' });
    mgl.enableCullFace(false);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableLighting(false);
    mgl.enableBlend(true);
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.ortho(...state.ortho);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();

    mgl.blendFunc(mgl.ONE, mgl.SRC_ALPHA);
    mgl.color4(1, 1, 1, Math.fround(0.9));
    mgl.begin(mgl.QUADS);
    mgl.texCoord2(0, 0); mgl.vertex3(-1, 1, 0);
    mgl.texCoord2(0.75, 0); mgl.vertex3(4, 1, 0);
    mgl.texCoord2(0.75, 1); mgl.vertex3(4, -1, 0);
    mgl.texCoord2(0, 1); mgl.vertex3(-1, -1, 0);
    mgl.end();

    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE_MINUS_SRC_ALPHA);
    mgl.begin(mgl.QUADS);
    for (const bar of state.bars) {
      mgl.color4(1, 1, 1, Math.fround(0.725));
      mgl.texCoord2(0, 0);
      mgl.vertex3(1, bar.yTopLeft, 0);
      mgl.color4(1, 1, 1, 1);
      mgl.vertex3(bar.x, bar.yBottom, 0);
      mgl.color4(1, 1, 1, 1);
      mgl.vertex3(bar.x, bar.yTopRight, 0);
      mgl.color4(1, 1, 1, Math.fround(0.725));
      mgl.vertex3(1, bar.yBottom, 0);
    }
    mgl.end();

    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ZERO);
    mgl.color4(1, 1, 1, Math.fround(0.41));
    mgl.begin(mgl.QUADS);
    mgl.texCoord2(0, 1); mgl.vertex3(0.8, -1, 0);
    mgl.texCoord2(1, 1); mgl.vertex3(0.8, 1, 0);
    mgl.texCoord2(1, 0); mgl.vertex3(1.25, 1, 0);
    mgl.texCoord2(0, 0); mgl.vertex3(1.25, -1, 0);
    mgl.end();

    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE_MINUS_SRC_ALPHA);
    mgl.begin(mgl.QUADS);
    for (const strip of state.strips) {
      mgl.color4(1, 1, 1, strip.alpha);
      mgl.texCoord2(0, strip.phase); mgl.vertex3(strip.left, 1, 0);
      mgl.texCoord2(0.51, strip.phase); mgl.vertex3(strip.right, 1, 0);
      mgl.texCoord2(0.51, strip.phaseEnd); mgl.vertex3(strip.right, -1, 0);
      mgl.texCoord2(0, strip.phaseEnd); mgl.vertex3(strip.left, -1, 0);
    }
    mgl.end();
    mgl.depthMask(true);
    return state;
  }
}
