import { envelopeTimes, parseEnvelope } from './shared/envelope.js';
import { parseExp } from './shared/exp.js';
import { metadataForWonderClip } from './inspector-data.js';
import { buildXmOrderTimeline, locateXmOrder, parseXmOrderTable } from './order-timeline.js';
import { WONDER_EFFECT_CLIPS, WONDER_SHOW_END } from './show-data.js';

const TERMINAL_ORDER = 21;
const TERMINAL_ROW = 63;
const LABEL_WIDTH = 226;
const HOT_RELOAD_INTERVAL_MS = 1500;
const MODULE_IMPORT = /\b(?:import|export)\s+(?:[^\"'`;]*?\s+from\s+)?[\"']([^\"']+)[\"']/g;

const dom = {
  activeElements: document.querySelector('#active-elements'),
  activeSummary: document.querySelector('#active-summary'),
  copyLink: document.querySelector('#copy-link'),
  hotReload: document.querySelector('#hot-reload'),
  hotReloadStatus: document.querySelector('#hot-reload-status'),
  nextOrder: document.querySelector('#next-order'),
  notice: document.querySelector('#notice'),
  orderReadout: document.querySelector('#order-readout'),
  play: document.querySelector('#play'),
  preview: document.querySelector('#preview'),
  previewStatus: document.querySelector('#preview-status'),
  reloadPreview: document.querySelector('#reload-preview'),
  previousOrder: document.querySelector('#previous-order'),
  scrubber: document.querySelector('#scrubber'),
  secondsReadout: document.querySelector('#seconds-readout'),
  time: document.querySelector('#time'),
  timelineContent: document.querySelector('#timeline-content'),
  timelineScroll: document.querySelector('#timeline-scroll'),
  zoom: document.querySelector('#zoom'),
};

const state = {
  model: null,
  xm: null,
  seconds: 0,
  pxPerSecond: Number(dom.zoom.value),
  playing: false,
  previousFrameTime: 0,
  previewReady: false,
  selectedEffect: null,
  sceneDependencies: new Map(),
  bars: new Map(),
  orderBlocks: new Map(),
  cursor: null,
  activeKey: '',
  lastDetailUpdate: 0,
  previewGeneration: 0,
  previewReloading: false,
  previewWatchUrls: [],
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function load(url, type) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
  return type === 'text' ? response.text() : response.arrayBuffer();
}

function assetKind(name, usage) {
  if (usage === 'loaded') return 'loaded';
  if (/\.exp$/i.test(name)) return 'scene';
  if (/\.env$/i.test(name)) return 'control';
  return 'texture';
}

function assetChip(name, usage) {
  const chip = element('a', `asset-chip ${assetKind(name, usage)}`, name);
  chip.href = `./assets/${encodeURIComponent(name)}`;
  chip.target = '_blank';
  chip.rel = 'noreferrer';
  chip.title = `${usage === 'loaded' ? 'Loaded but not drawn' : 'Open original asset'}: ${name}`;
  return chip;
}

async function loadSceneDependencies() {
  const sceneNames = [...new Set(WONDER_EFFECT_CLIPS.flatMap((clip) =>
    clip.data.assets.filter((name) => /\.exp$/i.test(name))))];
  const entries = await Promise.all(sceneNames.map(async (name) => {
    try {
      const scene = parseExp(await load(`./assets/${encodeURIComponent(name)}`, 'bytes'), {
        variant: 'wonder',
        source: name,
      });
      const maps = [...new Set(scene.materials.flatMap((material) =>
        material.textureNames ?? []).filter(Boolean))];
      return [name, Object.freeze({ maps: Object.freeze(maps), error: null })];
    } catch (error) {
      return [name, Object.freeze({ maps: Object.freeze([]), error: error.message })];
    }
  }));
  return new Map(entries);
}

function hueForLayer(layer) {
  return (185 + layer * 29) % 360;
}

function graphX(seconds) {
  return LABEL_WIDTH + seconds * state.pxPerSecond;
}

function secondsAtPointer(event) {
  const bounds = dom.timelineContent.getBoundingClientRect();
  const contentX = event.clientX - bounds.left;
  return Math.max(0, Math.min(WONDER_SHOW_END,
    (contentX - LABEL_WIDTH) / state.pxPerSecond));
}

function setPosition(node, start, end) {
  node.style.left = `${graphX(start)}px`;
  node.style.width = `${Math.max(1, (end - start) * state.pxPerSecond)}px`;
}

function buildTimelineView() {
  dom.timelineContent.replaceChildren();
  state.bars.clear();
  state.orderBlocks.clear();
  dom.timelineContent.style.width = `${LABEL_WIDTH + WONDER_SHOW_END * state.pxPerSecond}px`;
  dom.timelineContent.style.height = `${58 + WONDER_EFFECT_CLIPS.length * 38}px`;

  const axis = element('div', 'order-axis');
  axis.append(element('div', 'axis-title', 'XM order / pattern'));
  for (const segment of state.model.segments) {
    const block = element('div', `order-block${segment.terminal ? ' terminal' : ''}`);
    block.dataset.order = segment.order;
    setPosition(block, segment.start, segment.end);
    const title = element('strong', '', `O${String(segment.order).padStart(2, '0')} · P${String(segment.pattern).padStart(2, '0')}`);
    const time = element('span', '', `${segment.start.toFixed(3)}s`);
    if ((segment.end - segment.start) * state.pxPerSecond < 28) {
      block.classList.add('sliver');
      block.append(element('strong', '', String(segment.order)));
    } else {
      block.append(title, time);
    }
    if (segment.terminal) block.title = `Order ${segment.order}, pattern ${segment.pattern}; F00 at row ${segment.terminalRow}`;
    axis.append(block);
    state.orderBlocks.set(segment.order, block);
  }
  dom.timelineContent.append(axis);

  for (const clip of WONDER_EFFECT_CLIPS) {
    const metadata = metadataForWonderClip(clip);
    const lane = element('div', 'effect-lane');
    lane.style.setProperty('--hue', hueForLayer(clip.layer));
    lane.dataset.effect = clip.id;
    const label = element('div', 'lane-label');
    const color = element('i', 'lane-color');
    const copy = element('div', 'lane-copy');
    copy.append(element('div', 'lane-name', metadata.name), element('div', 'lane-id', `${clip.id} · layer ${clip.layer}`));
    label.append(color, copy);
    label.addEventListener('click', (event) => {
      event.stopPropagation();
      state.selectedEffect = clip.id;
      updateTime(Math.min(clip.start + 0.001, WONDER_SHOW_END), { reveal: true, forceDetails: true });
    });

    const visibleEnd = Math.min(clip.end, WONDER_SHOW_END);
    const bar = element('button', 'clip-bar', metadata.name);
    bar.type = 'button';
    bar.style.setProperty('--hue', hueForLayer(clip.layer));
    setPosition(bar, clip.start, visibleEnd);
    bar.title = `${metadata.name}: ${clip.start.toFixed(3)}–${clip.end.toFixed(3)} s${clip.end > WONDER_SHOW_END ? ' (cut by release exit)' : ''}`;
    bar.addEventListener('click', (event) => {
      event.stopPropagation();
      state.selectedEffect = clip.id;
      updateTime(secondsAtPointer(event), { forceDetails: true });
    });
    lane.append(label, bar);
    dom.timelineContent.append(lane);
    state.bars.set(clip.id, bar);
  }

  for (const segment of state.model.segments) {
    const line = element('div', 'grid-line');
    line.style.left = `${graphX(segment.start)}px`;
    dom.timelineContent.append(line);
  }
  const endLine = element('div', 'grid-line');
  endLine.style.left = `${graphX(WONDER_SHOW_END)}px`;
  dom.timelineContent.append(endLine);

  for (const ghost of state.model.unreachable) {
    const marker = element('div', 'ghost-order');
    marker.style.left = `${graphX(ghost.nominalStart)}px`;
    marker.title = `Order ${ghost.order}, pattern ${ghost.pattern} is in the XM table but F00 prevents it from playing`;
    marker.append(element('span', '', `O${ghost.order}/P${ghost.pattern} unreached`));
    dom.timelineContent.append(marker);
  }

  state.cursor = element('div', 'timeline-cursor');
  dom.timelineContent.append(state.cursor);
}

function momentLabel(seconds) {
  const located = locateXmOrder(state.model, seconds);
  return `O${String(located.order).padStart(2, '0')}/P${String(located.pattern).padStart(2, '0')}`;
}

function appendPart(card, part) {
  const wrapper = element('div', 'asset-part');
  const heading = element('div', 'part-name');
  heading.append(element('span', `usage ${part.usage}`, part.usage === 'loaded' ? 'loaded only' : part.usage), document.createTextNode(part.name));
  const assets = element('div', 'asset-list');
  for (const name of part.assets) {
    assets.append(assetChip(name, part.usage));
    if (/\.exp$/i.test(name)) {
      const dependency = state.sceneDependencies.get(name);
      if (dependency?.maps.length) {
        const materialMaps = element('div', 'material-maps');
        materialMaps.append(element('div', 'part-name', '↳ material maps used by this scene'));
        const mapList = element('div', 'asset-list');
        for (const map of dependency.maps) mapList.append(assetChip(map, part.usage === 'loaded' ? 'loaded' : 'texture'));
        materialMaps.append(mapList);
        wrapper.append(materialMaps);
      } else if (dependency?.error) {
        wrapper.append(element('div', 'element-meta', `Could not inspect scene maps: ${dependency.error}`));
      }
    }
  }
  wrapper.prepend(heading, assets);
  card.append(wrapper);
}

function renderActiveElements(active) {
  dom.activeElements.replaceChildren();
  dom.activeSummary.textContent = active.length
    ? `${active.length} compiled element${active.length === 1 ? '' : 's'} contributing at this frame; top render layer first.`
    : 'No compiled effect is active at this frame.';
  if (!active.length) {
    dom.activeElements.append(element('div', 'empty-state', 'No active elements'));
    return;
  }

  for (const clip of [...active].sort((a, b) => b.layer - a.layer)) {
    const metadata = metadataForWonderClip(clip);
    const card = element('article', `element-card${state.selectedEffect === clip.id ? ' selected' : ''}`);
    card.style.setProperty('--hue', hueForLayer(clip.layer));
    const heading = element('div', 'element-heading');
    heading.append(element('h3', '', metadata.name));
    const jump = element('button', '', `layer ${clip.layer}`);
    jump.type = 'button';
    jump.title = 'Select this element lane';
    jump.addEventListener('click', () => {
      state.selectedEffect = clip.id;
      updateTime(state.seconds, { revealEffect: clip.id, forceDetails: true });
    });
    heading.append(jump);
    const local = state.seconds - clip.start;
    const intervalEnd = Math.min(clip.end, WONDER_SHOW_END);
    const cut = clip.end > WONDER_SHOW_END ? ` · scheduled end ${clip.end.toFixed(3)}s, release cut ${WONDER_SHOW_END.toFixed(3)}s` : '';
    card.append(
      heading,
      element('div', 'element-meta', `${clip.id} · local ${local.toFixed(3)}s · ${clip.start.toFixed(3)}–${intervalEnd.toFixed(3)}s · ${momentLabel(clip.start)} → ${momentLabel(intervalEnd)}${cut}`),
      element('p', 'element-description', metadata.description),
    );
    for (const part of metadata.parts) appendPart(card, part);
    dom.activeElements.append(card);
  }
}

function updatePreview() {
  if (!state.previewReady) return;
  try {
    const result = dom.preview.contentWindow.__wonderRenderAt(state.seconds);
    dom.previewStatus.textContent = `${result.active.length} active renderer${result.active.length === 1 ? '' : 's'} · frame ${result.frame.toFixed(2)}`;
  } catch (error) {
    state.previewReady = false;
    dom.previewStatus.textContent = `preview error: ${error.message}`;
  }
}

function sourceUrl(relative) {
  const url = new URL(relative, location.href);
  url.search = '';
  url.hash = '';
  return url.href;
}

function sourceHash(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${text.length}:${hash >>> 0}`;
}

function moduleImports(source, baseUrl) {
  const imports = [];
  MODULE_IMPORT.lastIndex = 0;
  for (let match = MODULE_IMPORT.exec(source); match; match = MODULE_IMPORT.exec(source)) {
    const specifier = match[1];
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) continue;
    const url = new URL(specifier, baseUrl);
    if (url.origin === location.origin && url.pathname.endsWith('.js')) imports.push(url.href);
  }
  return imports;
}

async function fetchWatchedSource(url, requestCache) {
  const response = await fetch(url, { cache: requestCache });
  if (!response.ok) throw new Error(`${new URL(url).pathname}: HTTP ${response.status}`);
  return response.text();
}

async function sourceGraph(roots, fetchCache) {
  const files = new Map();
  const pending = roots.map(sourceUrl);
  const queued = new Set(pending);
  while (pending.length) {
    const batch = pending.splice(0);
    const loaded = await Promise.all(batch.map(async (url) => ({
      url,
      source: await fetchWatchedSource(url, fetchCache),
    })));
    for (const { url, source } of loaded) {
      files.set(url, sourceHash(source));
      if (!new URL(url).pathname.endsWith('.js')) continue;
      for (const imported of moduleImports(source, url)) {
        if (queued.has(imported)) continue;
        queued.add(imported);
        pending.push(imported);
      }
    }
  }
  return files;
}

function changedSources(previous, current) {
  if (!previous) return [];
  const urls = new Set([...previous.keys(), ...current.keys()]);
  return [...urls].filter((url) => previous.get(url) !== current.get(url));
}

function setHotReloadStatus(message, mode = '') {
  dom.hotReloadStatus.textContent = message;
  const label = dom.hotReload.closest('.hot-reload-toggle');
  label.classList.toggle('watching', mode === 'watching');
  label.classList.toggle('reloading', mode === 'reloading');
}

async function warmSourceCache(urls) {
  await Promise.all(urls.map(async (url) => {
    try {
      await fetchWatchedSource(url, 'reload');
    } catch {
      // A deleted module should still trigger the reload and expose its real
      // import error in the fresh renderer.
    }
  }));
}

function reloadInspector() {
  const url = new URL(location.href);
  url.searchParams.set('t', state.seconds.toFixed(3));
  url.searchParams.set('hot', String(Date.now()));
  location.replace(url);
}

async function reloadRenderer({ changed = [], manual = false } = {}) {
  if (state.previewReloading) return;
  state.previewReloading = true;
  dom.reloadPreview.disabled = true;
  setHotReloadStatus(manual ? 'reloading renderer…' : `${changed.length} source file${changed.length === 1 ? '' : 's'} changed…`, 'reloading');
  const refreshUrls = changed.length ? changed : state.previewWatchUrls;
  if (refreshUrls.length) await warmSourceCache(refreshUrls);
  const generation = ++state.previewGeneration;
  state.previewReady = false;
  dom.previewStatus.textContent = `reloading at ${state.seconds.toFixed(3)}s…`;
  const url = new URL('./', location.href);
  url.searchParams.set('t', state.seconds.toFixed(3));
  url.searchParams.set('debug', '');
  url.searchParams.set('embedded', '');
  url.searchParams.set('hot', String(Date.now()));
  dom.preview.addEventListener('load', () => awaitPreview(generation), { once: true });
  dom.preview.src = url.href;
}

async function startHotReload() {
  const previewRoots = ['./js/main.js', './index.html'];
  const inspectorRoots = ['./js/timeline-inspector.js', './timeline.css', './timeline.html'];
  let previewSnapshot;
  let inspectorSnapshot;
  try {
    [previewSnapshot, inspectorSnapshot] = await Promise.all([
      sourceGraph(previewRoots, 'no-store'),
      sourceGraph(inspectorRoots, 'no-store'),
    ]);
    state.previewWatchUrls = [...previewSnapshot.keys()];
    setHotReloadStatus(`watching ${new Set([...previewSnapshot.keys(), ...inspectorSnapshot.keys()]).size} files`, 'watching');
  } catch (error) {
    setHotReloadStatus(`watch error: ${error.message}`);
  }

  const poll = async () => {
    if (dom.hotReload.checked && !state.previewReloading) {
      try {
        const [nextPreview, nextInspector] = await Promise.all([
          sourceGraph(previewRoots, 'no-store'),
          sourceGraph(inspectorRoots, 'no-store'),
        ]);
        const inspectorChanges = changedSources(inspectorSnapshot, nextInspector);
        const previewChanges = changedSources(previewSnapshot, nextPreview);
        inspectorSnapshot = nextInspector;
        previewSnapshot = nextPreview;
        state.previewWatchUrls = [...nextPreview.keys()];
        if (inspectorChanges.length) {
          setHotReloadStatus('viewer source changed…', 'reloading');
          await warmSourceCache(inspectorChanges);
          reloadInspector();
          return;
        }
        if (previewChanges.length) await reloadRenderer({ changed: previewChanges });
        else setHotReloadStatus(`watching ${new Set([...nextPreview.keys(), ...nextInspector.keys()]).size} files`, 'watching');
      } catch (error) {
        setHotReloadStatus(`watch error: ${error.message}`);
      }
    } else if (!dom.hotReload.checked) {
      setHotReloadStatus('hot reload off');
    }
    setTimeout(poll, HOT_RELOAD_INTERVAL_MS);
  };
  setTimeout(poll, HOT_RELOAD_INTERVAL_MS);
}

function revealCursor() {
  const cursorX = graphX(state.seconds);
  const left = dom.timelineScroll.scrollLeft + LABEL_WIDTH + 30;
  const right = dom.timelineScroll.scrollLeft + dom.timelineScroll.clientWidth - 40;
  if (cursorX < left) dom.timelineScroll.scrollLeft = Math.max(0, cursorX - LABEL_WIDTH - 40);
  else if (cursorX > right) dom.timelineScroll.scrollLeft = cursorX - dom.timelineScroll.clientWidth + 80;
}

function revealEffect(effectId) {
  const lane = dom.timelineContent.querySelector(`[data-effect="${effectId}"]`);
  lane?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function updateTime(requestedSeconds, options = {}) {
  state.seconds = Math.max(0, Math.min(Number(requestedSeconds) || 0, WONDER_SHOW_END));
  const located = locateXmOrder(state.model, state.seconds);
  dom.time.value = state.seconds.toFixed(3);
  dom.scrubber.value = String(state.seconds);
  dom.secondsReadout.textContent = `${state.seconds.toFixed(3)} s`;
  const row = located.held
    ? `row ${located.row} · F00 hold`
    : `≈ row ${located.row}${located.terminal && located.row === located.terminalRow ? ' · F00' : ''}`;
  dom.orderReadout.textContent = `order ${String(located.order).padStart(2, '0')} · pattern ${String(located.pattern).padStart(2, '0')} · ${row} · ${state.seconds.toFixed(3)} s`;
  state.cursor.style.left = `${graphX(state.seconds)}px`;

  const active = WONDER_EFFECT_CLIPS.filter((clip) =>
    state.seconds >= clip.start && state.seconds < clip.end);
  for (const [id, bar] of state.bars) {
    bar.classList.toggle('active', active.some((clip) => clip.id === id));
    bar.classList.toggle('selected', id === state.selectedEffect);
  }
  for (const [order, block] of state.orderBlocks) block.classList.toggle('current', order === located.order);
  const activeKey = active.map((clip) => clip.id).join(',');
  const now = performance.now();
  if (options.forceDetails || activeKey !== state.activeKey || now - state.lastDetailUpdate >= 100) {
    renderActiveElements(active);
    state.activeKey = activeKey;
    state.lastDetailUpdate = now;
  }
  updatePreview();
  if (options.reveal) revealCursor();
  if (options.revealEffect) revealEffect(options.revealEffect);
}

function setPlaying(playing) {
  state.playing = playing;
  state.previousFrameTime = performance.now();
  dom.play.textContent = playing ? 'Pause' : 'Play';
  if (playing) requestAnimationFrame(playFrame);
}

function playFrame(now) {
  if (!state.playing) return;
  const elapsed = Math.min(0.1, (now - state.previousFrameTime) / 1000);
  state.previousFrameTime = now;
  const next = Math.min(WONDER_SHOW_END, state.seconds + elapsed);
  updateTime(next, { reveal: true });
  if (next >= WONDER_SHOW_END) setPlaying(false);
  else requestAnimationFrame(playFrame);
}

function adjacentOrder(direction) {
  const located = locateXmOrder(state.model, state.seconds);
  const index = state.model.segments.findIndex((segment) => segment.order === located.order);
  if (direction < 0 && state.seconds - located.start > 0.15) return located.start;
  const target = state.model.segments[Math.max(0, Math.min(state.model.segments.length - 1, index + direction))];
  return target.start;
}

function showNotice(message) {
  dom.notice.textContent = message;
  dom.notice.classList.add('visible');
  clearTimeout(showNotice.timeout);
  showNotice.timeout = setTimeout(() => dom.notice.classList.remove('visible'), 1800);
}

function wireControls() {
  dom.timelineContent.addEventListener('click', (event) => {
    state.selectedEffect = null;
    updateTime(secondsAtPointer(event), { forceDetails: true });
  });
  dom.scrubber.addEventListener('input', () => updateTime(dom.scrubber.value, { reveal: true, forceDetails: true }));
  dom.time.addEventListener('change', () => updateTime(dom.time.value, { reveal: true, forceDetails: true }));
  dom.play.addEventListener('click', () => setPlaying(!state.playing));
  dom.reloadPreview.addEventListener('click', () => reloadRenderer({ manual: true }));
  dom.hotReload.addEventListener('change', () => {
    setHotReloadStatus(dom.hotReload.checked ? 'checking sources…' : 'hot reload off',
      dom.hotReload.checked ? 'reloading' : '');
  });
  dom.previousOrder.addEventListener('click', () => updateTime(adjacentOrder(-1), { reveal: true, forceDetails: true }));
  dom.nextOrder.addEventListener('click', () => updateTime(adjacentOrder(1), { reveal: true, forceDetails: true }));
  dom.zoom.addEventListener('change', () => {
    const oldX = graphX(state.seconds);
    const oldScroll = dom.timelineScroll.scrollLeft;
    state.pxPerSecond = Number(dom.zoom.value);
    buildTimelineView();
    updateTime(state.seconds);
    dom.timelineScroll.scrollLeft = Math.max(0, graphX(state.seconds) - oldX + oldScroll);
  });
  dom.copyLink.addEventListener('click', async () => {
    const url = new URL(location.href);
    url.searchParams.set('t', state.seconds.toFixed(3));
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url.href);
      showNotice('Frame link copied');
    } catch {
      showNotice('Frame time added to the address bar');
    }
  });
  dom.timelineScroll.addEventListener('keydown', (event) => {
    let target = null;
    if (event.key === ' ') setPlaying(!state.playing);
    else if (event.key === 'ArrowLeft') target = state.seconds - (event.shiftKey ? 1 : 0.1);
    else if (event.key === 'ArrowRight') target = state.seconds + (event.shiftKey ? 1 : 0.1);
    else if (event.key === 'PageUp') target = adjacentOrder(-1);
    else if (event.key === 'PageDown') target = adjacentOrder(1);
    else return;
    event.preventDefault();
    if (target !== null) updateTime(target, { reveal: true, forceDetails: true });
  });
}

function awaitPreview(generation = state.previewGeneration) {
  let attempts = 0;
  const poll = () => {
    if (generation !== state.previewGeneration) return;
    attempts++;
    try {
      if (dom.preview.contentWindow?.__wonderReady) {
        state.previewReady = true;
        state.previewReloading = false;
        dom.reloadPreview.disabled = false;
        updatePreview();
        if (dom.hotReload.checked) setHotReloadStatus('renderer updated · watching', 'watching');
        return;
      }
    } catch {
      // The iframe is still navigating; retry below.
    }
    if (attempts < 300) setTimeout(poll, 50);
    else {
      state.previewReloading = false;
      dom.reloadPreview.disabled = false;
      dom.previewStatus.textContent = 'renderer did not become ready';
      setHotReloadStatus('reload failed');
    }
  };
  poll();
}

async function main() {
  try {
    const [orderText, xmBytes, sceneDependencies] = await Promise.all([
      load('./assets/mystified.env', 'text'),
      load('./assets/mystified.xm', 'bytes'),
      loadSceneDependencies(),
    ]);
    const orderTimes = envelopeTimes(parseEnvelope(orderText, 'mystified.env'));
    state.xm = parseXmOrderTable(xmBytes);
    state.model = buildXmOrderTimeline(orderTimes, state.xm, WONDER_SHOW_END, {
      terminalOrder: TERMINAL_ORDER,
      terminalRow: TERMINAL_ROW,
    });
    state.sceneDependencies = sceneDependencies;
    buildTimelineView();
    wireControls();
    const requested = Number(new URLSearchParams(location.search).get('t'));
    updateTime(Number.isFinite(requested) ? requested : 0, { reveal: true });
    awaitPreview();
    startHotReload();
  } catch (error) {
    dom.orderReadout.textContent = 'timeline failed to load';
    dom.activeSummary.textContent = error.message;
    dom.previewStatus.textContent = error.message;
    throw error;
  }
}

main();
