// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { bucketFor, createJsonLoader, jsdelivrBase, JsonLoadError, parseBounds, useJson } from '../src/data';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const status = (code: number) => new Response('', { status: code });

describe('createJsonLoader', () => {
  it('shares one request between concurrent callers and caches the result', async () => {
    const fetch = vi.fn(async () => ok({ a: 1 }));
    const loader = createJsonLoader({ urls: (n) => [`/data/${n}.json`], fetch });
    const [a, b] = await Promise.all([loader.load('units'), loader.load('units')]);
    expect(a).toEqual({ a: 1 });
    expect(b).toBe(a);
    await loader.load('units');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(loader.peek('units')).toEqual({ a: 1 });
  });

  it('falls through candidate URLs in order (region then global)', async () => {
    const fetch = vi.fn(async (url: string) => (url.startsWith('/kr/') ? status(404) : ok({ from: url })));
    const loader = createJsonLoader({ urls: (n) => [`/kr/${n}`, `/global/${n}`], fetch: fetch as typeof globalThis.fetch });
    expect(await loader.load('units.json')).toEqual({ from: '/global/units.json' });
    expect(fetch.mock.calls.map((c) => c[0])).toEqual(['/kr/units.json', '/global/units.json']);
  });

  it('does not retry plain 404s', async () => {
    const fetch = vi.fn(async () => status(404));
    const loader = createJsonLoader({ urls: (n) => [n], fetch });
    await expect(loader.load('x')).rejects.toBeInstanceOf(JsonLoadError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries network errors and 5xx once, then succeeds', async () => {
    let calls = 0;
    const fetch = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('network down');
      return ok(42);
    });
    const loader = createJsonLoader({ urls: (n) => [n], fetch });
    expect(await loader.load('x')).toBe(42);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('evicts failures so a later call refetches', async () => {
    let fail = true;
    const fetch = vi.fn(async () => (fail ? status(500) : ok('fine')));
    const loader = createJsonLoader({ urls: (n) => [n], fetch, retry: 0 });
    await expect(loader.load('x')).rejects.toThrow('failed to load x');
    fail = false;
    expect(await loader.load('x')).toBe('fine');
  });

  it('retryOn can retry every status, as Aigis did', async () => {
    const fetch = vi.fn(async () => status(404));
    const loader = createJsonLoader({ urls: (n) => [n], fetch, retryOn: () => true });
    await expect(loader.load('x')).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('useJson', () => {
  it('loads, reports loading, and stays idle for null', async () => {
    const loader = createJsonLoader({ urls: (n) => [n], fetch: async () => ok({ v: 1 }) });
    const { result, rerender } = renderHook(({ name }) => useJson<{ v: number }>(loader, name), {
      initialProps: { name: 'a' as string | null },
    });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ v: 1 }));
    expect(result.current.loading).toBe(false);
    act(() => rerender({ name: null }));
    expect(result.current).toEqual({ data: undefined, loading: false, error: null });
  });

  it('exposes errors', async () => {
    const loader = createJsonLoader({ urls: (n) => [n], fetch: async () => status(404) });
    const { result } = renderHook(() => useJson(loader, 'missing'));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(JsonLoadError));
  });
});

describe('url helpers', () => {
  it('bucketFor matches the Aigis inclusive-upper-bound rule', () => {
    const bounds = parseBounds('615,1225,1885,2580, x');
    expect(bounds).toEqual([615, 1225, 1885, 2580]);
    expect([1, 615, 616, 1225, 2580, 2581].map((id) => bucketFor(id, bounds))).toEqual([0, 0, 1, 1, 3, 4]);
  });

  it('jsdelivrBase matches MAD bucketBase', () => {
    expect(jsdelivrBase({ owner: 'anyabot', repo: 'MAD-assets-1', ref: 'master', dir: 'skins' }))
      .toBe('https://cdn.jsdelivr.net/gh/anyabot/MAD-assets-1@master/skins');
  });
});
