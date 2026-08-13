import { Mat4 } from '../shared/mathlib.js';

const MODE2_START = 44;
const MODE2_END = 82;
// 0x407245 stores 0x3d2aaaab. The system uses this as a maximum step: each
// display update consumes min(remaining time, 1/12), rather than ticking at a
// fixed 12 Hz.
const MAX_PHYSICS_STEP = Math.fround(1 / 12);
// The executable rotates its attractor once per displayed frame. The surviving
// visual reference is 30 fps, so deterministic seeking reconstructs that
// cadence explicitly instead of inheriting the browser's refresh rate.
const REFERENCE_DISPLAY_RATE = 30;
const EMIT_INTERVAL = Math.fround(0.004000000189989805);
const PARTICLE_LIFETIME = 5;
const ATTRACTOR_STRENGTH = -50000;
const LINE_ALPHA = Math.fround(0.16099999845027924);
const ROTATION_STEP = Math.PI * 10 / 180;

// DAT_0043e908: seven keys, each followed by the five values consumed by
// 0x406ed0 as T(x,y,z), Rx, Ry and the final camera-Z translation.
export const ENERGIA_MODE2_CAMERA_KEYS = Object.freeze([
  [0, 0, 0, 0, 7.000000953674316, 55, 120],
  [5, -49.72534942626953, 0, 128.64120483398438,
    -52.33333206176758, 82.33332824707031, 120],
  [10, 12.296725273132324, 0, 145.8953857421875,
    62.66667175292969, 17.666662216186523, 120],
  [15, 12.296725273132324, 0, 145.8953857421875,
    40.66667175292969, -88.00000762939453, 120],
  [20, 12.296725273132324, 0, 145.8953857421875,
    -36.999996185302734, -6.333339214324951, 120],
  [25, -1.6963249444961548, 0, 8.894671440124512,
    15.333338737487793, -11.666671752929688, 120],
  [30, -87.41706085205078, 0, -455.7027282714844,
    15.333338737487793, -11.666671752929688, 120],
]);

function prepareCameraKeys() {
  const keys = ENERGIA_MODE2_CAMERA_KEYS.map((key) => ({
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
    // 0x404060 first writes T/C/B=.25 to every key. 0x403f30 then fills
    // the two six-float tangent blocks at offsets 7 and 13.
    const tension = 0.25;
    const continuity = 0.25;
    const bias = 0.25;
    for (let channel = 0; channel < 6; channel++) {
      const into = current.values[channel] - previous.values[channel];
      const out = next.values[channel] - current.values[channel];
      current.tangent7[channel] = Math.fround((
        into * (1 + bias) * (1 - tension) * (1 - continuity)
        + out * (1 - bias) * (1 - tension) * (1 + continuity)
      ) * previousWeight);
      current.tangent13[channel] = Math.fround((
        into * (1 + continuity) * (1 + bias) * (1 - tension)
        + out * (1 - bias) * (1 - tension) * (1 - continuity)
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

const PREPARED_CAMERA_KEYS = prepareCameraKeys();

export function energiaMode2Camera(localSeconds) {
  // Interpolation mode 1 at 0x403d80 wraps over lastTime-firstTime+1.
  const firstTime = PREPARED_CAMERA_KEYS[0].time;
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
    h10 * left.tangent13[channel]
    + h00 * value
    + h01 * right.values[channel]
    + h11 * right.tangent7[channel],
  ));
  return {
    translation: values.slice(0, 3),
    rotation: values.slice(3, 5),
    distance: values[5],
  };
}

function particle(position, velocity, born) {
  return {
    position: position.slice(),
    velocity: velocity.slice(),
    born,
    mass: 1,
  };
}

function accelerateAndMove(value, center, seconds) {
  const { position, velocity, mass } = value;
  let ax = 0, ay = 0, az = 0;

  let dx = position[0] - center[0];
  let dy = position[1] - center[1];
  let dz = position[2] - center[2];
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  if (distanceSquared > 1e-8) {
    const factor = ATTRACTOR_STRENGTH / distanceSquared;
    ax = Math.fround(ax + dx * factor);
    ay = Math.fround(ay + dy * factor);
    az = Math.fround(az + dz * factor);
  }

  // The second mode-2 force at 0x407840 points at the origin and contributes
  // an acceleration whose magnitude is the particle's current speed.
  dx = -position[0]; dy = -position[1]; dz = -position[2];
  const distance = Math.hypot(dx, dy, dz);
  if (distance > 1e-8) {
    const speed = Math.hypot(...velocity);
    const factor = speed / distance;
    ax = Math.fround(ax + dx * factor);
    ay = Math.fround(ay + dy * factor);
    az = Math.fround(az + dz * factor);
  }

  // 0x407490 uses the old velocity for position and then integrates force.
  position[0] = Math.fround(position[0] + velocity[0] * seconds);
  position[1] = Math.fround(position[1] + velocity[1] * seconds);
  position[2] = Math.fround(position[2] + velocity[2] * seconds);
  velocity[0] = Math.fround(velocity[0] + ax / mass * seconds);
  velocity[1] = Math.fround(velocity[1] + ay / mass * seconds);
  velocity[2] = Math.fround(velocity[2] + az / mass * seconds);
}

function rotateAttractor(center, radians = ROTATION_STEP) {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const x = center[0];
  const z = center[2];
  center[0] = Math.fround(cosine * x - sine * z);
  center[2] = Math.fround(cosine * z + sine * x);
}

class Mode2Simulation {
  constructor({ rotationStep = ROTATION_STEP, displayRate = REFERENCE_DISPLAY_RATE } = {}) {
    this.rotationStep = rotationStep;
    this.displayRate = displayRate;
    this.reset();
  }

  reset() {
    // The particle system receives the absolute demo clock at activation;
    // only the camera track is evaluated relative to the 44-second gate.
    this.seconds = MODE2_START;
    this.nextDisplayFrame = 0;
    this.lastDisplaySeconds = Number.NEGATIVE_INFINITY;
    this.center = [50, 50, 50];
    this.emitters = [1, 2].map((mass) => ({
      template: particle([10, 10, 10], [-10, 0, 0], Number.NEGATIVE_INFINITY),
      mass,
    }));
    for (const emitter of this.emitters) emitter.template.mass = emitter.mass;
    // The virtual start pass creates the two flagged source particles. At the
    // absolute time 44, previous+fmod(previous,.004) is already beyond the
    // zero-length interval, so 0x407be0 does not create an ordinary particle.
    this.particles = [];
  }

  step(seconds) {
    const previous = this.seconds;
    const current = Math.fround(previous + seconds);

    // Generic lifetime removal and the 1,000-unit bound callback both run
    // before force accumulation and integration in 0x407490.
    this.particles = this.particles.filter((value) => current - value.born <= PARTICLE_LIFETIME
      && Math.abs(value.position[0]) < 1000
      && Math.abs(value.position[1]) < 1000
      && Math.abs(value.position[2]) < 1000);

    for (const emitter of this.emitters) {
      accelerateAndMove(emitter.template, this.center, seconds);
    }
    for (const value of this.particles) accelerateAndMove(value, this.center, seconds);

    for (const emitter of this.emitters) {
      // 0x407be0 starts from previous + fmod(previous, interval), then walks
      // the interval through the current update. This slightly irregular
      // phase (including a repeat at zero) is retained rather than replaced
      // by a conventional persistent next-emission clock.
      let emittedAt = Math.fround(previous + (previous % EMIT_INTERVAL));
      while (emittedAt <= current + 1e-7) {
        // Raw 0x4086a8 reads the individual emission-time argument. Each new
        // particle therefore gets its own π*8 phase within the update.
        const angle = Math.PI * emittedAt * 8;
        this.particles.push(particle(emitter.template.position,
          [-50 * Math.cos(angle), 0, -50 * Math.sin(angle)], emittedAt));
        emittedAt = Math.fround(emittedAt + EMIT_INTERVAL);
      }
    }
    this.seconds = current;
  }

  displayFrame(targetSeconds) {
    // 0x408740 rotates before tail-calling the system update at 0x407380.
    rotateAttractor(this.center, this.rotationStep);
    while (this.seconds + 1e-7 < targetSeconds) {
      this.step(Math.fround(Math.min(MAX_PHYSICS_STEP, targetSeconds - this.seconds)));
    }
    this.lastDisplaySeconds = targetSeconds;
  }

  advance(localSeconds) {
    const target = Math.max(0, Math.min(MODE2_END - MODE2_START, localSeconds));
    if (target + 1e-7 < this.lastDisplaySeconds) this.reset();
    while (this.nextDisplayFrame / this.displayRate <= target + 1e-7) {
      this.displayFrame(Math.fround(MODE2_START + this.nextDisplayFrame / this.displayRate));
      this.nextDisplayFrame++;
    }
    this.lastDisplaySeconds = target;
    return this;
  }
}

export function energiaMode2State(
  seconds, { rotationDegrees = 10, displayRate = REFERENCE_DISPLAY_RATE } = {},
) {
  const localSeconds = Math.max(0, Math.min(MODE2_END - MODE2_START, seconds - MODE2_START));
  const simulation = new Mode2Simulation({
    rotationStep: Math.PI * rotationDegrees / 180,
    displayRate,
  }).advance(localSeconds);
  return {
    localSeconds,
    simulatedSeconds: Math.fround(simulation.seconds - MODE2_START),
    camera: energiaMode2Camera(localSeconds),
    center: simulation.center.slice(),
    particleCount: simulation.particles.length + simulation.emitters.length,
    particles: simulation.particles,
  };
}

function transformClip(matrix, position) {
  const m = matrix.m;
  const [x, y, z] = position;
  return [
    x * m[0] + y * m[4] + z * m[8] + m[12],
    x * m[1] + y * m[5] + z * m[9] + m[13],
    x * m[2] + y * m[6] + z * m[10] + m[14],
    x * m[3] + y * m[7] + z * m[11] + m[15],
  ];
}

function lerpArray(left, right, amount) {
  return left.map((value, index) => value + (right[index] - value) * amount);
}

function clipHomogeneousLine(left, right) {
  // The fixed-function line would be clipped against all six clip planes
  // after projection. Clipping here prevents a line that crosses the camera
  // or screen boundary from producing an enormous fallback quad.
  const planeValues = (point) => [
    point[3] + point[0], point[3] - point[0],
    point[3] + point[1], point[3] - point[1],
    point[3] + point[2], point[3] - point[2],
  ];
  const leftPlanes = planeValues(left.clip);
  const rightPlanes = planeValues(right.clip);
  let start = 0;
  let end = 1;
  for (let plane = 0; plane < leftPlanes.length; plane++) {
    const a = leftPlanes[plane];
    const b = rightPlanes[plane];
    if (a < 0 && b < 0) return null;
    if (a < 0 || b < 0) {
      const amount = a / (a - b);
      if (a < 0) start = Math.max(start, amount);
      else end = Math.min(end, amount);
    }
  }
  if (start > end) return null;
  return [
    start === 0 ? left : {
      clip: lerpArray(left.clip, right.clip, start),
      color: lerpArray(left.color, right.color, start),
    },
    end === 1 ? right : {
      clip: lerpArray(left.clip, right.clip, end),
      color: lerpArray(left.color, right.color, end),
    },
  ];
}

/**
 * Expand native GL_LINES into pixel-width quads. WebGL implementations are
 * allowed to expose only width 1, while Energia asks for widths 1, 4 and 12.
 */
export function buildEnergiaMode2LineQuads(
  values, modelView, projection, lineWidth, viewportWidth, viewportHeight,
) {
  if (!(lineWidth > 0) || !(viewportWidth > 0) || !(viewportHeight > 0)) return [];
  const transform = projection.clone().mult(modelView);
  const vertices = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    const clipped = clipHomogeneousLine(
      { clip: transformClip(transform, values[index].position), color: values[index].color },
      { clip: transformClip(transform, values[index + 1].position), color: values[index + 1].color },
    );
    if (!clipped) continue;
    const endpoints = clipped.map(({ clip, color }) => ({
      position: [clip[0] / clip[3], clip[1] / clip[3], clip[2] / clip[3]],
      color,
    }));
    const dxPixels = (endpoints[1].position[0] - endpoints[0].position[0]) * viewportWidth * 0.5;
    const dyPixels = (endpoints[1].position[1] - endpoints[0].position[1]) * viewportHeight * 0.5;
    const lengthPixels = Math.hypot(dxPixels, dyPixels);
    if (!(lengthPixels > 1e-7)) continue;
    const offsetX = -dyPixels / lengthPixels * lineWidth / viewportWidth;
    const offsetY = dxPixels / lengthPixels * lineWidth / viewportHeight;
    const vertex = (endpoint, side) => ({
      position: [
        endpoint.position[0] + offsetX * side,
        endpoint.position[1] + offsetY * side,
        endpoint.position[2],
      ],
      color: endpoint.color,
    });
    vertices.push(
      vertex(endpoints[0], 1), vertex(endpoints[0], -1),
      vertex(endpoints[1], -1), vertex(endpoints[1], 1),
    );
  }
  return vertices;
}

/** Energia compositor mode 2 (0x406dc0 / 0x408400-0x4087a0). */
export class EnergiaMode2ParticleEffect {
  constructor(mgl) {
    this.mgl = mgl;
    this.simulation = new Mode2Simulation();
  }

  render(seconds) {
    const localSeconds = Math.max(0, Math.min(MODE2_END - MODE2_START, seconds - MODE2_START));
    this.simulation.advance(localSeconds);
    const camera = energiaMode2Camera(localSeconds);
    const { mgl } = this;
    const aspect = mgl.gl.drawingBufferWidth / mgl.gl.drawingBufferHeight;

    const projection = new Mat4().frustum(-aspect, aspect, -1, 1, 1, 2000);
    // 0x406f67 applies glScaled(1,1,-1) before the per-mode camera track.
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
    mgl.enableLighting(false);
    mgl.enableFog(false);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableCullFace(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);

    const values = [
      ...this.simulation.emitters.map((emitter) => ({
        position: emitter.template.position,
        remaining: 0,
      })),
      ...this.simulation.particles.map((value) => ({
        position: value.position,
        remaining: PARTICLE_LIFETIME - (this.simulation.seconds - value.born),
      })),
    ].map((value) => ({
      position: value.position,
      // The x87 status-word test at 0x40881d takes the pale branch for
      // lifetime >= 1; only the final second burns down through orange.
      color: value.remaining >= 1
        ? [0.8, 0.8, 0.8, LINE_ALPHA]
        : [0.8, 0.28, 0.18, Math.max(0, value.remaining) * LINE_ALPHA],
    }));

    // GL line widths above one are not portable in WebGL. Recreate the
    // executable's three paired line passes as clipped screen-space quads.
    const viewportWidth = mgl.gl.drawingBufferWidth;
    const viewportHeight = mgl.gl.drawingBufferHeight;
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    for (const width of [1, 4, 12]) {
      const quads = buildEnergiaMode2LineQuads(
        values, modelView, projection, width, viewportWidth, viewportHeight,
      );
      mgl.begin(mgl.QUADS);
      for (const value of quads) {
        mgl.color4(...value.color);
        mgl.vertex3(...value.position);
      }
      mgl.end();
    }
    mgl.depthMask(true);
  }
}
