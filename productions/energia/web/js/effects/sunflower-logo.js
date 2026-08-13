function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/** Compiled scalar channels in the 0x412750 s.raw/sb.raw overlay. */
export function energiaSunflowerLogoState(seconds) {
  const time = Math.fround(seconds);
  const local = time - 6;
  const envelope = clamp01(local * 0.5) * (1 - clamp01(local - 11));
  if (envelope === 0) {
    return { local, envelope: 0, mix: 0, alpha: 0, blurredAlpha: 0, width: 800, height: 100 };
  }
  const phase = local - 5;
  const alpha = clamp01(phase * 0.054) * envelope;
  const mix = clamp01(phase * 0.4);
  return {
    local,
    envelope,
    mix,
    alpha,
    blurredAlpha: (1 - mix) * alpha,
    width: 800 - 380 * mix,
    height: 100 - 25 * mix,
  };
}

export class EnergiaSunflowerLogoEffect {
  constructor(mgl, { sharp, blurred }) {
    this.mgl = mgl;
    this.sharp = sharp;
    this.blurred = blurred;
  }

  _quad(texture, alpha, width, height) {
    if (alpha <= 0) return;
    const { mgl } = this;
    const halfWidth = width * 0.5;
    const halfHeight = height * 0.5;
    mgl.bindTexture(texture);
    mgl.color4(1, 1, 1, alpha);
    mgl.begin(mgl.QUADS);
    mgl.texCoord2(0, 0); mgl.vertex3(-halfWidth, -halfHeight, 0);
    mgl.texCoord2(0, 1); mgl.vertex3(-halfWidth, halfHeight, 0);
    mgl.texCoord2(1, 1); mgl.vertex3(halfWidth, halfHeight, 0);
    mgl.texCoord2(1, 0); mgl.vertex3(halfWidth, -halfHeight, 0);
    mgl.end();
  }

  render(seconds) {
    const state = energiaSunflowerLogoState(seconds);
    if (state.envelope === 0) return state;
    const { mgl } = this;
    const width = mgl.gl.drawingBufferWidth;
    const height = mgl.gl.drawingBufferHeight;
    const aspect = height / width;
    mgl.viewport(0, 0, width, height);
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-0.5, 0.5, -aspect * 0.5, aspect * 0.5, 1, 5000);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.translate(0, 0, -500);
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.enableLighting(false);
    mgl.enableCullFace(false);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    this._quad(this.sharp, state.alpha, state.width, state.height);
    this._quad(this.blurred, state.blurredAlpha, state.width, state.height);
    mgl.depthMask(true);
    return state;
  }
}
