// notes.mjs — turn "this looks wrong" into something an agent can act on.
//
// Backs the inspector's comment box. The value here is NOT the note text — a
// human can type that anywhere. It is that the note arrives with everything
// needed to act on it already attached, gathered from the frame that was on
// screen when it was written:
//
//   * which part, at what local time, against what show time,
//   * the scores there (r, RMSE) and the renderer's own report of the frame
//     (objects, triangles, textured groups, camera, GL error, …),
//   * the geometry and images that part references,
//   * and BOTH FRAMES SAVED TO DISK — ours and the reference — so whoever
//     picks it up can look at what was being described rather than re-deriving
//     the timestamp and re-rendering it.
//
// That last point is the whole reason this exists. A bug report that says
// "morko looks wrong around the middle" costs the next person twenty minutes
// of hunting; the same sentence with part, time, scores and two PNGs attached
// costs nothing.
//
// Notes are appended to work/verify/inspect/notes.json, which is the machine
// -readable queue an agent reads. Filing to GitHub is OPTIONAL and off unless
// the caller asks, because the local note is cheap and reversible and a public
// comment is neither.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fromRepo } from '../harness/index.mjs';
import { safePart } from './plan.mjs';

const KEY_RE = /<!--\s*sweep-key:\s*([^\s]+)\s*-->/;

/** Where a production's inspector artefacts live. */
export const outDir = (prod) => fromRepo('productions', prod, 'work/verify/inspect');

/**
 * Record one observation.
 *
 * @param {object} note  { prod, part, local, captureTime, r, rmse, text,
 *                         info, assets, ourPng (data URL), file (bool) }
 * @returns {object} the stored note, plus `issue` when one was commented on
 */
export function addNote(note) {
  const { prod, part } = note;
  if (!prod || !part || !note.text?.trim()) throw new Error('note needs prod, part and text');
  const dir = outDir(prod);
  const notesDir = path.join(dir, 'notes');
  fs.mkdirSync(notesDir, { recursive: true });

  const id = `${safePart(part)}-${String(note.local ?? 0).replace('.', 'p')}-${Date.now().toString(36)}`;

  // Save the frame that was being described, and the reference beside it. The
  // sweep already cached the reference; ours comes from the canvas as a data
  // URL because re-rendering later is not guaranteed to reproduce it (feedback
  // parts and the shared rand stream both depend on how you got there).
  const shots = {};
  if (note.ourPng?.startsWith('data:image/png;base64,')) {
    const f = path.join(notesDir, `${id}_ours.png`);
    fs.writeFileSync(f, Buffer.from(note.ourPng.split(',')[1], 'base64'));
    shots.ours = path.relative(fromRepo('.'), f);
  }
  if (note.captureTime != null) {
    const ref = path.join(dir, 'frames', `ref_${Number(note.captureTime).toFixed(3)}.png`);
    if (fs.existsSync(ref)) {
      const f = path.join(notesDir, `${id}_ref.png`);
      fs.copyFileSync(ref, f);
      shots.reference = path.relative(fromRepo('.'), f);
    }
  }

  const stored = {
    id, when: new Date().toISOString(), status: 'open',
    production: prod, part, local: note.local ?? null, captureTime: note.captureTime ?? null,
    r: note.r ?? null, rmse: note.rmse ?? null,
    text: note.text.trim(),
    info: note.info ?? null, assets: note.assets ?? null,
    shots,
  };

  const file = path.join(dir, 'notes.json');
  const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  // A double-click on `record` should not become two findings. Same part,
  // same instant, same words is the same observation.
  const dup = all.find((n) => n.part === stored.part && n.local === stored.local &&
                              n.text === stored.text);
  if (dup) return dup;

  // FILE FIRST, THEN PERSIST. Writing notes.json before filing loses the issue
  // number — the note is returned to the browser with it, but what lands on
  // disk has no `issue`, so a later `--notes` pass sees an unfiled note and
  // files it again. That produced four duplicate issues (#18-#21) before it
  // was spotted.
  if (note.file) {
    try { stored.issue = fileToGitHub(stored); }
    catch (e) { stored.issueError = String(e.message ?? e); }
  }
  all.push(stored);
  fs.writeFileSync(file, JSON.stringify(all, null, 2));
  return stored;
}

const gh = (args, input) => execFileSync('gh', args,
  { encoding: 'utf8', input, maxBuffer: 1 << 24, cwd: fromRepo('.') });

/** Comment on the part's open sweep issue, or open one if it has none. */
function fileToGitHub(n) {
  const body = [
    `**Observed in the inspector** — ${n.part} at local ${n.local}s (show ${n.captureTime}s)`,
    '',
    `> ${n.text.split('\n').join('\n> ')}`,
    '',
    n.r != null ? `Scores there: r ${n.r}, RMSE ${n.rmse}.` : '',
    n.info ? '\n<details><summary>frame</summary>\n\n```json\n' +
      JSON.stringify(n.info, null, 2) + '\n```\n</details>' : '',
    n.assets?.length ? '\n<details><summary>resources</summary>\n\n' +
      n.assets.map((a) => `- \`${a}\``).join('\n') + '\n</details>' : '',
    Object.keys(n.shots).length
      ? `\nFrames saved locally: ${Object.entries(n.shots).map(([k, v]) => `\`${v}\` (${k})`).join(', ')}`
      : '',
    '',
    '```',
    `node tools/inspect/serve.mjs ${n.production}   # then click ${n.part} on the timeline`,
    '```',
    `<sub>inspector note ${n.id}</sub>`,
  ].filter(Boolean).join('\n');

  const open = JSON.parse(gh(['issue', 'list', '--state', 'open', '--label', 'sweep',
    '--limit', '300', '--json', 'number,body']));
  const hit = open.find((it) => {
    const m = KEY_RE.exec(it.body ?? '');
    return m && m[1].startsWith(`${n.production}/${n.part}/`);
  });

  if (hit) {
    gh(['issue', 'comment', String(hit.number), '--body-file', '-'], body);
    return { number: hit.number, action: 'comment' };
  }
  // No sweep issue for this part — the observation is still real, so open one.
  // Marked `observed` rather than `sweep` so the sweep's own sync never treats
  // it as one of its findings and closes it from under you.
  // `gh label create` prints to stderr when the label exists, which is noise
  // rather than an error; check first instead.
  //
  // BOTH labels, not just `observed`. This guard used to cover `observed`
  // alone while the create call below passed `prod:<production>` as well, so
  // the first note filed for any production that had never been labelled died
  // with `could not add label: 'prod:sonnet' not found` — losing the trip to
  // the tracker even though the note itself was already stored. "Never block
  // filing on them" was the stated intent and the next line broke it.
  const wantLabels = [
    ['observed', '5319e7', 'Reported from the inspector by a human'],
    [`prod:${n.production}`, '1d76db', `Production: ${n.production}`],
  ];
  try {
    const have = JSON.parse(gh(['label', 'list', '--limit', '200', '--json', 'name']))
      .map((l) => l.name);
    for (const [name, color, description] of wantLabels) {
      if (!have.includes(name)) {
        gh(['label', 'create', name, '--color', color, '--description', description]);
      }
    }
  } catch { /* labels are cosmetic; never block filing on them */ }
  const out = gh(['issue', 'create', '--title', `${n.part} — ${n.text.split('\n')[0].slice(0, 70)}`,
    '--body-file', '-', '--label', 'observed', '--label', `prod:${n.production}`], body);
  const url = out.trim().split('\n').pop();
  return { url, action: 'create' };
}

/** Overwrite the stored notes (used when filing or resolving them). */
export function writeNotes(prod, notes) {
  fs.writeFileSync(path.join(outDir(prod), 'notes.json'), JSON.stringify(notes, null, 2));
}

/** File one already-stored note, and hand back what the tracker did. */
export function fileNote(note) { return fileToGitHub(note); }

/** Notes for a production, newest first. */
export function listNotes(prod) {
  const file = path.join(outDir(prod), 'notes.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).reverse();
}
