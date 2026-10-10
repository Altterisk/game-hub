import { describe, expect, it } from 'vitest';
import {
  filterValueAllowed, listState, nextFilterMode, nextRouterAdapter, paginate, searchParamsAdapter, textMatch,
  type NextRouterLike, type ParamAdapter,
} from '../src/filters';

function memoryAdapter(init: Record<string, string> = {}): ParamAdapter & { values: Record<string, string> } {
  const values = { ...init };
  return {
    values,
    get: (k) => values[k] ?? null,
    set(updates) {
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) delete values[k];
        else values[k] = v;
      }
    },
  };
}

describe('tri-state filters (LOMapR rank.ts semantics)', () => {
  it('cycles neutral, include, exclude', () => {
    expect([nextFilterMode(0), nextFilterMode(1), nextFilterMode(-1)]).toEqual([1, -1, 0]);
  });

  it('allows values per include/exclude rules', () => {
    expect(filterValueAllowed('SS', {})).toBe(true);
    expect(filterValueAllowed('SS', { S: -1 })).toBe(true);
    expect(filterValueAllowed('S', { S: -1 })).toBe(false);
    expect(filterValueAllowed('SS', { S: 1 })).toBe(false);
    expect(filterValueAllowed('S', { S: 1, A: -1 })).toBe(true);
  });
});

describe('textMatch', () => {
  it('needs every token somewhere, case and width insensitive', () => {
    expect(textMatch('', ['x'])).toBe(true);
    expect(textMatch('val cap', ['Valkyrie Captain', 'SSR'])).toBe(true);
    expect(textMatch('ＶＡＬ', ['valkyrie'])).toBe(true);
    expect(textMatch('val nope', ['Valkyrie'])).toBe(false);
    expect(textMatch('101', [101, null])).toBe(true);
  });
});

describe('listState', () => {
  it('resets the page on filter changes and encodes modes', () => {
    const a = memoryAdapter({ page: '3', q: 'x' });
    const s = listState(a);
    expect(s.page).toBe(3);
    s.toggle('rarity', 'SSR');
    expect(a.values).toEqual({ q: 'x', rarity: 'SSR' });
    listState(a).toggle('rarity', 'SR');
    expect(listState(a).list('rarity')).toEqual(['SSR', 'SR']);
    listState(a).cycleMode('cls', 'Heavy');
    listState(a).cycleMode('cls', 'Heavy');
    listState(a).cycleMode('cls', 'Ranged');
    expect(listState(a).modes('cls')).toEqual({ Heavy: -1, Ranged: 1 });
    listState(a).cycleMode('cls', 'Heavy');
    expect(a.values.cls).toBe('Ranged');
    listState(a).setPage(2);
    expect(a.values.page).toBe('2');
    listState(a).setText('q', '');
    expect(a.values).toEqual({ rarity: 'SSR,SR', cls: 'Ranged' });
  });

  it('paginates with clamping', () => {
    const items = Array.from({ length: 125 }, (_, i) => i);
    expect(paginate(items, 3, 60)).toEqual(items.slice(120));
    expect(paginate(items, 99, 60)).toEqual(items.slice(120));
    expect(paginate([], 1, 60)).toEqual([]);
  });
});

describe('router adapters', () => {
  it('searchParamsAdapter replaces params', () => {
    let last: URLSearchParams | null = null;
    let replace: boolean | undefined;
    const adapter = searchParamsAdapter(new URLSearchParams('q=a&page=2'), (n, o) => { last = n; replace = o?.replace; });
    listState(adapter).setText('q', 'b');
    expect(String(last)).toBe('q=b');
    expect(replace).toBe(true);
  });

  it('nextRouterAdapter keeps other query values and routes shallowly', () => {
    const calls: unknown[] = [];
    const router: NextRouterLike = {
      pathname: '/equipment',
      query: { equip: 'E1', type: ['Chip', 'OS'] },
      replace: (...args) => { calls.push(args); },
    };
    const adapter = nextRouterAdapter(router);
    expect(adapter.get('type')).toBe('Chip');
    adapter.set({ q: 'sword', equip: null });
    expect(calls).toEqual([[{ pathname: '/equipment', query: { type: ['Chip', 'OS'], q: 'sword' } }, undefined, { shallow: true, scroll: false }]]);
  });

  it('nextRouterAdapter builds on a change the router has not applied yet', async () => {
    let apply = () => {};
    const router: NextRouterLike = {
      pathname: '/units',
      query: {},
      replace: (url) => new Promise<void>((done) => { apply = () => { router.query = url.query; done(); }; }),
    };
    const list = () => listState(nextRouterAdapter(router));
    list().cycleMode('type', 'Heavy');
    list().cycleMode('type', 'Heavy');
    expect(list().modes('type')).toEqual({ Heavy: -1 });
    apply();
    await new Promise((r) => setTimeout(r, 0));
    expect(router.query).toEqual({ type: '-Heavy' });
    expect(list().modes('type')).toEqual({ Heavy: -1 });
  });
});
