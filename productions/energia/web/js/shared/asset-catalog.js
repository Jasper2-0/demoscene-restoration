export class AssetCatalog {
  constructor(baseUrl, entries) {
    this.baseUrl = new URL(baseUrl, document.baseURI);
    this.entries = entries;
    this.byExactPath = new Map(entries.map((entry) => [entry.path, entry]));
    this.byFoldedPath = new Map();
    for (const entry of entries) {
      const folded = entry.path.replaceAll('\\', '/').toLocaleLowerCase('en-US');
      if (!this.byFoldedPath.has(folded)) this.byFoldedPath.set(folded, entry);
      const basename = folded.split('/').at(-1);
      if (!this.byFoldedPath.has(basename)) this.byFoldedPath.set(basename, entry);
    }
    this.imagePromises = new Map();
    this.bytePromises = new Map();
  }

  static async load(manifestUrl, baseUrl = './assets/') {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`cannot load asset manifest: ${response.status} ${response.statusText}`);
    const manifest = await response.json();
    return new AssetCatalog(baseUrl, manifest.assets);
  }

  resolve(name) {
    if (!name) return null;
    const normalized = name.replaceAll('\\', '/').replace(/^\.\//, '');
    const entry = this.byExactPath.get(normalized)
      ?? this.byFoldedPath.get(normalized.toLocaleLowerCase('en-US'));
    return entry ? new URL(entry.path, this.baseUrl) : null;
  }

  async loadImage(name) {
    const url = this.resolve(name);
    if (!url) throw new Error(`asset is absent from manifest: ${name}`);
    const key = url.href;
    if (!this.imagePromises.has(key)) {
      this.imagePromises.set(key, new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image), { once: true });
        image.addEventListener('error', () => reject(new Error(`cannot decode image ${url.pathname}`)), { once: true });
        image.src = url.href;
      }));
    }
    return this.imagePromises.get(key);
  }

  async loadBytes(name) {
    const url = this.resolve(name);
    if (!url) throw new Error(`asset is absent from manifest: ${name}`);
    const key = url.href;
    if (!this.bytePromises.has(key)) {
      this.bytePromises.set(key, fetch(url).then((response) => {
        if (!response.ok) {
          throw new Error(`cannot load ${url.pathname}: ${response.status} ${response.statusText}`);
        }
        return response.arrayBuffer();
      }));
    }
    return this.bytePromises.get(key);
  }
}
