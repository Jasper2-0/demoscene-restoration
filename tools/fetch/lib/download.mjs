// download.mjs — checksum-verified, idempotent file materialization.
//
// The contract (same one tools/fetch_mashi.sh pioneered for the Mashi binary):
//   * a file that exists and hashes clean is never re-downloaded;
//   * bytes land in <target>.part and are renamed only after the hash checks;
//   * a hash mismatch deletes the .part and throws — a wrong artifact never
//     sits at the recorded path.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export function sha256File(p) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

// Returns { path, sha256, bytes, action: 'kept' | 'downloaded' }.
// opts.sha256: expected hash (null = unpinned, caller may record the result).
export async function materialize(urls, target, { sha256 = null } = {}) {
  if (fs.existsSync(target)) {
    const got = sha256File(target);
    if (sha256 && got !== sha256) {
      throw new Error(`${target}: on-disk sha256 ${got.slice(0, 12)}… does not match pinned ${sha256.slice(0, 12)}…`);
    }
    return { path: target, sha256: got, bytes: fs.statSync(target).size, action: 'kept' };
  }
  const list = Array.isArray(urls) ? urls : [urls];
  let lastErr = null;
  for (const url of list) {
    const part = target + '.part';
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(part));
      const got = sha256File(part);
      if (sha256 && got !== sha256) {
        fs.rmSync(part);
        throw new Error(`${url}: sha256 ${got.slice(0, 12)}… does not match pinned ${sha256.slice(0, 12)}…`);
      }
      fs.renameSync(part, target);
      return { path: target, sha256: got, bytes: fs.statSync(target).size, action: 'downloaded' };
    } catch (e) {
      fs.rmSync(part, { force: true });
      lastErr = e;
      // a hash mismatch is not retried on mirrors — same content expected everywhere
      if (String(e).includes('does not match pinned')) throw e;
    }
  }
  throw lastErr ?? new Error(`no URLs to fetch ${target}`);
}
