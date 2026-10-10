import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { loadArchive, readBytes, readText, untar } from '../src/archive';

const tar = new Uint8Array(readFileSync(new URL('./fixtures/python.tar', import.meta.url)));

describe('untar', () => {
  it('reads a Python tarfile archive, including PAX and prefixed names', async () => {
    const files = untar(tar);
    expect([...files.keys()].sort()).toEqual(['dir_' + 'x'.repeat(120) + '/long.txt', 'empty.txt', 'page_0.png', 'spine.json', '한글.txt']);
    expect(await readText(files, 'spine.json')).toBe('{"skeleton":{"spine":"4.2"}}');
    expect(Array.from(await readBytes(files, 'page_0.png'))).toEqual(Array.from({ length: 768 }, (_, i) => i % 256));
    expect(await readText(files, '한글.txt')).toBe('hangul');
    expect((await readBytes(files, 'empty.txt')).length).toBe(0);
  });

  it('reports a missing file', async () => {
    await expect(readText(untar(tar), 'nope.atlas')).rejects.toThrow('nope.atlas not found');
  });
});

describe('loadArchive', () => {
  it('falls through URLs, caches by name, and evicts failures', async () => {
    const fetch = vi.fn(async (url: string) => (url.includes('cdn') ? new Response('', { status: 404 }) : new Response(tar)));
    const decompress = (b: Uint8Array) => b;
    const opts = { fetch: fetch as typeof globalThis.fetch, decompress };
    const files = await loadArchive('skin:a', () => ['https://cdn/a.tar.br', '/skins/a.tar.br'], opts);
    expect(files.has('spine.json')).toBe(true);
    expect(await loadArchive('skin:a', () => ['unused'], opts)).toBe(files);
    expect(fetch).toHaveBeenCalledTimes(2);

    await expect(loadArchive('skin:b', () => ['https://cdn/b.tar.br'], opts)).rejects.toThrow('https://cdn/b.tar.br 404');
    const again = await loadArchive('skin:b', () => ['/skins/b.tar.br'], opts);
    expect(again.has('spine.json')).toBe(true);
  });
});
