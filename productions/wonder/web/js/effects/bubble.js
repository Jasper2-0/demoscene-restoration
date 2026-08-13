import { sampleEnvelope } from '../shared/envelope.js';

const ROWS = 6;
const COLUMNS = 6;
const COLUMN_STEPS = 4;
const ROW_STEPS = 6;

// Constants below are decoded from the operands used by 0x4092c0. Keeping
// their original float/double widths documents where the last-bit differences
// in the x87 calculation come from.
const FADE_RATE = 0.26;
const FREQUENCY_RATE_F32 = Math.fround(0.1);
const FREQUENCY_SWING = 1.199999999254942;
const FREQUENCY_BASE = 1.300000000745058;
const SIZE_RATE_F32 = Math.fround(3.14);
const SIZE_SWING = 16;
const SIZE_BASE = 80;
const END_CAP_SCALE_F32 = Math.fround(0.8);
const RIPPLE_SWING = 0.550000011920929;
const RIPPLE_BASE = 1.1500000357627869;
const ONE_SIXTH = 1 / 6;

function f32(value) {
  return Math.fround(value);
}

/** Control vertex emitted by Wonder's 0x4092c0 mode-one lattice generator. */
export function wonderBubbleControlPoint(localTime, row, column) {
  const time = f32(localTime);
  const fade = Math.min(1, time * FADE_RATE);
  const frequency = Math.sin(f32(time * FREQUENCY_RATE_F32)) * FREQUENCY_SWING
    + FREQUENCY_BASE;
  const size = Math.sin(f32(time * SIZE_RATE_F32)) * SIZE_SWING + SIZE_BASE;
  const endCap = row === 0 || row === ROWS - 1;
  const radialSize = size * (endCap ? END_CAP_SCALE_F32 : 1);
  const ripple = Math.sin((row + column + time) * frequency) * RIPPLE_SWING
    + RIPPLE_BASE;
  const angle = column * 2 * ONE_SIXTH * Math.PI;
  return {
    position: [
      f32(Math.cos(angle) * ripple * radialSize),
      f32(Math.sin(angle) * ripple * radialSize),
      f32((row * 10 - 25) * ripple * size * FREQUENCY_RATE_F32),
    ],
    uv: [f32(column * ONE_SIXTH), f32(row * ONE_SIXTH)],
    color: [1, 1, 1, endCap ? 0 : f32(fade)],
  };
}

// 0x40a650 is the standard tension-.5 Catmull-Rom polynomial. The original
// surface renderer applies it in both lattice dimensions.
function catmullRom(a, b, c, d, t) {
  return 0.5 * ((2 * b) + (-a + c) * t
    + (2 * a - 5 * b + 4 * c - d) * t * t
    + (-a + 3 * b - 3 * c + d) * t * t * t);
}

function interpolateControlGrid(control, row, column, rowFraction, columnFraction) {
  const rowIndices = [
    Math.max(0, row - 1),
    row,
    Math.min(ROWS - 1, row + 1),
    Math.min(ROWS - 1, row + 2),
  ];
  const columnIndices = [column - 1, column, column + 1, column + 2]
    .map((value) => (value + COLUMNS) % COLUMNS);
  const sample = (property, component) => {
    const across = rowIndices.map((rowIndex) => {
      const values = columnIndices.map((columnIndex) =>
        control[rowIndex][columnIndex][property][component]);
      return catmullRom(values[0], values[1], values[2], values[3], columnFraction);
    });
    return catmullRom(across[0], across[1], across[2], across[3], rowFraction);
  };
  const positionAt = (v, u) => [0, 1, 2].map((component) => {
    const across = rowIndices.map((rowIndex) => {
      const values = columnIndices.map((columnIndex) =>
        control[rowIndex][columnIndex].position[component]);
      return catmullRom(values[0], values[1], values[2], values[3], u);
    });
    return catmullRom(across[0], across[1], across[2], across[3], v);
  });
  const position = positionAt(rowFraction, columnFraction);
  const epsilon = 1 / 1024;
  const u0 = Math.max(0, columnFraction - epsilon);
  const u1 = Math.min(1, columnFraction + epsilon);
  const v0 = Math.max(0, rowFraction - epsilon);
  const v1 = Math.min(1, rowFraction + epsilon);
  const beforeU = positionAt(rowFraction, u0);
  const afterU = positionAt(rowFraction, u1);
  const beforeV = positionAt(v0, columnFraction);
  const afterV = positionAt(v1, columnFraction);
  const tangentU = afterU.map((value, component) => value - beforeU[component]);
  const tangentV = afterV.map((value, component) => value - beforeV[component]);
  const normal = [
    tangentU[1] * tangentV[2] - tangentU[2] * tangentV[1],
    tangentU[2] * tangentV[0] - tangentU[0] * tangentV[2],
    tangentU[0] * tangentV[1] - tangentU[1] * tangentV[0],
  ];
  const normalLength = Math.hypot(...normal) || 1;
  return {
    position,
    normal: normal.map((value) => value / normalLength),
    color: [0, 1, 2, 3].map((component) => sample('color', component)),
    // The legacy renderer treats the cyclic U seam specially. Interpolating
    // it as an unwrapped interval reproduces 5/6 -> 1 instead of smearing it
    // backwards through zero.
    uv: [(column + columnFraction) * ONE_SIXTH, (row + rowFraction) * ONE_SIXTH],
  };
}

export function buildWonderBubbleSurface(localTime) {
  const control = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, column) =>
      wonderBubbleControlPoint(localTime, row, column)));
  const vertices = [];
  for (let row = 0; row < ROWS - 1; row++) {
    for (let rowStep = 0; rowStep < ROW_STEPS - 1; rowStep++) {
      const v0 = rowStep / (ROW_STEPS - 1);
      const v1 = (rowStep + 1) / (ROW_STEPS - 1);
      for (let column = 0; column < COLUMNS; column++) {
        for (let columnStep = 0; columnStep < COLUMN_STEPS - 1; columnStep++) {
          const u0 = columnStep / (COLUMN_STEPS - 1);
          const u1 = (columnStep + 1) / (COLUMN_STEPS - 1);
          const a = interpolateControlGrid(control, row, column, v0, u0);
          const b = interpolateControlGrid(control, row, column, v0, u1);
          const c = interpolateControlGrid(control, row, column, v1, u1);
          const d = interpolateControlGrid(control, row, column, v1, u0);
          vertices.push(a, b, c, a, c, d);
        }
      }
    }
  }
  return vertices;
}

/** Reimplementation of Wonder class 0x408ca0, mode one. */
export class BubbleEffect {
  constructor(mgl, texture, envelope) {
    this.mgl = mgl;
    this.texture = texture;
    this.envelope = envelope;
  }

  render(localTime) {
    const { mgl } = this;
    const camera = sampleEnvelope(this.envelope, localTime);
    const vertices = buildWonderBubbleSurface(localTime);

    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableCullFace(false);
    mgl.enableLighting(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.bindTexture(this.texture);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-0.5, 0.5, -0.375, 0.375, 1, 1000);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.translate(camera[0], 0, -420);
    mgl.rotate(90, -0.30000001192092896, 1, 0);
    mgl.rotate(f32(localTime) * 0.5, 0, 1, 0);
    mgl.rotate(camera[1], 1, 0, 0);

    // The constructor installs two descriptors for the same image. Flags 1
    // and 2 select regular UVs and the generated normal XY respectively;
    // 0x4098a0 draws them as distinct additive passes.
    for (let pass = 0; pass < 2; pass++) {
      mgl.begin(mgl.TRIANGLES);
      for (const vertex of vertices) {
        mgl.color4(...vertex.color);
        mgl.texCoord2(...(pass === 0 ? vertex.uv : vertex.normal));
        mgl.vertex3(...vertex.position);
      }
      mgl.end();
    }
    mgl.depthMask(true);
    return { camera, vertexCount: vertices.length };
  }
}
