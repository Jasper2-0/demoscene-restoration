/** Reimplementation of Wonder class 0x4138a0. */
export class IntroductionPoemEffect {
  constructor(mgl, texture) {
    this.mgl = mgl;
    this.texture = texture;
  }

  render(localTime) {
    // Executable: sin(min(t * 0x3d95f011 * 3.14, 3.14)). Keeping the
    // original single-precision multiplier preserves its authored fade span.
    const alpha = Math.sin(Math.min(localTime * 0.07321179658174515 * 3.14, 3.14));
    const { mgl } = this;
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
    mgl.ortho(-1, 1, -1, 1, -1, 1);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.color4(1, 1, 1, Math.max(0, alpha));
    mgl.begin(mgl.QUADS);
    mgl.texCoord2(0, 0); mgl.vertex3(-1, 1, 0);
    mgl.texCoord2(1, 0); mgl.vertex3(1, 1, 0);
    mgl.texCoord2(1, 1); mgl.vertex3(1, -1, 0);
    mgl.texCoord2(0, 1); mgl.vertex3(-1, -1, 0);
    mgl.end();
    mgl.depthMask(true);
    return { alpha };
  }
}
