import { Mat4 } from '../shared/mathlib.js';
import { sampleScene } from '../shared/scene.js';

const BUMP_RATE = 3.14159275;
const BUMP_RADIUS = 0.005;
const MATERIAL_OPACITY_SCALE = 0.9999999;

const BUMP_QUAD = Object.freeze([
  Object.freeze({ uv: [0, 0], position: [-1, 1, -0.5] }),
  Object.freeze({ uv: [1, 0], position: [1, 1, -0.5] }),
  Object.freeze({ uv: [1, 1], position: [1, -1, -0.5] }),
  Object.freeze({ uv: [0, 1], position: [-1, -1, -0.5] }),
]);

function f32(value) {
  return Math.fround(value);
}

/** The 2-second entrance, full opacity through second 5, and 2-second exit. */
export function wonderEndFade(localTime) {
  const time = f32(localTime);
  if (time < 2) return f32(Math.min(f32(time * 0.5), 1));
  if (time <= 5) return 1;
  return f32(1 - Math.min(f32(f32(time - 5) * 0.5), 1));
}

/** Exact scalar state recovered from Wonder render method 0x40c380. */
export function wonderEndState(localTime) {
  const time = f32(localTime);
  const phase = time * BUMP_RATE;
  return {
    time,
    fade: wonderEndFade(time),
    bumpOffset: [
      f32(Math.sin(phase) * BUMP_RADIUS),
      f32(Math.cos(phase) * BUMP_RADIUS),
    ],
    sceneFrame: f32(f32(time * 15) + 60),
  };
}

function cameraMatrices(renderer, frame) {
  const camera = sampleScene(renderer.scene, frame).camera;
  if (!camera) throw new Error('Wonder end scene has no camera');
  const canvas = renderer.mgl.gl.canvas;
  const halfWidth = Math.tan(camera.fov * 0.5);
  const halfHeight = halfWidth * canvas.height / canvas.width;
  return {
    projection: new Mat4().frustum(
      -halfWidth, halfWidth, -halfHeight, halfHeight, 1, 10000,
    ),
    modelView: camera.viewMatrix,
  };
}

/** Reimplementation of Wonder class 0x40bfa0 / render method 0x40c380. */
export class EndEffect {
  constructor(mgl, renderer, bumpTexture) {
    this.mgl = mgl;
    this.renderer = renderer;
    this.bumpTexture = bumpTexture;
  }

  drawBumpCard(state) {
    const { mgl } = this;
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableCullFace(false);
    mgl.enableLighting(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE_MINUS_SRC_ALPHA);
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.ortho(-0.95, 0.95, -1.5, 1.5, 0, 1);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();

    // 0x40bce0 binds the same JPEG+height-alpha composite to both units. Unit
    // zero forms 0.5 + height0 - height1 with NV COMBINE4; unit one adds that
    // signed height difference to the half-intensity base colour.
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.bindTexture(this.bumpTexture);
    mgl.texEnv({
      mode: 'combine4',
      rgb: {
        operation: 'modulate',
        sources: ['texture', 'previous', 'constant', 'zero'],
        operands: ['src_color', 'src_color', 'src_alpha', 'one_minus_src_color'],
        scale: 1,
      },
      alpha: {
        operation: 'add_signed',
        sources: ['texture', 'zero', 'texture1', 'zero'],
        operands: ['src_alpha', 'one_minus_src_alpha', 'one_minus_src_alpha', 'one_minus_src_alpha'],
        scale: 1,
      },
    });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.activeTexture(1);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.bindTexture(this.bumpTexture);
    mgl.texEnv({
      mode: 'combine',
      rgb: {
        operation: 'add_signed',
        sources: ['previous', 'previous', 'constant'],
        operands: ['src_color', 'src_alpha', 'src_color'],
        scale: 2,
      },
      alpha: {
        operation: 'replace',
        sources: ['primary_color', 'texture', 'constant'],
        operands: ['src_alpha', 'src_alpha', 'src_alpha'],
        scale: 1,
      },
    });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.activeTexture(0);
    mgl.color4(0.5, 0.5, 0.5, state.fade);
    mgl.begin(mgl.QUADS);
    for (const vertex of BUMP_QUAD) {
      mgl.texCoord2(...vertex.uv);
      mgl.multiTexCoord2(1,
        vertex.uv[0] + state.bumpOffset[0], vertex.uv[1] + state.bumpOffset[1]);
      mgl.vertex3(...vertex.position);
    }
    mgl.end();

    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.texEnv({ mode: 'modulate' });
    mgl.activeTexture(0);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderEndState(localTime);
    const matrices = cameraMatrices(this.renderer, state.sceneFrame);
    if (clear) this.mgl.clear();
    this.drawBumpCard(state);
    const scales = new Map(this.renderer.scene.materials
      .map((_, index) => [index, MATERIAL_OPACITY_SCALE]));
    this.renderer.render(state.sceneFrame, {
      clear: false,
      depthTest: true,
      cullFaceOverride: false,
      opacityScale: state.fade,
      materialOpacityScales: scales,
      // FUN_0040bfa0 walks this object's material array at 0x0040c258-0x0040c28e
      // and writes +0x94 = 1 to every material, right beside the +0x9c scaling
      // the `scales` map above already models. A non-zero +0x94 makes the draw
      // gate at 0x004076cd submit every triangle, so this scene is exempt from
      // the per-vertex facing rejection.
      bypassFacing: true,
      blendFuncOverride: [this.mgl.SRC_ALPHA, this.mgl.ONE_MINUS_SRC_ALPHA],
      projectionMatrix: matrices.projection,
      modelViewMatrix: matrices.modelView,
    });
    return state;
  }
}
