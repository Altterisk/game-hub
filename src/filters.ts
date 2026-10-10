import { useMemo } from 'react';

// Three-state list filters: neutral -> include -> exclude -> neutral.
export type FilterMode = 0 | 1 | -1;

export const nextFilterMode = (mode: FilterMode): FilterMode => (mode === 0 ? 1 : mode === 1 ? -1 : 0);

// Excluded values fail; once anything is included, only included values pass.
export function filterValueAllowed(
  value: PropertyKey,
  modes: Readonly<Partial<Record<PropertyKey, FilterMode>>>,
): boolean {
  if (modes[value] === -1) return false;
  return !Object.values(modes).some((mode) => mode === 1) || modes[value] === 1;
}

export function normalizeText(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim();
}

// Every whitespace-separated query token must appear in at least one field.
export function textMatch(query: string, fields: readonly (string | number | null | undefined)[]): boolean {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const hay = fields.filter((f) => f !== null && f !== undefined && f !== '').map((f) => normalizeText(String(f)));
  return tokens.every((t) => hay.some((h) => h.includes(t)));
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const p = Math.min(Math.max(1, page), pageCount(items.length, pageSize));
  return items.slice((p - 1) * pageSize, p * pageSize);
}

export interface ParamAdapter {
  get(key: string): string | null;
  set(updates: Record<string, string | null>): void;
}

export interface ListState {
  text(key: string, fallback?: string): string;
  list(key: string): string[];
  modes(key: string): Record<string, FilterMode>;
  page: number;
  setText(key: string, value: string): void;
  setList(key: string, values: readonly string[]): void;
  toggle(key: string, value: string): void;
  cycleMode(key: string, value: string): void;
  setPage(page: number): void;
  clear(keys: readonly string[]): void;
}

const csv = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);

// Filter state lives in the URL through the adapter; any filter change returns to page 1.
export function listState(adapter: ParamAdapter, pageKey = 'page'): ListState {
  const commit = (updates: Record<string, string | null>) => adapter.set({ ...updates, [pageKey]: null });
  const page = Math.max(1, parseInt(adapter.get(pageKey) ?? '1', 10) || 1);
  return {
    text: (key, fallback = '') => adapter.get(key) ?? fallback,
    list: (key) => csv(adapter.get(key)),
    // Encoded as "a,-b": a included, b excluded.
    modes: (key) => Object.fromEntries(csv(adapter.get(key)).map((v) =>
      (v.startsWith('-') ? [v.slice(1), -1] : [v, 1]) as [string, FilterMode])),
    page,
    setText: (key, value) => commit({ [key]: value || null }),
    setList: (key, values) => commit({ [key]: values.length ? values.join(',') : null }),
    toggle(key, value) {
      const cur = csv(adapter.get(key));
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      commit({ [key]: next.length ? next.join(',') : null });
    },
    cycleMode(key, value) {
      const cur = csv(adapter.get(key));
      const mode: FilterMode = cur.includes(value) ? 1 : cur.includes(`-${value}`) ? -1 : 0;
      const rest = cur.filter((v) => v !== value && v !== `-${value}`);
      const next = nextFilterMode(mode);
      const out = next === 0 ? rest : [...rest, next === 1 ? value : `-${value}`];
      commit({ [key]: out.length ? out.join(',') : null });
    },
    setPage: (p) => adapter.set({ [pageKey]: p > 1 ? String(p) : null }),
    clear: (keys) => commit(Object.fromEntries(keys.map((k) => [k, null]))),
  };
}

export function useListState(adapter: ParamAdapter, pageKey = 'page'): ListState {
  return useMemo(() => listState(adapter, pageKey), [adapter, pageKey]);
}

// For react-router's useSearchParams(): searchParamsAdapter(...useSearchParams()).
export function searchParamsAdapter(
  params: URLSearchParams,
  setParams: (next: URLSearchParams, opts?: { replace?: boolean }) => void,
): ParamAdapter {
  return {
    get: (key) => params.get(key),
    set(updates) {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
  };
}

export interface NextRouterLike {
  pathname: string;
  query: Record<string, string | string[] | undefined>;
  replace(url: { pathname: string; query: Record<string, string | string[]> }, as?: undefined,
    options?: { shallow?: boolean; scroll?: boolean }): unknown;
}

type Query = Record<string, string | string[]>;

const definedQuery = (query: NextRouterLike['query']): Query => {
  const out: Query = {};
  for (const [k, v] of Object.entries(query)) if (v !== undefined) out[k] = v;
  return out;
};
const dynamicKeys = (pathname: string) => Array.from(pathname.matchAll(/\[\[?(?:\.\.\.)?([^\]]+)\]\]?/g), (m) => m[1]);

// useRouter() hands each render a snapshot, so the live search string is read and only dynamic segments come from the snapshot.
function liveQuery(router: NextRouterLike): Query {
  if (typeof window === 'undefined') return definedQuery(router.query);
  const out: Query = {};
  for (const k of dynamicKeys(router.pathname)) {
    const v = router.query[k];
    if (v !== undefined) out[k] = v;
  }
  const params = new URLSearchParams(window.location.search);
  for (const k of new Set(params.keys())) {
    const all = params.getAll(k);
    out[k] = all.length > 1 ? all : all[0];
  }
  return out;
}

// router.replace lands asynchronously, so a second change before it does must build on the first.
let pendingQuery: { pathname: string; query: Query } | null = null;

// For Next's pages router: nextRouterAdapter(useRouter()). Shallow, no scroll jump.
export function nextRouterAdapter(router: NextRouterLike): ParamAdapter {
  const current = (): Query =>
    (pendingQuery && pendingQuery.pathname === router.pathname ? pendingQuery.query : liveQuery(router));
  return {
    get(key) {
      const v = current()[key];
      return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    },
    set(updates) {
      const query = { ...current() };
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') delete query[k];
        else query[k] = v;
      }
      const pending = { pathname: router.pathname, query };
      pendingQuery = pending;
      Promise.resolve(router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false }))
        .catch(() => {})
        .finally(() => { if (pendingQuery === pending) pendingQuery = null; });
    },
  };
}
