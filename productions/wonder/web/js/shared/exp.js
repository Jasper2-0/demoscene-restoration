const RESERVED_RECORDS = new Set([0, 4, 6, 7, 8, 9]);
const VARIANTS = new Set(['wonder', 'energia']);
const COLLECTIONS = Object.freeze({
  mesh: 'meshes', camera: 'cameras', light: 'lights',
  target: 'targets', material: 'materials', reserved: 'reserved',
});
const MATERIAL_BYTES = Object.freeze({
  wonder: Object.freeze({ KEXP: 0xad, SUNF: 0xae }),
});

export class ExpFormatError extends Error {
  constructor(message, { source = '<EXP>', offset = 0 } = {}) {
    super(`${source}: ${message} at 0x${offset.toString(16)}`);
    this.name = 'ExpFormatError';
    this.source = source;
    this.offset = offset;
  }
}

class Reader {
  constructor(input, source) {
    if (input instanceof ArrayBuffer) {
      this.bytes = new Uint8Array(input);
    } else if (ArrayBuffer.isView(input)) {
      this.bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    } else {
      throw new TypeError('parseExp expects an ArrayBuffer or typed-array view');
    }
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    this.source = source;
    this.offset = 0;
  }

  fail(message, offset = this.offset) {
    throw new ExpFormatError(message, { source: this.source, offset });
  }

  ensure(length, label = `${length} bytes`) {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > this.bytes.length) {
      this.fail(`unexpected end while reading ${label}`);
    }
  }

  u8(label = 'byte') {
    this.ensure(1, label);
    return this.bytes[this.offset++];
  }

  u32(label = 'uint32') {
    this.ensure(4, label);
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  i32(label = 'int32') {
    this.ensure(4, label);
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  f32(label = 'float32') {
    this.ensure(4, label);
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  fixedString(length, label = 'string') {
    const bytes = this.copyBytes(length, label);
    const nul = bytes.indexOf(0);
    const used = nul < 0 ? bytes : bytes.subarray(0, nul);
    let value = '';
    for (const byte of used) value += String.fromCharCode(byte);
    return value;
  }

  copyBytes(length, label = `${length} raw bytes`) {
    this.ensure(length, label);
    const value = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  f32Array(count, label) {
    this.ensureCount(count, 4, label);
    const values = new Float32Array(count);
    for (let i = 0; i < count; i++) values[i] = this.f32(label);
    return values;
  }

  u32Array(count, label) {
    this.ensureCount(count, 4, label);
    const values = new Uint32Array(count);
    for (let i = 0; i < count; i++) values[i] = this.u32(label);
    return values;
  }

  ensureCount(count, stride, label) {
    if (!Number.isSafeInteger(count) || count < 0 || count > Math.floor(this.bytes.length / stride)) {
      this.fail(`impossible ${label} count ${count}`);
    }
    this.ensure(count * stride, label);
  }
}

function readTrack(reader, kind, label) {
  const offset = reader.offset;
  const count = reader.u32(`${label} key count`);
  const words = kind === 'quaternion' ? 8 : kind === 'vector3' ? 7 : 2;
  reader.ensureCount(count, words * 4, `${label} keys`);
  const keys = new Array(count);

  for (let i = 0; i < count; i++) {
    if (kind === 'scalar') {
      // Scalar tracks are the one exception to the value-first disk layout.
      const time = reader.f32(`${label} time`);
      const value = reader.f32(`${label} value`);
      keys[i] = { time, value, tension: 0, continuity: 0, bias: 0 };
      continue;
    }

    const dimensions = kind === 'quaternion' ? 4 : 3;
    const value = new Array(dimensions);
    for (let component = 0; component < dimensions; component++) {
      value[component] = reader.f32(`${label} value`);
    }
    const tension = reader.f32(`${label} tension`);
    const continuity = reader.f32(`${label} continuity`);
    const bias = reader.f32(`${label} bias`);
    const time = reader.f32(`${label} time`);
    keys[i] = { time, value, tension, continuity, bias };
  }

  for (let i = 1; i < keys.length; i++) {
    if (keys[i].time < keys[i - 1].time) {
      reader.fail(`${label} key times are not monotonic`, offset);
    }
  }
  return { kind, offset, byteLength: reader.offset - offset, keys };
}

function readMesh(reader) {
  const name = reader.fixedString(32, 'mesh name');
  const objectId = reader.i32('mesh object id');
  const vertexCount = reader.u32('mesh vertex count');
  const texcoordCount = reader.u32('mesh texture-coordinate count');
  const faceCount = reader.u32('mesh face count');
  const parentId = reader.i32('mesh parent id');
  const materialIndex = reader.i32('mesh material index');
  const pivot = [...reader.f32Array(3, 'mesh pivot')];

  const positions = reader.f32Array(vertexCount * 3, 'mesh positions');
  const texcoords = reader.f32Array(texcoordCount * 2, 'mesh texture coordinates');
  // The exporter omits this complete face-sized table when a mesh has no UVs.
  const texcoordIndices = texcoordCount
    ? reader.u32Array(faceCount * 3, 'mesh texture-coordinate indices')
    : new Uint32Array(0);
  const indices = new Uint32Array(faceCount * 3);
  const faceFlags = new Uint32Array(faceCount);
  reader.ensureCount(faceCount, 16, 'mesh faces');
  for (let face = 0; face < faceCount; face++) {
    indices[face * 3] = reader.u32('mesh vertex index');
    indices[face * 3 + 1] = reader.u32('mesh vertex index');
    indices[face * 3 + 2] = reader.u32('mesh vertex index');
    faceFlags[face] = reader.u32('mesh face flags');
  }

  const translation = readTrack(reader, 'vector3', `${name} translation`);
  const rotation = readTrack(reader, 'quaternion', `${name} rotation`);
  const scale = readTrack(reader, 'vector3', `${name} scale`);
  return {
    type: 'mesh', name, objectId, parentId, materialIndex, pivot,
    vertexCount, texcoordCount, faceCount,
    positions, texcoords, texcoordIndices, indices, faceFlags,
    tracks: { translation, rotation, scale },
  };
}

function readCamera(reader) {
  const name = reader.fixedString(32, 'camera name');
  const targetName = reader.fixedString(32, 'camera target name');
  const objectId = reader.i32('camera object id');
  const parentId = reader.i32('camera parent id');
  const position = readTrack(reader, 'vector3', `${name} position`);
  const fov = readTrack(reader, 'scalar', `${name} field of view`);
  const roll = readTrack(reader, 'scalar', `${name} roll`);
  return { type: 'camera', name, targetName, objectId, parentId, tracks: { position, fov, roll } };
}

function readLight(reader) {
  const name = reader.fixedString(32, 'light name');
  const objectId = reader.i32('light object id');
  const parentId = reader.i32('light parent id');
  const lightType = reader.u32('light type');
  const color = [...reader.f32Array(3, 'light color')];
  const multiplier = reader.f32('light multiplier');
  const hotspot = reader.f32('light hotspot');
  const falloff = reader.f32('light falloff');
  const position = readTrack(reader, 'vector3', `${name} position`);
  return {
    type: 'light', name, objectId, parentId, lightType,
    color, multiplier, hotspot, falloff, tracks: { position },
  };
}

function readTarget(reader) {
  const name = reader.fixedString(32, 'target name');
  const objectId = reader.i32('target object id');
  const parentId = reader.i32('target parent id');
  const position = readTrack(reader, 'vector3', `${name} position`);
  return { type: 'target', name, objectId, parentId, tracks: { position } };
}

function stringAt(bytes, offset, length = 32) {
  const end = Math.min(bytes.length, offset + length);
  let value = '';
  for (let i = offset; i < end && bytes[i] !== 0; i++) value += String.fromCharCode(bytes[i]);
  return value;
}

function embeddedStrings(bytes) {
  const strings = [];
  let value = '';
  for (const byte of bytes) {
    if (byte >= 0x20 && byte <= 0x7e) {
      value += String.fromCharCode(byte);
    } else {
      if (value.length >= 3) strings.push(value);
      value = '';
    }
  }
  if (value.length >= 3) strings.push(value);
  return strings;
}

function readMaterial(reader, variant, magic) {
  if (variant === 'energia') {
    if (magic !== 'SUNF') reader.fail(`unsupported Energia ${magic} material layout`);
    const offset = reader.offset;
    const name = reader.fixedString(32, 'material name');
    const map0 = reader.fixedString(32, 'material primary map');
    const textureOffsetU = readTrack(reader, 'scalar', `${name} texture U offset`);
    const textureOffsetV = readTrack(reader, 'scalar', `${name} texture V offset`);
    const map1 = reader.fixedString(32, 'material secondary map');
    const map2 = reader.fixedString(32, 'material environment map');
    const flags = reader.u32('material flags');
    const doubleSided = reader.u8('material two-sided flag') !== 0;
    const ambient = readTrack(reader, 'vector3', `${name} ambient color`);
    const diffuse = readTrack(reader, 'vector3', `${name} diffuse color`);
    const specular = readTrack(reader, 'vector3', `${name} specular color`);
    const opacity = readTrack(reader, 'scalar', `${name} opacity`);
    const blendMode = reader.u8('material blend mode');
    const bytes = reader.bytes.slice(offset, reader.offset);
    const maps = [map0, map1, map2];
    return {
      type: 'material', name, bytes, maps, textureNames: maps.filter(Boolean),
      strings: embeddedStrings(bytes), flags, doubleSided, blendMode,
      tracks: { textureOffsetU, textureOffsetV, ambient, diffuse, specular, opacity },
    };
  }
  const byteLength = MATERIAL_BYTES[variant]?.[magic];
  if (byteLength === undefined) {
    reader.fail(`unsupported ${variant} ${magic} material layout`);
  }
  const bytes = reader.copyBytes(byteLength, `${variant} material`);
  const strings = embeddedStrings(bytes);
  const material = {
    type: 'material', name: stringAt(bytes, 0), bytes, strings,
    textureNames: strings.filter((value) => /\.(?:jpe?g|png|bmp|tga|raw)$/i.test(value)),
  };
  if (variant === 'wonder') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    material.maps = [stringAt(bytes, 0x20), stringAt(bytes, 0x40), stringAt(bytes, 0x60)];
    material.textureNames = material.maps.filter(Boolean);
    material.mapMode = view.getUint32(0x80, true);
    material.doubleSided = bytes[0x84] !== 0;
    material.ambient = [0x85, 0x89, 0x8d].map((offset) => view.getFloat32(offset, true));
    material.diffuse = [0x91, 0x95, 0x99].map((offset) => view.getFloat32(offset, true));
    material.specular = [0x9d, 0xa1, 0xa5].map((offset) => view.getFloat32(offset, true));
    material.opacity = view.getFloat32(0xa9, true);
    material.blendMode = magic === 'SUNF' && bytes[0xad] !== 0 ? 1 : 0;
  }
  return material;
}

function validateMesh(reader, mesh, recordOffset) {
  for (const index of mesh.indices) {
    if (index >= mesh.vertexCount) reader.fail(`${mesh.name} vertex index ${index} is out of range`, recordOffset);
  }
  for (const index of mesh.texcoordIndices) {
    if (index >= mesh.texcoordCount) {
      reader.fail(`${mesh.name} texture-coordinate index ${index} is out of range`, recordOffset);
    }
  }
}

/**
 * Parse Sunflower's little-endian SUNF/KEXP record stream.
 *
 * The two executables share the scene/track layout, but Energia's material
 * record is an expanded 0x10a-byte revision. Requiring the caller to state the
 * variant keeps malformed streams from being silently accepted.
 */
export function parseExp(input, { variant = 'wonder', source = '<EXP>' } = {}) {
  if (!VARIANTS.has(variant)) throw new TypeError(`unknown EXP variant ${variant}`);
  const reader = new Reader(input, source);
  if (reader.bytes.length < 8) reader.fail('file is shorter than the eight-byte header', 0);
  const magic = reader.fixedString(4, 'magic');
  if (magic !== 'SUNF' && magic !== 'KEXP') reader.fail(`invalid magic ${JSON.stringify(magic)}`, 0);
  const frameEnd = reader.u32('scene end frame');
  const scene = {
    variant, magic, frameEnd, byteLength: reader.bytes.length,
    records: [], meshes: [], cameras: [], lights: [], targets: [], materials: [], reserved: [],
  };

  while (reader.offset < reader.bytes.length) {
    const offset = reader.offset;
    const recordType = reader.u32('record type');
    let record;
    if (recordType === 1) record = readMesh(reader);
    else if (recordType === 2) record = readCamera(reader);
    else if (recordType === 3) record = readLight(reader);
    else if (recordType === 5) record = readTarget(reader);
    else if (recordType === 10) record = readMaterial(reader, variant, magic);
    else if (RESERVED_RECORDS.has(recordType)) record = { type: 'reserved', recordType };
    else reader.fail(`unknown record type ${recordType}`, offset);

    record.recordType = recordType;
    record.offset = offset;
    record.byteLength = reader.offset - offset;
    if (record.type === 'mesh') validateMesh(reader, record, offset);
    scene.records.push(record);
    scene[COLLECTIONS[record.type]].push(record);
  }

  if (reader.offset !== reader.bytes.length) reader.fail('record stream was not consumed exactly');
  return scene;
}

export function summarizeExp(scene) {
  return {
    variant: scene.variant,
    magic: scene.magic,
    frameEnd: scene.frameEnd,
    byteLength: scene.byteLength,
    records: scene.records.length,
    meshes: scene.meshes.map((mesh) => ({
      name: mesh.name,
      vertices: mesh.vertexCount,
      texcoords: mesh.texcoordCount,
      faces: mesh.faceCount,
      materialIndex: mesh.materialIndex,
    })),
    cameras: scene.cameras.map(({ name, targetName }) => ({ name, targetName })),
    lights: scene.lights.map(({ name }) => name),
    targets: scene.targets.map(({ name }) => name),
    materials: scene.materials.map(({ name, maps }) => ({ name, maps: maps ?? null })),
  };
}
