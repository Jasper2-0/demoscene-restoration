import { sampleEnvelope } from '../shared/envelope.js';

// Wonder retains the editor's green/red diffuse swatches in beginning.exp,
// but Wonder's textured material path emits 0xff vertex intensity. Let the
// MAX/nebulamultip maps provide their authored color instead of tinting them.
export const WONDER_BEGINNING_MATERIAL_COLORS = new Map([
  [0, Object.freeze([1, 1, 1])],
  [1, Object.freeze([1, 1, 1])],
]);

// Both materials store their second image in EXP's environment-map slot.
// Wonder's renderer feeds that slot generated normal coordinates on texture
// unit one rather than duplicating the primary mesh UVs.
export const WONDER_BEGINNING_ENVIRONMENT_MAP_UNITS = new Map([
  [0, new Set([1])],
  [1, new Set([1])],
]);

/** Exact top-level behavior recovered for Wonder class 0x4106a0. */
export class BeginningEffect {
  constructor(mgl, sceneRenderer, textures, { circleAlpha, exit }) {
    this.mgl = mgl;
    this.sceneRenderer = sceneRenderer;
    this.textures = textures;
    this.circleAlpha = circleAlpha;
    this.exit = exit;
  }

  drawFullscreen(texture, alpha) {
    const { mgl } = this;
    mgl.bindTexture(texture);
    mgl.color4(1, 1, 1, Math.max(0, Math.min(1, alpha)));
    mgl.begin(mgl.QUADS);
    mgl.texCoord2(0, 0); mgl.vertex3(-1, 1, 0);
    mgl.texCoord2(1, 0); mgl.vertex3(1, 1, 0);
    mgl.texCoord2(1, 1); mgl.vertex3(1, -1, 0);
    mgl.texCoord2(0, 1); mgl.vertex3(-1, -1, 0);
    mgl.end();
  }

  render(localTime, { clear = true } = {}) {
    const pulse = sampleEnvelope(this.circleAlpha, localTime);
    const cameraFrame = localTime * 15 + (60 / (localTime + 1)) * pulse;
    const objectFrame = localTime * 20;
    const textureScroll = localTime * 1.4;
    // The executable samples the exit curve one second late. Its value grows
    // from 0 to 400, then is multiplied by .01 before attenuating the common
    // alpha. OpenGL clamps negative color components at the framebuffer.
    const commonAlpha = (1 - sampleEnvelope(this.exit, localTime - 1) * 0.01)
      * (pulse + 0.2);
    const textureOffsets = new Map([
      [0, [0.3, textureScroll + 0.5]],
      [1, [textureScroll, 0]],
    ]);
    const nativeSceneState = {
      cameraFrame,
      materialTextureOffsets: textureOffsets,
      materialColorOverrides: WONDER_BEGINNING_MATERIAL_COLORS,
      materialEnvironmentMapUnits: WONDER_BEGINNING_ENVIRONMENT_MAP_UNITS,
      opacityScale: commonAlpha,
      cullFaceOverride: false,
    };

    // 0x410840-0x410966 draws the background QuadPatch with depth testing
    // disabled, then enables depth before drawing B2.LWO and B2.LWO01. The
    // background therefore never seeds the depth buffer or hides the later
    // foreground fragments.
    this.sceneRenderer.render(objectFrame, {
      clear,
      ...nativeSceneState,
      meshIndices: [1],
      depthTest: false,
    });
    this.sceneRenderer.render(objectFrame, {
      clear: false,
      ...nativeSceneState,
      meshIndices: [0, 4],
      depthTest: true,
    });

    const mix = 1 - pulse ** 4;

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
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.ortho(-1, 1, -1.4, 1.4, -1, 1);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    this.drawFullscreen(this.textures.get('overtake.jpg'), commonAlpha * mix);
    this.drawFullscreen(this.textures.get('overtake2.jpg'), commonAlpha * (1 - mix));
    mgl.depthMask(true);

    return { cameraFrame, objectFrame, pulse, commonAlpha };
  }
}
