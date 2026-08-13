// browser.mjs — one headless Chrome launcher, one page instrumentation.
//
// Replaces the `executablePath: '/Applications/Google Chrome.app/...'` literal
// that appears in ~49 harness files and makes the entire verification suite
// machine-specific. Discovery order here: an explicit option, then
// $CHROME_PATH / $PUPPETEER_EXECUTABLE_PATH, then the usual install locations
// per platform. If none exist the error says how to fix it rather than failing
// deep inside puppeteer.
//
// `--use-angle=metal` is kept as the default on macOS because it is what the
// existing harnesses measured against: ANGLE's Metal backend is the real
// target, and a different backend has already produced a bug that reproduced
// in one and not the other (METHOD.md §8 — a headless-vs-GUI disagreement is a
// hypothesis, not a verdict).
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
};

export function findChrome(explicit = null) {
  const tries = [
    explicit,
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    ...(CANDIDATES[process.platform] ?? []),
  ].filter(Boolean);
  for (const p of tries) if (fs.existsSync(p)) return p;
  throw new Error(
    'no Chrome found. Set CHROME_PATH=/path/to/chrome, or install Google Chrome.\n' +
    'tried:\n  ' + tries.join('\n  '));
}

/**
 * Launch headless Chrome with the conventions the restorations verify under.
 * Returns { browser, newPage() }.
 *
 * newPage() returns { page, errors, consoleLines, failedRequests } — the
 * instrumentation every harness was re-implementing. A page that throws or
 * 404s now records it rather than rendering a quietly broken frame.
 */
export async function launch({
  executablePath = null,
  width = 900, height = 760,
  angle = process.platform === 'darwin' ? 'metal' : null,
  autoplay = true,          // most restorations start audio without a gesture
  headless = 'new',
  extraArgs = [],
} = {}) {
  const puppeteer = require('puppeteer-core');
  const args = [
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    ...(angle ? [`--use-angle=${angle}`] : []),
    ...(autoplay ? ['--autoplay-policy=no-user-gesture-required'] : []),
    ...extraArgs,
  ];
  const browser = await puppeteer.launch({
    executablePath: findChrome(executablePath), headless, args,
  });

  const newPage = async ({ viewport = { width, height } } = {}) => {
    const page = await browser.newPage();
    if (viewport) await page.setViewport(viewport);
    const errors = [], consoleLines = [], failedRequests = [];
    page.on('pageerror', (e) => errors.push(String(e.message ?? e)));
    page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text()}`));
    page.on('requestfailed', (r) => failedRequests.push(`FAIL ${r.url()}`));
    page.on('response', (r) => {
      if (r.status() >= 400) failedRequests.push(`HTTP ${r.status()} ${r.url()}`);
    });
    return { page, errors, consoleLines, failedRequests };
  };

  return { browser, newPage, close: () => browser.close() };
}
