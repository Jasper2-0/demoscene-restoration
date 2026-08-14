// server.mjs — the one static file server for every verification harness.
//
// Replaces ~47 hand-rolled `http.createServer` blocks that each carried their
// own MIME table and their own root computation. The monorepo migration had to
// hand-patch the root in every one of them, which is what proved they should
// have been a module.
//
// Two things it does that none of the hand-rolled ones did:
//
//   * CASE-EXACT SERVING. macOS filesystems are case-insensitive, so a page
//     asking for `Textures/Foo.PNG` when the file is `textures/foo.png` works
//     locally and 404s on GitHub Pages. Serving case-exactly makes that class
//     of bug fail here, on the machine where it is cheap to fix. The Wonder
//     build already gates on case-exactness for assets; this extends the same
//     rule to anything a page can fetch.
//   * TRAVERSAL GUARD. `path.join(root, url)` with a `..` in the URL escapes
//     the root. Harmless in a local harness until the day a page requests
//     something surprising and you are debugging why.
//
// It also records every request, so a harness can assert on 404s instead of
// silently rendering a scene with missing textures — the failure mode METHOD.md
// §8 warns about, where the measurement quietly lies.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Union of every MIME table found across the existing harnesses, plus the
// formats the restorations actually ship.
export const MIME = {
  '.html': 'text/html', '.htm': 'text/html',
  '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
  '.tga': 'image/x-tga', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.flac': 'audio/flac',
  '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
  '.md': 'text/markdown', '.txt': 'text/plain', '.sha256': 'text/plain',
  // demoscene payloads: served as octet-stream so the browser never guesses
  '.bin': 'application/octet-stream', '.dat': 'application/octet-stream',
  '.xm': 'application/octet-stream', '.ixa': 'application/octet-stream',
  '.exp': 'application/octet-stream', '.env': 'application/octet-stream',
  '.as1': 'application/octet-stream', '.raw': 'application/octet-stream',
  '.lwo': 'application/octet-stream', '.lws': 'text/plain',
};

// Verify every path component matches the on-disk spelling exactly. Returns
// the corrected name when it differs, or null when it matches.
function caseMismatch(root, rel) {
  let dir = root;
  for (const part of rel.split('/').filter(Boolean)) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch { return null; }
    if (!entries.includes(part)) {
      const hit = entries.find((e) => e.toLowerCase() === part.toLowerCase());
      if (hit) return { asked: part, actual: hit };
      return null;                       // genuinely missing — a normal 404
    }
    dir = path.join(dir, part);
  }
  return null;
}

/**
 * Start a static server rooted at `root`.
 * Returns { url, port, requests, missing, caseErrors, close() }.
 *
 * `requests` records every path served; `missing` every 404; `caseErrors`
 * every request that only resolved because the filesystem is case-insensitive.
 */
/**
 * `routes` lets a caller answer a few paths itself before the static handler
 * sees them — `{ 'POST /_x/thing': async (req, res, body) => … }`. Added so a
 * harness page can talk BACK to the tool that launched it (the inspector files
 * notes this way) without standing up a second server on another origin and
 * then needing CORS to reach it. Handlers own the response; anything they do
 * not claim falls through to the file server unchanged.
 */
export async function serve(root, { spa = false, caseExact = true, routes = null } = {}) {
  const base = path.resolve(root);
  if (!fs.existsSync(base)) throw new Error(`serve: no such root ${base}`);

  const requests = [], missing = [], caseErrors = [];

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const route = routes?.[`${req.method} ${urlPath}`];
    if (route) {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', async () => {
        try {
          const body = Buffer.concat(chunks).toString('utf8');
          await route(req, res, body ? JSON.parse(body) : null);
        } catch (e) {
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: String(e.message ?? e) }));
        }
      });
      return;
    }
    let rel = urlPath.replace(/^\/+/, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    requests.push('/' + rel);

    const file = path.resolve(base, rel);
    // Traversal guard: the resolved path must stay inside the root.
    if (file !== base && !file.startsWith(base + path.sep)) {
      missing.push('/' + rel);
      res.writeHead(403); res.end('outside root'); return;
    }
    if (caseExact) {
      const mm = caseMismatch(base, rel);
      if (mm) {
        caseErrors.push(`/${rel}  (on disk: ${mm.actual}, asked: ${mm.asked})`);
        missing.push('/' + rel);
        res.writeHead(404); res.end('case mismatch'); return;
      }
    }
    let body;
    try {
      body = fs.readFileSync(file);
    } catch {
      if (spa) {
        try { body = fs.readFileSync(path.join(base, 'index.html')); }
        catch { missing.push('/' + rel); res.writeHead(404); res.end('not found'); return; }
      } else {
        missing.push('/' + rel);
        res.writeHead(404); res.end('not found'); return;
      }
    }
    const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    // BYTE RANGES. Without them a media element cannot seek: Chrome will
    // silently refuse to set currentTime beyond what it has streamed, so any
    // harness that jumps to a point in a demo lands back at zero. Everything
    // here is served from memory, so a range is just a slice.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (range) {
      const last = body.length - 1;
      let start = range[1] === '' ? last - Number(range[2]) + 1 : Number(range[1]);
      let end = range[2] === '' || range[1] === '' ? last : Number(range[2]);
      start = Math.max(0, start); end = Math.min(last, end);
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${body.length}` });
        res.end(); return;
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${body.length}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      });
      res.end(body.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return {
    port,
    url: `http://127.0.0.1:${port}`,
    root: base,
    requests, missing, caseErrors,
    close: () => new Promise((r) => server.close(r)),
  };
}
