// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { listState, nextRouterAdapter, type NextRouterLike } from '../src/filters';

describe('nextRouterAdapter in a browser', () => {
  it('reads the live URL when the router snapshot is stale', async () => {
    window.history.replaceState(null, '', '/units?type=Heavy&equip=E1');
    const calls: { pathname: string; query: Record<string, string | string[]> }[] = [];
    const stale: NextRouterLike = {
      pathname: '/units',
      query: {},
      replace: (url) => { calls.push(url); return Promise.resolve(true); },
    };
    const list = listState(nextRouterAdapter(stale));
    expect(list.modes('type')).toEqual({ Heavy: 1 });
    list.cycleMode('type', 'Heavy');
    expect(calls[0].query).toEqual({ type: '-Heavy', equip: 'E1' });
    await new Promise((r) => setTimeout(r, 0));
  });

  it('keeps dynamic route segments from the snapshot', () => {
    window.history.replaceState(null, '', '/units/42?q=a');
    const calls: { pathname: string; query: Record<string, string | string[]> }[] = [];
    const router: NextRouterLike = {
      pathname: '/units/[id]',
      query: { id: '42' },
      replace: (url) => { calls.push(url); return Promise.resolve(true); },
    };
    nextRouterAdapter(router).set({ q: 'b' });
    expect(calls[0]).toEqual({ pathname: '/units/[id]', query: { id: '42', q: 'b' } });
  });
});
