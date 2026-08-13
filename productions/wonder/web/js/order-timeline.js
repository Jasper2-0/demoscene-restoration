function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError('XM data must be an ArrayBuffer or byte view');
}

function readAscii(bytes, offset, length) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/** Read only the XM structure needed by the visual order inspector. */
export function parseXmOrderTable(input) {
  const bytes = asBytes(input);
  if (bytes.byteLength < 80) throw new Error('XM file is shorter than its header');
  if (readAscii(bytes, 0, 17) !== 'Extended Module: ') {
    throw new Error('not a FastTracker II XM module');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = view.getUint32(60, true);
  const headerEnd = 60 + headerSize;
  const songLength = view.getUint16(64, true);
  if (songLength < 1 || songLength > 256 || 80 + songLength > bytes.byteLength) {
    throw new Error(`invalid XM song length ${songLength}`);
  }
  if (headerSize < 20 || headerEnd > bytes.byteLength) {
    throw new Error(`invalid XM header size ${headerSize}`);
  }

  const patternCount = view.getUint16(70, true);
  const patternRows = [];
  let offset = headerEnd;
  for (let pattern = 0; pattern < patternCount; pattern++) {
    if (offset + 9 > bytes.byteLength) throw new Error(`truncated XM pattern ${pattern}`);
    const patternHeaderSize = view.getUint32(offset, true);
    const rows = view.getUint16(offset + 5, true);
    const packedSize = view.getUint16(offset + 7, true);
    if (patternHeaderSize < 9 || rows < 1 || offset + patternHeaderSize + packedSize > bytes.byteLength) {
      throw new Error(`invalid XM pattern ${pattern}`);
    }
    patternRows.push(rows);
    offset += patternHeaderSize + packedSize;
  }

  return Object.freeze({
    songLength,
    restart: view.getUint16(66, true),
    channels: view.getUint16(68, true),
    patternCount,
    tempo: view.getUint16(76, true),
    bpm: view.getUint16(78, true),
    orders: Object.freeze([...bytes.subarray(80, 80 + songLength)]),
    patternRows: Object.freeze(patternRows),
  });
}

function assertTimes(orderTimes) {
  if (!Array.isArray(orderTimes) || !orderTimes.length
      || orderTimes.some((time) => !Number.isFinite(time))) {
    throw new Error('order timeline requires finite order times');
  }
  for (let index = 1; index < orderTimes.length; index++) {
    if (orderTimes[index] <= orderTimes[index - 1]) {
      throw new Error('order times must be strictly increasing');
    }
  }
}

/**
 * Combine Wonder's retained order-to-seconds ENV with the XM order table.
 * The terminal F00 means later table entries exist in the file but are not
 * visited by the release. Those entries remain available as ghost markers.
 */
export function buildXmOrderTimeline(orderTimes, xm, showEnd, options = {}) {
  assertTimes(orderTimes);
  if (!xm?.orders?.length) throw new Error('order timeline requires an XM order table');
  if (orderTimes.length < xm.orders.length) {
    throw new Error(`only ${orderTimes.length} order times for ${xm.orders.length} XM orders`);
  }
  if (!Number.isFinite(showEnd) || showEnd <= orderTimes[0]) {
    throw new Error('order timeline requires a valid show endpoint');
  }

  const terminalOrder = options.terminalOrder ?? null;
  const terminalRow = options.terminalRow ?? null;
  const lastReachableOrder = terminalOrder === null ? xm.orders.length - 1 : terminalOrder;
  if (!Number.isInteger(lastReachableOrder)
      || lastReachableOrder < 0 || lastReachableOrder >= xm.orders.length) {
    throw new Error(`invalid terminal XM order ${lastReachableOrder}`);
  }

  const segments = [];
  for (let order = 0; order <= lastReachableOrder; order++) {
    const start = orderTimes[order];
    const nominalEnd = orderTimes[order + 1] ?? showEnd;
    const terminal = order === terminalOrder;
    const end = terminal ? showEnd : Math.min(nominalEnd, showEnd);
    if (start >= showEnd) break;
    const pattern = xm.orders[order];
    segments.push(Object.freeze({
      order,
      pattern,
      rows: xm.patternRows[pattern] ?? 64,
      start,
      end,
      nominalEnd,
      terminal,
      terminalRow: terminal ? terminalRow : null,
    }));
  }

  const unreachable = [];
  for (let order = lastReachableOrder + 1; order < xm.orders.length; order++) {
    const pattern = xm.orders[order];
    unreachable.push(Object.freeze({
      order,
      pattern,
      rows: xm.patternRows[pattern] ?? 64,
      nominalStart: orderTimes[order],
    }));
  }

  return Object.freeze({
    start: orderTimes[0],
    end: showEnd,
    segments: Object.freeze(segments),
    unreachable: Object.freeze(unreachable),
  });
}

export function locateXmOrder(timeline, requestedSeconds) {
  const seconds = Math.max(timeline.start, Math.min(Number(requestedSeconds) || 0, timeline.end));
  let segment = timeline.segments[timeline.segments.length - 1];
  for (const candidate of timeline.segments) {
    if (seconds < candidate.end || candidate === timeline.segments.at(-1)) {
      segment = candidate;
      break;
    }
  }

  const nominalDuration = Math.max(Number.EPSILON, segment.nominalEnd - segment.start);
  const nominalProgress = Math.max(0, Math.min(1, (seconds - segment.start) / nominalDuration));
  let row = Math.min(segment.rows - 1, Math.floor(nominalProgress * segment.rows));
  const held = segment.terminal && seconds >= segment.nominalEnd;
  if (held && Number.isInteger(segment.terminalRow)) row = segment.terminalRow;
  return Object.freeze({
    ...segment,
    seconds,
    progress: Math.max(0, Math.min(1, (seconds - segment.start) / (segment.end - segment.start))),
    nominalProgress,
    row,
    held,
  });
}

