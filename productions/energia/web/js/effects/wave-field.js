import { lookAtMatrix } from '../shared/scene.js';

const CAMERA_BOUNDARIES = Object.freeze([0, 6, 7, 12, 45, 46, 66]);
const CAMERA_X = Object.freeze([400, 0, -3500, -5300, -6300, -5800, -5800]);
const CAMERA_Z = Object.freeze([0, -530, 0, 30, -330, 300, 400]);

function lerp(a, b, t) { return a + (b - a) * t; }

function cameraChannel(values, seconds) {
  let segment = CAMERA_BOUNDARIES.length - 2;
  for (let index = 0; index < CAMERA_BOUNDARIES.length - 1; index++) {
    if (seconds <= CAMERA_BOUNDARIES[index + 1]) {
      segment = index;
      break;
    }
  }
  const start = CAMERA_BOUNDARIES[segment];
  const end = CAMERA_BOUNDARIES[segment + 1];
  const progress = Math.max(0, Math.min(1, (seconds - start) / (end - start)));
  return lerp(values[segment], values[segment + 1], progress);
}

export function energiaWaveCamera(seconds, cameraStart = 0) {
  const cameraSeconds = seconds - cameraStart;
  return {
    eye: [
      cameraChannel(CAMERA_X, cameraSeconds) + Math.sin(seconds * 0.4) * 50 + 300,
      Math.sin(seconds * 0.3) * 600 + 860,
      cameraChannel(CAMERA_Z, cameraSeconds) + 1800,
    ],
    target: [0, 1100, 0],
  };
}

export function energiaWaveDimensions(seconds, secondPass = false) {
  return secondPass
    ? [Math.round(Math.sin(seconds * 2.853) * 10 + 40),
      Math.round(Math.sin(seconds * 2.9854) * 10 + 40)]
    : [Math.round(Math.sin(seconds * 0.853) * 14 + 24),
      Math.round(Math.sin(seconds * 0.9854) * 14 + 24)];
}

function modulo(value, divisor) {
  const result = value % divisor;
  return result < 0 ? result + divisor : result;
}

function normal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let x = uy * vz - uz * vy;
  let y = uz * vx - ux * vz;
  let z = ux * vy - uy * vx;
  const length = Math.hypot(x, y, z) || 1;
  x /= length; y /= length; z /= length;
  return [x, y, z];
}

/** Energia's wave1.raw grid generator at 0x411ba0. */
function buildGrid(bytes, seconds, secondPass) {
  const [width, height] = energiaWaveDimensions(seconds, secondPass);
  const vertices = new Array(width * height);
  const xStep = 255 / (width - 1);
  const zStep = 255 / (height - 1);
  for (let row = 0; row < height; row++) {
    const zFraction = row / (height - 1);
    const sampleY = modulo(Math.round(seconds * 54 + zStep * row), 255);
    for (let column = 0; column < width; column++) {
      const xFraction = column / (width - 1);
      const sampleX = modulo(Math.round(seconds * 64 + xStep * column), 255);
      const value = bytes[sampleY * 256 + sampleX];
      const gray = (Math.round(value * 0.5 + 127) & 0xff) / 255;
      vertices[row * width + column] = {
        position: [xFraction * 6000 - 3000, value * 10 - 2333, zFraction * 6000 - 3000],
        color: [gray, gray, gray, 155 / 255],
      };
    }
  }
  return { width, height, vertices };
}

function emitVertex(mgl, vertex) {
  mgl.color4(...vertex.color);
  mgl.vertex3(...vertex.position);
}

function drawGrid(mgl, grid) {
  const { width, height, vertices } = grid;
  mgl.begin(mgl.TRIANGLES);
  for (let row = 0; row < height - 1; row++) {
    for (let column = 0; column < width - 1; column++) {
      const a = vertices[row * width + column];
      const b = vertices[row * width + column + 1];
      const c = vertices[(row + 1) * width + column];
      const d = vertices[(row + 1) * width + column + 1];
      mgl.normal3(...normal(a.position, b.position, c.position));
      emitVertex(mgl, c); emitVertex(mgl, b); emitVertex(mgl, a);
      mgl.normal3(...normal(c.position, d.position, b.position));
      emitVertex(mgl, d); emitVertex(mgl, b); emitVertex(mgl, c);
    }
  }
  mgl.end();
}

/** Energia's two-pass 0x411e10 height-field renderer. */
export class EnergiaWaveFieldEffect {
  constructor(mgl, waveBytes, { dust, gradient }) {
    if (waveBytes.byteLength !== 256 * 256) {
      throw new Error(`wave1.raw: expected 65536 bytes, found ${waveBytes.byteLength}`);
    }
    this.mgl = mgl;
    this.waveBytes = waveBytes;
    this.dust = dust;
    this.gradient = gradient;
  }

  render(seconds, { clear = false, cameraStart = 0 } = {}) {
    const { mgl } = this;
    if (clear) mgl.clear();
    const aspect = mgl.gl.drawingBufferHeight / mgl.gl.drawingBufferWidth;
    const camera = energiaWaveCamera(seconds, cameraStart);

    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-aspect * 2.9, aspect * 2.9, -2.9, 2.9, 1, 5000);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadMatrix(lookAtMatrix(camera.eye, camera.target));
    mgl.rotate(60, 1, 0, 0);

    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.bindTexture(this.dust);
    mgl.texEnv({ mode: 'modulate' });
    mgl.texGenSphereMap(true);
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.enableLighting(false);
    mgl.enableCullFace(true);
    mgl.cullFace(mgl.BACK);
    mgl.enableDepthTest(true);
    mgl.depthMask(true);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE_MINUS_SRC_ALPHA);
    drawGrid(mgl, buildGrid(this.waveBytes, seconds, false));

    mgl.bindTexture(this.gradient);
    mgl.scale(1.25, 1.25, 1.25);
    mgl.blendFunc(mgl.SRC_COLOR, mgl.ONE);
    drawGrid(mgl, buildGrid(this.waveBytes, seconds, true));
  }
}
