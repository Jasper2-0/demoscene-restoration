import {
  buildMeshGeometry, buildWonderVertexNormals, wonderFacingFlags, wonderFacingIndices,
  wonderFacingIndicesFromGeometry,
  WONDER_FACING_FIT,
} from './mesh-geometry.js';
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
export function wonderEnvironmentTexcoords(normals, modelViewMatrix, scale = [1, 1, 1], output = null) {
  const m = modelViewMatrix.m ?? modelViewMatrix;
  const result = output ?? new Float32Array((normals.length / 3) * 2);
  // 0x0040755f-0x004075d0 divides each matrix ROW by twice ITS OWN scale, and
  // only the first two columns of each, because only eyeX and eyeY are used:
  //
  //   [ESP+0x64] doubled -> divides m0 and m1     (row 0)
  //   [ESP+0x68] doubled -> divides m4 and m5     (row 1)
  //   [ESP+0x6c] doubled -> divides m8 and m9     (row 2)
  //
  // The previous form divided each COLUMN by one scale — eyeX by 2*scaleX and
  // eyeY by 2*scaleY — which agrees only when the scale is uniform. woah3's
  // meshes are not uniformly scaled, and this path feeds the second texture unit,
  // so the error showed up as a large brightness excess rather than as skew.
  const s0 = 2 * (scale[0] || 1);
  const s1 = 2 * (scale[1] || 1);
  const s2 = 2 * (scale[2] || 1);
  for (let vertex = 0; vertex < normals.length / 3; vertex++) {
    const nx = normals[vertex * 3];
    const ny = normals[vertex * 3 + 1];
    const nz = normals[vertex * 3 + 2];
    const eyeX = nx * m[0] / s0 + ny * m[4] / s1 + nz * m[8] / s2;
    const eyeY = nx * m[1] / s0 + ny * m[5] / s1 + nz * m[9] / s2;
    result[vertex * 2] = eyeX + 0.5;
    result[vertex * 2 + 1] = -(eyeY + 0.5);
  }
  return result;
}

export class ExpSceneRenderer {
  // facingCull: 'fitted' uses the superseded load-time fit (the shipping default
  // for woah3, because it still renders it best); true uses the PROVEN per-frame
  // rule; false/null disables rejection entirely.
  constructor(mgl, scene, assets, { lighting = false, sphereMap = false, facingCull = null } = {}) {
    this.mgl = mgl;
    this.scene = scene;
    this.assets = assets;
    this.lighting = lighting;
    this.sphereMap = sphereMap;
    const wonder = scene.variant === 'wonder';
    this.geometries = scene.meshes.map((mesh) => buildMeshGeometry(mesh, {
      wonderNormals: wonder,
      facingCull: facingCull === 'fitted' ? WONDER_FACING_FIT : null,
    }));
    // Wonder rejects triangles per frame from a per-vertex camera-facing flag
    // (wonderFacingFlags). `facingCull: false` disables it. The normals are built
    // once; the flags and surviving index list are rebuilt per frame into scratch
    // buffers so a long sequence does not allocate per mesh per frame.
    this.facing = wonder && facingCull === true;
    this.facingNormals = this.facing ? scene.meshes.map(buildWonderVertexNormals) : null;
    this.facingFlags = this.facing ? scene.meshes.map(() => null) : null;
    this.facingIndices = this.facing ? scene.meshes.map(() => null) : null;
    this.envNormals = scene.meshes.map(() => null);
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
    // Mirrors a runtime write of material[+0x94] = 1, which makes the gate at
    // 0x004076cd submit every triangle regardless of the per-vertex facing flag.
    bypassFacing = false,
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
      // The native callbacks at 0x408463/0x408580 compare the material's runtime +0x9c
      // opacity with 1.0 EXACTLY — `if (1.0 <= opacity) glDisable(GL_BLEND)`. The
      // threshold was 0.999 here, which is not the same test: end.js scales every
      // material by 0.9999999 (0x00433450), and that value blends natively while
      // failing a 0.999 comparison. DAT_004360c4 multiplies glColor alpha later and
      // does not participate in the enable decision.
      mgl.enableBlend(Boolean(blendFuncOverride) || materialOpacity < 1 || blendMode !== 0);
      if (blendFuncOverride) mgl.blendFunc(...blendFuncOverride);
      // Wonder registers exactly two modes (0x004062xx, decompiled.c:6266-6273):
      // 0 -> SRC_ALPHA/ONE_MINUS_SRC_ALPHA, 1 -> SRC_ALPHA/ONE. There is no mode 2 or
      // 3; branches for them were dead and are removed rather than left to imply the
      // format carries values it does not.
      else if (blendMode === 1) mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
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
        // Wonder's renderer owns one animated UV offset pair and adds it to the
        // ordinary (unit-zero) coordinates.
        //
        // NOT a general rule about environment coordinates, though it reads like one:
        // the TWO-unit callback FUN_00408a70 (decompiled.c:6779-6803) leaves env
        // coordinates alone, but the SINGLE-texture environment callback FUN_00408bb0
        // (decompiled.c:6806-6829) adds the same material offsets to them. No current
        // Wonder material takes that path — it needs maps[0] empty and maps[2] set — so
        // nothing renders wrong today, but do not read this as "env never gets offset".
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
        // 0x004075e4 reads the normal from the VERTEX at +0x3c/+0x40/+0x44 — the
        // ENGINE's smooth normal. buildWonderVertexNormals was measured to return
        // exactly its negation (dot = -1.0000 on 100% of vertices, against normals
        // dumped out of the running executable), so feeding its orientation here
        // mirrors U and V about the 0.5 bias and samples the wrong part of the
        // second texture. Negated once per mesh rather than per frame.
        if (this.scene.variant === 'wonder' && !this.envNormals[index]) {
          const src = geometry.nativeNormals;
          const dst = new Float32Array(src.length);
          for (let i = 0; i < src.length; i++) dst[i] = -src[i];
          this.envNormals[index] = dst;
        }
        environmentTexcoords = wonderEnvironmentTexcoords(
          this.scene.variant === 'wonder' ? this.envNormals[index] : geometry.normals,
          combinedModelView, sampledMesh.scale, geometry.environmentTexcoords);
        geometry.environmentTexcoords = environmentTexcoords;
      }
      // Clocal = inverse(objectMatrix) * cameraWorld, with NO sign correction.
      //
      // Verified against the oracle rather than guessed: at capture 102.88 the
      // executable submits 6408 / 2499 / 2472 / 2439 / 2388 / 1944 vertices for
      // woah3's Original, B2.LWO01-04 and QuadPatch, and this reproduces all eight
      // meshes EXACTLY (0.00% error). Two earlier attempts adopted a Z or YZ flip
      // because they searched over guessed frame numbers; computing the frames from
      // woah3's own clocks (camera local*10, object local*15) removes the freedom
      // that made a flip look necessary.
      let drawIndices = geometry.indices;
      // material[+0x94] != 0 bypasses rejection entirely (FUN_00407650 at
      // 0x004076cd). That runtime byte is loaded from the record's +0x84 at
      // 0x004015c0-0x004015c6 — the same byte exp.js reads as doubleSided — so
      // this is the port's name for the gate's own field, not a proxy.
      if (this.facing && !bypassFacing && material?.doubleSided !== true) {
        const c = transformPoint(meshMatrix.clone().inverse(), camera.position);
        // Read the CURRENT buffers, so a mesh a runtime modifier rewrote is tested
        // on the geometry the engine would actually have in its vertex array.
        this.facingIndices[index] = wonderFacingIndicesFromGeometry(
          geometry, c, this.facingIndices[index]);
        drawIndices = this.facingIndices[index];
      }
      mgl.drawElements(
        geometry.positions,
        environmentUnits?.has(0) ? environmentTexcoords : geometry.texcoords,
        drawIndices, null, geometry.normals, null,
        environmentUnits?.has(1) ? environmentTexcoords : geometry.texcoords,
      );
      mgl.popMatrix();
    });
    mgl.depthMask(true);
    return { ...sampled, camera };
  }
}
