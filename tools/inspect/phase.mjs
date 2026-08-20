// phase.mjs — is this part at the wrong TIME, or drawing the wrong PICTURE?
//
//   node tools/inspect/phase.mjs lapsus flu2 5.59 0.4 0.1
//   node tools/inspect/phase.mjs wonder effect_40c760 1.27
//
// Scores one rendered frame against reference frames at a range of offsets. A
// real timing error shows a sharp peak away from zero; a wrong picture shows a
// flat scan with no good score anywhere.
//
// Promoted from productions/lapsus/work/verify/ (#29 S4), keeping the two
// verdict rules that file was corrected for twice — both are the difference
// between a diagnosis and a wrong lead.
import { withDemo, captureOf, refFrame } from './demo.mjs';
import { grayOf, corr } from './compare.mjs';

const [prodName, part, localArg, spanArg, stepArg] = process.argv.slice(2)
  .filter((a) => !a.startsWith('--'));
const local = parseFloat(localArg);
const span = parseFloat(spanArg ?? '0.8');
const step = parseFloat(stepArg ?? '0.1');
const extra = process.argv.slice(2).filter((a) => a.includes('=') && !a.startsWith('--'));
if (!prodName || !part || !Number.isFinite(local)) {
  console.error('usage: node tools/inspect/phase.mjs <production> <part> <local> [span=0.8] [step=0.1]');
  process.exit(2);
}

const cap = captureOf(prodName);
await withDemo(prodName, extra, async (api) => {
  const t0 = api.captureTime(part, local);
  const { pngPath } = await api.render(part, local);
  const ours = grayOf(pngPath);

  const rows = [];
  for (let d = -span; d <= span + 1e-9; d += step) {
    const off = +d.toFixed(3), t = t0 + off;
    if (t < 0) continue;
    rows.push({ d: off, t, r: corr(ours, grayOf(refFrame(prodName, cap.file, +t.toFixed(3)))) });
  }

  console.log(`\n  ${prodName}/${part} @${local}s   offset     capture       r`);
  const best = rows.reduce((a, b) => (b.r > a.r ? b : a), rows[0]);
  const atZero = rows.find((x) => Math.abs(x.d) < 1e-9);
  for (const x of rows) {
    console.log(`   ${x.d >= 0 ? '+' : ''}${x.d.toFixed(2)}s   ${x.t.toFixed(2)}s  ${x.r.toFixed(4)}` +
      (x === best ? '  <== best' : ''));
  }
  const sorted = rows.map((x) => x.r).sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1];
  console.log(`\n  aligned r ${atZero ? atZero.r.toFixed(4) : '?'}   best r ${best.r.toFixed(4)} ` +
    `at ${best.d >= 0 ? '+' : ''}${best.d.toFixed(2)}s   scan median ${median.toFixed(4)}`);

  const MARGIN = 0.1;
  if (Math.abs(best.d) < step * 1.5) {
    console.log(atZero.r > 0.75
      ? '\n  -> ALIGNED. The peak is at zero and it is high: on time and matching.'
      : '\n  -> Peak is at zero but low: the timing is right and the picture is wrong.');
  } else if (best.r - atZero.r > MARGIN && best.r >= 0.55) {
    // BOTH CONDITIONS ARE REQUIRED. "Some offset beats zero by 0.1" is satisfied
    // by NOISE whenever nothing matches: lapsus's paleksi scored 0.15-0.33 at
    // every offset across +-1.2s and this printed "OFF BY 0.20s" off a 0.335
    // peak, sending the next step after a clock that was not wrong. A timing
    // offset means the picture is RIGHT somewhere.
    console.log(`\n  -> OFF BY ${best.d.toFixed(2)}s. The peak beats the aligned sample by ` +
      `${(best.r - atZero.r).toFixed(3)} and reaches ${best.r.toFixed(3)}.`);
  } else if (best.r - atZero.r > MARGIN) {
    console.log(`\n  -> NO MATCH ANYWHERE. The best offset only reaches ${best.r.toFixed(3)}, so\n` +
      '     even the nearest-matching instant does not match. NOT a timing offset:\n' +
      '     the part draws a different picture at every time in the scan.');
  } else {
    console.log('\n  -> FLAT. Nothing nearby matches appreciably better than the aligned\n' +
      `     frame (best beats it by ${(best.r - atZero.r).toFixed(3)}), so this is not a\n` +
      '     timing offset — the part draws a different picture.');
  }
});
