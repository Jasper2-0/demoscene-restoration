#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { XmPlayer } from '../shared/sunflower/js/xm.js';

const [, , inputName, outputName, durationText = '186.5', sampleRateText = '8000'] = process.argv;
if (!inputName || !outputName) {
  console.error('usage: node tools/render-xm-pcm.mjs INPUT.xm OUTPUT.s16le [seconds] [sampleRate]');
  process.exit(2);
}
const duration = Number(durationText);
const sampleRate = Number(sampleRateText);
if (!Number.isFinite(duration) || duration <= 0 || !Number.isSafeInteger(sampleRate) || sampleRate < 1000) {
  throw new Error('duration and sample rate must be positive');
}

const player = new XmPlayer(fs.readFileSync(inputName), sampleRate);
const output = fs.openSync(outputName, 'w');
const chunkFrames = 4096;
const left = new Float32Array(chunkFrames);
const right = new Float32Array(chunkFrames);
const pcm = Buffer.allocUnsafe(chunkFrames * 2);
let remaining = Math.round(duration * sampleRate);
try {
  while (remaining > 0) {
    const frames = Math.min(chunkFrames, remaining);
    player.render(left, right, frames);
    for (let i = 0; i < frames; i++) {
      const mono = Math.max(-1, Math.min(1, (left[i] + right[i]) * 0.5));
      pcm.writeInt16LE(Math.round(mono * 32767), i * 2);
    }
    fs.writeSync(output, pcm, 0, frames * 2);
    remaining -= frames;
  }
} finally {
  fs.closeSync(output);
}

console.log(`${path.basename(inputName)}: rendered ${duration}s mono s16le at ${sampleRate} Hz`);
