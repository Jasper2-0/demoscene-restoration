// frame.mjs — render one instant and put it beside the reference.
//
//   node tools/inspect/frame.mjs lapsus flu2 5.59
//   node tools/inspect/frame.mjs wonder effect_40c760 1.27 --out=/tmp
//
// score1 answers "how close is it". This answers "what is different", which is
// the question a number cannot. Writes ours, ref and a side-by-side.
//
// Promoted from productions/lapsus/work/verify/ (#29 S4).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fromRepo } from '../harness/index.mjs';
import { withDemo, captureOf, refFrame } from './demo.mjs';
import { scorePair } from './compare.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
const [prodName, part, localArg] = args.filter((a) => !a.startsWith('--'));
const local = parseFloat(localArg);
const extra = args.filter((a) => a.includes('=') && !a.startsWith('--'));
if (!prodName || !part || !Number.isFinite(local)) {
  console.error('usage: node tools/inspect/frame.mjs <production> <part> <local> [k=v ...] [--out=DIR]');
  process.exit(2);
}

const cap = captureOf(prodName);
const outDir = flag('out', fromRepo('productions', prodName, 'work/verify/frames'));
fs.mkdirSync(outDir, { recursive: true });
const tag = extra.length ? '_' + extra.join('_').replace(/[^\w.-]/g, '') : '';
const base = `${part}_t${local}${tag}`;

await withDemo(prodName, extra, async (api) => {
  const t = api.captureTime(part, local);
  const { pngPath, info } = await api.render(part, local);

  const ours = path.join(outDir, `${base}_ours.png`);
  const ref = path.join(outDir, `${base}_ref.png`);
  const sbs = path.join(outDir, `${base}_sbs.png`);
  fs.copyFileSync(pngPath, ours);
  fs.copyFileSync(refFrame(prodName, cap.file, t), ref);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', ours, '-i', ref,
    '-filter_complex', '[0:v][1:v]hstack=inputs=2', sbs]);

  const s = scorePair(ours, ref, api.frameRect);
  console.log(`${prodName}/${part}  local ${local}s   capture ${t.toFixed(3)}s`);
  if (info) console.log('  ' + JSON.stringify(info));
  console.log(`  r ${s.r.toFixed(4)}   RMSE ${s.rmse.toFixed(2)}   luma ${s.meanOurs.toFixed(1)} vs ${s.meanRef.toFixed(1)}`);
  if (s.kind !== 'ok') console.log(`  ${s.kind.toUpperCase()}: ${s.reason}`);
  for (const [k, v] of [['ours', ours], ['ref', ref], ['sbs', sbs]]) {
    console.log(`  ${k.padEnd(4)} ${path.relative(fromRepo('.'), v)}`);
  }
  // A FLAT REFERENCE IS NOT A COMPARISON. Parts running into a truncated
  // capture, or sampled inside a fade, get compared against solid black; the
  // side-by-side then shows our picture against nothing, which reads as a
  // catastrophic mismatch and is really an ABSENT MEASUREMENT.
  if (s.refFlat) {
    console.log(`\n  !! the REFERENCE frame is FLAT — there is no picture at ${t.toFixed(2)}s.` +
      '\n     Any score here is meaningless and the side-by-side will look like a total' +
      '\n     mismatch. Pick a local time inside the capture, or check the offset.');
  }
});
