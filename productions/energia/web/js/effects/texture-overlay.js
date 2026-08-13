/** Recovered early Energia texture-cut compositor at 0x410080 (12–56 s). */
export class TextureOverlayEffect {
  constructor(mgl, textures) {
    this.mgl = mgl;
    this.textures = textures;
  }

  render(textureName) {
    const { mgl } = this;
    const texture = this.textures.get(textureName);
    if (!texture) throw new Error(`Energia overlay texture is not prepared: ${textureName}`);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableCullFace(false);
    mgl.enableLighting(false);
    mgl.enableBlend(true);
    // Exact executable factors. The monochrome design frames modulate the
    // procedural layers beneath them instead of acting as alpha cards.
    mgl.blendFunc(mgl.ONE_MINUS_SRC_COLOR, mgl.SRC_COLOR);
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.bindTexture(texture);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.ortho(0, 1, 1, 0, -1, 1);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.color4(1, 1, 1, 1);
    mgl.begin(mgl.QUADS);
    mgl.texCoord2(0, 0); mgl.vertex3(0, 0, 0);
    mgl.texCoord2(1, 0); mgl.vertex3(1, 0, 0);
    mgl.texCoord2(1, 1); mgl.vertex3(1, 1, 0);
    mgl.texCoord2(0, 1); mgl.vertex3(0, 1, 0);
    mgl.end();
    mgl.depthMask(true);
  }
}
