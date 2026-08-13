import { Mat4 } from '../shared/mathlib.js';
import { sampleScene } from '../shared/scene.js';

const FRAME_END = 500;

function nativeFmod(value, divisor) {
  return value % divisor;
}

/** Exact six scene clocks recovered from Wonder render method 0x40fcb0. */
export function wonderClockFrames(localTime) {
  const time = Math.fround(localTime);
  const first = Math.fround(time * Math.fround(13));
  return [
    first,
    Math.fround(time * Math.fround(17) + Math.fround(15)),
    Math.fround(time * Math.fround(21) + Math.fround(45)),
    Math.fround(time * Math.fround(35) + Math.fround(65)),
    Math.fround(nativeFmod(Math.fround(500 - first), FRAME_END)),
    Math.fround(nativeFmod(
      Math.fround(500 - Math.fround(time * Math.fround(19) + Math.fround(54))),
      FRAME_END,
    )),
  ];
}

function cameraMatrices(renderer, frame) {
  const camera = sampleScene(renderer.scene, frame).camera;
  if (!camera) throw new Error('Wonder clock scene has no camera');
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

/** Reimplementation of Wonder class 0x40fc00 / render method 0x40fcb0. */
export class ClockEffect {
  constructor(mgl, renderer) {
    this.mgl = mgl;
    this.renderer = renderer;
    this.materialColors = new Map(renderer.scene.materials
      .map((material, index) => material.textureNames.length ? [index, [1, 1, 1]] : null)
      .filter(Boolean));
    this.environmentMaps = new Map(renderer.scene.materials
      .map((material, index) => material.maps?.[2] ? [index, new Set([1])] : null)
      .filter(Boolean));
  }

  render(localTime, { clear = false } = {}) {
    const frames = wonderClockFrames(localTime);
    frames.forEach((frame, index) => {
      const matrices = cameraMatrices(this.renderer, frame);
      this.renderer.render(frame, {
        clear: clear && index === 0,
        depthTest: false,
        cullFaceOverride: false,
        materialColorOverrides: this.materialColors,
        materialEnvironmentMapUnits: this.environmentMaps,
        projectionMatrix: matrices.projection,
        modelViewMatrix: matrices.modelView,
      });
    });
    return { frames };
  }
}
