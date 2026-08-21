import { sampleEnvelope } from '../shared/envelope.js';
import { Mat4 } from '../shared/mathlib.js';
import { sampleScene } from '../shared/scene.js';

const ENVELOPE_TIME_ORIGIN = 69.753;
const FIRST_OPACITY = Math.fround(0.23965999484062195);
const SECOND_OPACITY = Math.fround(0.4966000020503998);
const SECOND_FADE_START = Math.fround(15.137999534606934);

/** Exact scalar state recovered from Wonder render method 0x40cb20. */
export function wonderFacetedState(localTime, pulseEnvelope) {
  const time = Math.fround(localTime);
  const envelopeTime = Math.fround(time + ENVELOPE_TIME_ORIGIN);
  const pulse = Math.fround(sampleEnvelope(pulseEnvelope, envelopeTime));
  const firstAlpha = Math.fround(1 - pulse * 0.8);
  const scroll = time * 1.5;
  let secondAlpha = firstAlpha;
  if (time >= SECOND_FADE_START) {
    const fade = Math.min(1, (time - SECOND_FADE_START) * 0.6);
    secondAlpha = Math.fround(1 - fade);
  }
  return {
    envelopeTime,
    pulse,
    firstAlpha,
    secondAlpha,
    firstFrame: Math.fround(time * Math.fround(10)),
    // FUN_0040cb20 drives the SECOND renderer from the FIRST renderer's frame,
    // not from the time: 0x0040cc68 loads the value already multiplied by 10.0 at
    // 0x0040cbcb and adds the float 30.0 at 0x004334b8. Adding 30 to `time`
    // instead put the second layer 9*time frames behind the first — at local
    // 9.528s, frame 39.5 where the executable is at 125.3.
    secondFrame: Math.fround(Math.fround(time * Math.fround(10)) + Math.fround(30)),
    firstTextureOffset: [Math.fround(scroll), 0],
    secondTextureOffset: [Math.fround(scroll + 8), 0],
    drawSecond: secondAlpha !== 0,
  };
}

function cameraMatrices(renderer, frame) {
  const camera = sampleScene(renderer.scene, frame).camera;
  if (!camera) throw new Error('Wonder faceted scene has no camera');
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

/** Reimplementation of Wonder class 0x40c990 / render method 0x40cb20. */
export class FacetedEffect {
  constructor(mgl, firstRenderer, secondRenderer, pulseEnvelope) {
    this.mgl = mgl;
    this.firstRenderer = firstRenderer;
    this.secondRenderer = secondRenderer;
    this.pulseEnvelope = pulseEnvelope;
    // The two constructor loops at 0x40ca4c and 0x40ca9e overwrite +0x9c
    // on every material, not just the first material whose U offset changes
    // in the render method.
    this.firstMaterialOpacities = new Map(firstRenderer.scene.materials
      .map((_, index) => [index, FIRST_OPACITY]));
    this.secondMaterialOpacities = new Map(secondRenderer.scene.materials
      .map((_, index) => [index, SECOND_OPACITY]));
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderFacetedState(localTime, this.pulseEnvelope);
    const firstMatrices = cameraMatrices(this.firstRenderer, state.firstFrame);
    this.firstRenderer.render(state.firstFrame, {
      clear,
      depthTest: false,
      cullFaceOverride: false,
      opacityScale: state.firstAlpha,
      materialOpacityOverrides: this.firstMaterialOpacities,
      materialTextureOffsets: new Map([[0, state.firstTextureOffset]]),
      materialColorOverrides: new Map([[0, [1, 1, 1]]]),
      blendFuncOverride: [this.mgl.SRC_ALPHA, this.mgl.ONE],
      projectionMatrix: firstMatrices.projection,
      modelViewMatrix: firstMatrices.modelView,
    });

    if (state.drawSecond) {
      const secondMatrices = cameraMatrices(this.secondRenderer, state.secondFrame);
      this.secondRenderer.render(state.secondFrame, {
        clear: false,
        depthTest: false,
        cullFaceOverride: false,
        opacityScale: state.secondAlpha,
        materialOpacityOverrides: this.secondMaterialOpacities,
        materialTextureOffsets: new Map([[0, state.secondTextureOffset]]),
        materialColorOverrides: new Map([[0, [1, 1, 1]]]),
        materialEnvironmentMapUnits: new Map([[0, new Set([1])]]),
        blendFuncOverride: [this.mgl.SRC_ALPHA, this.mgl.ONE],
        projectionMatrix: secondMatrices.projection,
        modelViewMatrix: secondMatrices.modelView,
      });
    }
    return state;
  }
}
