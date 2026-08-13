import { Mat4 } from '../shared/mathlib.js';
import { buildMeshGeometry, buildWonderVertexNormals } from '../shared/mesh-geometry.js';
import { sampleScene } from '../shared/scene.js';

const PI_CUTOFF = Math.fround(3.14);
const FRAME_END = 200;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function positiveRemainder(value, divisor) {
  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
}

/** Vertex mutation from callback 0x40e490. */
export function buildWonderShiteGeometry(mesh, frame = 0) {
  const vertexNormals = buildWonderVertexNormals(mesh);
  const positions = new Float32Array(mesh.positions.length);
  // The callback receives the separately wrapped t*10 object clock. Ghidra's
  // first pass lost both phase terms; the raw x87 stream at 0x40e8d9 proves
  // they are frame*0.2 and frame*0.32 respectively.
  const xPhase = frame * 0.2;
  const yPhase = frame * 0.32 + 1.2;
  for (let vertex = 0; vertex < mesh.vertexCount; vertex++) {
    const offset = vertex * 3;
    const sine = Math.sin(vertexNormals[offset] * 3.2 + xPhase);
    const cosine = Math.cos(vertexNormals[offset + 1] * 3.2 + yPhase);
    const xScale = sine * sine * sine * sine * 1.3 + 1.5;
    // The native callback spills this scale to float before multiplying Y.
    const yScale = Math.fround(cosine * cosine * cosine * cosine + 1.5);
    positions[offset] = Math.fround(mesh.positions[offset] * xScale);
    positions[offset + 1] = Math.fround(mesh.positions[offset + 1] * yScale);
    positions[offset + 2] = mesh.positions[offset + 2];
  }
  const deformedMesh = { ...mesh, positions };
  const geometry = buildMeshGeometry(deformedMesh, { wonderNormals: true });
  // Wonder renders the single normal stored on each shared vertex. It does
  // not consult the EXP face flags while drawing, so copy FUN_00406e20's
  // regenerated vertex normals into every expanded triangle corner.
  geometry.normals.set(geometry.nativeNormals);
  return geometry;
}

/** Exact scalar state recovered from Wonder render method 0x40ee50. */
export function wonderShiteDesignState(localTime) {
  const time = Math.fround(localTime);
  const capped = time >= 3.14 ? PI_CUTOFF : time;
  const sweep = Math.sin(capped * 0.5);
  const objectRate = Math.fround(time * Math.fround(10));
  return {
    designProjectionX: Math.fround(200 - sweep * 200),
    designProjectionTilt: Math.fround(Math.sin(time * 0.4) * 16),
    designTextureOffsets: [time, Math.fround(time + 16)],
    shiteAlpha: Math.fround(clamp01(time - 1)),
    shiteCameraFrame: Math.fround(Math.sin(time * 0.62) * 63.5 + 64),
    shiteObjectFrame: Math.fround(positiveRemainder(objectRate, FRAME_END)),
    shiteProjectionX: Math.fround(3000 - sweep * 3000),
    shitePasses: [
      { meshIndex: 1, textureOffset: [Math.fround(time * 0.6), 0] },
      { meshIndex: 2, textureOffset: [Math.fround(time * 0.7), Math.fround(0.01)] },
      { meshIndex: 3, textureOffset: [Math.fround(time * 0.3), Math.fround(0.04)] },
      { meshIndex: 0, textureOffset: [Math.fround(time * 0.9), Math.fround(0.08)] },
    ],
  };
}

function cameraMatrices(renderer, cameraFrame, projectionX, projectionTilt = 0) {
  const camera = sampleScene(renderer.scene, cameraFrame).camera;
  if (!camera) throw new Error('Wonder shite/design scene has no camera');
  const canvas = renderer.mgl.gl.canvas;
  // Wonder stores horizontal FOV. FUN_00403340 uses tan(fov / 2) for
  // left/right and multiplies top/bottom by the 3:4 viewport ratio.
  const halfWidth = Math.tan(camera.fov * 0.5);
  const halfHeight = halfWidth * canvas.height / canvas.width;
  const projection = new Mat4().frustum(
    -halfWidth, halfWidth, -halfHeight, halfHeight, 1, 10000,
  );
  projection.translate(projectionX, 0, 0);
  if (projectionTilt) projection.rotate(projectionTilt, 1, 0, 0);
  return { projection, modelView: camera.viewMatrix };
}

/** Reimplementation of Wonder class 0x40ec40 / render method 0x40ee50. */
export class ShiteDesignEffect {
  constructor(mgl, shiteRenderer, designRenderer, textures) {
    this.mgl = mgl;
    this.shiteRenderer = shiteRenderer;
    this.designRenderer = designRenderer;

    // Constructor 0x40ec40 replaces the three compiled material maps after
    // loading shite1.exp. Keep that mutation local to this scene renderer.
    shiteRenderer.materialTextures[0] ??= [];
    shiteRenderer.materialTextures[1] ??= [];
    shiteRenderer.materialTextures[0][0] = textures.get('MAX_T5.JPG');
    shiteRenderer.materialTextures[1][0] = textures.get('Water2.jpg');
    shiteRenderer.materialTextures[1][1] = textures.get('MAX_t3.jpg');
    // Constructor 0x40ec40 attaches one 0x40e490 modifier to each of the
    // first four linked-list meshes. Each callback restores its saved source
    // vertices, applies its current object-frame phases, then regenerates the
    // mesh normals.
    for (let index = 0; index < Math.min(4, shiteRenderer.scene.meshes.length); index++) {
      shiteRenderer.geometries[index] = buildWonderShiteGeometry(
        shiteRenderer.scene.meshes[index],
      );
    }
    this.designMeshIndices = designRenderer.scene.meshes
      .map((mesh, index) => (mesh.name.includes('Qua') ? index : -1))
      .filter((index) => index >= 0);
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderShiteDesignState(localTime);
    const designMatrices = cameraMatrices(
      this.designRenderer, 0, state.designProjectionX, state.designProjectionTilt,
    );
    const designOptions = {
      cameraFrame: 0,
      meshIndices: this.designMeshIndices,
      depthTest: false,
      cullFaceOverride: false,
      // Wonder's textured material paths use the mesh's 0xff intensity as
      // grayscale RGB; the exported diffuse swatch is not a texture tint.
      materialColorOverrides: new Map([[0, [1, 1, 1]]]),
      projectionMatrix: designMatrices.projection,
      modelViewMatrix: designMatrices.modelView,
    };
    this.designRenderer.render(0, {
      ...designOptions,
      clear,
      materialTextureOffsets: new Map([[0, [state.designTextureOffsets[0], 0]]]),
    });
    this.designRenderer.render(0, {
      ...designOptions,
      clear: false,
      // 0x40ef38 selects GL_PROJECTION and applies this translation to the
      // projection already modified by the entrance shift and tilt. Moving
      // the camera/model-view instead changes the perspective placement.
      projectionMatrix: designMatrices.projection.clone().translate(-10, 0, 0),
      materialTextureOffsets: new Map([[0, [state.designTextureOffsets[1], 0]]]),
    });

    const shiteMatrices = cameraMatrices(
      this.shiteRenderer, state.shiteCameraFrame, state.shiteProjectionX,
    );
    for (let index = 0; index < Math.min(4, this.shiteRenderer.scene.meshes.length); index++) {
      this.shiteRenderer.geometries[index] = buildWonderShiteGeometry(
        this.shiteRenderer.scene.meshes[index], state.shiteObjectFrame,
      );
    }
    const shiteOptions = {
      clear: false,
      cameraFrame: state.shiteCameraFrame,
      depthTest: false,
      cullFaceOverride: false,
      opacityScale: state.shiteAlpha,
      materialOpacityScales: new Map([[0, Math.fround(0.4)]]),
      materialColorOverrides: new Map([
        [0, [1, 1, 1]],
        [1, [1, 1, 1]],
      ]),
      // Material #2's second runtime map occupies the exported environment
      // slot. Draw variant 0x408a70 feeds Wonder's generated coordinates.
      materialEnvironmentMapUnits: new Map([[1, new Set([1])]]),
      projectionMatrix: shiteMatrices.projection,
      modelViewMatrix: shiteMatrices.modelView,
    };
    for (const pass of state.shitePasses) {
      this.shiteRenderer.render(state.shiteObjectFrame, {
        ...shiteOptions,
        meshIndices: [pass.meshIndex],
        materialTextureOffsets: new Map([[0, pass.textureOffset]]),
      });
    }
    return state;
  }
}
