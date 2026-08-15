import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { envelopeTimes, parseEnvelope } from '../js/envelope.js';
import { WONDER_EFFECT_METADATA } from '../../../productions/wonder/work/js/inspector-data.js';
import {
  buildXmOrderTimeline, locateXmOrder, parseXmOrderTable,
} from '../../../productions/wonder/work/js/order-timeline.js';
import { WONDER_EFFECT_CLIPS, WONDER_SHOW_END } from '../../../productions/wonder/web/js/show-data.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const assets = path.join(repo, 'productions/wonder/web', 'assets');

function loadModel() {
  const xm = parseXmOrderTable(fs.readFileSync(path.join(assets, 'mystified.xm')));
  const orderTimes = envelopeTimes(parseEnvelope(
    fs.readFileSync(path.join(assets, 'mystified.env'), 'utf8'),
    'mystified.env',
  ));
  return { xm, orderTimes, model: buildXmOrderTimeline(orderTimes, xm, WONDER_SHOW_END, {
    terminalOrder: 21,
    terminalRow: 63,
  }) };
}

test('Wonder inspector reads the release XM order table', () => {
  const { xm, orderTimes } = loadModel();
  assert.equal(xm.songLength, 23);
  assert.equal(xm.channels, 10);
  assert.equal(xm.orders[21], 13);
  assert.equal(xm.orders[22], 14);
  assert.equal(xm.patternRows[13], 64);
  assert.deepEqual(orderTimes.slice(-2), [Math.fround(172.578), Math.fround(181.035)]);
});

test('Wonder inspector keeps order 21 active through F00 and ghosts order 22', () => {
  const { model } = loadModel();
  assert.equal(model.segments.length, 22);
  assert.equal(model.segments.at(-1).order, 21);
  assert.equal(model.segments.at(-1).pattern, 13);
  assert.equal(model.segments.at(-1).start, Math.fround(172.578));
  assert.equal(model.segments.at(-1).end, WONDER_SHOW_END);
  assert.deepEqual(model.unreachable.map(({ order, pattern, nominalStart }) =>
    [order, pattern, nominalStart]), [[22, 14, Math.fround(181.035)]]);

  const held = locateXmOrder(model, 184);
  assert.equal(held.order, 21);
  assert.equal(held.pattern, 13);
  assert.equal(held.row, 63);
  assert.equal(held.held, true);
});

test('every scheduled Wonder asset is tied to a named inspector element part', () => {
  assert.deepEqual(Object.keys(WONDER_EFFECT_METADATA).sort(),
    WONDER_EFFECT_CLIPS.map((clip) => clip.id).sort());
  for (const clip of WONDER_EFFECT_CLIPS) {
    const metadata = WONDER_EFFECT_METADATA[clip.id];
    const mappedAssets = new Set(metadata.parts.flatMap((part) => part.assets));
    for (const asset of clip.data.assets) {
      assert.ok(mappedAssets.has(asset), `${clip.id} does not map ${asset}`);
    }
  }
});
