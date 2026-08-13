// index.mjs — the facade. A harness should be able to say what it wants to
// look at, not how to stand up a web server and find Chrome.
//
//   import { withPage, assertClean } from '../../../tools/harness/index.mjs';
//
//   await withPage({ root: 'productions/lapsus/web', path: '/index.html' },
//     async ({ page, server, errors, failedRequests }) => {
//       await page.waitForFunction('window.__ready === true');
//       assertClean({ errors, failedRequests }, server);
//     });
//
// Everything is torn down even when the body throws, which the hand-rolled
// harnesses mostly got wrong — a thrown assertion used to leave Chrome and a
// listening socket behind.
export { serve, MIME } from './server.mjs';
export { launch, findChrome } from './browser.mjs';
export { timeGL, warmUp, sampleAgainstAudioClock, shootCanvas, assertClean } from './measure.mjs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './server.mjs';
import { launch } from './browser.mjs';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Resolve a path against the repo root, so callers never compute `../../..`. */
export const fromRepo = (...p) => path.resolve(repoRoot, ...p);

/**
 * Serve `root`, open `path` in headless Chrome, hand both to `body`, and tear
 * everything down afterwards.
 *
 * opts: { root, path='/index.html', query='', width, height, angle, autoplay,
 *         headless, executablePath, viewport, caseExact, extraArgs }
 */
export async function withPage(opts, body) {
  const {
    root, path: pagePath = '/index.html', query = '',
    caseExact = true, viewport, ...launchOpts
  } = opts;
  if (!root) throw new Error('withPage: `root` is required — the server takes a root rather than assuming one');

  const server = await serve(fromRepo(root), { caseExact });
  let session = null;
  try {
    session = await launch(launchOpts);
    const { page, errors, consoleLines, failedRequests } = await session.newPage({ viewport });
    const url = server.url + pagePath + (query ? (query.startsWith('?') ? query : '?' + query) : '');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    return await body({ page, server, errors, consoleLines, failedRequests, url, browser: session.browser });
  } finally {
    await session?.close().catch(() => {});
    await server.close().catch(() => {});
  }
}
