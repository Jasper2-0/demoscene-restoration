import { Mat4 } from './mathlib.js';

const tangentCache = new WeakMap();
const quaternionCache = new WeakMap();

function add(a, b) { return a.map((value, i) => value + b[i]); }
function sub(a, b) { return a.map((value, i) => value - b[i]); }
function mul(a, scalar) { return a.map((value) => value * scalar); }

function asVector(value) { return Array.isArray(value) ? value : [value]; }
function fromVector(value, kind) { return kind === 'scalar' ? value[0] : value; }

function findSegment(keys, frame) {
  if (frame <= keys[0].time) return { index: 0, t: 0 };
  const last = keys.length - 1;
  if (frame > keys[last].time) return { index: last - 1, t: 1 };
  let low = 0;
  let high = last;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    // FUN_00404f70/FUN_00405960 advance while next.time < frame. Keeping
    // equality on the preceding segment matters for duplicate-time ENV keys:
    // the first value is sampled at the key, then the second takes over after.
    if (keys[middle].time < frame) low = middle;
    else high = middle;
  }
  const duration = keys[low + 1].time - keys[low].time;
  return { index: low, t: duration > 0 ? (frame - keys[low].time) / duration : 1 };
}

function computeTangents(track) {
  const cached = tangentCache.get(track);
  if (cached) return cached;
  const keys = track.keys;
  const incoming = keys.map((key) => mul(asVector(key.value), 0));
  const outgoing = keys.map((key) => mul(asVector(key.value), 0));
  if (keys.length < 2) {
    const result = { incoming, outgoing };
    tangentCache.set(track, result);
    return result;
  }

  if (keys.length === 2) {
    const delta = sub(asVector(keys[1].value), asVector(keys[0].value));
    outgoing[0] = mul(delta, 1 - keys[0].tension);
    incoming[1] = mul(delta, 1 - keys[1].tension);
  } else {
    for (let i = 1; i < keys.length - 1; i++) {
      const previous = keys[i - 1];
      const key = keys[i];
      const next = keys[i + 1];
      const totalTime = next.time - previous.time;
      const previousWeight = totalTime === 0 ? 0.5 : (key.time - previous.time) / totalTime;
      const nextWeight = totalTime === 0 ? 0.5 : (next.time - key.time) / totalTime;
      const deltaPrevious = sub(asVector(key.value), asVector(previous.value));
      const deltaNext = sub(asVector(next.value), asVector(key.value));
      const t = 1 - key.tension;
      const c = key.continuity;
      const b = key.bias;
      incoming[i] = mul(add(
        mul(deltaNext, (1 + c) * (1 - b) * t),
        mul(deltaPrevious, (1 - c) * (1 + b) * t),
      ), previousWeight);
      outgoing[i] = mul(add(
        mul(deltaNext, (1 - c) * (1 - b) * t),
        mul(deltaPrevious, (1 + c) * (1 + b) * t),
      ), nextWeight);
    }

    // These are Wonder's original endpoint equations. Vector tracks use
    // 0x4051f0/0x4053c0; scalar tracks use 0x405790/0x405820. The final
    // vector equation has an additional 0.25 term at 0x40540a that is not
    // present in the scalar equation.
    const first = keys[0];
    const second = keys[1];
    const third = keys[2];
    const span0 = third.time - first.time;
    // 0.25 for BOTH kinds. The vector equation at 0x0040523a and the scalar one at
    // 0x004057e3 both do `FSUBR double [0x004332e8]`, and that constant is 0.25.
    // The port originally carried a bias at the closing end and none here, which
    // left the first segment of every scalar track slightly wrong — visible as
    // Wonder's check camera projecting a 1.5436 half-width where the executable
    // projects 1.4503.
    const timeCorrection0 = span0 === 0
      ? 0.25
      : 0.25 - (second.time - first.time) / (2 * span0);
    const delta02 = sub(asVector(third.value), asVector(first.value));
    outgoing[0] = mul(add(
      add(mul(delta02, 0.5), mul(delta02, timeCorrection0)),
      mul(sub(sub(asVector(second.value), asVector(first.value)), mul(delta02, 0.5)), 1.5),
    ), 1 - first.tension);

    const lastIndex = keys.length - 1;
    const last = keys[lastIndex];
    const penultimate = keys[lastIndex - 1];
    const antepenultimate = keys[lastIndex - 2];
    const span1 = last.time - antepenultimate.time;
    // 0.75 for BOTH kinds, exactly as the opening is 0.25 for both. The two
    // routines reach it by different arithmetic, which is what made this look
    // asymmetric for so long: the VECTOR equation at 0x0040540a does
    // `FSUBR float [0x004332f0]` (0.25) and then `FADD float [0x004332e4]` (0.5)
    // inline, while the SCALAR one at 0x00405872 does `FSUBR double [0x004332e8]`
    // (0.25) and adds the same delta20*0.5 back as a SEPARATE term at 0x0040588e,
    // after the 1.5 term. Both compute 0.75 - ratio; all four constants were read
    // out of the executable rather than inferred.
    //
    // The port used 0.5 for scalar, which left the FINAL segment of every scalar
    // track wrong while every earlier segment matched exactly. Measured against the
    // executable, Wonder's camera roll at order 8 agreed to 0.00 degrees at frame
    // 30.6 and was 12.17 degrees out at frame 89 — the same instant where
    // effect_40cea0 scores 0.597.
    const lastTimeBias = 0.75;
    const timeCorrection1 = span1 === 0
      ? lastTimeBias
      : lastTimeBias - (last.time - penultimate.time) / (2 * span1);
    const delta20 = sub(asVector(last.value), asVector(antepenultimate.value));
    incoming[lastIndex] = mul(add(
      mul(delta20, timeCorrection1),
      mul(sub(sub(asVector(last.value), asVector(penultimate.value)), mul(delta20, 0.5)), 1.5),
    ), 1 - last.tension);
  }

  const result = { incoming, outgoing };
  tangentCache.set(track, result);
  return result;
}

function sampleHermite(track, frame) {
  const keys = track.keys;
  if (!keys.length) return track.kind === 'scalar' ? 0 : track.kind === 'quaternion' ? [1, 0, 0, 0] : [0, 0, 0];
  if (keys.length === 1) return Array.isArray(keys[0].value) ? [...keys[0].value] : keys[0].value;
  const { index, t } = findSegment(keys, frame);
  const { incoming, outgoing } = computeTangents(track);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const value = add(
    add(mul(asVector(keys[index].value), h00), mul(outgoing[index], h10)),
    add(mul(asVector(keys[index + 1].value), h01), mul(incoming[index + 1], h11)),
  );
  return fromVector(value, track.kind);
}

function qNormalize(q) {
  const length = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return q.map((value) => value / length);
}
function qDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; }
function qMultiply(a, b) {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}
function qExp(q) {
  const angle = Math.hypot(q[1], q[2], q[3]);
  if (angle < 1e-12) return [1, 0, 0, 0];
  const scale = Math.sin(angle) / angle;
  return [Math.cos(angle), q[1] * scale, q[2] * scale, q[3] * scale];
}
function qInverseNormalized(q) {
  const normalized = qNormalize(q);
  return [normalized[0], -normalized[1], -normalized[2], -normalized[3]];
}

// FUN_00402cc0: logarithm of inverse(a) * b. The original uses atan2's
// equivalent x87 path, rather than deriving the angle from the scalar alone.
function qLogDifference(a, b) {
  const relative = qMultiply(qInverseNormalized(a), b);
  const vectorLength = Math.hypot(relative[1], relative[2], relative[3]);
  const scalar = qDot(a, b);
  const angle = scalar === 0 ? Math.PI / 2 : Math.atan(vectorLength / scalar);
  const scale = vectorLength === 0 ? angle : angle / vectorLength;
  return [0, relative[1] * scale, relative[2] * scale, relative[3] * scale];
}

function qNativeSlerp(a, b, t, spin, shortest) {
  const rawDot = qDot(a, b);
  const dot = shortest ? Math.abs(rawDot) : rawDot;
  const sign = shortest && rawDot < 0 ? -1 : 1;
  let firstWeight;
  let secondWeight;
  if (1 - Math.abs(dot) < 1e-5) {
    firstWeight = 1 - t;
    secondWeight = t;
  } else {
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const phase = t * (spin * Math.PI + angle);
    const denominator = Math.sin(angle);
    firstWeight = Math.sin(angle - phase) / denominator;
    secondWeight = Math.sin(phase) / denominator;
  }
  secondWeight *= sign;
  return a.map((value, i) => value * firstWeight + b[i] * secondWeight);
}

function prepareQuaternions(track) {
  const cached = quaternionCache.get(track);
  if (cached) return cached;
  // FUN_00404290 first turns the exported delta rotations into absolute
  // orientations in place: q[i + 1] = q[i] * q[i + 1].
  const values = track.keys.map((key) => [...key.value]);
  for (let i = 0; i + 1 < values.length; i++) values[i + 1] = qMultiply(values[i], values[i + 1]);

  // FUN_00403d80 builds separate incoming/outgoing TCB SQUAD controls. Its
  // timing factors matter for the deliberately nonuniform keys in beginning.exp.
  const incoming = new Array(values.length);
  const outgoing = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const key = track.keys[i];
    const previousKey = i > 0 ? track.keys[i - 1] : null;
    const nextKey = i + 1 < values.length ? track.keys[i + 1] : null;
    let previousLog = null;
    let nextLog = null;
    if (i > 0) {
      let previous = values[i - 1];
      if (qDot(qNormalize(previous), qNormalize(values[i])) < 0) previous = qInverseNormalized(previous);
      previousLog = qLogDifference(previous, values[i]);
    }
    if (i + 1 < values.length) {
      let next = values[i + 1];
      if (qDot(qNormalize(next), qNormalize(values[i])) < 0) next = qInverseNormalized(next);
      nextLog = qLogDifference(values[i], next);
    }
    if (!previousLog) previousLog = nextLog ?? [0, 0, 0, 0];
    if (!nextLog) nextLog = previousLog;

    let previousTimeFactor = 1;
    let nextTimeFactor = 1;
    if (previousKey && nextKey) {
      const halfSpan = (nextKey.time - previousKey.time) * 0.5;
      if (halfSpan !== 0) {
        previousTimeFactor = (key.time - previousKey.time) / halfSpan;
        nextTimeFactor = (nextKey.time - key.time) / halfSpan;
      }
      const absoluteContinuity = Math.abs(key.continuity);
      previousTimeFactor = absoluteContinuity + previousTimeFactor
        - absoluteContinuity * previousTimeFactor;
      nextTimeFactor = absoluteContinuity + nextTimeFactor
        - absoluteContinuity * nextTimeFactor;
    }

    const halfTension = (1 - key.tension) * 0.5;
    const oneMinusBias = 1 - key.bias;
    const onePlusBias = 1 + key.bias;
    const oneMinusContinuity = 1 - key.continuity;
    const onePlusContinuity = 1 + key.continuity;
    const previousIncoming = 1 - halfTension * oneMinusContinuity
      * onePlusBias * previousTimeFactor;
    const nextIncoming = -(halfTension * onePlusContinuity
      * oneMinusBias * previousTimeFactor);
    const previousOutgoing = halfTension * onePlusContinuity
      * onePlusBias * nextTimeFactor;
    const nextOutgoing = halfTension * oneMinusContinuity
      * oneMinusBias * nextTimeFactor - 1;

    const incomingLog = previousLog.map((value, component) => component === 0 ? 0
      : (value * previousIncoming + nextLog[component] * nextIncoming) * 0.5);
    const outgoingLog = previousLog.map((value, component) => component === 0 ? 0
      : (value * previousOutgoing + nextLog[component] * nextOutgoing) * 0.5);
    incoming[i] = qMultiply(values[i], qExp(incomingLog));
    outgoing[i] = qMultiply(values[i], qExp(outgoingLog));
  }
  const result = { values, incoming, outgoing };
  quaternionCache.set(track, result);
  return result;
}

function sampleQuaternion(track, frame) {
  if (!track.keys.length) return [1, 0, 0, 0];
  const { values, incoming, outgoing } = prepareQuaternions(track);
  if (values.length === 1) return [...values[0]];
  const { index, t } = findSegment(track.keys, frame);
  const angleDifference = 2 * Math.acos(Math.max(-1, Math.min(1, values[index + 1][0])))
    - 2 * Math.acos(Math.max(-1, Math.min(1, values[index][0])));
  const turns = angleDifference <= 0
    ? Math.ceil(angleDifference / (2 * Math.PI))
    : Math.floor(angleDifference / (2 * Math.PI));
  const shortest = Math.abs(angleDifference - turns * 2 * Math.PI) <= Math.PI;
  const direct = qNativeSlerp(values[index], values[index + 1], t, turns, shortest);
  const control = qNativeSlerp(outgoing[index], incoming[index + 1], t, turns, shortest);
  return qNativeSlerp(direct, control, 2 * t * (1 - t), 0, shortest);
}

export function sampleTrack(track, frame) {
  if (!track || !Number.isFinite(frame)) throw new TypeError('sampleTrack requires a track and finite frame');
  return track.kind === 'quaternion' ? sampleQuaternion(track, frame) : sampleHermite(track, frame);
}

export function matrixFromQuaternion(q) {
  const [w, x, y, z] = qNormalize(q);
  const matrix = new Mat4();
  matrix.m.set([
    1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y), 0,
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x), 0,
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1,
  ]);
  return matrix;
}

function translationMatrix(position) {
  return new Mat4().translate(position[0], position[1], position[2]);
}

function meshLocalMatrix(mesh, frame) {
  const translation = sampleTrack(mesh.tracks.translation, frame);
  const rotation = sampleTrack(mesh.tracks.rotation, frame);
  const scale = sampleTrack(mesh.tracks.scale, frame);
  const matrix = matrixFromQuaternion(rotation);
  // The original adapters replace the rotation matrix translation, scale its
  // three bases, then right-multiply the exported negative pivot.
  matrix.m[12] = translation[0];
  matrix.m[13] = translation[1];
  matrix.m[14] = translation[2];
  matrix.scale(scale[0], scale[1], scale[2]);
  matrix.translate(-mesh.pivot[0], -mesh.pivot[1], -mesh.pivot[2]);
  return matrix;
}

function transformPoint(matrix, value) {
  const m = matrix.m;
  return [
    value[0] * m[0] + value[1] * m[4] + value[2] * m[8] + m[12],
    value[0] * m[1] + value[1] * m[5] + value[2] * m[9] + m[13],
    value[0] * m[2] + value[1] * m[6] + value[2] * m[10] + m[14],
  ];
}

function normalized(v) {
  const length = Math.hypot(...v) || 1;
  return v.map((value) => value / length);
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

export function lookAtMatrix(eye, target, roll = 0) {
  const forward = normalized(sub(target, eye));
  let right = normalized(cross(forward, [0, 0, 1]));
  if (Math.hypot(...right) < 1e-8) right = normalized(cross(forward, [0, 1, 0]));
  let up = normalized(cross(right, forward));
  if (roll) {
    const cosine = Math.cos(roll);
    const sine = Math.sin(roll);
    // FUN_00403460's final native matrix product stores the rolled camera
    // basis in this order. Treating the intermediate FUN_00403bb0 matrix as
    // a conventional column-vector premultiplication reverses the exported
    // roll on screen (most visibly in credits.exp and end.exp).
    const rolledRight = add(mul(right, cosine), mul(up, sine));
    up = add(mul(up, cosine), mul(right, -sine));
    right = rolledRight;
  }
  const matrix = new Mat4();
  matrix.m.set([
    right[0], up[0], -forward[0], 0,
    right[1], up[1], -forward[1], 0,
    right[2], up[2], -forward[2], 0,
    -dot(right, eye), -dot(up, eye), dot(forward, eye), 1,
  ]);
  return matrix;
}

/** The restored EXP cameras store horizontal FOV; top is right / aspect. */
export function perspectiveMatrix(horizontalFovRadians, aspect, near = 1, far = 10000) {
  const right = near * Math.tan(horizontalFovRadians / 2);
  const top = right / aspect;
  return new Mat4().frustum(-right, right, -top, top, near, far);
}

export function sampleScene(scene, frame) {
  if (!scene || !Number.isFinite(frame)) throw new TypeError('sampleScene requires a scene and finite frame');
  const nodes = new Map();
  for (const mesh of scene.meshes) nodes.set(mesh.objectId, { source: mesh, parentId: mesh.parentId, local: meshLocalMatrix(mesh, frame) });
  for (const camera of scene.cameras) {
    nodes.set(camera.objectId, { source: camera, parentId: camera.parentId, local: translationMatrix(sampleTrack(camera.tracks.position, frame)) });
  }
  for (const target of scene.targets) {
    nodes.set(target.objectId, { source: target, parentId: target.parentId, local: translationMatrix(sampleTrack(target.tracks.position, frame)) });
  }
  for (const light of scene.lights) {
    nodes.set(light.objectId, { source: light, parentId: light.parentId, local: translationMatrix(sampleTrack(light.tracks.position, frame)) });
  }

  const visiting = new Set();
  function worldFor(id) {
    const node = nodes.get(id);
    if (!node) return new Mat4();
    if (node.world) return node.world;
    if (visiting.has(id)) throw new Error(`cycle in EXP hierarchy at object ${id}`);
    visiting.add(id);
    node.world = node.parentId === -1 || !nodes.has(node.parentId)
      ? node.local.clone()
      : worldFor(node.parentId).clone().mult(node.local);
    visiting.delete(id);
    return node.world;
  }
  for (const id of nodes.keys()) worldFor(id);

  const sampledMeshes = scene.meshes.map((mesh) => ({
    source: mesh,
    matrix: worldFor(mesh.objectId),
    scale: sampleTrack(mesh.tracks.scale, frame),
  }));
  const sampledMaterials = scene.materials.map((material) => {
    if (!material.tracks) {
      return {
        source: material, textureOffset: [0, 0],
        ambient: material.ambient ?? [1, 1, 1],
        diffuse: material.diffuse ?? [1, 1, 1],
        specular: material.specular ?? [0, 0, 0],
        opacity: material.opacity ?? 1,
      };
    }
    return {
      source: material,
      textureOffset: [
        sampleTrack(material.tracks.textureOffsetU, frame),
        sampleTrack(material.tracks.textureOffsetV, frame),
      ],
      ambient: sampleTrack(material.tracks.ambient, frame),
      diffuse: sampleTrack(material.tracks.diffuse, frame),
      specular: sampleTrack(material.tracks.specular, frame),
      opacity: sampleTrack(material.tracks.opacity, frame),
    };
  });
  const sampledLights = scene.lights.map((light) => ({
    source: light,
    position: transformPoint(worldFor(light.objectId), [0, 0, 0]),
  }));
  let camera = null;
  if (scene.cameras.length) {
    const source = scene.cameras[0];
    const targetSource = scene.targets.find((target) => target.name === source.targetName) ?? scene.targets[0];
    const position = transformPoint(worldFor(source.objectId), [0, 0, 0]);
    const target = targetSource
      ? transformPoint(worldFor(targetSource.objectId), [0, 0, 0])
      : add(position, [0, 1, 0]);
    const fov = sampleTrack(source.tracks.fov, frame);
    const roll = sampleTrack(source.tracks.roll, frame);
    camera = { source, position, target, fov, roll, viewMatrix: lookAtMatrix(position, target, roll) };
  }
  return {
    scene, frame, nodes, meshes: sampledMeshes,
    materials: sampledMaterials, lights: sampledLights, camera,
  };
}
