import { Mat4 } from '../shared/mathlib.js';
import { sampleScene } from '../shared/scene.js';

const EXIT_START = Math.fround(7);
const EXIT_RATE = 0.3;

function f32(value) {
  return Math.fround(value);
}

/** Exact scene clock, material scroll and late fade from Wonder 0x40eae0. */
export function wonderEnergyState(localTime) {
  const time = f32(localTime);
  let alpha = 1;
  if (time > EXIT_START) {
    alpha = f32(1 - Math.min((time - EXIT_START) * EXIT_RATE, 1));
  }
  return {
    time,
    alpha,
    frame: f32(time * Math.fround(10)),
    textureOffset: [f32(time * 0.6), 0],
  };
}

function cameraMatrices(renderer, frame) {
  const camera = sampleScene(renderer.scene, frame).camera;
  if (!camera) throw new Error('Wonder energy scene has no camera');
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

/** Reimplementation of Wonder class 0x40ea30 / render method 0x40eae0. */
export class EnergyEffect {
  constructor(mgl, renderer) {
    this.mgl = mgl;
    this.renderer = renderer;
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderEnergyState(localTime);
    const matrices = cameraMatrices(this.renderer, state.frame);
    this.renderer.render(state.frame, {
      clear,
      depthTest: false,
      cullFaceOverride: false,
      opacityScale: state.alpha,
      materialTextureOffsets: new Map([[0, state.textureOffset]]),
      projectionMatrix: matrices.projection,
      modelViewMatrix: matrices.modelView,
    });
    return state;
  }
}
