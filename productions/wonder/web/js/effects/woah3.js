import { sampleEnvelope } from '../shared/envelope.js';
import { Mat4 } from '../shared/mathlib.js';
import { sampleScene } from '../shared/scene.js';

const ENVELOPE_TIME_ORIGIN = 69.753;
const CAMERA_RATE = Math.fround(10);
const OBJECT_RATE = Math.fround(15);
const TEXTURE_SCROLL_RATE = 1.4;
const LWO_ALPHA_SCALES = [0.7, 0.5, 0.35, 0.2];

/** Exact scalar state recovered from Wonder render method 0x410410. */
export function wonderWoah3State(localTime, pulseEnvelope) {
  const time = Math.fround(localTime);
  const envelopeTime = Math.fround(time + ENVELOPE_TIME_ORIGIN);
  const pulse = Math.fround(sampleEnvelope(pulseEnvelope, envelopeTime));
  const inversePulse = Math.fround(1 - pulse);
  const textureScroll = Math.fround(time * TEXTURE_SCROLL_RATE);
  return {
    envelopeTime,
    pulse,
    cameraFrame: Math.fround(time * CAMERA_RATE),
    objectFrame: Math.fround(time * OBJECT_RATE),
    materialOffsets: new Map([
      [0, [Math.fround(0.3), Math.fround(time * TEXTURE_SCROLL_RATE + 0.5)]],
      [1, [0, textureScroll]],
    ]),
    lwoAlphas: LWO_ALPHA_SCALES.map((scale) =>
      Math.fround(inversePulse * scale)),
  };
}

function cameraMatrices(renderer, frame) {
  const camera = sampleScene(renderer.scene, frame).camera;
  if (!camera) throw new Error('Wonder woah3 scene has no camera');
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

/** Reimplementation of Wonder class 0x410300 / render method 0x410410. */
export class Woah3Effect {
  constructor(mgl, renderer, pulseEnvelope) {
    this.mgl = mgl;
    this.renderer = renderer;
    this.pulseEnvelope = pulseEnvelope;
    this.originalMesh = renderer.scene.meshes.findIndex((mesh) => mesh.name === 'Original');
    this.quadMeshes = renderer.scene.meshes
      .map((mesh, index) => (mesh.name.startsWith('QuadPatch') ? index : -1))
      .filter((index) => index >= 0)
      .slice(0, 2);
    this.lwoMeshes = ['LWO01', 'LWO02', 'LWO03', 'LWO04'].map((name) =>
      renderer.scene.meshes.findIndex((mesh) => mesh.name.includes(name)));
    if (this.originalMesh < 0 || this.quadMeshes.length !== 2
        || this.lwoMeshes.some((index) => index < 0)) {
      throw new Error('woah3.exp does not match the native object traversal');
    }
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderWoah3State(localTime, this.pulseEnvelope);
    const matrices = cameraMatrices(this.renderer, state.cameraFrame);
    const texturedOptions = {
      cameraFrame: state.cameraFrame,
      cullFaceOverride: false,
      materialTextureOffsets: state.materialOffsets,
      materialColorOverrides: new Map([
        [0, [1, 1, 1]],
        [1, [1, 1, 1]],
      ]),
      // Both compiled materials put their second runtime image in the
      // environment-map slot consumed by Wonder's software-coordinate path.
      materialEnvironmentMapUnits: new Map([
        [0, new Set([1])],
        [1, new Set([1])],
      ]),
      projectionMatrix: matrices.projection,
      modelViewMatrix: matrices.modelView,
    };

    // The native linked-list walk draws only the first two QuadPatch nodes.
    this.renderer.render(state.objectFrame, {
      ...texturedOptions,
      clear,
      depthTest: false,
      meshIndices: this.quadMeshes,
    });
    this.renderer.render(state.objectFrame, {
      ...texturedOptions,
      clear: false,
      depthTest: true,
      meshIndices: [this.originalMesh],
    });

    // The final four calls disable both texture units and select nodes by the
    // LWO01..04 substrings. Their exported black, 0.5-opacity material keeps
    // its ordinary source-alpha blend; only the native global alpha varies.
    for (let index = 0; index < this.lwoMeshes.length; index++) {
      this.renderer.render(state.objectFrame, {
        clear: false,
        cameraFrame: state.cameraFrame,
        meshIndices: [this.lwoMeshes[index]],
        depthTest: false,
        cullFaceOverride: false,
        opacityScale: state.lwoAlphas[index],
        projectionMatrix: matrices.projection,
        modelViewMatrix: matrices.modelView,
      });
    }
    return state;
  }
}
