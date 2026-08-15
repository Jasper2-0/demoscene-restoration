// score1.mjs — score ONE instant, with arbitrary renderer query params.
//
//   node tools/inspect/score1.mjs lapsus flu2 5.59
//   node tools/inspect/score1.mjs lapsus flu2 5.59 shinmodel=clamp
//   node tools/inspect/score1.mjs wonder effect_40c760 1.27
//
// The sweep forwards no per-run parameters to an individual sample, so a
// one-variable experiment cannot be run through it — three "different" runs once
// came back byte-identical before that was noticed. This is the knob-turning
// tool, and it is the counterpart of `--query=` on the sweep.
//
// Promoted from productions/lapsus/work/verify/ (#29 S4): it had the lapsus
// schedule compiled in as a literal two-phase part table, so it was useful to
// exactly one production. The schedule now comes from the adapter.
import { withDemo, captureOf, refFrame } from './demo.mjs';
import { scorePair } from './compare.mjs';

const [prodName, part, localArg, ...rest] = process.argv.slice(2);
const local = parseFloat(localArg);
const extra = rest.filter((a) => a.includes('='));
if (!prodName || !part || !Number.isFinite(local)) {
  console.error('usage: node tools/inspect/score1.mjs <production> <part> <local> [k=v ...]');
  process.exit(2);
}

const cap = captureOf(prodName);
await withDemo(prodName, extra, async (api) => {
  const t = api.captureTime(part, local);
  const { pngPath, info } = await api.render(part, local);
  const s = scorePair(pngPath, refFrame(prodName, cap.file, t), api.frameRect);

  console.log(`  ${prodName}/${part} @${local}s  ${extra.join(' ') || '(baseline)'}   capture ${t.toFixed(3)}s`);
  console.log(`    r ${s.r.toFixed(4)}   RMSE ${s.rmse.toFixed(2)}   luma ${s.meanOurs.toFixed(1)} vs ${s.meanRef.toFixed(1)}`);
  // The classification is the diagnosis, not decoration: r is invariant to the
  // affine level change a fade or a missing additive layer makes, so the two
  // metrics together say which KIND of fault this is.
  if (s.kind !== 'ok') console.log(`    ${s.kind.toUpperCase()}: ${s.reason}`);
  if (s.refFlat) console.log('    !! the REFERENCE frame is FLAT — there is no picture at this' +
                             ' instant to compare against, so this score is not a measurement');
  if (info?.glError) console.log(`    !! gl.getError 0x${info.glError.toString(16)}`);
});
