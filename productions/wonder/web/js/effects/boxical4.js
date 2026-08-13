import { Mat4 } from '../shared/mathlib.js';
import { sampleScene } from '../shared/scene.js';

const FRAME_END = 100;
const MATERIAL_OPACITY = Math.fround(0.3);

function positiveRemainder(value, divisor) {
  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
}

/** Exact scalar state from Wonder render method 0x40cf90. */
export function wonderBoxical4State(localTime) {
  const time = Math.fround(localTime);
  const baseFrame = Math.fround(time * Math.fround(8));
  return {
    alpha: time < 1 ? time : 1,
    frames: [
      Math.fround(positiveRemainder(baseFrame, FRAME_END)),
      Math.fround(positiveRemainder(Math.fround(baseFrame + 4), FRAME_END)),
    ],
    textureOffset: [Math.fround(-time * 0.2), 0],
  };
}

function cameraMatrices(renderer, frame) {
  const camera = sampleScene(renderer.scene, frame).camera;
  if (!camera) throw new Error('Wonder boxical4 scene has no camera');
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

/** Reimplementation of Wonder class 0x40cea0 / render method 0x40cf90. */
export class Boxical4Effect {
  constructor(mgl, renderer) {
    this.mgl = mgl;
    this.renderer = renderer;
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderBoxical4State(localTime);
    state.frames.forEach((frame, index) => {
      const matrices = cameraMatrices(this.renderer, frame);
      this.renderer.render(frame, {
        clear: index === 0 ? clear : false,
        depthTest: false,
        cullFaceOverride: false,
        opacityScale: state.alpha,
        materialOpacityOverrides: new Map([[0, MATERIAL_OPACITY]]),
        materialColorOverrides: new Map([[0, [1, 1, 1]]]),
        materialTextureOffsets: new Map([[0, state.textureOffset]]),
        blendFuncOverride: [this.mgl.SRC_ALPHA, this.mgl.ONE_MINUS_SRC_ALPHA],
        projectionMatrix: matrices.projection,
        modelViewMatrix: matrices.modelView,
      });
    });
    return state;
  }
}
