import { sampleEnvelope } from '../shared/envelope.js';

const ROWS = 16;
const COLUMNS = 6;
// CSplinedObject::RenderPatch names +0x190 seedU and +0x194 seedV: five
// samples across cyclic columns and two down depth rows.
const COLUMN_STEPS = 5;
const ROW_STEPS = 2;

// All non-integer constants are the original single-precision operands from
// 0x40b040/0x40b470/0x40b860. The native code evaluates the trigonometry on
// x87 and stores each generated control-vertex component back to float.
const CENTER_STEP = Math.fround(0.0430000014603138);
const CENTER_DEPTH_STEP = Math.fround(64);
const CENTER_DEPTH_ORIGIN = Math.fround(-0.5);
const OSCILLATORS = Object.freeze([
  Object.freeze({ amplitude: 96, rate: Math.fround(4.2096099853515625), phase: 0 }),
  Object.freeze({ amplitude: 64, rate: Math.fround(2.4503698348999023), phase: Math.fround(0.7) }),
  Object.freeze({ amplitude: 64, rate: Math.fround(4.837909698486328), phase: Math.fround(-0.1) }),
  Object.freeze({ amplitude: 96, rate: Math.fround(3.078670024871826), phase: Math.fround(0.37) }),
]);
const ROW_FRACTION = Math.fround(0.0625);
const COLUMN_FRACTION = Math.fround(1 / 6);
const TAU_F32 = Math.fround(6.2831854820251465);
const HALF_PI_F32 = Math.fround(1.5707963705062866);
const RADIUS = Math.fround(98);
// Raw x87 `fmull 0x4332e8`: the eight bytes encode double 0.25.  The adjacent
// float at 0x4332e0 is 1.5, but it is not the operand used by 0x40b860.
const Y_RADIUS_WAVE = 0.25;
const DEPTH_SWING = Math.fround(10);
const U_SCROLL = Math.fround(0.15);
const V_SCROLL = Math.fround(-1.1699999570846558);
const V_ROW_STEP = Math.fround(0.15000000596046448);
const FADE_OUT_START = Math.fround(15.137999534606934);
const ENVELOPE_TIME_ORIGIN = 69.753;

const OVERLAY_QUAD = Object.freeze([
  Object.freeze({ uv: [0, 0], position: [-100, 75, -200] }),
  Object.freeze({ uv: [1, 0], position: [100, 75, -200] }),
  Object.freeze({ uv: [1, 1], position: [100, -75, -200] }),
  Object.freeze({ uv: [0, 1], position: [-100, -75, -200] }),
]);

function f32(value) {
  return Math.fround(value);
}

/** The shared entrance/exit envelope used by both the surface and design card. */
export function wonderDesignTunnelFade(localTime) {
  const time = f32(localTime);
  if (time < 2) return f32(Math.min(f32(time * 0.5), 1));
  if (time <= FADE_OUT_START) return 1;
  return f32(1 - Math.min(f32(f32(time - FADE_OUT_START) * 0.5), 1));
}

function tunnelCenters(time) {
  const [x0, x1, y0, y1] = OSCILLATORS;
  return Array.from({ length: ROWS }, (_, row) => {
    const phase = row * CENTER_STEP + time;
    return [
      f32(Math.sin(phase * x0.rate + x0.phase) * x0.amplitude
        + Math.sin(phase * x1.rate + x1.phase) * x1.amplitude),
      f32(Math.sin(phase * y0.rate + y0.phase) * y0.amplitude
        + Math.sin(phase * y1.rate + y1.phase) * y1.amplitude),
      f32(CENTER_DEPTH_ORIGIN - row * CENTER_DEPTH_STEP),
    ];
  });
}

// 0x40a280 derives two face vectors for every control point, accumulates the
// six neighboring vectors, normalizes the result, then maps X/Y to [0,1].
// These coordinates are stored in the vertex's first UV channel and are what
// descriptor flag 2 consumes.  They are deliberately generated on the 16x6
// controls before Catmull-Rom tessellation, rather than from the final spline.
function addNativeEnvironmentCoordinates(control) {
  const faces = control.map((row, rowIndex) => row.map((point, columnIndex) => {
    const nextColumn = control[rowIndex][(columnIndex + 1) % COLUMNS];
    const nextRow = rowIndex + 1 < ROWS ? control[rowIndex + 1][columnIndex] : point;
    const diagonal = rowIndex + 1 < ROWS
      ? control[rowIndex + 1][(columnIndex + 1) % COLUMNS]
      : nextColumn;
    const b = nextColumn.position.map((value, component) => f32(value - point.position[component]));
    const c = nextRow.position.map((value, component) => f32(value - point.position[component]));
    const d = diagonal.position.map((value, component) => f32(value - point.position[component]));
    // Raw 0x40a340..0x40a3a3, including its nonstandard add/negate order.
    return {
      row: [
        f32(-(d[2] * c[1] + d[1] * c[2])),
        f32(-(c[2] * d[0] + d[2] * c[0])),
        f32(d[1] * c[0] + c[1] * d[0]),
      ],
      column: [
        f32(-(d[2] * b[1] + d[1] * b[2])),
        f32(-(b[2] * d[0] + d[2] * b[0])),
        f32(d[1] * b[0] + b[1] * d[0]),
      ],
    };
  }));

  const generated = Array.from({ length: ROWS }, () => Array(COLUMNS));
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const previousRow = Math.max(0, row - 1);
      const nextRow = Math.min(ROWS - 1, row + 1);
      const previousColumn = (column + COLUMNS - 1) % COLUMNS;
      const previousDiagonalRow = row > 0 ? row - 1 : row;
      const vectors = [
        faces[row][column].row,
        faces[row][column].column,
        faces[previousRow][column].row,
        faces[nextRow][column].column,
        faces[previousDiagonalRow][previousColumn].row,
        faces[previousDiagonalRow][previousColumn].column,
      ];
      const normal = [0, 0, 0];
      for (const vector of vectors) {
        for (let component = 0; component < 3; component++) {
          normal[component] = f32(normal[component] + vector[component]);
        }
      }
      const length = Math.hypot(...normal) || 1;
      generated[row][column] = [
        f32(f32(normal[0] / length + 1) * 0.5),
        f32(f32(normal[1] / length + 1) * 0.5),
      ];
    }
  }
  // GenerateNormals binds its CVector reference before updating `i`. The
  // first generated value (control 0) is consequently written to control 95,
  // and every other result lands one vertex behind. Disassembly shows the
  // same stale-index flow as the surviving tessellator source.
  for (let source = 0; source < ROWS * COLUMNS; source++) {
    const destination = (source + ROWS * COLUMNS - 1) % (ROWS * COLUMNS);
    control[Math.floor(destination / COLUMNS)][destination % COLUMNS].environmentUv =
      generated[Math.floor(source / COLUMNS)][source % COLUMNS];
  }
  return control;
}

/** Exact 16x6 control lattice emitted by Wonder method 0x40b860. */
export function wonderDesignTunnelControlGrid(localTime) {
  const time = f32(localTime);
  const centers = tunnelCenters(time);
  const origin = centers[0];
  let v = (time * V_SCROLL) % 1; // C fmod: the negative remainder is retained.
  const control = [];
  for (let row = 0; row < ROWS; row++) {
    const rowPhase = row * ROW_FRACTION;
    const radiusMod = Math.sin(rowPhase * Math.fround(2.540400266647339) + time)
      * Math.fround(0.19999998807907104) + 0.5;
    const yBase = Math.sin(rowPhase * Math.fround(7.533420085906982)
      + (time + Math.fround(0.7850000262260437))) * Y_RADIUS_WAVE
      + Math.fround(1.149999976158142);
    const xLow = f32((Math.fround(1.100000023841858) - radiusMod) * 0.5);
    const xHigh = f32((radiusMod + Math.fround(1.100000023841858)) * 0.5);
    const yLow = f32((yBase - Math.fround(0.30000001192092896)) * 0.5);
    const yHigh = f32((yBase + Math.fround(0.30000001192092896)) * 0.5);
    const center = centers[ROWS - 1 - row];
    const color = f32(rowPhase);
    const points = [];
    for (let column = 0; column < COLUMNS; column++) {
      const columnPhase = column * COLUMN_FRACTION;
      const theta = columnPhase * TAU_F32;
      const combinedPhase = rowPhase + columnPhase;
      const xWave = Math.sin(combinedPhase * Math.fround(6.309999942779541) + time);
      const yWave = Math.sin(combinedPhase * Math.fround(3.6566002368927)
        + time * Math.fround(0.8999999761581421));
      const xRadial = f32(Math.sin(theta + HALF_PI_F32) * RADIUS
        * (xWave * xLow + xHigh));
      const yRadial = f32(Math.sin(theta) * RADIUS * (yWave * yLow + yHigh));
      const zRadial = f32(Math.sin(time * 5) * DEPTH_SWING);
      points.push({
        position: [
          f32(xRadial + center[0] - origin[0]),
          f32(yRadial + center[1] - origin[1]),
          f32(zRadial + center[2] - origin[2]),
        ],
        uv: [f32(columnPhase), f32(v)],
        color: [color, color, color, 1],
      });
    }
    control.push(points);
    v += V_ROW_STEP;
  }
  return addNativeEnvironmentCoordinates(control);
}

// 0x40a650, used by the shared native surface renderer, is the standard
// tension-.5 Catmull-Rom polynomial.
function catmullRom(a, b, c, d, t) {
  return 0.5 * ((2 * b) + (-a + c) * t
    + (2 * a - 5 * b + 4 * c - d) * t * t
    + (-a + 3 * b - 3 * c + d) * t * t * t);
}

function interpolateControlGrid(control, row, column, rowFraction, columnFraction) {
  const rowIndices = [
    Math.max(0, row - 1), row, Math.min(ROWS - 1, row + 1), Math.min(ROWS - 1, row + 2),
  ];
  const columnIndices = [column - 1, column, column + 1, column + 2]
    .map((value) => (value + COLUMNS) % COLUMNS);
  const positionAt = (v, u) => [0, 1, 2].map((component) => {
    const across = rowIndices.map((rowIndex) => {
      const values = columnIndices.map((columnIndex) =>
        control[rowIndex][columnIndex].position[component]);
      return catmullRom(values[0], values[1], values[2], values[3], u);
    });
    return catmullRom(across[0], across[1], across[2], across[3], v);
  });
  const sampleColor = (component) => {
    const across = rowIndices.map((rowIndex) => {
      const values = columnIndices.map((columnIndex) =>
        control[rowIndex][columnIndex].color[component]);
      return catmullRom(values[0], values[1], values[2], values[3], columnFraction);
    });
    return catmullRom(across[0], across[1], across[2], across[3], rowFraction);
  };
  const position = positionAt(rowFraction, columnFraction);
  const epsilon = 1 / 1024;
  const beforeU = positionAt(rowFraction, Math.max(0, columnFraction - epsilon));
  const afterU = positionAt(rowFraction, Math.min(1, columnFraction + epsilon));
  const beforeV = positionAt(Math.max(0, rowFraction - epsilon), columnFraction);
  const afterV = positionAt(Math.min(1, rowFraction + epsilon), columnFraction);
  const tangentU = afterU.map((value, component) => value - beforeU[component]);
  const tangentV = afterV.map((value, component) => value - beforeV[component]);
  const normal = [
    tangentU[1] * tangentV[2] - tangentU[2] * tangentV[1],
    tangentU[2] * tangentV[0] - tangentU[0] * tangentV[2],
    tangentU[0] * tangentV[1] - tangentU[1] * tangentV[0],
  ];
  const normalLength = Math.hypot(...normal) || 1;
  const sampleEnvironmentUv = (component) => {
    const across = rowIndices.map((rowIndex) => {
      const values = columnIndices.map((columnIndex) =>
        control[rowIndex][columnIndex].environmentUv[component]);
      return catmullRom(values[0], values[1], values[2], values[3], columnFraction);
    });
    return catmullRom(across[0], across[1], across[2], across[3], rowFraction);
  };
  return {
    position,
    normal: normal.map((value) => value / normalLength),
    environmentUv: [sampleEnvironmentUv(0), sampleEnvironmentUv(1)],
    color: [0, 1, 2, 3].map(sampleColor),
    // FUN_40ab70 unwraps the cyclic seam before interpolating regular UVs.
    uv: [
      (column + columnFraction) * COLUMN_FRACTION,
      catmullRom(
        control[rowIndices[0]][column].uv[1], control[rowIndices[1]][column].uv[1],
        control[rowIndices[2]][column].uv[1], control[rowIndices[3]][column].uv[1],
        rowFraction,
      ),
    ],
  };
}

/** Tessellate with native +0x190=5 cyclic-column and +0x194=2 depth-row samples. */
export function buildWonderDesignTunnelSurface(localTime) {
  const control = wonderDesignTunnelControlGrid(localTime);
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
          // Native RenderPatch uses the top-right/bottom-left diagonal.
          vertices.push(a, b, d, b, c, d);
        }
      }
    }
  }
  return vertices;
}

/** Exact scalar state from 0x40b470/0x40b860, separated for regression tests. */
export function wonderDesignTunnelState(localTime, pulseEnvelope) {
  const time = f32(localTime);
  const fade = wonderDesignTunnelFade(time);
  const mix = f32((Math.sin(time * 4) + 1) * 0.5);
  const envelopeTime = f32(time + ENVELOPE_TIME_ORIGIN);
  const pulse = f32(sampleEnvelope(pulseEnvelope, envelopeTime));
  return {
    time,
    fade,
    mix,
    envelopeTime,
    pulse,
    surfaceAlpha: f32(fade - pulse * 0.7),
    textureOffsets: [
      [f32(time * U_SCROLL), 0],
      [f32(-time * U_SCROLL), 0],
      [0, f32(-time)],
    ],
    overlayAlphas: [f32(mix * fade), f32((1 - mix) * fade)],
  };
}

/** Reimplementation of Wonder class 0x40b040 and render method 0x40b470. */
export class DesignTunnelEffect {
  constructor(mgl, surfaceTextures, overlayTextures, pulseEnvelope) {
    this.mgl = mgl;
    this.surfaceTextures = surfaceTextures;
    this.overlayTextures = overlayTextures;
    this.pulseEnvelope = pulseEnvelope;
  }

  render(localTime, { surface = true, overlays = true, surfacePasses = null } = {}) {
    const state = wonderDesignTunnelState(localTime, this.pulseEnvelope);
    const vertices = buildWonderDesignTunnelSurface(localTime);
    const { mgl } = this;
    mgl.enableDepthTest(true);
    mgl.depthFunc(mgl.LEQUAL);
    mgl.depthMask(true);
    mgl.enableCullFace(false);
    mgl.enableLighting(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-0.5, 0.5, -0.375, 0.375, 1, 5000);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();

    if (surface) {
      for (let pass = 0; pass < this.surfaceTextures.length; pass++) {
        if (surfacePasses && !surfacePasses.has(pass)) continue;
        mgl.bindTexture(this.surfaceTextures[pass]);
        mgl.begin(mgl.TRIANGLES);
        for (const vertex of vertices) {
          mgl.color4(vertex.color[0], vertex.color[1], vertex.color[2], state.surfaceAlpha);
          mgl.normal3(...vertex.normal);
          if (pass === 2) {
            // The old flag-2 draw helper consumes the generated first UV
            // channel and does not read its descriptor's -t offset.
            mgl.texCoord2(...vertex.environmentUv);
          } else {
            const offset = state.textureOffsets[pass];
            mgl.texCoord2(vertex.uv[0] + offset[0], vertex.uv[1] + offset[1]);
          }
          mgl.vertex3(...vertex.position);
        }
        mgl.end();
      }
    }

    mgl.enableDepthTest(false);
    if (overlays) {
      for (let pass = 0; pass < this.overlayTextures.length; pass++) {
        mgl.bindTexture(this.overlayTextures[pass]);
        mgl.color4(1, 1, 1, state.overlayAlphas[pass]);
        mgl.begin(mgl.QUADS);
        for (const vertex of OVERLAY_QUAD) {
          mgl.texCoord2(...vertex.uv);
          mgl.vertex3(...vertex.position);
        }
        mgl.end();
      }
    }
    return { ...state, vertexCount: vertices.length };
  }
}
