import { Mat4 } from '../shared/mathlib.js';

const MODE3_START = 182;
const MODE3_END = 233;
const GRID_SIZE = 13;
const GRID_SLICE = GRID_SIZE * GRID_SIZE;
const GRID_EXTENT = 300;
const GRID_STEP = Math.fround((GRID_EXTENT * 2) / GRID_SIZE);
const MAX_PHYSICS_STEP = Math.fround(1 / 12);
const REFERENCE_DISPLAY_RATE = 30;
const SPRING_STRENGTH = 100;
const SPRING_DAMPING = 20;
const FIELD_DISTANCE_LIMIT = 800;
const FIELD_DISTANCE_SCALE = 0.00125;
const FIELD_ZERO_DISTANCE = 0.001;
const HOLE_THRESHOLD = Math.fround(0.03999999910593033);

// DAT_0043eb78: ten keys followed by the tangent storage prepared by
// 0x404060. As in modes 2 and 4, the six animated values are T(x,y,z),
// Rx, Ry and the final camera-Z translation.
export const ENERGIA_MODE3_CAMERA_KEYS = Object.freeze([
  [0, -176.74708557128906, 0, 306.0207214355469,
    7.666667938232422, -108, 120],
  [4, -134.46255493164062, 0, 300.5519714355469,
    -7.999999046325684, -33.33333206176758, 120],
  [9, -55.99953842163086, 0, 188.7382049560547,
    23.000001907348633, -30.333332061767578, 120],
  [14, -55.19029235839844, 0, 209.4061737060547,
    2.666670083999634, 41.333335876464844, 120],
  [18, -10.467637062072754, 0, 118.83209991455078,
    -66.33332824707031, 25.333335876464844, 120],
  [21, -67.6434555053711, 0, 16.953935623168945,
    2.0000081062316895, 43.333335876464844, 120],
  [25, 40.6798095703125, 0, -75.04911041259766,
    -46.99999237060547, 248.3333282470703, 120],
  [27, 179.21572875976562, 0, 98.37882995605469,
    28.666677474975586, 311, 120],
  [31, 179.21572875976562, 0, 98.37882995605469,
    90, 370, 120],
  [36, 419.1304931640625, 0, 179.78480529785156,
    39.333335876464844, 427.6666564941406, 120],
]);

function prepareCameraKeys(source) {
  const keys = source.map((key) => ({
    time: key[0],
    values: key.slice(1),
    tangent7: Array(6).fill(0),
    tangent13: Array(6).fill(0),
  }));
  const duration = keys.at(-1).time;
  const setTangents = (previous, current, next) => {
    let previousTime = previous.time;
    let currentTime = current.time;
    let nextTime = next.time;
    if (previousTime <= currentTime) {
      if (nextTime < currentTime) nextTime += duration;
    } else {
      currentTime += duration;
      nextTime += duration;
    }
    const previousWeight = (currentTime - previousTime) / (nextTime - previousTime);
    const nextWeight = (nextTime - currentTime) / (nextTime - previousTime);
    for (let channel = 0; channel < 6; channel++) {
      const into = current.values[channel] - previous.values[channel];
      const out = next.values[channel] - current.values[channel];
      // Every native camera key is prepared with T=C=B=.25.
      current.tangent7[channel] = Math.fround((
        into * 1.25 * 0.75 * 0.75 + out * 0.75 * 0.75 * 1.25
      ) * previousWeight);
      current.tangent13[channel] = Math.fround((
        into * 1.25 * 1.25 * 0.75 + out * 0.75 * 0.75 * 0.75
      ) * nextWeight);
    }
  };
  for (let index = 1; index < keys.length - 1; index++) {
    setTangents(keys[index - 1], keys[index], keys[index + 1]);
  }
  setTangents(keys.at(-2), keys[0], keys[1]);
  setTangents(keys.at(-2), keys.at(-1), keys[1]);
  return keys;
}

const PREPARED_CAMERA_KEYS = prepareCameraKeys(ENERGIA_MODE3_CAMERA_KEYS);

export function energiaMode3Camera(localSeconds) {
  const firstTime = PREPARED_CAMERA_KEYS[0].time;
  // Interpolation mode 1 at 0x403d80 wraps over last-first+1.
  const period = PREPARED_CAMERA_KEYS.at(-1).time - firstTime + 1;
  const seconds = ((Math.max(0, localSeconds) - firstTime) % period + period) % period + firstTime;
  let index = PREPARED_CAMERA_KEYS.length - 2;
  for (let key = 0; key < PREPARED_CAMERA_KEYS.length - 1; key++) {
    if (seconds <= PREPARED_CAMERA_KEYS[key + 1].time) {
      index = key;
      break;
    }
  }
  const left = PREPARED_CAMERA_KEYS[index];
  const right = PREPARED_CAMERA_KEYS[index + 1];
  const amount = Math.max(0, Math.min(1,
    (seconds - left.time) / (right.time - left.time)));
  const amount2 = amount * amount;
  const amount3 = amount2 * amount;
  const h00 = 2 * amount3 - 3 * amount2 + 1;
  const h10 = amount3 - 2 * amount2 + amount;
  const h01 = 3 * amount2 - 2 * amount3;
  const h11 = amount3 - amount2;
  const values = left.values.map((value, channel) => Math.fround(
    h10 * left.tangent13[channel] + h00 * value
      + h01 * right.values[channel] + h11 * right.tangent7[channel],
  ));
  return {
    translation: values.slice(0, 3),
    rotation: values.slice(3, 5),
    distance: values[5],
  };
}

function buildGridParticles() {
  const particles = [];
  let z = Math.fround(-GRID_EXTENT);
  for (let zi = 0; zi < GRID_SIZE; zi++) {
    let y = Math.fround(GRID_EXTENT);
    for (let yi = 0; yi < GRID_SIZE; yi++) {
      let x = Math.fround(-GRID_EXTENT);
      for (let xi = 0; xi < GRID_SIZE; xi++) {
        const rest = [x, y, z];
        particles.push({
          position: rest.slice(),
          velocity: [0, 0, 0],
          acceleration: [0, 0, 0],
          rest,
          mass: 1,
          field: 0,
        });
        x = Math.fround(x + GRID_STEP);
      }
      y = Math.fround(y - GRID_STEP);
    }
    z = Math.fround(z + GRID_STEP);
  }
  return particles;
}

function mode3Fields(seconds) {
  const time = Math.fround(seconds);
  return [
    {
      center: [
        Math.fround(Math.sin(time * 1.234) * 200),
        Math.fround(Math.cos(time * 0.32456) * 200),
        Math.fround(Math.sin(time * 0.874) * 200),
      ],
      strength: Math.fround(Math.sin(time * 1.11) * 6000 + 18400),
    },
    {
      center: [
        Math.fround(Math.sin(time * 1.7) * -40),
        Math.fround(Math.cos(time * 0.7) * -75),
        Math.fround(Math.sin(time * 0.34) * 69),
      ],
      strength: -8400,
    },
  ];
}

function applyRadialField(particles, { center, strength }) {
  for (const particle of particles) {
    const dx = center[0] - particle.position[0];
    const dy = center[1] - particle.position[1];
    const dz = center[2] - particle.position[2];
    const distance = Math.hypot(dx, dy, dz);
    const inverseDistance = distance > FIELD_ZERO_DISTANCE ? 1 / distance : 1;
    // 0x407a80 stores this renderer field on every callback. The negative
    // radial modifier runs last, so its distance is what 0x408da0 sees.
    particle.field = Math.fround(
      Math.min(distance, FIELD_DISTANCE_LIMIT) * FIELD_DISTANCE_SCALE,
    );
    const magnitude = (1 - particle.field) * strength;
    particle.acceleration[0] = Math.fround(
      particle.acceleration[0] - dx * inverseDistance * magnitude,
    );
    particle.acceleration[1] = Math.fround(
      particle.acceleration[1] - dy * inverseDistance * magnitude,
    );
    particle.acceleration[2] = Math.fround(
      particle.acceleration[2] - dz * inverseDistance * magnitude,
    );
  }
}

function recomputeForces(particles, fields) {
  // Modifier 0x408880 reconstructs the original grid coordinates while it
  // walks the pointer array; no separate spring-rest buffer exists natively.
  for (const particle of particles) {
    for (let axis = 0; axis < 3; axis++) {
      particle.acceleration[axis] = Math.fround(
        (particle.rest[axis] - particle.position[axis]) * SPRING_STRENGTH
          - particle.velocity[axis] * SPRING_DAMPING,
      );
    }
  }
  applyRadialField(particles, fields[0]);
  applyRadialField(particles, fields[1]);
}

class Mode3Simulation {
  constructor({ displayRate = REFERENCE_DISPLAY_RATE } = {}) {
    this.displayRate = displayRate;
    this.reset();
  }

  reset() {
    this.seconds = MODE3_START;
    this.nextDisplayFrame = 0;
    this.lastDisplaySeconds = Number.NEGATIVE_INFINITY;
    this.particles = buildGridParticles();
    this.fields = mode3Fields(MODE3_START);
  }

  integrate(seconds) {
    // Generic system update 0x407490 advances position with the old velocity,
    // then velocity with the acceleration accumulated on the preceding step.
    for (const particle of this.particles) {
      for (let axis = 0; axis < 3; axis++) {
        particle.position[axis] = Math.fround(
          particle.position[axis] + particle.velocity[axis] * seconds,
        );
        particle.velocity[axis] = Math.fround(
          particle.velocity[axis] + particle.acceleration[axis] * seconds,
        );
      }
    }
    this.seconds = Math.fround(this.seconds + seconds);
    recomputeForces(this.particles, this.fields);
  }

  displayFrame(targetSeconds) {
    // 0x408bf0 moves both fields once per displayed frame, before tail-calling
    // the generic particle update. A zero-delta activation still evaluates all
    // force modifiers and seeds the acceleration for the following frame.
    this.fields = mode3Fields(targetSeconds);
    if (this.seconds + 1e-7 >= targetSeconds) {
      recomputeForces(this.particles, this.fields);
      return;
    }
    while (this.seconds + 1e-7 < targetSeconds) {
      this.integrate(Math.fround(Math.min(
        MAX_PHYSICS_STEP, targetSeconds - this.seconds,
      )));
    }
  }

  advance(localSeconds) {
    const target = Math.max(0, Math.min(MODE3_END - MODE3_START, localSeconds));
    if (target + 1e-7 < this.lastDisplaySeconds) this.reset();
    while (this.nextDisplayFrame / this.displayRate <= target + 1e-7) {
      this.displayFrame(Math.fround(
        MODE3_START + this.nextDisplayFrame / this.displayRate,
      ));
      this.nextDisplayFrame++;
    }
    this.lastDisplaySeconds = target;
    return this;
  }
}

export function energiaMode3State(seconds, { displayRate = REFERENCE_DISPLAY_RATE } = {}) {
  const localSeconds = Math.max(0, Math.min(MODE3_END - MODE3_START, seconds - MODE3_START));
  const simulation = new Mode3Simulation({ displayRate }).advance(localSeconds);
  return {
    localSeconds,
    simulatedSeconds: Math.fround(simulation.seconds - MODE3_START),
    camera: energiaMode3Camera(localSeconds),
    particleCount: simulation.particles.length,
    particles: simulation.particles,
    fields: simulation.fields,
  };
}

function copyColor(color) { return [color[0], color[1], color[2], color[3]]; }

function appendTriangle(output, a, b, c) { output.push(a, b, c); }

function appendTriangleStrip(output, strip) {
  for (let index = 0; index + 2 < strip.length; index++) {
    if ((index & 1) === 0) appendTriangle(output, strip[index], strip[index + 1], strip[index + 2]);
    else appendTriangle(output, strip[index + 1], strip[index], strip[index + 2]);
  }
}

function appendQuadStrip(output, strip) {
  for (let index = 0; index + 3 < strip.length; index += 2) {
    // Native GL_QUAD_STRIP quad order is 0,1,3,2.
    appendTriangle(output, strip[index], strip[index + 1], strip[index + 3]);
    appendTriangle(output, strip[index], strip[index + 3], strip[index + 2]);
  }
}

function coloredParticleVertex(particle, color) {
  return { position: particle.position, color: copyColor(color) };
}

/** Expand both immediate strip families emitted by Energia's 0x408da0. */
export function buildEnergiaMode3LatticeTriangles(particles) {
  const triangles = [];
  let black = false;
  let color = [1, 0.3, 0.12, 0.2];
  let cursor = 0;
  for (let z = 0; z < GRID_SIZE; z++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const strip = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const particle = particles[cursor++];
        if (particle.field < HOLE_THRESHOLD) {
          if (!black) { color = [0, 0, 0, 0]; black = true; }
        } else if (black) {
          color = [1, 0.3, 0.12, 0.5];
          black = false;
        }
        strip.push(coloredParticleVertex(particle, color));
      }
      appendQuadStrip(triangles, strip);
    }
  }

  black = false;
  color = [1, 0.3, 0.12, 0.25];
  for (let z = 0; z < GRID_SIZE; z++) {
    const sliceStart = z * GRID_SLICE;
    for (let x = 0; x < GRID_SIZE; x++) {
      const strip = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        const particle = particles[sliceStart + y * GRID_SIZE + x];
        if (particle.field < HOLE_THRESHOLD) {
          if (!black) { color = [0, 0, 0, 0]; black = true; }
        } else if (black) {
          color = [1, 0.3, 0.12, 0.5];
          black = false;
        }
        strip.push(coloredParticleVertex(particle, color));
      }
      appendTriangleStrip(triangles, strip);
    }
  }
  return triangles;
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

/** Expand the eleven skymap triangle strips emitted by 0x408f60. */
export function buildEnergiaMode3SurfaceTriangles(particles) {
  const triangles = [];
  for (let y = 1; y <= 11; y++) {
    const rowStart = y * GRID_SIZE;
    const strip = [
      { position: particles[rowStart].position, normal: [0, 0, 1] },
      { position: particles[rowStart + GRID_SIZE].position, normal: [0, 0, 1] },
    ];
    for (let x = 1; x <= 11; x++) {
      const index = rowStart + x;
      const current = particles[index].position;
      // Pool allocation runs backward through contiguous 0x34-byte records.
      // Consequently the native `particle-0x34` operand is the next X entry,
      // while pointer-array +0x30 is the next row's preceding X entry.
      const nextX = particles[index + 1].position;
      const nextRowPreviousX = particles[index + GRID_SIZE - 1].position;
      const a = [
        current[0] - nextX[0], current[1] - nextX[1], current[2] - nextX[2],
      ];
      const b = [
        current[0] - nextRowPreviousX[0],
        current[1] - nextRowPreviousX[1],
        current[2] - nextRowPreviousX[2],
      ];
      const normal = cross(b, a).map(Math.fround);
      strip.push(
        { position: current, normal },
        { position: particles[index + GRID_SIZE].position, normal },
      );
    }
    appendTriangleStrip(triangles, strip);
  }
  return triangles;
}

/** Energia compositor mode 3 (0x406dc0 / 0x408880-0x409190). */
export class EnergiaMode3LatticeEffect {
  constructor(mgl, skymap) {
    this.mgl = mgl;
    this.skymap = skymap;
    this.simulation = new Mode3Simulation();
  }

  render(seconds) {
    const localSeconds = Math.max(0, Math.min(MODE3_END - MODE3_START, seconds - MODE3_START));
    this.simulation.advance(localSeconds);
    const camera = energiaMode3Camera(localSeconds);
    const { mgl } = this;
    const aspect = mgl.gl.drawingBufferWidth / mgl.gl.drawingBufferHeight;
    const projection = new Mat4().frustum(-aspect, aspect, -1, 1, 1, 2000);
    const modelView = new Mat4()
      .scale(1, 1, -1)
      .translate(0, 0, camera.distance)
      .rotate(camera.rotation[0], 1, 0, 0)
      .rotate(camera.rotation[1], 0, 1, 0)
      .translate(...camera.translation);

    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadMatrix(projection);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadMatrix(modelView);
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(false);
    // 0x4090a0 sets sphere-map texgen before both helpers and only disables it
    // after the skymap surface has been submitted.
    mgl.texGenSphereMap(true);
    mgl.enableLighting(false);
    mgl.enableFog(false);
    mgl.enableCullFace(true);
    mgl.cullFace(mgl.FRONT);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.lineWidth(1);
    mgl.enableNormalize(false);

    const lattice = buildEnergiaMode3LatticeTriangles(this.simulation.particles);
    mgl.begin(mgl.TRIANGLES);
    for (const vertex of lattice) {
      mgl.color4(...vertex.color);
      mgl.vertex3(...vertex.position);
    }
    mgl.end();

    const surface = buildEnergiaMode3SurfaceTriangles(this.simulation.particles);
    mgl.enableNormalize(true);
    mgl.enableTexture(true);
    mgl.bindTexture(this.skymap);
    mgl.texEnv({ mode: 'modulate' });
    mgl.color4(1, 1, 1, 0.9);
    mgl.begin(mgl.TRIANGLES);
    for (const vertex of surface) {
      mgl.normal3(...vertex.normal);
      mgl.vertex3(...vertex.position);
    }
    mgl.end();

    mgl.enableTexture(false);
    mgl.enableNormalize(false);
    mgl.texGenSphereMap(false);
    mgl.depthMask(true);
    return {
      localSeconds,
      camera,
      particleCount: this.simulation.particles.length,
      latticeTriangleCount: lattice.length / 3,
      surfaceTriangleCount: surface.length / 3,
    };
  }
}
