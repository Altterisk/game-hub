import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadArchive, readText } from '../src/archive';

const br = new Uint8Array(readFileSync(new URL('./fixtures/python.tar.br', import.meta.url)));

// loadBrotli() fetches the .wasm by URL, which only browsers/bundlers do; Node gets the same decoder from disk.
async function nodeDecoder() {
  const root = dirname(createRequire(import.meta.url).resolve('brotli-dec-wasm'));
  const mod = await import(/* @vite-ignore */ pathToFileURL(join(root, 'pkg', 'brotli_dec_wasm.js')).href);
  await mod.default({ module_or_path: readFileSync(join(root, 'pkg', 'brotli_dec_wasm_bg.wasm')) });
  return (data: Uint8Array) => mod.decompress(data) as Uint8Array;
}

describe('brotli archives', () => {
  it('decodes a .tar.br with brotli-dec-wasm through loadArchive', async () => {
    const decompress = await nodeDecoder();
    const files = await loadArchive('br:fixture', () => ['/fixture.tar.br'], { fetch: async () => new Response(br), decompress });
    expect(await readText(files, 'spine.json')).toBe('{"skeleton":{"spine":"4.2"}}');
    expect(await readText(files, '한글.txt')).toBe('hangul');
  });
});
