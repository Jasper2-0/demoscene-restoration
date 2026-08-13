import { sampleTrack } from './scene.js';

/** Parse Sunflower's loose text envelope format. */
export function parseEnvelope(text, source = '<envelope>') {
  const lines = String(text).replace(/\r/g, '').split('\n');
  const label = (lines.shift() ?? '').trim();
  if (!label) throw new Error(`${source}: missing envelope label`);

  const keys = [];
  let dimensions = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line || /^E+ND$/i.test(line)) continue;
    const fields = line.split(/\s+/);
    if (fields.length < 4) {
      throw new Error(`${source}:${index + 2}: malformed envelope key`);
    }
    const time = Number(fields[1]);
    const payload = fields.slice(3).map(Number);
    if (!Number.isFinite(time) || !payload.length || payload.some((v) => !Number.isFinite(v))) {
      throw new Error(`${source}:${index + 2}: non-finite envelope value`);
    }
    if (!dimensions) {
      if (payload.length === 1 || payload.length === 4) dimensions = 1;
      else if (payload.length === 3 || payload.length === 6) dimensions = 3;
      else throw new Error(`${source}:${index + 2}: unsupported envelope payload width ${payload.length}`);
    }
    const hasTcb = payload.length === dimensions + 3;
    if (payload.length !== dimensions && !hasTcb) {
      throw new Error(`${source}:${index + 2}: expected ${dimensions} values with optional TCB fields, found ${payload.length}`);
    }
    const values = payload.slice(0, dimensions);
    const [tension = 0, continuity = 0, bias = 0] = hasTcb
      ? payload.slice(dimensions) : [];
    if (keys.length && time < keys[keys.length - 1].time) {
      throw new Error(`${source}:${index + 2}: envelope times are not monotonic`);
    }
    keys.push({
      time,
      value: dimensions === 1 ? values[0] : values,
      tension,
      continuity,
      bias,
    });
  }
  if (!keys.length) throw new Error(`${source}: envelope has no keys`);
  return Object.freeze({
    label,
    dimensions,
    kind: dimensions === 1 ? 'scalar' : 'vector3',
    keys: Object.freeze(keys),
  });
}

/** Native Hermite/TCB sample from FUN_00405580/FUN_004058b0. */
export function sampleEnvelope(envelope, time) {
  return sampleTrack(envelope, time);
}

export function envelopeTimes(envelope) {
  return envelope.keys.map((key) => key.time);
}
