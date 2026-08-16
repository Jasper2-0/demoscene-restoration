// capture.mjs — materialize reference captures from prod.json.
//
//   node tools/fetch/capture.mjs <slug>              # fetch/verify captures[]
//   node tools/fetch/capture.mjs <slug> --record     # pin hash of an existing file
//   node tools/fetch/capture.mjs <slug> --allow-new  # accept a hash mismatch (re-record)
//
// Captures are verification ground truth (METHOD.md §7): the port is aligned to
// them by audio cross-correlation, so alignmentOffsetMs in the manifest is as
// much a part of the record as the video itself. They are recorded, never
// distributed — work/reference/ is gitignored and this tool is the rehydration
// path. The sha256 pins OUR capture: yt-dlp output varies with format
// availability, so a mismatch on refetch is a warning that the ground truth
// changed, not routine noise — hence --allow-new instead of silent acceptance.
//
// TWO SOURCE KINDS. `captures[].youtube` goes through yt-dlp, which re-encodes
// and is why the hash has to be pinned per-fetch. `captures[].url` is a direct
// download of a file somebody already encoded — the bytes are stable, so its
// hash is a real identity rather than a record of what yt-dlp happened to pick,
// and it is the better ground truth when one exists.
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readProd, writeProd, repoRoot } from './lib/prod.mjs';
import { sha256File } from './lib/download.mjs';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const record = args.includes('--record');
const allowNew = args.includes('--allow-new');
if (!slug) { console.error('usage: node tools/fetch/capture.mjs <slug> [--record] [--allow-new]'); process.exit(2); }

const prod = readProd(slug);
if (!prod?.captures?.length) { console.log(`${slug}: no captures[] entries`); process.exit(0); }

// Only require yt-dlp if something actually needs it.
if (prod.captures.some((c) => c.youtube)) {
  try { execFileSync('yt-dlp', ['--version'], { stdio: 'pipe' }); }
  catch { console.error('yt-dlp not found — brew install yt-dlp'); process.exit(1); }
}

let dirty = false, failures = 0;
for (const cap of prod.captures) {
  const target = path.join(repoRoot, cap.path);
  if (fs.existsSync(target)) {
    const got = sha256File(target);
    if (!cap.sha256) {
      if (record) { cap.sha256 = got; dirty = true; console.log(`${slug}: recorded ${cap.path}  ${got.slice(0, 12)}…`); }
      else console.log(`${slug}: present (unpinned — use --record) ${cap.path}`);
    } else if (got === cap.sha256) {
      console.log(`${slug}: verified ${cap.path}`);
    } else if (allowNew) {
      cap.sha256 = got; dirty = true;
      console.log(`${slug}: RE-PINNED ${cap.path} — ground truth changed, re-check alignmentOffsetMs`);
    } else {
      failures++;
      console.error(`${slug}: MISMATCH ${cap.path} — this is not the capture the port was verified against (--allow-new to accept)`);
    }
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const source = cap.youtube ? cap.youtube : cap.url;
  if (!source) {
    failures++;
    console.error(`${slug}: captures[] entry has neither .youtube nor .url`);
    continue;
  }
  console.log(`${slug}: fetching ${source} → ${cap.path}`);
  try {
    if (cap.youtube) {
      execFileSync('yt-dlp',
        ['-f', cap.format || 'bestvideo+bestaudio', '--merge-output-format', 'mkv',
         '-o', target, `https://www.youtube.com/watch?v=${cap.youtube}`],
        { stdio: 'inherit' });
    } else {
      // -L follows redirects, -f fails loudly on 4xx/5xx rather than writing an
      // error page to disk and calling it a capture.
      execFileSync('curl', ['-fL', '--retry', '3', '-o', target, cap.url],
        { stdio: 'inherit' });
    }
    const got = sha256File(target);
    if (cap.sha256 && got !== cap.sha256 && !allowNew) {
      failures++;
      console.error(`${slug}: fetched, but hash differs from the pinned capture (--allow-new to accept)`);
    } else if (!cap.sha256 || allowNew) {
      cap.sha256 = got; dirty = true;
      console.log(`${slug}: pinned ${got.slice(0, 12)}… — set alignmentOffsetMs after cross-correlating`);
    }
  } catch (e) {
    failures++;
    console.error(`${slug}: fetch failed for ${source}: ${e.message ?? e}`);
  }
}
if (dirty) writeProd(prod);
process.exit(failures ? 1 : 0);
