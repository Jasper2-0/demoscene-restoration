const LENGTH_SEGMENTS = 150;
const RADIAL_SEGMENTS = 150;
const RADIAL_STRIDE = RADIAL_SEGMENTS + 1;
const HEIGHT_MAP_SIZE = 256;
const HEIGHT_MAP_PERIOD = 255;
const TRIANGLE_ALPHA = 0.1589999943971634;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function roundToNearestEven(value) {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return (lower & 1) === 0 ? lower : lower + 1;
}

function positiveModulo(value, divisor) {
  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
}

/**
 * The primitive built by 0x4031f0 for 0x40f070: a 150-by-150 cylinder with
 * one duplicated radial seam vertex. The native mesh stores four floats per
 * vector; the browser only needs xyz and uv.
 */
export function buildEnergiaHardcodedCylinder({
  lengthSegments = LENGTH_SEGMENTS,
  radialSegments = RADIAL_SEGMENTS,
} = {}) {
  const radialStride = radialSegments + 1;
  const vertexCount = lengthSegments * radialStride;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const texcoords = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array((lengthSegments - 1) * radialSegments * 6);
  const lengthStep = Math.fround(500 / lengthSegments);
  const angleStep = Math.fround(6.2831853 / radialSegments);
  let x = (lengthStep - 500) * 0.5;

  for (let lengthIndex = 0; lengthIndex < lengthSegments; lengthIndex++) {
    const u = Math.fround(lengthIndex / (lengthSegments - 1));
    for (let radialIndex = 0; radialIndex <= radialSegments; radialIndex++) {
      const vertex = lengthIndex * radialStride + radialIndex;
      const angle = radialIndex === radialSegments ? 0 : angleStep * radialIndex;
      const sine = radialIndex === radialSegments ? 0 : Math.sin(angle);
      const cosine = radialIndex === radialSegments ? 1 : Math.cos(angle);
      positions[vertex * 3] = Math.fround(x);
      positions[vertex * 3 + 1] = Math.fround(sine * 80);
      positions[vertex * 3 + 2] = Math.fround(cosine * 80);
      normals[vertex * 3] = 0;
      normals[vertex * 3 + 1] = Math.fround(sine);
      normals[vertex * 3 + 2] = Math.fround(cosine);
      texcoords[vertex * 2] = u;
      texcoords[vertex * 2 + 1] = radialIndex === radialSegments
        ? 1 : Math.fround(radialIndex / radialSegments);
    }
    x += lengthStep;
  }

  let cursor = 0;
  for (let lengthIndex = 0; lengthIndex < lengthSegments - 1; lengthIndex++) {
    const row = lengthIndex * radialStride;
    const nextRow = row + radialStride;
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex++) {
      const a = row + radialIndex;
      const b = nextRow + radialIndex;
      const c = row + radialIndex + 1;
      const d = nextRow + radialIndex + 1;
      indices[cursor++] = a;
      indices[cursor++] = b;
      indices[cursor++] = d;
      indices[cursor++] = a;
      indices[cursor++] = d;
      indices[cursor++] = c;
    }
  }
  return { positions, normals, texcoords, indices };
}

function heightSample(bytes, u, v, scaleU, scaleV, offsetU, offsetV) {
  const sampleU = Math.fround(u * scaleU * HEIGHT_MAP_SIZE + offsetU);
  const sampleV = Math.fround(v * scaleV * HEIGHT_MAP_SIZE + offsetV);
  const roundedU = roundToNearestEven(sampleU);
  const roundedV = roundToNearestEven(sampleV);
  const baseU = positiveModulo(roundedU, HEIGHT_MAP_PERIOD);
  const baseV = positiveModulo(roundedV, HEIGHT_MAP_PERIOD);
  const fractionU = sampleU - roundedU;
  const fractionV = sampleV - roundedV;
  const offset = baseV * HEIGHT_MAP_SIZE + baseU;
  const upper = bytes[offset] * (1 - fractionU) + bytes[offset + 1] * fractionU;
  const lower = bytes[offset + HEIGHT_MAP_SIZE] * (1 - fractionU)
    + bytes[offset + HEIGHT_MAP_SIZE + 1] * fractionU;
  return upper * (1 - fractionV) + lower * fractionV;
}

function displaceRadially(source, destination, texcoords, bytes, {
  scaleU, scaleV, offsetU, offsetV, amplitude,
}) {
  for (let vertex = 0; vertex < texcoords.length / 2; vertex++) {
    const x = source[vertex * 3];
    const y = source[vertex * 3 + 1];
    const z = source[vertex * 3 + 2];
    const length = Math.hypot(x, y, z) || 1;
    const height = heightSample(
      bytes, texcoords[vertex * 2], texcoords[vertex * 2 + 1],
      scaleU, scaleV, offsetU, offsetV,
    );
    const factor = 1 + height * amplitude / (length * 255);
    destination[vertex * 3] = Math.fround(x * factor);
    destination[vertex * 3 + 1] = Math.fround(y * factor);
    destination[vertex * 3 + 2] = Math.fround(z * factor);
  }
}

/** Apply the linked wave1.raw and twirlB.raw modifiers used by 0x40f070. */
export function deformEnergiaHardcodedCylinder(
  geometry, waveBytes, twirlBytes, seconds, scratch = null, destination = null,
) {
  if (waveBytes.byteLength !== HEIGHT_MAP_SIZE * HEIGHT_MAP_SIZE
      || twirlBytes.byteLength !== HEIGHT_MAP_SIZE * HEIGHT_MAP_SIZE) {
    throw new Error('Energia hardcoded cylinder expects two 256x256 grayscale maps');
  }
  const intermediate = scratch ?? new Float32Array(geometry.positions.length);
  const result = destination ?? new Float32Array(geometry.positions.length);
  const time = Math.fround(seconds);
  displaceRadially(geometry.positions, intermediate, geometry.texcoords, waveBytes, {
    scaleU: 2,
    scaleV: 1,
    offsetU: Math.fround(time * 42),
    offsetV: Math.fround(time * 63),
    amplitude: 223,
  });
  displaceRadially(intermediate, result, geometry.texcoords, twirlBytes, {
    scaleU: 4, scaleV: 3, offsetU: 0, offsetV: 0, amplitude: 64,
  });
  return result;
}

/** Exact hardcoded placement/rotation channels surrounding the repeated mesh. */
export function energiaHardcodedCylinderState(seconds, startSeconds) {
  const time = Math.fround(seconds);
  const phase = Math.fround(clamp01((time - Math.fround(startSeconds)) * 0.16));
  return {
    phase,
    placements: [
      { translation: [Math.sin(time) * 30, phase + 500, -700], rotationX: 0 },
      {
        translation: [-430, phase + 500, Math.sin(time * 0.74) * 340 - 1200],
        rotationX: Math.sin(time * 0.3 + 234234) * 400,
      },
      { translation: [630, phase + 500, Math.sin(time * 0.64) * 500 - 1500], rotationX: 0 },
    ],
    repeatedRotation: [
      Math.sin(time * 0.2) * 30,
      Math.sin(time * 0.3 + 234234) * 40,
      Math.sin(time * 0.4 + 2314234) * 40,
    ],
  };
}

export class EnergiaHardcodedCylinderEffect {
  constructor(mgl, waveBytes, twirlBytes, textures) {
    this.mgl = mgl;
    this.waveBytes = waveBytes;
    this.twirlBytes = twirlBytes;
    this.textures = textures;
    this.geometry = buildEnergiaHardcodedCylinder();
    this.scratch = new Float32Array(this.geometry.positions.length);
    this.positions = new Float32Array(this.geometry.positions.length);

    const gl = mgl.gl;
    this.positionBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.texcoordBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.geometry.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.geometry.texcoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.geometry.indices, gl.STATIC_DRAW);
  }

  _bindGeometry() {
    const { mgl } = this;
    const gl = mgl.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(mgl.aPos);
    gl.vertexAttribPointer(mgl.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.enableVertexAttribArray(mgl.aNormal);
    gl.vertexAttribPointer(mgl.aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.enableVertexAttribArray(mgl.aUV[0]);
    gl.vertexAttribPointer(mgl.aUV[0], 2, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(mgl.aUV[1]);
    gl.vertexAttrib2f(mgl.aUV[1], 0, 0);
    gl.disableVertexAttribArray(mgl.aColor);
    gl.uniform1i(mgl.uUseVertexColor, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  }

  _drawGeometry() {
    const { mgl } = this;
    mgl._applyCommonUniforms();
    mgl.gl.drawElements(
      mgl.gl.TRIANGLES, this.geometry.indices.length, mgl.gl.UNSIGNED_INT, 0,
    );
  }

  render(seconds, { startSeconds, texture }) {
    const { mgl } = this;
    const gl = mgl.gl;
    const state = energiaHardcodedCylinderState(seconds, startSeconds);
    deformEnergiaHardcodedCylinder(
      this.geometry, this.waveBytes, this.twirlBytes, seconds, this.scratch, this.positions,
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const aspect = height / width;
    mgl.viewport(0, 0, width, height);
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-1.75, 1.75, -aspect * 0.5, aspect * 0.5, 1, 5000);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();

    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.bindTexture(texture);
    mgl.texGenSphereMap(false);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.enableLighting(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    mgl.enableCullFace(true);
    mgl.cullFace(mgl.BACK);
    mgl.enableDepthTest(true);
    mgl.depthMask(false);
    mgl.color4(1, 1, 1, TRIANGLE_ALPHA);
    this._bindGeometry();

    for (const placement of state.placements) {
      mgl.loadIdentity();
      mgl.translate(...placement.translation);
      if (placement.rotationX) mgl.rotate(placement.rotationX, 1, 0, 0);
      mgl.rotate(30, 0, 1, 0);
      mgl.rotate(30, 0, 0, 1);
      for (let copy = 0; copy < 5; copy++) {
        this._drawGeometry();
        mgl.scale(0.9, 0.9, 0.9);
        mgl.rotate(state.repeatedRotation[0], 1, 0, 0);
        mgl.rotate(state.repeatedRotation[1], 0, 1, 0);
        mgl.rotate(state.repeatedRotation[2], 0, 0, 1);
      }
    }
    mgl.depthMask(true);
  }
}
