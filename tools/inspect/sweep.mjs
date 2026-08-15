// sweep.mjs — walk a production's whole timeline against its reference
// capture, score every sample, and RAISE ISSUES.
//
//   node tools/inspect/sweep.mjs lapsus
//   node tools/inspect/sweep.mjs lapsus --step=1 --tag=after-fix
//   node tools/inspect/sweep.mjs lapsus --parts=flu2,pehko
//   node tools/inspect/sweep.mjs ptct --query=quality=original --tag=original
//
// Generalises sonnet's web/test/sweep.mjs, which did this for one demo with
// its timeline hardcoded. Everything production-specific now lives behind the
// `window.__demo` adapter (tools/inspect/ADAPTER.md), so this file works for
// any port that implements it.
//
// Output goes to <production>/work/verify/inspect/ :
//   run[-TAG].json     every sample, every metric, plus the run's provenance
//   issues[-TAG].md    what is actually wrong, ranked, grouped by part
//   worst[-TAG].png    the twelve worst samples, ours above the reference
//   timeline[-TAG].png score against show time, with part boundaries
//
// WHAT THIS GETS RIGHT, because the sibling projects paid for it:
//
//  1. ONE PAGE, MANY RENDERS. The per-part harness reloaded the page for every
//     frame, which cost seconds each and dominated the runtime. The adapter's
//     render() is callable repeatedly, so a whole sweep is one page load.
//
//  2. RENDER AND READ IN THE SAME EVALUATE. Screenshotting the canvas in a
//     later call is a race: the drawing buffer may already have been cleared
//     by compositing and you get a black or stale frame with NO error. Sonnet
//     measured RMSE 136 where the truth was 26 from exactly this. So the page
//     renders and returns the pixels in one round trip, via toDataURL.
//
//  3. TWO METRICS, NOT ONE. Correlation answers "is this the same picture",
//     RMSE answers "is it the same brightness". They disagree in useful ways:
//     a part that is structurally right but too dark scores well on one and
//     badly on the other, and that difference is a diagnosis rather than a
//     nuisance. Both are reported and issues cite whichever fired.
//
//  4. gl.getError IS AN ISSUE ON ITS OWN. A frame can score beautifully and
//     still have raised INVALID_OPERATION. Pixels are not the only evidence.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, fromRepo } from '../harness/index.mjs';
import { defaultPlan, safePart } from './plan.mjs';
import { W, H, N, grayOf, corr, rmse, meanOf, classify } from './compare.mjs';

const argv = process.argv.slice(2);
const prodName = argv.find((a) => !a.startsWith('--'));
const flag = (n, d) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
if (!prodName) {
  console.error('usage: node tools/inspect/sweep.mjs <production> [--step=2] [--tag=x] [--parts=a,b] [--query=k=v&k=v]');
  process.exit(2);
}
const STEP = Number(flag('step', 2));
const TAG = flag('tag', '');
const ONLY = flag('parts', '') ? flag('parts', '').split(',') : null;
// EXTRA RENDERER PARAMETERS. Every port has authenticity switches the sweep
// could not reach — ?quality=original, ?tess=, ?texscale=, ?lighting= — so
// without this it can only ever score the REMASTER path, while the fidelity
// claim is about the original. Given as `--query=quality=original&tess=1`.
const QUERY = flag('query', '');
const PAGE_QUERY = `?inspect=1${QUERY ? `&${QUERY.replace(/^[?&]/, '')}` : ''}`;
const suffix = TAG ? `-${TAG}` : '';

const PROD = fromRepo('productions', prodName);
const prod = JSON.parse(fs.readFileSync(path.join(PROD, 'prod.json'), 'utf8'));
const cap = prod.captures?.[0];
if (!cap?.path) { console.error(`${prodName}: prod.json has no captures[0].path`); process.exit(2); }
const CAPTURE = fromRepo(cap.path);
if (!fs.existsSync(CAPTURE)) {
  console.error(`no capture at ${CAPTURE}\n  fetch it: node tools/fetch/capture.mjs ${prodName}`);
  process.exit(2);
}

const OUT = path.join(PROD, 'work/verify/inspect');
const FRAMES = path.join(OUT, 'frames');
fs.mkdirSync(FRAMES, { recursive: true });

// Metrics, their flat-frame guard and the LEVEL/STRUCTURE classifier live in
// ./compare.mjs so every tool shares them rather than reimplementing or
// omitting them. See that file for why each guard exists.

// Reference frames are cached: the capture never changes, and re-extracting
// thousands of them dominates a re-run.
function refFrame(t) {
  const f = path.join(FRAMES, `ref_${t.toFixed(3)}.png`);
  if (!fs.existsSync(f)) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', CAPTURE,
      '-frames:v', '1', '-vf', `scale=${W}:${H}`, f]);
  }
  return f;
}

console.log(`sweep ${prodName}  step ${STEP}s${TAG ? `  tag ${TAG}` : ''}`);

const samples = [];
await withPage(
  { root: `productions/${prodName}`, path: '/web/index.html', query: PAGE_QUERY,
    width: W, height: H, viewport: { width: W, height: H } },
  async ({ page, errors }) => {
    // READINESS IS PART OF THE CONTRACT, and this line used to hardcode
    // `window.__lapsusReady` — the FIRST IMPLEMENTER'S PRIVATE FLAG NAME. Any
    // second production that did not happen to pick that name hung here until
    // CDP's protocolTimeout fired, 180s before this wait's own 600s timeout, so
    // the failure surfaced as an unrelated-looking `Runtime.callFunctionOn
    // timed out` deep in puppeteer rather than "this page never became ready".
    // Wonder hit exactly that on its first sweep.
    //
    // Wait on the ADAPTER instead: `__demoReady` when a production wants to
    // signal explicitly after async setup, otherwise the mere existence of
    // window.__demo — which both implementations now assign LAST for this
    // reason. No production name appears in this file.
    await page.waitForFunction(
      'window.__demoReady === true || !!window.__demo',
      { timeout: 600000 });
    const has = await page.evaluate(() => typeof window.__demo === 'object' && !!window.__demo);
    if (!has) throw new Error(
      `${prodName} does not expose window.__demo — see tools/inspect/ADAPTER.md`);

    // THE SAMPLE GRID IS THE SWEEP'S, NOT THE PRODUCTION'S. It used to be
    // copy-pasted into every adapter, which made the five-sample floor — a
    // correctness property — something that could drift silently between ports
    // until two of them disagreed about which part was worst. `plan()` is now an
    // optional override for a genuinely irregular timeline; tools/inspect/
    // plan-identity.mjs asserts the default reproduces what the copies produced.
    const hasOwnPlan = await page.evaluate(() => typeof window.__demo.plan === 'function');
    // The sub-rect of the canvas the page actually draws, if it declares one.
    const FRAME_RECT = await page.evaluate(() => window.__demo.frameRect?.() ?? null);
    if (FRAME_RECT) console.log(`  frameRect ${FRAME_RECT.w}x${FRAME_RECT.h} at ` +
      `${FRAME_RECT.x},${FRAME_RECT.y} — cropping our frames to the drawn band`);

    let plan = hasOwnPlan
      ? await page.evaluate((s) => window.__demo.plan(s), STEP)
      : defaultPlan(await page.evaluate(() => window.__demo.schedule()), STEP);
    if (ONLY) plan = plan.filter((p) => ONLY.includes(p.part));

    // A SAMPLE PAST THE END OF THE CAPTURE HAS NO REFERENCE, AND THAT IS NOT AN
    // ERROR — it is a fact about the recording, and it has to be reported
    // rather than crashed on. Wonder's clip table runs to 195s while its
    // executable exits at 186.5s and the capture is ~187s, so the tail of its
    // schedule simply is not on video. ffmpeg then wrote no PNG, and the score
    // step died on a missing file several hundred renders later — after all the
    // expensive work, with a stack trace that named neither the part nor why.
    //
    // Drop them here, and SAY SO with the range: a silent truncation would read
    // as "the whole timeline was swept" when the end of it never was.
    const durOut = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
      'format=duration', '-of', 'default=nw=1:nk=1', CAPTURE], { encoding: 'utf8' });
    const capDur = Number(durOut.trim());
    if (Number.isFinite(capDur)) {
      const before = plan.length;
      // A frame is only reliably extractable a little before the last one.
      const limit = capDur - 0.05;
      const dropped = plan.filter((p) => p.captureTime > limit);
      plan = plan.filter((p) => p.captureTime <= limit);
      if (dropped.length) {
        const parts = [...new Set(dropped.map((d) => d.part))];
        console.log(`  capture is ${capDur.toFixed(2)}s; DROPPED ${dropped.length}/${before} ` +
          `sample(s) past its end (${dropped[0].captureTime.toFixed(2)}s..` +
          `${dropped[dropped.length - 1].captureTime.toFixed(2)}s) in: ${parts.join(', ')}`);
      }
    }
    console.log(`  ${plan.length} samples across ${new Set(plan.map((p) => p.part)).size} parts`);

    let i = 0;
    for (const s of plan) {
      // Render AND read back in one round trip — see note 2 at the top.
      const dataUrl = await page.evaluate(async (sm) => {
        const info = await window.__demo.render(sm);
        return { png: document.querySelector('canvas').toDataURL('image/png'), info };
      }, s);
      const ours = path.join(FRAMES, `ours${suffix}_${safePart(s.part)}_${s.local}.png`);
      fs.writeFileSync(ours, Buffer.from(dataUrl.png.split(',')[1], 'base64'));
      const a = grayOf(ours, FRAME_RECT), b = grayOf(refFrame(s.captureTime));
      samples.push({
        ...s, ours,
        r: +corr(a, b).toFixed(4),
        rmse: +rmse(a, b).toFixed(2),
        meanOurs: +meanOf(a).toFixed(1), meanRef: +meanOf(b).toFixed(1),
        info: dataUrl.info ?? null,
      });
      if (++i % 10 === 0) process.stdout.write(`\r  rendered ${i}/${plan.length}`);
    }
    process.stdout.write(`\r  rendered ${i}/${plan.length}\n`);
    if (errors.length) console.warn(`  page errors: ${errors.length}`);
  });

// ---- issues. A number is not a finding; a number with a threshold and a
// grouping is. Per-sample noise is real, so single samples must clear a wider
// bar than a part's median does.
const byPart = new Map();
for (const s of samples) {
  if (!byPart.has(s.part)) byPart.set(s.part, []);
  byPart.get(s.part).push(s);
}
const median = (xs) => { const v = [...xs].sort((x, y) => x - y); return v[v.length >> 1]; };

const issues = [];
for (const [part, ss] of byPart) {
  const mr = median(ss.map((s) => s.r));
  const mrm = median(ss.map((s) => s.rmse));
  const mo = median(ss.map((s) => s.meanOurs)), mf = median(ss.map((s) => s.meanRef));
  const gl = ss.filter((s) => s.info?.glError);
  if (gl.length) issues.push({ part, sev: 'error', kind: 'gl',
    text: `raises gl.getError 0x${(gl[0].info.glError).toString(16)} on ${gl.length}/${ss.length} samples` });
  if (mr < 0.55) issues.push({ part, sev: 'major', kind: 'structure',
    text: `median r ${mr.toFixed(3)} — the picture is wrong, not just the shading` });
  else if (mr < 0.75) issues.push({ part, sev: 'minor', kind: 'structure',
    text: `median r ${mr.toFixed(3)}` });
  // Brightness is only worth reporting when the structure is broadly right,
  // otherwise it is a symptom of the structure issue already raised. The
  // LEVEL/STRUCTURE call is the shared classifier's, not a second local copy —
  // it is the same distinction every other tool now reports.
  const cls = classify({ r: mr, meanOurs: mo, meanRef: mf });
  if (mr >= 0.55 && cls.kind === 'level') issues.push({ part, sev: 'minor', kind: 'brightness',
    text: cls.reason });
  // a part whose samples disagree wildly is usually a timing or a transition
  // problem rather than a uniform rendering one
  const spread = Math.max(...ss.map((s) => s.r)) - Math.min(...ss.map((s) => s.r));
  if (spread > 0.45 && ss.length > 2) issues.push({ part, sev: 'minor', kind: 'unstable',
    text: `r ranges ${Math.min(...ss.map((s) => s.r)).toFixed(2)}..${Math.max(...ss.map((s) => s.r)).toFixed(2)} across the part — suspect timing or a transition` });
  byPart.set(part, Object.assign(ss, { mr, mrm, mo, mf }));
}
const SEV = { error: 0, major: 1, minor: 2 };
issues.sort((a, b) => SEV[a.sev] - SEV[b.sev] || a.part.localeCompare(b.part));

const worst = [...samples].sort((a, b) => a.r - b.r).slice(0, 12);
const run = {
  production: prodName, tag: TAG || null, when: new Date().toISOString(),
  step: STEP, capture: cap.path, captureSha256: cap.sha256 ?? null,
  // WHAT WAS ACTUALLY RENDERED. run.json recorded step, capture and sha256 but
  // not the URL, so two runs of the same production down different authenticity
  // paths were indistinguishable after the fact.
  query: PAGE_QUERY,
  medianR: +median(samples.map((s) => s.r)).toFixed(4),
  medianRmse: +median(samples.map((s) => s.rmse)).toFixed(2),
  parts: [...byPart].map(([name, ss]) => ({
    name, samples: ss.length, medianR: +ss.mr.toFixed(4), medianRmse: +ss.mrm.toFixed(2),
    meanOurs: +ss.mo.toFixed(1), meanRef: +ss.mf.toFixed(1),
  })).sort((a, b) => a.medianR - b.medianR),
  issues, samples,
};
fs.writeFileSync(path.join(OUT, `run${suffix}.json`), JSON.stringify(run, null, 2));

// ---- contact sheets: ours above the reference, so a defect is visible rather
// than merely scored.
const pairFor = (s, out) => {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', s.ours, '-i', refFrame(s.captureTime),
    '-filter_complex',
    `[0:v]scale=320:240,drawtext=text='${s.part} ${s.local}s  r=${s.r}':x=4:y=4:fontsize=11:fontcolor=white:box=1:boxcolor=black@0.6[a];` +
    `[1:v]scale=320:240[b];[a][b]vstack`, out]);
};
if (worst.length) {
  const tiles = worst.map((s, i) => {
    const f = path.join(FRAMES, `_worst${i}.png`); pairFor(s, f); return f;
  });
  execFileSync('ffmpeg', ['-v', 'error', '-y',
    ...tiles.flatMap((f) => ['-i', f]),
    '-filter_complex', `${tiles.map((_, i) => `[${i}:v]`).join('')}xstack=inputs=${tiles.length}:layout=` +
      tiles.map((_, i) => `${(i % 4) * 320}_${Math.floor(i / 4) * 480}`).join('|'),
    path.join(OUT, `worst${suffix}.png`)]);
  for (const f of tiles) fs.unlinkSync(f);
}

// ---- timeline plot: score against show time, part boundaries marked.
{
  const PW = Math.max(900, samples.length * 6), PH = 260, PAD = 34;
  const xs = samples.map((s) => s.captureTime);
  const t0 = Math.min(...xs), t1 = Math.max(...xs);
  const X = (t) => PAD + (t - t0) / (t1 - t0 || 1) * (PW - PAD * 2);
  const Y = (r) => PH - PAD - Math.max(0, Math.min(1, r)) * (PH - PAD * 2);
  const seen = new Set();
  const marks = samples.filter((s) => !seen.has(s.part) && seen.add(s.part));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}">
<rect width="100%" height="100%" fill="#111"/>
${[0.25, 0.5, 0.75, 1].map((g) => `<line x1="${PAD}" y1="${Y(g)}" x2="${PW - PAD}" y2="${Y(g)}" stroke="#333"/><text x="4" y="${Y(g) + 4}" fill="#666" font-family="monospace" font-size="10">${g}</text>`).join('')}
${marks.map((s) => `<line x1="${X(s.captureTime)}" y1="${PAD}" x2="${X(s.captureTime)}" y2="${PH - PAD}" stroke="#2a2a2a"/><text x="${X(s.captureTime) + 2}" y="${PAD - 4}" fill="#777" font-family="monospace" font-size="9" transform="rotate(-12 ${X(s.captureTime)} ${PAD - 4})">${s.part}</text>`).join('')}
<polyline fill="none" stroke="#6cf" stroke-width="1.5" points="${samples.map((s) => `${X(s.captureTime).toFixed(1)},${Y(s.r).toFixed(1)}`).join(' ')}"/>
${samples.filter((s) => s.r < 0.55).map((s) => `<circle cx="${X(s.captureTime)}" cy="${Y(s.r)}" r="3" fill="#f55"/>`).join('')}
<text x="${PAD}" y="${PH - 8}" fill="#888" font-family="monospace" font-size="10">${prodName}${TAG ? ` (${TAG})` : ''} — correlation vs show time, red = below 0.55</text>
</svg>`;
  const svgPath = path.join(OUT, `timeline${suffix}.svg`);
  fs.writeFileSync(svgPath, svg);
  // ffmpeg without librsvg cannot rasterise SVG; the .svg is the artefact
  // either way, so a missing .png is not worth a stack trace.
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', svgPath, path.join(OUT, `timeline${suffix}.png`)],
      { stdio: 'ignore' });
  } catch { /* fine */ }
}

// ---- the issue report
const sevMark = { error: '🔴', major: '🟠', minor: '🟡' };
const md = [
  `# ${prodName} — sweep${TAG ? ` (${TAG})` : ''}`,
  '',
  `${run.samples.length} samples, step ${STEP}s, against \`${cap.path}\``,
  `median r **${run.medianR}**, median RMSE **${run.medianRmse}**`,
  '',
  '## Issues',
  '',
  issues.length ? '' : '_none above threshold._',
  ...issues.map((i) => `- ${sevMark[i.sev]} **${i.part}** — ${i.text}`),
  '',
  '## Parts, worst first',
  '',
  '| part | samples | median r | median RMSE | mean ours | mean ref |',
  '|---|--:|--:|--:|--:|--:|',
  ...run.parts.map((p) => `| ${p.name} | ${p.samples} | ${p.medianR.toFixed(3)} | ${p.medianRmse.toFixed(1)} | ${p.meanOurs} | ${p.meanRef} |`),
  '',
  '## Worst samples',
  '',
  '| part | local | capture | r | RMSE |',
  '|---|--:|--:|--:|--:|',
  ...worst.map((s) => `| ${s.part} | ${s.local}s | ${s.captureTime}s | ${s.r.toFixed(3)} | ${s.rmse.toFixed(1)} |`),
  '',
  `_worst${suffix}.png_ shows these twelve, ours above the reference.`,
  '',
].join('\n');
fs.writeFileSync(path.join(OUT, `issues${suffix}.md`), md);

console.log(`\n  median r ${run.medianR}   median RMSE ${run.medianRmse}`);
console.log(`  ${issues.length} issue${issues.length === 1 ? '' : 's'}` +
  (issues.length ? `: ${issues.slice(0, 5).map((i) => `${i.part}/${i.kind}`).join(', ')}${issues.length > 5 ? '…' : ''}` : ''));
console.log(`  -> ${path.relative(fromRepo('.'), OUT)}/issues${suffix}.md`);
