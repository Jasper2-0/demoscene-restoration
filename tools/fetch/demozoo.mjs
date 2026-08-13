// demozoo.mjs — fill productions/<slug>/prod.json from the Demozoo API.
//
//   node tools/fetch/demozoo.mjs <slug>            # uses ids.demozoo from prod.json
//   node tools/fetch/demozoo.mjs <slug> --id 25088 # first fill / pin the id
//   node tools/fetch/demozoo.mjs <slug> --force    # let API values overwrite hand edits
//
// Demozoo is the primary source because its API is clean JSON and cross-links
// everything else: download_links carry the scene.org mirrors, external links
// carry the pouet id and YouTube candidates. The merge is fill-nulls-only, so
// hand-curated fields always survive a refetch (--force to override).
import { readProd, newProd, writeProd, merge } from './lib/prod.mjs';

const API = 'https://demozoo.org/api/v1';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const idArg = args.includes('--id') ? Number(args[args.indexOf('--id') + 1]) : null;
const force = args.includes('--force');
if (!slug) { console.error('usage: node tools/fetch/demozoo.mjs <slug> [--id N] [--force]'); process.exit(2); }

const prod = readProd(slug) ?? newProd(slug);
const id = idArg ?? prod.ids?.demozoo;
if (!id) { console.error(`${slug}: no demozoo id — pass --id N`); process.exit(2); }

const get = async (url) => {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};

const p = await get(`${API}/productions/${id}/?format=json`);

const incoming = {
  title: p.title ?? null,
  group: (p.author_nicks ?? []).map((n) => n.name).join(' & ') || null,
  platform: (p.platforms ?? []).map((x) => x.name).join(', ') || null,
  releaseDate: p.release_date ?? null,
  ids: { demozoo: id },
  links: { demozoo: `https://demozoo.org/productions/${id}/` },
  // Keep BOTH fields. Demozoo's `role` is the qualifier that separates work on
  // the original production from work on later derivatives — "Code" +
  // "WebGL remake" is a restoration credit, not a 2000 credit. Collapsing to
  // `category || role` erases that distinction and silently promotes a
  // remake author into the original team's credit list.
  credits: (p.credits ?? []).map((c) => {
    const credit = { name: c.nick?.name ?? null, role: c.category || null };
    if (c.role) credit.note = c.role;
    return credit;
  }),
};

// external links: pouet id + youtube capture candidates. The API hands back
// full URLs, so identity is parsed out of them rather than trusted fields.
for (const l of p.external_links ?? []) {
  if (l.link_class === 'PouetProduction' && l.url) {
    const m = l.url.match(/which=(\d+)/);
    if (m) { incoming.ids.pouet = Number(m[1]); incoming.links.pouet = l.url; }
  }
  if (l.link_class === 'YoutubeVideo' && l.url) incoming.links.youtube = l.url;
}

// download links → originals[] url candidates (scene.org first). Only appended
// when originals[] is empty — never rearranges a curated list.
// files.scene.org /view/ URLs are HTML landing pages; /get/ is the download.
const dls = (p.download_links ?? []).map((l) => l.url.replace('files.scene.org/view/', 'files.scene.org/get/'))
  .sort((a, b) => (b.includes('scene.org') ? 1 : 0) - (a.includes('scene.org') ? 1 : 0));
if ((prod.originals ?? []).length === 0 && dls.length) {
  const name = decodeURIComponent(dls[0].split('/').pop());
  incoming.originals = [{
    path: `originals/${(incoming.group ?? slug).toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${name}`,
    urls: dls, sha256: null, bytes: null,
  }];
}

// party placement: invitation to look it up rather than guess — the API's
// competition placements live on the party object, so only fill what we have.
if (p.competition_placements?.length) {
  const c = p.competition_placements[0];
  incoming.party = {
    name: c.competition?.party?.name ?? null,
    compo: c.competition?.name ?? null,
    ranking: c.ranking ? Number(c.ranking) : null,
  };
}

merge(prod, incoming, { force });
const file = writeProd(prod);
console.log(`${slug}: wrote ${file}`);
console.log(`  title=${prod.title}  group=${prod.group}  demozoo=${prod.ids.demozoo}  pouet=${prod.ids.pouet ?? '—'}`);
if (prod.originals.length) console.log(`  originals[0]: ${prod.originals[0].urls?.[0] ?? prod.originals[0].path}`);
