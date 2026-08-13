import { buildEnergiaHardcodedCylinder } from './hardcoded-cylinder.js';

const MAP_SIZE = 256;
const MAP_PERIOD = 255;
const FIRST_ALPHA = Math.fround(0.8999999761581421);
const SECOND_ALPHA = Math.fround(0.3100000023841858);
const THIRD_ALPHA = Math.fround(0.531000018119812);

function roundToNearestEven(value) {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return (lower & 1) === 0 ? lower : lower + 1;
}

function sampleMap(bytes, u, v, scaleU, scaleV, offsetU, offsetV) {
  const mappedU = Math.fround(u * scaleU * MAP_SIZE + offsetU);
  const mappedV = Math.fround(v * scaleV * MAP_SIZE + offsetV);
  const roundedU = roundToNearestEven(mappedU);
  const roundedV = roundToNearestEven(mappedV);
  const baseU = ((roundedU % MAP_PERIOD) + MAP_PERIOD) % MAP_PERIOD;
  const baseV = ((roundedV % MAP_PERIOD) + MAP_PERIOD) % MAP_PERIOD;
  const fractionU = mappedU - roundedU;
  const fractionV = mappedV - roundedV;
  const offset = baseV * MAP_SIZE + baseU;
  const upper = bytes[offset] * (1 - fractionU) + bytes[offset + 1] * fractionU;
  const lower = bytes[offset + MAP_SIZE] * (1 - fractionU)
    + bytes[offset + MAP_SIZE + 1] * fractionU;
  return upper * (1 - fractionV) + lower * fractionV;
}

function displaceStage(source, destination, texcoords, bytes, settings, weights = null) {
  for (let vertex = 0; vertex < texcoords.length / 2; vertex++) {
    const x = source[vertex * 3];
    const y = source[vertex * 3 + 1];
    const z = source[vertex * 3 + 2];
    const sample = sampleMap(
      bytes,
      texcoords[vertex * 2],
      texcoords[vertex * 2 + 1],
      settings.scaleU,
      settings.scaleV,
      settings.offsetU,
      settings.offsetV,
    );
    const normalized = Math.fround(sample * Math.fround(1 / 255));
    const length = Math.hypot(x, y, z) || 1;
    const factor = 1 + sample * settings.amplitude / (length * 255);
    destination[vertex * 3] = Math.fround(x * factor);
    destination[vertex * 3 + 1] = Math.fround(y * factor);
    destination[vertex * 3 + 2] = Math.fround(z * factor);
    if (weights) weights[vertex] = Math.fround(normalized * normalized);
  }
}

/** Exact dynamic channels written by 0x40f570 into its DISP2/wave modifiers. */
export function energiaLateCylinderState(seconds) {
  const time = Math.fround(seconds);
  const sine = Math.sin(time * 0.1);
  const cosine = Math.cos(time * 0.16);
  return {
    rotation: Math.fround(time * 32),
    disp: {
      scaleU: Math.fround(Math.abs(sine * 10)),
      scaleV: Math.fround(Math.abs(cosine * 3)),
      offsetU: 0,
      offsetV: 0,
      amplitude: 64,
    },
    wave: {
      scaleU: Math.fround(Math.abs(sine * 3)),
      scaleV: Math.fround(Math.abs(cosine * 10)),
      offsetU: Math.fround(time * 32),
      offsetV: Math.fround(time * 53),
      amplitude: 114,
    },
  };
}

/** Apply the two linked native modifiers and retain the final position.w field. */
export function deformEnergiaLateCylinder(
  geometry, dispBytes, waveBytes, seconds,
  scratch = null, destination = null, weights = null,
) {
  if (dispBytes.byteLength !== MAP_SIZE * MAP_SIZE
      || waveBytes.byteLength !== MAP_SIZE * MAP_SIZE) {
    throw new Error('Energia late cylinder expects DISP2.raw and wave1.raw as 256x256 maps');
  }
  const state = energiaLateCylinderState(seconds);
  const intermediate = scratch ?? new Float32Array(geometry.positions.length);
  const result = destination ?? new Float32Array(geometry.positions.length);
  const resultWeights = weights ?? new Float32Array(geometry.positions.length / 3);
  displaceStage(geometry.positions, intermediate, geometry.texcoords, dispBytes, state.disp);
  displaceStage(intermediate, result, geometry.texcoords, waveBytes, state.wave, resultWeights);
  return { positions: result, weights: resultWeights, state };
}

export function buildEnergiaLateCylinderTriangles(
  geometry, positions, weights, expandedPositions = null, colors = null,
) {
  const vertexCount = geometry.indices.length;
  const resultPositions = expandedPositions ?? new Float32Array(vertexCount * 3);
  const resultColors = colors ?? new Float32Array(vertexCount * 4);
  for (let output = 0; output < vertexCount; output++) {
    const source = geometry.indices[output];
    const corner = output % 3;
    const brightness = Math.fround(weights[source] * (corner === 2 ? 0.5 : 1));
    resultPositions[output * 3] = positions[source * 3];
    resultPositions[output * 3 + 1] = positions[source * 3 + 1];
    resultPositions[output * 3 + 2] = positions[source * 3 + 2];
    resultColors[output * 4] = brightness;
    resultColors[output * 4 + 1] = brightness;
    resultColors[output * 4 + 2] = brightness;
    resultColors[output * 4 + 3] = corner === 0
      ? FIRST_ALPHA : (corner === 1 ? SECOND_ALPHA : THIRD_ALPHA);
  }
  return { positions: resultPositions, colors: resultColors };
}

/** Energia's final compiled six-pass displaced-cylinder layer at 0x40f570. */
export class EnergiaLateCylinderEffect {
  constructor(mgl, dispBytes, waveBytes, texture) {
    this.mgl = mgl;
    this.dispBytes = dispBytes;
    this.waveBytes = waveBytes;
    this.texture = texture;
    this.geometry = buildEnergiaHardcodedCylinder({
      lengthSegments: 40,
      radialSegments: 40,
    });
    this.scratch = new Float32Array(this.geometry.positions.length);
    this.positions = new Float32Array(this.geometry.positions.length);
    this.weights = new Float32Array(this.geometry.positions.length / 3);
    this.expandedPositions = new Float32Array(this.geometry.indices.length * 3);
    this.colors = new Float32Array(this.geometry.indices.length * 4);
    this.expandedTexcoords = new Float32Array(this.geometry.indices.length * 2);
    for (let output = 0; output < this.geometry.indices.length; output++) {
      const source = this.geometry.indices[output];
      this.expandedTexcoords[output * 2] = this.geometry.texcoords[source * 2];
      this.expandedTexcoords[output * 2 + 1] = this.geometry.texcoords[source * 2 + 1];
    }

    const gl = mgl.gl;
    this.positionBuffer = gl.createBuffer();
    this.texcoordBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.expandedTexcoords, gl.STATIC_DRAW);
  }

  _bindGeometry() {
    const { mgl } = this;
    const gl = mgl.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.expandedPositions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(mgl.aPos);
    gl.vertexAttribPointer(mgl.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.enableVertexAttribArray(mgl.aUV[0]);
    gl.vertexAttribPointer(mgl.aUV[0], 2, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(mgl.aUV[1]);
    gl.vertexAttrib2f(mgl.aUV[1], 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(mgl.aColor);
    gl.vertexAttribPointer(mgl.aColor, 4, gl.FLOAT, false, 0, 0);
    gl.uniform1i(mgl.uUseVertexColor, 1);
    if (mgl.aNormal >= 0) {
      gl.disableVertexAttribArray(mgl.aNormal);
      gl.vertexAttrib3f(mgl.aNormal, 0, 0, 1);
    }
  }

  render(seconds) {
    const { mgl } = this;
    const gl = mgl.gl;
    const { state } = deformEnergiaLateCylinder(
      this.geometry,
      this.dispBytes,
      this.waveBytes,
      seconds,
      this.scratch,
      this.positions,
      this.weights,
    );
    buildEnergiaLateCylinderTriangles(
      this.geometry,
      this.positions,
      this.weights,
      this.expandedPositions,
      this.colors,
    );

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const aspect = height / width;
    mgl.viewport(0, 0, width, height);
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-0.5, 0.5, -aspect * 0.5, aspect * 0.5, 1, 5000);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();

    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.bindTexture(this.texture);
    mgl.texGenSphereMap(false);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    mgl.enableCullFace(false);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.translate(0, 0, -700);
    mgl.rotate(state.rotation, 0, 1, 1);
    mgl.rotate(180, 1, 0, 0);
    this._bindGeometry();

    for (let copy = 0; copy < 6; copy++) {
      mgl._applyCommonUniforms();
      gl.drawArrays(gl.TRIANGLES, 0, this.geometry.indices.length);
      mgl.rotate(30, 0, 1, 0);
    }

    mgl.activeTexture(0);
    mgl.enableTexture(false);
    mgl.enableDepthTest(true);
    mgl.depthMask(true);
    mgl.enableBlend(true);
  }
}
