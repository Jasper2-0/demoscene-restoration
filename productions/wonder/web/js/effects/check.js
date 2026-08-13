import { Mat4 } from '../shared/mathlib.js';
import { sampleScene } from '../shared/scene.js';

const MATERIAL_OPACITY = Math.fround(0.4239659905433655);

/** Exact scalar state from Wonder render method 0x40cdb0. */
export function wonderCheckState(localTime) {
  const time = Math.fround(localTime);
  const frame = Math.fround(time * Math.fround(3));
  return {
    frames: [frame, Math.fround(frame + 4)],
    textureOffset: [Math.fround(time * 1.5), 0],
  };
}

function cameraMatrices(renderer, frame) {
  const camera = sampleScene(renderer.scene, frame).camera;
  if (!camera) throw new Error('Wonder check scene has no camera');
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

/** Reimplementation of Wonder class 0x40ccc0 / render method 0x40cdb0. */
export class CheckEffect {
  constructor(mgl, renderer) {
    this.mgl = mgl;
    this.renderer = renderer;
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderCheckState(localTime);
    state.frames.forEach((frame, index) => {
      const matrices = cameraMatrices(this.renderer, frame);
      this.renderer.render(frame, {
        clear: index === 0 ? clear : false,
        depthTest: false,
        cullFaceOverride: false,
        materialOpacityOverrides: new Map([[0, MATERIAL_OPACITY]]),
        materialColorOverrides: new Map([[0, [1, 1, 1]]]),
        materialTextureOffsets: new Map([[0, state.textureOffset]]),
        blendFuncOverride: [this.mgl.SRC_ALPHA, this.mgl.ONE],
        projectionMatrix: matrices.projection,
        modelViewMatrix: matrices.modelView,
      });
    });
    return state;
  }
}
