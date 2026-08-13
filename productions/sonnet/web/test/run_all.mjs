// run_all.mjs — the one-command verification pipeline (invoked by
// work/run-verify.sh; runnable directly).
//
//   node web/test/run_all.mjs [--fast|--full|--bless] [--quality=original]
//
//   --fast   tiers 0-2 (default): static suites, browser suites, oracle
//   --full   adds tier 3: the 354-sample sweep + verdict vs the blessed baseline
//   --bless  tier 3 with a COLD sweep; if everything is green, promotes the
//            result to work/verify/baseline_golden.json
//
// Tiers (fail-fast between tiers, not within):
//   0  static, seconds  timeline / integration / text / meshgen / inventory /
//                       modulegraph --check   (provenance runs REPORT-ONLY —
//                       "a reminder, not a gate", re/CONVENTIONS.md)
//   1  browser          minid3d8 (116 asserts), generate_test (generation
//                       byte-checks + the warm-vs-live equivalence guard)
//   2  oracle           oracle_test (port vs the EMULATED ORIGINAL's fixtures),
//                       stream_trace_test (live build-time LCG boundaries)
//   3  sweep + verdict  sweep.mjs --tag=ci, then verdict.mjs vs the baseline
//
// Every run writes work/verify/report_<stamp>.md.  Guards before tier 3: no other
// sweep may be running, and the port sources must not change mid-run
// (SCENES_7_10.md §14.1 — a concurrent edit contaminated a measurement once).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const MODE = argv.includes('--bless') ? 'bless' : argv.includes('--full') ? 'full' : 'fast';
const QUALITY = (argv.find((a) => a.startsWith('--quality=')) || '--quality=original')
  .split('=')[1];

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const report = [];
const say = (s) => { console.log(s); report.push(s); };

const results = [];
function run(tier, name, cmd, args, { gate = true } = {}) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: WORK, encoding: 'utf8', timeout: 900000 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const out = (r.stdout || '') + (r.stderr || '');
  const passed = r.status === 0;
  results.push({ tier, name, passed, gate, secs, tail: out.trim().split('\n').slice(-3) });
  // On failure keep the FIRST error line (the message — a stack tail alone
  // hides what actually went wrong) plus the tail for context.
  const lines = out.trim().split('\n');
  const firstErr = lines.find((l) => /Error|error:|FAIL/.test(l));
  say(`${passed ? 'PASS' : gate ? 'FAIL' : 'warn'}  [tier ${tier}] ${name} (${secs}s)` +
      (passed ? '' : '\n' + [...(firstErr ? ['        ' + firstErr] : []),
        ...lines.slice(-12).map((l) => '        ' + l)].join('\n')));
  return passed || !gate;
}
const tierOk = (t) => results.filter((r) => r.tier === t && r.gate)
  .every((r) => r.passed);

const NODE = process.execPath;
say(`# Sonnet verification run — ${stamp}  (mode ${MODE}, quality ${QUALITY})`);

// ------------------------------------------------------------------- tier 0
run(0, 'timeline_test', NODE, ['web/test/timeline_test.mjs']);
run(0, 'integration_test', NODE, ['web/test/integration_test.mjs']);
run(0, 'text_test', NODE, ['web/test/text_test.mjs']);
run(0, 'meshgen_test', NODE, ['work/js/meshgen_test.mjs']);
run(0, 'inventory', NODE, ['web/test/inventory.mjs']);
run(0, 'modulegraph --check', NODE, ['web/test/modulegraph.mjs', '--check']);
run(0, 'provenance (report-only)', NODE, ['web/test/provenance.mjs'], { gate: false });
if (!tierOk(0)) { finish(1); }

// ------------------------------------------------------------------- tier 1
run(1, 'minid3d8', NODE,
  ['--experimental-default-type=module', 'web/test/run_minid3d8_test.mjs']);
run(1, 'generate_test (+warm equivalence)', NODE, ['web/test/generate_test.mjs']);
if (!tierOk(1)) { finish(1); }

// ------------------------------------------------------------------- tier 2
run(2, 'oracle_test', NODE, ['web/test/oracle_test.mjs']);
run(2, 'stream_trace_test', NODE, ['web/test/stream_trace_test.mjs']);
if (!tierOk(2)) { finish(1); }

// ------------------------------------------------------------------- tier 3
if (MODE !== 'fast') {
  // guards: no concurrent sweep; record the source state so a mid-run edit is
  // detectable in the report.
  let other = '';
  try { other = execSync('pgrep -f "test/sweep.mjs" || true', { encoding: 'utf8' }).trim(); }
  catch { /* pgrep absent */ }
  if (other) { say(`FAIL  [tier 3] another sweep.mjs is running (pid ${other}) — aborting`); finish(1); }
  const srcState = execSync('ls -lT web/js work/js | shasum', { cwd: WORK, encoding: 'utf8' }).trim();

  const sweepArgs = ['web/test/sweep.mjs', `--quality=${QUALITY}`, '--tag=ci'];
  if (MODE === 'bless') sweepArgs.push('--cold');
  run(3, `sweep${MODE === 'bless' ? ' (cold)' : ''}`, NODE, sweepArgs);

  const srcState2 = execSync('ls -lT web/js work/js | shasum', { cwd: WORK, encoding: 'utf8' }).trim();
  if (srcState !== srcState2) {
    say('FAIL  [tier 3] port sources changed DURING the sweep — numbers untrusted'); finish(1);
  }
  if (!tierOk(3)) finish(1);

  if (MODE === 'bless') {
    const src = path.join(WORK, 'work/verify/results_ci.json');
    const dst = path.join(WORK, 'work/verify/baseline_golden.json');
    const ci = JSON.parse(fs.readFileSync(src));
    if (ci.warm !== 'cold') { say(`FAIL  bless: sweep ran warm (${ci.warm}) — refusing to bless`); finish(1); }
    fs.copyFileSync(src, dst);
    say(`BLESSED  work/verify/baseline_golden.json  (median ${ci.stats.medianRmse ?? ci.stats.median}, ` +
        `samples ${ci.samples}, quality ${ci.quality}, cold)`);
  } else {
    run(3, 'verdict vs baseline', NODE,
      ['web/test/verdict.mjs', 'work/verify/results_ci.json', 'work/verify/baseline_golden.json']);
    if (!tierOk(3)) finish(1);
  }
}

finish(0);

function finish(code) {
  const passed = results.filter((r) => r.passed).length;
  say(`\n${passed}/${results.length} checks passed — ${code === 0 ? 'OK' : 'FAILED'}`);
  const outPath = path.join(WORK, 'work/verify', `report_${stamp}.md`);
  fs.writeFileSync(outPath, report.join('\n') + '\n');
  console.log(`report: ${path.relative(WORK, outPath)}`);
  process.exit(code);
}
