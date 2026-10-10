export type ArchiveFiles = Map<string, Blob>;

type Decompress = (data: Uint8Array) => Uint8Array | Promise<Uint8Array>;

let brotliPromise: Promise<Decompress> | null = null;

// Lazy so the WASM decoder downloads only with the first archive; DecompressionStream has no brotli.
export function loadBrotli(): Promise<Decompress> {
  if (!brotliPromise) {
    // The package's default export is a promise of the initialised module.
    brotliPromise = import('brotli-dec-wasm').then(async (m) => {
      const mod = (await m.default) as unknown as { decompress: Decompress };
      return (data: Uint8Array) => mod.decompress(data);
    });
    brotliPromise.catch(() => { brotliPromise = null; });
  }
  return brotliPromise;
}

// USTAR: 512-byte headers (name @0, size @124 octal, type @156, prefix @345), data padded to the block.
export function untar(bytes: Uint8Array): ArchiveFiles {
  const files: ArchiveFiles = new Map();
  const BLOCK = 512;
  const decoder = new TextDecoder('utf-8');
  const field = (h: Uint8Array, at: number, len: number) => decoder.decode(h.subarray(at, at + len)).replace(/\0.*$/s, '');
  let offset = 0;
  let paxPath: string | null = null;
  while (offset + BLOCK <= bytes.length) {
    const header = bytes.subarray(offset, offset + BLOCK);
    if (header.every((b) => b === 0)) break;
    const size = parseInt(field(header, 124, 12).trim(), 8) || 0;
    const type = field(header, 156, 1);
    const magic = field(header, 257, 6);
    const prefix = magic.startsWith('ustar') ? field(header, 345, 155) : '';
    const dataStart = offset + BLOCK;
    const data = bytes.subarray(dataStart, dataStart + size);
    if (type === 'x') {
      // PAX records "<len> path=<value>\n" carry names that do not fit or are not ASCII.
      const match = decoder.decode(data).match(/(?:^|\n)\d+ path=([^\n]*)\n/);
      paxPath = match ? match[1] : null;
    } else if (type === '' || type === '0') {
      const name = paxPath ?? (prefix ? `${prefix}/${field(header, 0, 100)}` : field(header, 0, 100));
      if (name) files.set(name, new Blob([data.slice() as BlobPart]));
      paxPath = null;
    } else {
      paxPath = null;
    }
    offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
  }
  return files;
}

export interface LoadArchiveOptions {
  decompress?: Decompress;
  fetch?: typeof fetch;
}

const archiveCache = new Map<string, Promise<ArchiveFiles>>();

// Tries each URL in order; one cached promise per name, so names must be unique across asset families.
export function loadArchive(
  name: string,
  urlsFor: () => readonly string[] | Promise<readonly string[]>,
  options: LoadArchiveOptions = {},
): Promise<ArchiveFiles> {
  let pending = archiveCache.get(name);
  if (!pending) {
    pending = (async () => {
      const doFetch = options.fetch ?? fetch;
      const [urls, decompress] = await Promise.all([urlsFor(), options.decompress ?? loadBrotli()]);
      const failures: string[] = [];
      for (const url of urls) {
        let res: Response;
        try {
          res = await doFetch(url);
        } catch (e) {
          failures.push(`${url} ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
        if (!res.ok) {
          failures.push(`${url} ${res.status}`);
          continue;
        }
        const compressed = new Uint8Array(await res.arrayBuffer());
        return untar(await decompress(compressed));
      }
      throw new Error(`failed to fetch archive ${name}: ${failures.join('; ') || 'no source'}`);
    })();
    pending.catch(() => archiveCache.delete(name));
    archiveCache.set(name, pending);
  }
  return pending;
}

// For a site's own loaders (loose files, local dev dirs) that should share the archive cache.
export function cacheArchive(name: string, load: () => Promise<ArchiveFiles>): Promise<ArchiveFiles> {
  let pending = archiveCache.get(name);
  if (!pending) {
    pending = load();
    pending.catch(() => archiveCache.delete(name));
    archiveCache.set(name, pending);
  }
  return pending;
}

export function forgetArchive(name: string): void {
  archiveCache.delete(name);
}

const urlCache = new Map<string, Map<string, string>>();

// Blob URLs are grouped by archive name so they can all be revoked together.
export function urlFor(name: string, files: ArchiveFiles, filename: string): string {
  let urls = urlCache.get(name);
  if (!urls) {
    urls = new Map();
    urlCache.set(name, urls);
  }
  let url = urls.get(filename);
  if (!url) {
    const blob = files.get(filename);
    if (!blob) throw new Error(`${filename} not found in ${name} archive`);
    url = URL.createObjectURL(blob);
    urls.set(filename, url);
  }
  return url;
}

export function revokeArchiveUrls(name: string): void {
  const urls = urlCache.get(name);
  if (!urls) return;
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urlCache.delete(name);
}

export async function readText(files: ArchiveFiles, filename: string): Promise<string> {
  const blob = files.get(filename);
  if (!blob) throw new Error(`${filename} not found in archive`);
  return blob.text();
}

export async function readBytes(files: ArchiveFiles, filename: string): Promise<Uint8Array> {
  const blob = files.get(filename);
  if (!blob) throw new Error(`${filename} not found in archive`);
  return new Uint8Array(await blob.arrayBuffer());
}
