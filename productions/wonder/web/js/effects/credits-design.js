import { Mat4 } from '../shared/mathlib.js';
import { sampleScene } from '../shared/scene.js';

function cameraMatrices(renderer, frame) {
  const camera = sampleScene(renderer.scene, frame).camera;
  if (!camera) throw new Error('Wonder credits/design scene has no camera');
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

function texturedMaterialState(renderer) {
  const colors = new Map();
  const environmentMaps = new Map();
  renderer.scene.materials.forEach((material, index) => {
    if (material.textureNames.length) colors.set(index, [1, 1, 1]);
    if (material.maps?.[2]) environmentMaps.set(index, new Set([1]));
  });
  return { colors, environmentMaps };
}

/** Exact scalar state recovered from Wonder render method 0x40fb10. */
export function wonderCreditsDesignState(localTime) {
  const time = Math.fround(localTime);
  return {
    designFrame: Math.fround(time * Math.fround(10)),
    creditsFrame: Math.fround(time * Math.fround(15)),
    creditsMaterial6Offset: [0, Math.fround(time * Math.fround(4))],
  };
}

/** Reimplementation of Wonder class 0x40fa30 / render method 0x40fb10. */
export class CreditsDesignEffect {
  constructor(mgl, creditsRenderer, designRenderer) {
    this.mgl = mgl;
    this.creditsRenderer = creditsRenderer;
    this.designRenderer = designRenderer;
    this.creditsMaterials = texturedMaterialState(creditsRenderer);
    this.designMaterials = texturedMaterialState(designRenderer);
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderCreditsDesignState(localTime);
    const designMatrices = cameraMatrices(this.designRenderer, state.designFrame);
    this.designRenderer.render(state.designFrame, {
      clear,
      depthTest: false,
      cullFaceOverride: false,
      materialColorOverrides: this.designMaterials.colors,
      materialEnvironmentMapUnits: this.designMaterials.environmentMaps,
      projectionMatrix: designMatrices.projection,
      modelViewMatrix: designMatrices.modelView,
    });

    const creditsMatrices = cameraMatrices(this.creditsRenderer, state.creditsFrame);
    this.creditsRenderer.render(state.creditsFrame, {
      clear: false,
      depthTest: false,
      cullFaceOverride: false,
      materialTextureOffsets: new Map([[6, state.creditsMaterial6Offset]]),
      materialColorOverrides: this.creditsMaterials.colors,
      materialEnvironmentMapUnits: this.creditsMaterials.environmentMaps,
      projectionMatrix: creditsMatrices.projection,
      modelViewMatrix: creditsMatrices.modelView,
    });
    return state;
  }
}
