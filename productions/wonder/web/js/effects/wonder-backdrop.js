export const WONDER_BACKDROP_QUAD = Object.freeze([
  Object.freeze({ uv: [0, 0], position: [-1, 1, 0] }),
  Object.freeze({ uv: [1, 0], position: [1, 1, 0] }),
  Object.freeze({ uv: [1, 1], position: [1, -1, 0] }),
  Object.freeze({ uv: [0, 1], position: [-1, -1, 0] }),
]);

/** Reimplementation of Wonder class 0x40fe10 / render method 0x40ff40. */
export class WonderBackdropEffect {
  constructor(mgl, texture) {
    this.mgl = mgl;
    this.texture = texture;
  }

  render() {
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
    mgl.ortho(-1, 1, -1, 1, -1, 1);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.color4(1, 1, 1, 1);
    mgl.begin(mgl.QUADS);
    for (const vertex of WONDER_BACKDROP_QUAD) {
      mgl.texCoord2(...vertex.uv);
      mgl.vertex3(...vertex.position);
    }
    mgl.end();
    return WONDER_BACKDROP_QUAD;
  }
}
