import { buildMeshGeometry } from './mesh-geometry.js';
import { perspectiveMatrix, sampleScene } from './scene.js';

function transformPoint(matrix, point) {
  const m = matrix.m;
  return [
    point[0] * m[0] + point[1] * m[4] + point[2] * m[8] + m[12],
    point[0] * m[1] + point[1] * m[5] + point[2] * m[9] + m[13],
    point[0] * m[2] + point[1] * m[6] + point[2] * m[10] + m[14],
  ];
}

/**
 * Reproduce Wonder's software-generated 2D environment coordinates from
 * Wonder's mesh update routine at 0x40752a-0x40762a. Unlike GL_SPHERE_MAP,
 * this is a linear projection of the eye-space normal. Each model-view basis
 * is divided by its scale before the half-range/bias transform.
 */
export function wonderEnvironmentTexcoords(normals, modelViewMatrix, output = null) {
  const m = modelViewMatrix.m ?? modelViewMatrix;
  const result = output ?? new Float32Array((normals.length / 3) * 2);
  const scaleX = Math.hypot(m[0], m[1], m[2]) || 1;
  const scaleY = Math.hypot(m[4], m[5], m[6]) || 1;
  const scaleZ = Math.hypot(m[8], m[9], m[10]) || 1;
  for (let vertex = 0; vertex < normals.length / 3; vertex++) {
    const nx = normals[vertex * 3];
    const ny = normals[vertex * 3 + 1];
    const nz = normals[vertex * 3 + 2];
    const eyeX = nx * m[0] / scaleX + ny * m[4] / scaleY + nz * m[8] / scaleZ;
    const eyeY = nx * m[1] / scaleX + ny * m[5] / scaleY + nz * m[9] / scaleZ;
    result[vertex * 2] = eyeX * 0.5 + 0.5;
    result[vertex * 2 + 1] = -(eyeY * 0.5 + 0.5);
  }
  return result;
}

export class ExpSceneRenderer {
  constructor(mgl, scene, assets, { lighting = false, sphereMap = false } = {}) {
    this.mgl = mgl;
    this.scene = scene;
    this.assets = assets;
    this.lighting = lighting;
    this.sphereMap = sphereMap;
    this.geometries = scene.meshes.map(buildMeshGeometry);
    this.materialTextures = [];
  }

  async prepare() {
    for (let materialIndex = 0; materialIndex < this.scene.materials.length; materialIndex++) {
      const material = this.scene.materials[materialIndex];
      const textures = [];
      for (let unit = 0; unit < Math.min(2, material.textureNames.length); unit++) {
        const name = material.textureNames[unit];
        const url = this.assets.resolve(name);
        if (!url || !/\.(?:jpe?g|png|bmp)$/i.test(url.pathname)) continue;
        const image = await this.assets.loadImage(name);
        this.mgl.activeTexture(unit);
        // Sunflower's OpenGL upload path sets GL_LINEAR for MIN/MAG and does
        // not construct mip levels; wrap remains the native GL_REPEAT default.
        textures[unit] = this.mgl.createTextureFromImage(image, false, false);
      }
      this.materialTextures[materialIndex] = textures;
    }
    this.mgl.activeTexture(0);
  }

  render(frame, {
    clear = true,
    cameraFrame = frame,
    meshIndices = null,
    materialTextureOffsets = null,
    materialTextureRotations = null,
    opacityScale = 1,
    materialOpacityScales = null,
    materialOpacityOverrides = null,
    materialColorOverrides = null,
    materialTextureOverrides = null,
    materialSphereMapUnits = null,
    materialEnvironmentMapUnits = null,
    meshMatrixOverrides = null,
    blendFuncOverride = null,
    depthTest = true,
    depthWrite = true,
    cullFaceOverride = null,
    projectionMatrix = null,
    modelViewMatrix = null,
  } = {}) {
    const { mgl } = this;
    const sampled = sampleScene(this.scene, frame);
    const cameraSample = cameraFrame === frame ? sampled : sampleScene(this.scene, cameraFrame);
    const camera = cameraSample.camera;
    if (!camera) throw new Error('EXP scene has no camera');
    const width = mgl.gl.canvas.width;
    const height = mgl.gl.canvas.height;
    mgl.viewport(0, 0, width, height);
    mgl.enableDepthTest(depthTest);
    mgl.depthFunc(mgl.LEQUAL);
    mgl.depthMask(depthWrite);
    mgl.enableBlend(false);
    mgl.enableCullFace(false);
    mgl.color4(1, 1, 1, 1);
    if (clear) mgl.clear();

    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadMatrix(projectionMatrix
      ?? perspectiveMatrix(camera.fov, width / height, 1, 10000));
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadMatrix(modelViewMatrix ?? camera.viewMatrix);

    if (this.lighting) {
      mgl.enableLighting(true);
      mgl.setLights(sampled.lights.map((light) => ({
        pos: [...transformPoint(camera.viewMatrix, light.position), 1],
        diffuse: light.source.color.map((value) => value * light.source.multiplier),
      })));
    } else {
      mgl.enableLighting(false);
    }

    const selectedMeshes = meshIndices === null
      ? sampled.meshes.map((sampledMesh, index) => ({ sampledMesh, index }))
      : meshIndices.map((index) => ({ sampledMesh: sampled.meshes[index], index }));
    selectedMeshes.forEach(({ sampledMesh, index }) => {
      if (!sampledMesh) throw new Error(`EXP mesh index ${index} is out of range`);
      const mesh = sampledMesh.source;
      const geometry = this.geometries[index];
      const textures = materialTextureOverrides?.get(mesh.materialIndex)
        ?? this.materialTextures[mesh.materialIndex] ?? [];
      const sampledMaterial = sampled.materials[mesh.materialIndex];
      const material = sampledMaterial?.source;
      const materialOpacityScale = materialOpacityScales?.get(mesh.materialIndex) ?? 1;
      const materialOpacity = (materialOpacityOverrides?.get(mesh.materialIndex)
        ?? sampledMaterial?.opacity ?? 1) * materialOpacityScale;
      const opacity = Math.max(0, Math.min(1, materialOpacity * opacityScale));
      // Wonder's unlit textured triangle callbacks (for example 0x4084b0)
      // emit one grayscale vertex intensity to all three glColor channels.
      // Supplied textured vertices saturate that intensity to white, leaving
      // the maps to carry authored colour. The untextured callbacks retain
      // material colour (notably the translucent black helper geometry).
      // Energia's animated material path and Wonder's lit scenes do too.
      const color = materialColorOverrides?.get(mesh.materialIndex)
        ?? (this.scene.variant === 'wonder' && !this.lighting && textures.some(Boolean)
          ? [1, 1, 1]
          : sampledMaterial?.diffuse ?? [1, 1, 1]);
      mgl.color4(color[0], color[1], color[2], opacity);
      const blendMode = material?.blendMode ?? 0;
      // The native callbacks at 0x408463/0x408580 compare the material's
      // runtime +0x9c opacity with 1.0. DAT_004360c4 multiplies glColor alpha
      // later and does not participate in the blend enable decision.
      mgl.enableBlend(Boolean(blendFuncOverride) || materialOpacity < 0.999 || blendMode !== 0);
      if (blendFuncOverride) mgl.blendFunc(...blendFuncOverride);
      else if (blendMode === 1) mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
      else if (blendMode === 2) mgl.blendFunc(mgl.SRC_COLOR, mgl.ONE);
      else if (blendMode === 3) mgl.blendFunc(mgl.ONE_MINUS_SRC_ALPHA, mgl.ONE);
      else mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE_MINUS_SRC_ALPHA);
      mgl.enableCullFace(cullFaceOverride ?? material?.doubleSided === false);
      const explicitEnvironmentUnits = materialEnvironmentMapUnits?.get(mesh.materialIndex);
      const nativeEnvironmentUnit = material?.mapMode && material?.maps?.[2]
        ? (material.maps[0] ? 1 : 0)
        : -1;
      const environmentUnits = explicitEnvironmentUnits
        ?? (nativeEnvironmentUnit < 0 ? null : new Set([nativeEnvironmentUnit]));
      for (let unit = 0; unit < 2; unit++) {
        mgl.activeTexture(unit);
        mgl.enableTexture(Boolean(textures[unit]));
        const sphereMapUnits = materialSphereMapUnits?.get(mesh.materialIndex);
        const environmentMap = material?.maps?.[2];
        const sphereMapped = sphereMapUnits
          ? sphereMapUnits.has(unit)
          : this.sphereMap && unit === 0 && Boolean(environmentMap);
        mgl.texGenSphereMap(Boolean(textures[unit]) && sphereMapped);
        if (textures[unit]) mgl.bindTexture(textures[unit]);
        mgl.texEnv({ mode: 'modulate' });
        mgl.matrixMode(mgl.TEXTURE);
        mgl.loadIdentity();
        // Wonder's renderer owns one animated UV offset pair and adds it only to the
        // ordinary (unit-zero) coordinates. Its environment coordinates are
        // emitted separately and never receive this offset.
        if (sampledMaterial && unit === 0) {
          const override = materialTextureOffsets?.get(mesh.materialIndex);
          const offset = override ?? sampledMaterial.textureOffset;
          const rotation = materialTextureRotations?.get(mesh.materialIndex) ?? 0;
          if (rotation) mgl.translate(0.5, 0.5, 0);
          mgl.translate(offset[0], offset[1], 0);
          if (rotation) {
            mgl.rotate(rotation, 0, 0, 1);
            mgl.translate(-0.5, -0.5, 0);
          }
        }
      }
      mgl.activeTexture(0);
      mgl.matrixMode(mgl.MODELVIEW);
      mgl.pushMatrix();
      const overrideMatrix = typeof meshMatrixOverrides === 'function'
        ? meshMatrixOverrides(index, sampledMesh)
        : meshMatrixOverrides?.get(index);
      const meshMatrix = overrideMatrix ?? sampledMesh.matrix;
      mgl.multMatrix(meshMatrix);
      let environmentTexcoords = null;
      if (environmentUnits?.size) {
        const combinedModelView = (modelViewMatrix ?? camera.viewMatrix).clone().mult(meshMatrix);
        environmentTexcoords = wonderEnvironmentTexcoords(
          geometry.normals, combinedModelView, geometry.environmentTexcoords);
        geometry.environmentTexcoords = environmentTexcoords;
      }
      mgl.drawElements(
        geometry.positions,
        environmentUnits?.has(0) ? environmentTexcoords : geometry.texcoords,
        geometry.indices, null, geometry.normals, null,
        environmentUnits?.has(1) ? environmentTexcoords : geometry.texcoords,
      );
      mgl.popMatrix();
    });
    mgl.depthMask(true);
    return { ...sampled, camera };
  }
}
