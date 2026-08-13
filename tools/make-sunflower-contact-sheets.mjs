#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  WONDER_EFFECT_CLIPS, WONDER_SHOW_END,
} from '../productions/wonder/web/js/show-data.js';
import {
  ENERGIA_PHASE_CLIPS, ENERGIA_SCENE_CLIPS,
} from '../productions/energia/web/js/show-data.js';

const [, , demo, input, outputDirectory] = process.argv;
if (!['wonder', 'energia'].includes(demo) || !input || !outputDirectory) {
  console.error('usage: node tools/make-sunflower-contact-sheets.mjs wonder|energia VIDEO OUTPUT_DIR');
  process.exit(2);
}

const captureOffset = demo === 'energia' ? 3.023 : 0;
const captureEnd = demo === 'energia' ? 255.061 : 186.525918;
const clips = demo === 'wonder'
  ? WONDER_EFFECT_CLIPS
  : [...ENERGIA_PHASE_CLIPS, ...ENERGIA_SCENE_CLIPS];

const samples = new Map();
function add(showTime, kind, clipId) {
  const captureTime = showTime - captureOffset;
  const key = showTime.toFixed(3);
  if (!samples.has(key)) samples.set(key, { showTime, captureTime, reasons: [] });
  samples.get(key).reasons.push(`${kind}:${clipId}`);
}
for (const clip of clips) {
  add(clip.start, 'start', clip.id);
  add((clip.start + clip.end) * 0.5, 'mid', clip.id);
  add(clip.end, 'end', clip.id);
}

const unavailable = [];
const available = [...samples.values()].sort((a, b) => a.showTime - b.showTime).filter((sample) => {
  const valid = sample.captureTime >= 0 && sample.captureTime <= captureEnd
    && (demo !== 'wonder' || sample.showTime <= WONDER_SHOW_END);
  if (!valid) unavailable.push(sample);
  return valid;
});

fs.mkdirSync(outputDirectory, { recursive: true });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), `${demo}-contact-`));
function run(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args],
    { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `ffmpeg exited ${result.status}`);
}

try {
  for (let index = 0; index < available.length; index++) {
    const sample = available[index];
    const label = demo === 'energia'
      ? `show ${sample.showTime.toFixed(3)}s / capture ${sample.captureTime.toFixed(3)}s`
      : `show/capture ${sample.showTime.toFixed(3)}s`;
    const output = path.join(temporary, `frame-${String(index).padStart(3, '0')}.jpg`);
    run([
      '-ss', sample.captureTime.toFixed(6), '-i', input, '-frames:v', '1',
      '-vf', `scale=320:240:force_original_aspect_ratio=decrease,pad=320:240:(ow-iw)/2:(oh-ih)/2:black,drawtext=text='${label}':x=6:y=h-th-6:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.65`,
      '-q:v', '3', output,
    ]);
  }

  const pageSize = 16;
  for (let start = 0, page = 1; start < available.length; start += pageSize, page++) {
    const count = Math.min(pageSize, available.length - start);
    const pageName = `page-${String(page).padStart(2, '0')}.jpg`;
    run([
      '-framerate', '1', '-start_number', String(start),
      '-i', path.join(temporary, 'frame-%03d.jpg'), '-frames:v', '1',
      '-vf', `tile=4x4:nb_frames=${count}:padding=4:margin=4:color=black`,
      '-q:v', '3', path.join(outputDirectory, pageName),
    ]);
    for (let index = start; index < start + count; index++) {
      available[index].page = pageName;
      available[index].tile = index - start + 1;
    }
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

const manifest = {
  demo, captureOffset, captureEnd, generatedFromTemporaryReference: true,
  samples: available, unavailable,
};
fs.writeFileSync(path.join(outputDirectory, 'index.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const lines = [
  `# ${demo === 'wonder' ? 'Wonder' : 'Energia'} reference contact sheets`, '',
  'Low-resolution diagnostic frames sampled at every recovered clip boundary and midpoint.',
  'The source reference video is temporary and is not distributed with the project.', '',
  '| page/tile | show time | capture time | reason |',
  '|---|---:|---:|---|',
  ...available.map((sample) =>
    `| ${sample.page} #${sample.tile} | ${sample.showTime.toFixed(3)} | ${sample.captureTime.toFixed(3)} | ${sample.reasons.join(', ')} |`),
];
if (unavailable.length) {
  lines.push('', '## Outside the available capture', '',
    ...unavailable.map((sample) =>
      `- show ${sample.showTime.toFixed(3)}: ${sample.reasons.join(', ')}`));
}
fs.writeFileSync(path.join(outputDirectory, 'INDEX.md'), `${lines.join('\n')}\n`);
console.log(`${demo}: ${available.length} samples across ${Math.ceil(available.length / 16)} pages; ${unavailable.length} outside capture`);
