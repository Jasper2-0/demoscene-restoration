// issues.mjs — sync a sweep's findings to GitHub Issues.
//
//   node tools/inspect/issues.mjs lapsus              # DRY RUN: what would change
//   node tools/inspect/issues.mjs lapsus --apply      # actually create/update/close
//   node tools/inspect/issues.mjs lapsus --apply --min=major
//
// DRY RUN IS THE DEFAULT, deliberately. A sweep re-runs on every change; an
// issue tracker is public and permanent. Nothing here touches the repo unless
// you ask twice.
//
// IDEMPOTENCY is the whole problem. Filing what the sweep found is trivial;
// filing it a hundred times is the failure mode. Every issue this tool creates
// carries a machine key in its body:
//
//     <!-- sweep-key: lapsus/pehko/structure -->
//
// which is what it matches on afterwards — not the title, which gets edited,
// and not the number, which is not knowable in advance. So the tool can be run
// after every sweep and will:
//
//   * CREATE an issue for a finding that has no open issue,
//   * UPDATE the body of one whose numbers moved (and comment when the move is
//     material, so the thread reads as a history rather than a diff),
//   * CLOSE one whose finding is gone, with the before/after that justifies it.
//
// It will never touch an issue that has no sweep-key, so anything a human
// opened is safe.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fromRepo } from '../harness/index.mjs';

const argv = process.argv.slice(2);
const prodName = argv.find((a) => !a.startsWith('--'));
const has = (f) => argv.includes(`--${f}`);
const val = (n, d) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
if (!prodName) {
  console.error('usage: node tools/inspect/issues.mjs <production> [--apply] [--tag=x] [--min=minor|major|error]');
  process.exit(2);
}
const APPLY = has('apply');
const TAG = val('tag', '');
const SEV_ORDER = { error: 0, major: 1, minor: 2 };
const MIN = val('min', 'minor');
if (!(MIN in SEV_ORDER)) { console.error(`--min must be one of ${Object.keys(SEV_ORDER)}`); process.exit(2); }

const runPath = fromRepo('productions', prodName, 'work/verify/inspect',
  `run${TAG ? `-${TAG}` : ''}.json`);
if (!fs.existsSync(runPath)) {
  console.error(`no sweep results at ${path.relative(fromRepo('.'), runPath)}\n` +
                `  run: node tools/inspect/sweep.mjs ${prodName}`);
  process.exit(2);
}
const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));

const gh = (args, input) => execFileSync('gh', args, {
  encoding: 'utf8', input, maxBuffer: 1 << 26, cwd: fromRepo('.'),
});

// ---- labels. Created on demand so a fresh clone works; colours are only so
// the list reads at a glance.
const LABELS = [
  ['sweep', 'ededed', 'Raised automatically by tools/inspect/sweep.mjs'],
  [`prod:${prodName}`, '1d76db', `Production: ${prodName}`],
  ['sev:error', 'b60205', 'Renderer raised a GL error'],
  ['sev:major', 'd93f0b', 'The picture is wrong, not just the shading'],
  ['sev:minor', 'fbca04', 'Visible deviation from the reference'],
];
function ensureLabels() {
  const existing = new Set(gh(['label', 'list', '--limit', '200', '--json', 'name'])
    .trim() ? JSON.parse(gh(['label', 'list', '--limit', '200', '--json', 'name'])).map((l) => l.name) : []);
  for (const [name, color, desc] of LABELS) {
    if (existing.has(name)) continue;
    if (APPLY) gh(['label', 'create', name, '--color', color, '--description', desc]);
    console.log(`  ${APPLY ? '+' : 'would add'} label ${name}`);
  }
}

const keyOf = (i) => `${run.production}/${i.part}/${i.kind}`;
const KEY_RE = /<!--\s*sweep-key:\s*([^\s]+)\s*-->/;

function bodyFor(issue, part) {
  const worst = run.samples.filter((s) => s.part === issue.part)
    .sort((a, b) => a.r - b.r).slice(0, 3);
  return [
    `<!-- sweep-key: ${keyOf(issue)} -->`,
    '',
    `**${issue.text}**`,
    '',
    `| | |`,
    `|---|---|`,
    `| part | \`${issue.part}\` |`,
    `| samples | ${part?.samples ?? '—'} |`,
    `| median r | ${part ? part.medianR.toFixed(3) : '—'} |`,
    `| median RMSE | ${part ? part.medianRmse.toFixed(1) : '—'} |`,
    `| mean luma | ${part ? `${part.meanOurs} vs reference ${part.meanRef}` : '—'} |`,
    '',
    '### Worst samples',
    '',
    '| local | show time | r | RMSE |',
    '|--:|--:|--:|--:|',
    ...worst.map((s) => `| ${s.local}s | ${s.captureTime}s | ${s.r.toFixed(3)} | ${s.rmse.toFixed(1)} |`),
    '',
    '### Reproduce',
    '',
    '```',
    `node tools/inspect/sweep.mjs ${run.production} --parts=${issue.part}`,
    `node tools/inspect/serve.mjs ${run.production}      # then click ${issue.part} on the timeline`,
    '```',
    '',
    `<sub>swept ${run.when} · step ${run.step}s · against \`${run.capture}\`` +
      `${run.captureSha256 ? ` (sha256 ${run.captureSha256.slice(0, 12)}…)` : ''}</sub>`,
  ].join('\n');
}
// Titles are STABLE — no numbers. The numbers move every sweep, and a title
// that moves with them turns the issue's history into a wall of renames and
// makes it impossible to search for the finding rather than its current value.
const KIND_TITLE = {
  gl: 'raises a GL error while rendering',
  structure: 'renders the wrong picture, not just the wrong shading',
  brightness: 'renders at the wrong brightness',
  unstable: 'score varies widely across the part — suspect timing or a transition',
};
const titleFor = (i) => `${i.part} — ${KIND_TITLE[i.kind] ?? i.kind}`;

// ---- what the sweep says now
const wanted = new Map();
for (const i of run.issues) {
  if (SEV_ORDER[i.sev] > SEV_ORDER[MIN]) continue;
  wanted.set(keyOf(i), i);
}

// ---- what the tracker says now
let open = [];
try {
  open = JSON.parse(gh(['issue', 'list', '--state', 'open', '--label', 'sweep',
    '--limit', '300', '--json', 'number,title,body,labels']));
} catch (e) {
  console.error('gh issue list failed — is `gh auth status` clean?\n' + e.message);
  process.exit(1);
}
const mine = new Map();
for (const it of open) {
  const m = KEY_RE.exec(it.body ?? '');
  if (!m) continue;                       // human-authored: never touched
  if (!m[1].startsWith(`${run.production}/`)) continue;
  mine.set(m[1], it);
}

// ---- diff
const partOf = (name) => run.parts.find((p) => p.name === name);
const plan = { create: [], update: [], close: [] };
for (const [key, issue] of wanted) {
  const ex = mine.get(key);
  if (!ex) plan.create.push({ key, issue });
  else {
    const body = bodyFor(issue, partOf(issue.part));
    if ((ex.body ?? '').trim() !== body.trim()) plan.update.push({ key, issue, ex, body });
  }
}
for (const [key, ex] of mine) if (!wanted.has(key)) plan.close.push({ key, ex });

console.log(`${run.production}: sweep raised ${run.issues.length} issue(s)` +
  `, ${wanted.size} at or above --min=${MIN}; ${mine.size} already tracked\n`);
if (!plan.create.length && !plan.update.length && !plan.close.length) {
  console.log('  tracker is in sync, nothing to do.');
  process.exit(0);
}
ensureLabels();

for (const { issue } of plan.create) console.log(`  ${APPLY ? 'CREATE' : 'would create'}  ${titleFor(issue)}`);
for (const { ex, issue } of plan.update) console.log(`  ${APPLY ? 'UPDATE' : 'would update'}  #${ex.number} ${titleFor(issue)}`);
for (const { ex } of plan.close) console.log(`  ${APPLY ? 'CLOSE ' : 'would close '}  #${ex.number} ${ex.title}`);

if (!APPLY) {
  console.log(`\n  dry run — nothing was changed. Re-run with --apply to sync.`);
  process.exit(0);
}

for (const { issue } of plan.create) {
  const out = gh(['issue', 'create', '--title', titleFor(issue), '--body-file', '-',
    '--label', 'sweep', '--label', `prod:${prodName}`, '--label', `sev:${issue.sev}`],
    bodyFor(issue, partOf(issue.part)));
  console.log(`  created ${out.trim().split('\n').pop()}`);
}
for (const { ex, issue, body } of plan.update) {
  gh(['issue', 'edit', String(ex.number), '--title', titleFor(issue), '--body-file', '-'], body);
  console.log(`  updated #${ex.number}`);
}
for (const { ex } of plan.close) {
  gh(['issue', 'close', String(ex.number), '--comment',
    `No longer raised by the sweep as of ${run.when} (median r ${run.medianR}). ` +
    `Closing automatically; reopen if you disagree — the sweep only measures what it can see.`]);
  console.log(`  closed #${ex.number}`);
}
