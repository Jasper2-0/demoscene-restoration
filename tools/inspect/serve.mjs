// serve.mjs — open the inspector on a production.
//
//   node tools/inspect/serve.mjs lapsus
//   node tools/inspect/serve.mjs lapsus --tag=after-fix
//
// Serves the REPO ROOT, because the inspector page needs three things that
// live in different trees: itself (tools/inspect/web/), the production's demo
// (productions/<p>/web/), and the sweep's results and cached reference frames
// (productions/<p>/work/verify/inspect/). One root keeps it to one origin, so
// the inspector can reach into the iframe for the adapter.
//
// It also answers three small API routes, which is why this is a server rather
// than "open the file". The page needs to WRITE (notes) and to read things a
// browser cannot (the GitHub tracker, via `gh`).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, fromRepo } from '../harness/index.mjs';
import { addNote, listNotes, outDir } from './notes.mjs';

const argv = process.argv.slice(2);
const prod = argv.find((a) => !a.startsWith('--'));
const tag = (argv.find((a) => a.startsWith('--tag=')) ?? '').slice(6);
if (!prod) {
  const names = fs.readdirSync(fromRepo('productions'), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();
  console.error(`usage: node tools/inspect/serve.mjs <production> [--tag=x]\n` +
                `       productions: ${names.join(', ')}`);
  process.exit(2);
}
if (!fs.existsSync(fromRepo('productions', prod, 'web', 'index.html'))) {
  console.error(`${prod} has no web/index.html`); process.exit(2);
}
const runFile = path.join(outDir(prod), `run${tag ? `-${tag}` : ''}.json`);
if (!fs.existsSync(runFile)) {
  console.warn(`  note: no sweep results yet (${path.basename(runFile)}).\n` +
               `  the inspector still scrubs, just without scores:\n` +
               `    node tools/inspect/sweep.mjs ${prod}\n`);
}

const json = (res, code, obj) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
};

const KEY_RE = /<!--\s*sweep-key:\s*([^\s]+)\s*-->/;
const NOTE_RE = /inspector note ([\w.-]+)/;

/**
 * The tracker, placed in TIME.
 *
 * An issue is only useful on a timeline if it knows where it belongs, and the
 * two kinds know it differently: a sweep issue names a part (so it spans that
 * part's window), while a note names an instant (so it pins there). Resolving
 * that here rather than in the page keeps `gh` — and the guesswork — on one
 * side of the wire.
 */
function trackerInTime() {
  let issues = [];
  try {
    issues = JSON.parse(execFileSync('gh',
      ['issue', 'list', '--state', 'all', '--limit', '300',
       '--json', 'number,title,state,body,labels,url'],
      { encoding: 'utf8', cwd: fromRepo('.'), maxBuffer: 1 << 24 }));
  } catch (e) {
    return { error: String(e.message ?? e).split('\n')[0], issues: [] };
  }
  const run = fs.existsSync(runFile) ? JSON.parse(fs.readFileSync(runFile, 'utf8')) : null;
  const notes = listNotes(prod);
  const partSpan = new Map();
  if (run) {
    for (const s of run.samples) {
      const cur = partSpan.get(s.part) ?? { from: Infinity, to: -Infinity, worst: null };
      cur.from = Math.min(cur.from, s.captureTime);
      cur.to = Math.max(cur.to, s.captureTime);
      if (!cur.worst || s.r < cur.worst.r) cur.worst = s;
      partSpan.set(s.part, cur);
    }
  }

  const out = [];
  for (const it of issues) {
    const labels = (it.labels ?? []).map((l) => l.name);
    if (!labels.includes(`prod:${prod}`)) continue;
    const sev = labels.find((l) => l.startsWith('sev:'))?.slice(4) ?? null;

    const nm = NOTE_RE.exec(it.body ?? '');
    if (nm) {
      const n = notes.find((x) => x.id === nm[1]);
      if (n?.captureTime != null) {
        out.push({ ...pick(it), sev, kind: 'note', part: n.part, at: n.captureTime });
        continue;
      }
    }
    const km = KEY_RE.exec(it.body ?? '');
    if (km) {
      const part = km[1].split('/')[1];
      const sp = partSpan.get(part);
      out.push({ ...pick(it), sev, kind: 'sweep', part,
        from: sp?.from ?? null, to: sp?.to ?? null, at: sp?.worst?.captureTime ?? null });
      continue;
    }
    out.push({ ...pick(it), sev, kind: 'other', part: null });
  }
  return { issues: out };
}
const pick = (it) => ({ number: it.number, title: it.title, state: it.state, url: it.url });

const server = await serve(fromRepo('.'), {
  routes: {
    'POST /_inspect/note': async (req, res, body) => {
      const stored = addNote({ ...body, prod });
      console.log(`  note ${stored.id}  ${stored.part} @ ${stored.local}s` +
        (stored.issue ? `  -> ${stored.issue.url ?? '#' + stored.issue.number}` : '') +
        (stored.issueError ? `  (github: ${stored.issueError})` : ''));
      json(res, 200, stored);
    },
    'GET /_inspect/notes': async (req, res) => json(res, 200, listNotes(prod)),
    'GET /_inspect/issues': async (req, res) => json(res, 200, trackerInTime()),
  },
});

const url = `${server.url}/tools/inspect/web/index.html?prod=${prod}${tag ? `&tag=${tag}` : ''}`;
console.log(`\n  inspector  ->  ${url}\n`);
console.log('  notes go to work/verify/inspect/notes.json; tick "file" to also send to GitHub');
console.log('  ctrl-c to stop\n');
