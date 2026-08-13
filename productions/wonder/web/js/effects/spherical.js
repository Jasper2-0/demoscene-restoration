import { Mat4 } from '../shared/mathlib.js';
import { sampleScene } from '../shared/scene.js';

const ENTRY_ANGLE = 3.664;
const MATERIAL_OPACITY = Math.fround(0.9998999834060669);

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function positiveRemainder(value, divisor) {
  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
}

/** Exact scalar state from Wonder render method 0x4101f0. */
export function wonderSphericalState(localTime) {
  const time = Math.fround(localTime);
  const entry = clamp((time - 1) * 2, 0, 2) * 0.5;
  const sine = Math.sin(entry * ENTRY_ANGLE);
  return {
    alpha: Math.fround(sine * sine),
    frame: Math.fround(positiveRemainder(time * Math.fround(8), 100)),
    textureOffsets: new Map([
      [0, [Math.fround(time * 0.2), 0]],
      [1, [0, Math.fround(-time * 0.2)]],
      [2, [Math.fround(-time * 0.3), 0]],
    ]),
  };
}

function cameraMatrices(renderer, frame) {
  const camera = sampleScene(renderer.scene, frame).camera;
  if (!camera) throw new Error('Wonder spherical scene has no camera');
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

/** Reimplementation of Wonder class 0x410100 / render method 0x4101f0. */
export class SphericalEffect {
  constructor(mgl, renderer) {
    this.mgl = mgl;
    this.renderer = renderer;
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderSphericalState(localTime);
    const matrices = cameraMatrices(this.renderer, state.frame);
    this.renderer.render(state.frame, {
      clear,
      depthTest: false,
      cullFaceOverride: false,
      opacityScale: state.alpha,
      materialOpacityOverrides: new Map([
        [0, MATERIAL_OPACITY],
        [1, MATERIAL_OPACITY],
        [2, MATERIAL_OPACITY],
      ]),
      materialColorOverrides: new Map([
        [0, [1, 1, 1]],
        [1, [1, 1, 1]],
        [2, [1, 1, 1]],
      ]),
      materialTextureOffsets: state.textureOffsets,
      blendFuncOverride: [this.mgl.SRC_ALPHA, this.mgl.ONE],
      projectionMatrix: matrices.projection,
      modelViewMatrix: matrices.modelView,
    });
    return state;
  }
}
