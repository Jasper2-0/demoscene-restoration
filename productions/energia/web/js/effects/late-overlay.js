import { Mat4 } from '../shared/mathlib.js';
import { buildEnergiaMode2LineQuads } from './mode2-particles.js';

const STRAND_COUNT = 32;
const KEY_COUNT = 5;
const SAMPLE_COUNT = 35;
const JITTER_REPETITIONS = 3;
const LATE_TEXTURES = Object.freeze({ 1: 'yellowshitred.jpg', 3: 'sc2.jpg' });
const LATE_OPACITY = Object.freeze({
  1: Math.fround(0.24300000071525574),
  3: Math.fround(0.34299999475479126),
});

const COLOR_START = Object.freeze([
  Math.fround(0.3019607961177826),
  Math.fround(0.04313725605607033),
  Math.fround(0.003921568859368563),
]);
const COLOR_MIDDLE = Object.freeze([
  1,
  Math.fround(0.3529411852359772),
  Math.fround(0.0470588244497776),
]);
const COLOR_END = Object.freeze([
  Math.fround(0.6078431606292725),
  Math.fround(0.7450980544090271),
  Math.fround(0.8705882430076599),
]);
const FIRST_COLOR_DELTA = Object.freeze([
  Math.fround(0.698039174079895),
  Math.fround(0.30980393290519714),
  Math.fround(0.04313725605607033),
]);

const FREQUENCIES = Object.freeze({
  p0: Object.freeze([0.8, 1.8, 0.9]),
  p1: Object.freeze([1.4, 1.12, 1.7, 0.85]),
  p2: Object.freeze([1.8, 1.44, 1.6]),
  p3: Object.freeze([2.2, 1.76, 0.75, 1.5]),
  p4: Object.freeze([2.6, 2.08, 0.7, 1.4]),
});

function f32(value) { return Math.fround(value); }

function buildColors() {
  const colors = [];
  const firstStep = FIRST_COLOR_DELTA.map((value) => f32(value * f32(0.03125)));
  for (let index = 0; index < 32; index++) {
    colors.push(COLOR_START.map((value, axis) => f32(f32(firstStep[axis] * index) + value)));
  }
  const secondStep = COLOR_END.map((value, axis) => (
    f32(f32(value - COLOR_MIDDLE[axis]) * f32(0.03125))
  ));
  for (let index = 0; index < 32; index++) {
    colors.push(COLOR_MIDDLE.map((value, axis) => (
      f32(f32(secondStep[axis] * index) + value)
    )));
  }
  return colors.map(Object.freeze);
}

/** The 64-entry constructor gradient at 0x413980. The renderer uses every other entry. */
export const ENERGIA_LATE_OVERLAY_COLORS = Object.freeze(buildColors());

/** Per-box matrices and material state written by 0x4133e0. */
export function energiaLateOverlaySceneState(localSeconds, mode, meshCount = 256) {
  const local = f32(localSeconds);
  const scaleValue = f32(Math.min(local, 1));
  const matrixCount = Math.max(0, meshCount | 0);
  const matrices = [];
  let objectPhase = 0;
  const phaseStep = f32((Math.cos(local * 0.03) + Math.sin(local * 0.11)) * 2.91);
  const timeRotation = local * 0.6;
  for (let index = 0; index < matrixCount; index++) {
    const translationZ = f32(Math.sin(objectPhase * 0.073 + local) * 250);
    const rotation = f32(objectPhase * 0.3 + timeRotation);
    const cosine = f32(Math.cos(rotation));
    const sine = f32(Math.sin(rotation));
    const matrix = new Mat4();
    matrix.m.set([
      f32(cosine * scaleValue), f32(sine * scaleValue), 0, 0,
      f32(-sine * scaleValue), f32(cosine * scaleValue), 0, 0,
      0, 0, scaleValue, 0,
      0, 0, translationZ, 1,
    ]);
    matrices.push(matrix);
    objectPhase = f32(objectPhase + phaseStep);
  }
  return Object.freeze({
    localSeconds: local,
    mode,
    frame: f32(local * 10),
    texture: LATE_TEXTURES[mode] ?? LATE_TEXTURES[1],
    opacityScale: LATE_OPACITY[mode] ?? LATE_OPACITY[1],
    textureOffset: Object.freeze([f32(local * 0.22), 0]),
    textureRotationRate: 24,
    scale: scaleValue,
    phaseStep,
    matrices: Object.freeze(matrices),
  });
}

function controlPoint(x, y, z) {
  return Object.freeze([f32(x), f32(y), f32(z)]);
}

/**
 * The five moving control points built by 0x413db0 for one of its 32 strands.
 * `localSeconds` is the first argument of 0x413050 (show time minus 156 or 182).
 */
export function energiaLateOverlayControlPoints(localSeconds, strandIndex) {
  const index = Math.max(0, Math.min(STRAND_COUNT - 1, strandIndex | 0));
  let phase = f32(f32(localSeconds) * 0.91);
  for (let offset = 0; offset <= index; offset++) phase = f32(phase + 0.01);
  const strandPhase = index * 0.3;
  const xPhase = Math.cos(strandPhase) * 5;
  const yPhase = Math.sin(strandPhase) * 4;
  const z = index === 0 ? 0 : -45 * Math.ceil(index / 2);

  return Object.freeze([
    controlPoint(
      Math.sin(phase) * Math.cos(phase * FREQUENCIES.p0[0] + xPhase) * 110 - 100,
      Math.cos(phase * FREQUENCIES.p0[1])
        * Math.sin(phase * FREQUENCIES.p0[2] + yPhase) * 180 - 100,
      z,
    ),
    controlPoint(
      Math.sin(phase * FREQUENCIES.p1[0])
        * Math.cos(phase * FREQUENCIES.p1[1] + xPhase) * 110 - 100,
      Math.cos(phase * FREQUENCIES.p1[2])
        * Math.sin(phase * FREQUENCIES.p1[3] + yPhase) * 180 + 100,
      z,
    ),
    controlPoint(
      Math.sin(phase * FREQUENCIES.p2[0])
        * Math.cos(phase * FREQUENCIES.p2[1] + xPhase) * 110 + 100,
      Math.sin(yPhase + phase * 0.8)
        * Math.cos(phase * FREQUENCIES.p2[2]) * 180 + 100,
      z,
    ),
    controlPoint(
      Math.sin(phase * FREQUENCIES.p3[0])
        * Math.cos(phase * FREQUENCIES.p3[1] + xPhase) * 110 + 100,
      Math.cos(phase * FREQUENCIES.p3[3])
        * Math.sin(phase * FREQUENCIES.p3[2] + yPhase) * 180 - 100,
      z,
    ),
    controlPoint(
      Math.sin(phase * FREQUENCIES.p4[0])
        * Math.cos(phase * FREQUENCIES.p4[1] + xPhase) * 110 - 100,
      Math.cos(phase * FREQUENCIES.p4[3])
        * Math.sin(phase * FREQUENCIES.p4[2] + yPhase) * 180 - 100,
      z,
    ),
  ]);
}

function subtract(a, b) {
  return a.map((value, axis) => f32(value - b[axis]));
}

function scale(a, amount) {
  return a.map((value) => f32(value * amount));
}

function add(a, b) {
  return a.map((value, axis) => f32(value + b[axis]));
}

function splineTangents(points) {
  const incoming = Array.from({ length: KEY_COUNT }, () => [0, 0, 0]);
  const outgoing = Array.from({ length: KEY_COUNT }, () => [0, 0, 0]);
  for (let index = 1; index < KEY_COUNT - 1; index++) {
    const tangent = scale(subtract(points[index + 1], points[index - 1]), 0.5);
    incoming[index] = tangent;
    outgoing[index] = tangent;
  }

  // Exact zero-TCB endpoint equations in 0x4168d0 and 0x416a50.
  const firstSpan = subtract(points[2], points[0]);
  outgoing[0] = add(
    scale(subtract(points[1], points[0]), 1.5),
    scale(firstSpan, -0.25),
  );
  const lastSpan = subtract(points[4], points[2]);
  incoming[4] = add(
    scale(subtract(points[4], points[3]), 1.5),
    scale(lastSpan, -0.25),
  );
  return { incoming, outgoing };
}

function sampleSpline(points, tangents, time) {
  const index = Math.max(0, Math.min(KEY_COUNT - 2, Math.floor(time)));
  const amount = time - index;
  const amount2 = amount * amount;
  const amount3 = amount2 * amount;
  const h00 = f32(2 * amount3 - 3 * amount2 + 1);
  const h10 = f32(amount3 - 2 * amount2 + amount);
  const h01 = f32(3 * amount2 - 2 * amount3);
  const h11 = amount3 - amount2;
  return [0, 1, 2].map((axis) => f32(
    h00 * points[index][axis]
      + h10 * tangents.outgoing[index][axis]
      + h01 * points[index + 1][axis]
      + h11 * tangents.incoming[index + 1][axis],
  ));
}

function jitterValue(phase, scaleValue) {
  return (Math.abs(Math.sin(phase) * Math.cos(phase + phase)) - 0.5) * scaleValue;
}

/**
 * Reachable vertex stream from 0x413db0/0x414400. The native program emits
 * all 6,528 vertices inside one GL_LINE_STRIP and changes color per strand.
 */
export function buildEnergiaLateOverlay(localSeconds) {
  const local = f32(localSeconds);
  let jitterPhase = f32(local * 0.91);
  const step = f32(4 / SAMPLE_COUNT);
  const vertices = [];
  const strands = [];

  for (let strandIndex = 0; strandIndex < STRAND_COUNT; strandIndex++) {
    const points = energiaLateOverlayControlPoints(local, strandIndex);
    const tangents = splineTangents(points);
    const color = Object.freeze([
      ...ENERGIA_LATE_OVERLAY_COLORS[strandIndex * 2],
      f32(0.1),
    ]);
    const firstVertex = vertices.length;
    let previous = sampleSpline(points, tangents, 0);
    let sampleTime = step;
    let segmentCount = 0;
    while (sampleTime < 4) {
      const current = sampleSpline(points, tangents, sampleTime);
      for (let repeat = 0; repeat < JITTER_REPETITIONS; repeat++) {
        // The first value affects only an unreachable diagnostic branch.
        jitterPhase += 125734;
        jitterValue(jitterPhase, 10);
        jitterPhase += 125734;
        const dy = jitterValue(jitterPhase, 80);
        jitterPhase += 125734;
        const dx = jitterValue(jitterPhase, 80);
        vertices.push(
          Object.freeze({ position: Object.freeze([
            f32(previous[0] + dx), f32(previous[1] + dy), previous[2],
          ]), color }),
          Object.freeze({ position: Object.freeze([
            f32(current[0] + dx), f32(current[1] + dy), current[2],
          ]), color }),
        );
      }
      previous = current;
      sampleTime = f32(sampleTime + step);
      segmentCount++;
    }
    strands.push(Object.freeze({
      index: strandIndex,
      controlPoints: points,
      firstVertex,
      vertexCount: vertices.length - firstVertex,
      segmentCount,
      color,
    }));
  }

  return Object.freeze({
    localSeconds: local,
    rotationX: f32(Math.sin(local * 0.21) * 20 + 360),
    rotationY: f32(Math.sin(local * 0.2113 + 0.3) * 20 + 360),
    vertices: Object.freeze(vertices),
    strands: Object.freeze(strands),
    finalJitterPhase: jitterPhase,
  });
}

/** Expand the native strip into portable clipped three-pixel quads. */
export function buildEnergiaLateOverlayLineQuads(
  state, modelView, projection, viewportWidth, viewportHeight,
) {
  const segments = [];
  for (let index = 0; index + 1 < state.vertices.length; index++) {
    segments.push(state.vertices[index], state.vertices[index + 1]);
  }
  return buildEnergiaMode2LineQuads(
    segments, modelView, projection, 3, viewportWidth, viewportHeight,
  );
}

/** Energia's procedural orange line pass at 0x413db0. */
export class EnergiaLateOverlayEffect {
  constructor(mgl) { this.mgl = mgl; }

  render(localSeconds) {
    const state = buildEnergiaLateOverlay(localSeconds);
    const { mgl } = this;
    const viewportWidth = mgl.gl.drawingBufferWidth;
    const viewportHeight = mgl.gl.drawingBufferHeight;
    const projection = new Mat4().frustum(-0.5, 0.5, -0.375, 0.375, 1, 5000);
    const modelView = new Mat4()
      .translate(0, 0, -350)
      .rotate(state.rotationX, 1, 0, 0)
      .rotate(state.rotationY, 0, 1, 0);
    mgl.viewport(0, 0, viewportWidth, viewportHeight);
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(false);
    mgl.enableLighting(false);
    mgl.enableFog(false);
    mgl.enableCullFace(false);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    const quads = buildEnergiaLateOverlayLineQuads(
      state, modelView, projection, viewportWidth, viewportHeight,
    );
    mgl.begin(mgl.QUADS);
    for (const vertex of quads) {
      mgl.color4(...vertex.color);
      mgl.vertex3(...vertex.position);
    }
    mgl.end();
    mgl.depthMask(true);
    mgl.enableDepthTest(true);
    mgl.enableCullFace(true);
    return state;
  }
}
