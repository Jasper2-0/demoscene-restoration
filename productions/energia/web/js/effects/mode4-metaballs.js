import { Mat4 } from '../shared/mathlib.js';
import { ENERGIA_MODE4_TRI_TABLE } from './mode4-marching-table.js';

const MODE4_START = 132;
const MODE4_END = 157;
const MAX_PHYSICS_STEP = Math.fround(1 / 12);
const REFERENCE_DISPLAY_RATE = 30;
const EMIT_INTERVAL = Math.fround(0.10000000149011612);
const PARTICLE_LIFETIME = 5;
const PARTICLE_MASS = 10;
const PARTICLE_LIMIT = 80;
const GRAVITY = -150;
const BOUNDARY = 80;
const RESTITUTION = 0.7;
const KICK_INTERVAL = 0.25;
const KICK_Y = 120;
const FIELD_MIN = -115;
const FIELD_MAX = 115;
const FIELD_RADIUS_SQUARED = 1024;
const FIELD_ISO = 0.5;
const FIELD_RESOLUTION = 32;
const NATIVE_TEXTURE_SCALE = 0.7400000095367432;
const NATIVE_BLACK_SHELL_SCALE = 2.0999999046325684;

const BOUNCE_TABLE = Object.freeze([
  0.0010000000474974513,
  3.2300000190734863,
  4.12023401260376,
  3.653700113296509,
  2.459218740463257,
  6.377999782562256,
  5.926000118255615,
  4.7042999267578125,
  8.743800163269043,
  4.297534942626953,
  // 0x407d50 increments before indexing and only wraps after this entry.
  1.5745600461959839,
]);

// DAT_0043eef0: seven keys, each followed by the six values consumed by
// 0x406ed0 and the tangent storage filled by 0x404060.
export const ENERGIA_MODE4_CAMERA_KEYS = Object.freeze([
  [0, -4.3333330154418945, 0, 23.33333396911621, -45, 0, 120],
  [4, 13.624480247497559, 0, 64.63258361816406, -45, -70, 120],
  [8, 31.145668029785156, 23.33333396911621, 54.0597038269043,
    -44.66666793823242, -133.3333282470703, 120],
  [13, -15.54237174987793, 23.33333396911621, -2.1285629272460938,
    -36, -190, 120],
  [16, -79.47869873046875, 53.333335876464844, 49.29085159301758,
    -49.66666793823242, -216.6666717529297, 120],
  [20, -80.34727478027344, 53.333335876464844, 206.29885864257812,
    -75.66667175292969, -265, 120],
  [24, 303.2231140136719, 53.333335876464844, 171.9003448486328,
    -55.999996185302734, -323.6666564941406, 120],
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

const PREPARED_CAMERA_KEYS = prepareCameraKeys(ENERGIA_MODE4_CAMERA_KEYS);

export function energiaMode4Camera(localSeconds) {
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
    h10 * left.tangent13[channel] + h00 * value
      + h01 * right.values[channel] + h11 * right.tangent7[channel],
  ));
  return {
    translation: values.slice(0, 3),
    rotation: values.slice(3, 5),
    distance: values[5],
  };
}

function newParticle(emittedAt, currentSeconds) {
  const angle = Math.PI * emittedAt * 8;
  return {
    position: [0, -50, 0],
    velocity: [
      Math.fround(-50 * Math.cos(angle)),
      0,
      Math.fround(-50 * Math.sin(angle)),
    ],
    acceleration: [0, 0, 0],
    born: emittedAt,
    remaining: Math.fround(PARTICLE_LIFETIME - (currentSeconds - emittedAt)),
    mass: PARTICLE_MASS,
  };
}

function bounceAxis(value, positionIndex, velocityIndex) {
  const position = value.position[positionIndex];
  const velocity = value.velocity[velocityIndex];
  if ((position <= -BOUNDARY && velocity <= 0)
      || (position >= BOUNDARY && velocity >= 0)) {
    value.velocity[velocityIndex] = Math.fround(-velocity * RESTITUTION);
    return true;
  }
  return false;
}

class Mode4Simulation {
  constructor({ displayRate = REFERENCE_DISPLAY_RATE } = {}) {
    this.displayRate = displayRate;
    this.reset();
  }

  reset() {
    this.seconds = MODE4_START;
    this.nextDisplayFrame = 0;
    this.lastDisplaySeconds = Number.NEGATIVE_INFINITY;
    this.particles = [];
    this.collisionClock = 0;
    this.bounceIndex = 0;
  }

  step(seconds) {
    const previous = this.seconds;
    const current = Math.fround(previous + seconds);
    this.particles = this.particles.filter((value) => current - value.born <= PARTICLE_LIFETIME);

    // 0x407490 integrates position with the old velocity, then velocity with
    // the force accumulated on the previous step.
    for (const value of this.particles) {
      for (let axis = 0; axis < 3; axis++) {
        value.position[axis] = Math.fround(
          value.position[axis] + value.velocity[axis] * seconds,
        );
        value.velocity[axis] = Math.fround(
          value.velocity[axis] + value.acceleration[axis] * seconds,
        );
      }
      value.remaining = Math.fround(PARTICLE_LIFETIME - (current - value.born));
    }

    // The mode-4 emitter at 0x407cb0 uses previous+fmod(previous,.1) and caps
    // the live list at 80 particles.
    let emittedAt = Math.fround(previous + (previous % EMIT_INTERVAL));
    while (emittedAt <= current + 1e-7 && this.particles.length < PARTICLE_LIMIT) {
      this.particles.push(newParticle(emittedAt, current));
      emittedAt = Math.fround(emittedAt + EMIT_INTERVAL);
    }

    this.collisionClock = Math.fround(this.collisionClock + seconds);
    for (const value of this.particles) {
      const bottom = bounceAxis(value, 1, 1);
      if (bottom && this.collisionClock >= KICK_INTERVAL) {
        this.collisionClock = 0;
        this.bounceIndex++;
        const kick = BOUNCE_TABLE[this.bounceIndex] * 3;
        value.velocity[1] = Math.fround(value.velocity[1] + KICK_Y);
        value.velocity[0] = Math.fround(value.velocity[0] + kick);
        value.velocity[2] = Math.fround(value.velocity[2] + kick);
        if (this.bounceIndex > 9) this.bounceIndex = 0;
      }
      bounceAxis(value, 0, 0);
      bounceAxis(value, 2, 2);
      // 0x407ed0 stores force=-150*mass; the integrator divides by mass.
      value.acceleration[0] = 0;
      value.acceleration[1] = GRAVITY;
      value.acceleration[2] = 0;
    }
    this.seconds = current;
  }

  displayFrame(targetSeconds) {
    while (this.seconds + 1e-7 < targetSeconds) {
      this.step(Math.fround(Math.min(MAX_PHYSICS_STEP, targetSeconds - this.seconds)));
    }
  }

  advance(localSeconds) {
    const target = Math.max(0, Math.min(MODE4_END - MODE4_START, localSeconds));
    if (target + 1e-7 < this.lastDisplaySeconds) this.reset();
    while (this.nextDisplayFrame / this.displayRate <= target + 1e-7) {
      this.displayFrame(Math.fround(MODE4_START + this.nextDisplayFrame / this.displayRate));
      this.nextDisplayFrame++;
    }
    this.lastDisplaySeconds = target;
    return this;
  }
}

export function energiaMode4State(seconds, { displayRate = REFERENCE_DISPLAY_RATE } = {}) {
  const localSeconds = Math.max(0, Math.min(MODE4_END - MODE4_START, seconds - MODE4_START));
  const simulation = new Mode4Simulation({ displayRate }).advance(localSeconds);
  return {
    localSeconds,
    simulatedSeconds: Math.fround(simulation.seconds - MODE4_START),
    camera: energiaMode4Camera(localSeconds),
    particleCount: simulation.particles.length,
    particles: simulation.particles,
    collisionClock: simulation.collisionClock,
    bounceIndex: simulation.bounceIndex,
  };
}

const CUBE_CORNERS = Object.freeze([
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
]);

const CUBE_EDGES = Object.freeze([
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
]);

function fieldValue(x, y, z, particles) {
  let value = 0;
  for (const particle of particles) {
    const dx = x - particle.position[0];
    const dy = y - particle.position[1];
    const dz = z - particle.position[2];
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    if (distanceSquared < FIELD_RADIUS_SQUARED) {
      value += 1 - distanceSquared / FIELD_RADIUS_SQUARED;
    }
  }
  return value;
}

function fieldNormal(position, particles) {
  let x = 0, y = 0, z = 0;
  for (const particle of particles) {
    const dx = position[0] - particle.position[0];
    const dy = position[1] - particle.position[1];
    const dz = position[2] - particle.position[2];
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    if (distanceSquared < FIELD_RADIUS_SQUARED) {
      const factor = 1 - distanceSquared / FIELD_RADIUS_SQUARED;
      x += dx * factor;
      y += dy * factor;
      z += dz * factor;
    }
  }
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function interpolate(left, right) {
  const denominator = right.value - left.value;
  const amount = denominator === 0 ? 0.5 : (FIELD_ISO - left.value) / denominator;
  return {
    position: [
      left.position[0] + (right.position[0] - left.position[0]) * amount,
      left.position[1] + (right.position[1] - left.position[1]) * amount,
      left.position[2] + (right.position[2] - left.position[2]) * amount,
    ],
  };
}

function polygoniseCube(corners, caseIndex, output) {
  const row = ENERGIA_MODE4_TRI_TABLE[caseIndex];
  if (row[0] === -1) return;
  const edgeVertices = new Array(CUBE_EDGES.length);
  const vertexForEdge = (edgeIndex) => {
    if (!edgeVertices[edgeIndex]) {
      const [left, right] = CUBE_EDGES[edgeIndex];
      edgeVertices[edgeIndex] = interpolate(corners[left], corners[right]);
    }
    return edgeVertices[edgeIndex];
  };
  for (let index = 0; index < row.length && row[index] !== -1; index += 3) {
    // FUN_004043e0 reads the native row as e0,e1,e2 but emits e0,e2,e1.
    output.push(
      vertexForEdge(row[index]),
      vertexForEdge(row[index + 2]),
      vertexForEdge(row[index + 1]),
    );
  }
}

/** Rebuild the native 32-cubed compact-field surface from the live particles. */
export function buildEnergiaMode4MetaballMesh(
  particles, { resolution = FIELD_RESOLUTION } = {},
) {
  if (!particles.length || resolution < 2) {
    return { positions: new Float32Array(), normals: new Float32Array(), triangleCount: 0 };
  }
  const step = (FIELD_MAX - FIELD_MIN) / (resolution - 1);
  const slice = resolution * resolution;
  const values = new Float32Array(resolution * slice);
  const valueAt = (x, y, z) => values[x + y * resolution + z * slice];
  for (let z = 0; z < resolution; z++) {
    const pz = FIELD_MIN + z * step;
    for (let y = 0; y < resolution; y++) {
      const py = FIELD_MIN + y * step;
      for (let x = 0; x < resolution; x++) {
        values[x + y * resolution + z * slice]
          = fieldValue(FIELD_MIN + x * step, py, pz, particles);
      }
    }
  }

  const vertices = [];
  for (let z = 0; z < resolution - 1; z++) {
    for (let y = 0; y < resolution - 1; y++) {
      for (let x = 0; x < resolution - 1; x++) {
        const corners = CUBE_CORNERS.map(([dx, dy, dz]) => ({
          position: [FIELD_MIN + (x + dx) * step,
            FIELD_MIN + (y + dy) * step, FIELD_MIN + (z + dz) * step],
          value: valueAt(x + dx, y + dy, z + dz),
        }));
        let caseIndex = 0;
        for (let corner = 0; corner < corners.length; corner++) {
          // FUN_00404d00 sets each case bit when the scalar is below .5.
          if (corners[corner].value < FIELD_ISO) caseIndex |= 1 << corner;
        }
        polygoniseCube(corners, caseIndex, vertices);
      }
    }
  }
  for (const vertex of vertices) vertex.normal = fieldNormal(vertex.position, particles);
  const positions = new Float32Array(vertices.length * 3);
  const normals = new Float32Array(vertices.length * 3);
  vertices.forEach((vertex, index) => {
    positions.set(vertex.position, index * 3);
    normals.set(vertex.normal, index * 3);
  });
  return { positions, normals, triangleCount: vertices.length / 3 };
}

// 0x404a45 feeds the normalized field vectors to glTexCoordPointer(size=3),
// then transforms them by T(.5,.5,0) S(.74) Rx(cameraX) Ry(cameraY).
export function energiaMode4TextureCoordinate(normal, camera) {
  const matrix = new Mat4()
    .translate(0.5, 0.5, 0)
    .scale(NATIVE_TEXTURE_SCALE, NATIVE_TEXTURE_SCALE, NATIVE_TEXTURE_SCALE)
    .rotate(camera.rotation[0], 1, 0, 0)
    .rotate(camera.rotation[1], 0, 1, 0)
    .m;
  const [x, y, z] = normal;
  return [
    Math.fround(x * matrix[0] + y * matrix[4] + z * matrix[8] + matrix[12]),
    Math.fround(x * matrix[1] + y * matrix[5] + z * matrix[9] + matrix[13]),
  ];
}

export class EnergiaMode4MetaballEffect {
  constructor(mgl, { primary, reflection }) {
    this.mgl = mgl;
    this.primary = primary;
    this.reflection = reflection;
    this.simulation = new Mode4Simulation();
  }

  _drawMesh(mesh, camera, { textureCoordinates = false } = {}) {
    const { mgl } = this;
    // Keep each immediate draw below MiniGL's retained buffer while preserving
    // the executable's single indexed triangle stream exactly.
    const floatsPerBatch = 16384 * 3 * 3;
    for (let batchStart = 0; batchStart < mesh.positions.length;
      batchStart += floatsPerBatch) {
      const batchEnd = Math.min(mesh.positions.length, batchStart + floatsPerBatch);
      mgl.begin(mgl.TRIANGLES);
      for (let index = batchStart; index < batchEnd; index += 3) {
        mgl.normal3(mesh.normals[index], mesh.normals[index + 1], mesh.normals[index + 2]);
        if (textureCoordinates) {
          mgl.texCoord2(...energiaMode4TextureCoordinate(
            [mesh.normals[index], mesh.normals[index + 1], mesh.normals[index + 2]], camera,
          ));
        }
        mgl.vertex3(mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]);
      }
      mgl.end();
    }
  }

  _drawWireframe(mesh) {
    const { mgl } = this;
    // 0x404bc0 resubmits the triangle index stream as GL_LINES. OpenGL pairs
    // consecutive indices; it does not expand every triangle into three
    // edges, so preserve that cross-triangle pairing here.
    const floatsPerBatch = 8192 * 2 * 3;
    for (let batchStart = 0; batchStart < mesh.positions.length;
      batchStart += floatsPerBatch) {
      const batchEnd = Math.min(mesh.positions.length, batchStart + floatsPerBatch);
      mgl.begin(mgl.LINES);
      for (let index = batchStart; index + 5 < batchEnd; index += 6) {
        mgl.vertex3(mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]);
        mgl.vertex3(
          mesh.positions[index + 3], mesh.positions[index + 4], mesh.positions[index + 5],
        );
      }
      mgl.end();
    }
  }

  render(seconds) {
    const localSeconds = Math.max(0, Math.min(MODE4_END - MODE4_START, seconds - MODE4_START));
    this.simulation.advance(localSeconds);
    const camera = energiaMode4Camera(localSeconds);
    const mesh = buildEnergiaMode4MetaballMesh(this.simulation.particles);
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
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.enableFog(false);
    mgl.enableCullFace(true);
    mgl.enableDepthTest(true);
    mgl.depthFunc(mgl.LEQUAL);
    mgl.depthMask(true);
    mgl.enableLighting(false);
    mgl.enableBlend(false);
    mgl.bindTexture(this.primary);
    mgl.texEnv({ mode: 'add' });
    // The surviving fixed-function capture shows a black primary contribution
    // under GL_ADD (the sotku2 texel is retained verbatim), despite the wrapper
    // restoring glColor3f(1,1,1) before entering the retained-array renderer.
    mgl.color4(0, 0, 0, 1);
    this._drawMesh(mesh, camera, { textureCoordinates: true });

    // 0x404bc0 repeats the triangle index stream as GL_LINES in opaque black.
    mgl.enableTexture(false);
    mgl.enableLighting(true);
    mgl.color4(0, 0, 0, 1);
    this._drawWireframe(mesh);

    // The executable binds water2.jpg, then disables texturing and draws an
    // enlarged black shell. This displaced cover is what leaves the inner
    // sotku2 surface showing through in irregular metallic islands.
    mgl.bindTexture(this.reflection);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadMatrix(modelView.clone().scale(
      NATIVE_BLACK_SHELL_SCALE, NATIVE_BLACK_SHELL_SCALE, NATIVE_BLACK_SHELL_SCALE,
    ));
    mgl.enableTexture(false);
    mgl.color4(0, 0, 0, 1);
    this._drawMesh(mesh, camera);

    mgl.enableBlend(false);
    mgl.loadIdentity();
    return { localSeconds, camera, particleCount: this.simulation.particles.length, mesh };
  }
}
