import { useEffect, useState } from 'react';

export interface JsonLoaderOptions {
  // Candidate URLs for a name, tried in order; the first OK response wins.
  urls: (name: string) => readonly string[] | Promise<readonly string[]>;
  // Extra passes over the whole candidate list after a retryable failure.
  retry?: number;
  // Which HTTP statuses earn a retry; network errors always do.
  retryOn?: (status: number) => boolean;
  init?: RequestInit;
  fetch?: typeof fetch;
}

export class JsonLoadError extends Error {
  constructor(readonly resource: string, readonly attempts: readonly string[]) {
    super(`failed to load ${resource}: ${attempts.join('; ') || 'no candidate URL'}`);
    this.name = 'JsonLoadError';
  }
}

export interface JsonLoader {
  load<T = unknown>(name: string): Promise<T>;
  peek<T = unknown>(name: string): T | undefined;
  forget(name?: string): void;
}

const defaultRetryOn = (status: number) => status === 408 || status === 429 || status >= 500;

// In-flight requests are shared; successes are cached; failures are evicted so the next call refetches.
export function createJsonLoader(options: JsonLoaderOptions): JsonLoader {
  const { urls, retry = 1, retryOn = defaultRetryOn, init } = options;
  const pending = new Map<string, Promise<unknown>>();
  const resolved = new Map<string, unknown>();

  async function fetchOnce(name: string): Promise<unknown> {
    const doFetch = options.fetch ?? fetch;
    const candidates = await urls(name);
    const attempts: string[] = [];
    for (let pass = 0; pass <= retry; pass += 1) {
      let retryable = false;
      for (const url of candidates) {
        let res: Response;
        try {
          res = await doFetch(url, init);
        } catch (e) {
          attempts.push(`${url} ${e instanceof Error ? e.message : String(e)}`);
          retryable = true;
          continue;
        }
        if (res.ok) return res.json();
        attempts.push(`${url} ${res.status}`);
        if (retryOn(res.status)) retryable = true;
      }
      if (!retryable) break;
    }
    throw new JsonLoadError(name, attempts);
  }

  return {
    load<T>(name: string): Promise<T> {
      let p = pending.get(name);
      if (!p) {
        p = fetchOnce(name).then(
          (value) => {
            resolved.set(name, value);
            return value;
          },
          (error) => {
            pending.delete(name);
            throw error;
          },
        );
        pending.set(name, p);
      }
      return p as Promise<T>;
    },
    peek<T>(name: string): T | undefined {
      return resolved.get(name) as T | undefined;
    },
    forget(name?: string) {
      if (name === undefined) {
        pending.clear();
        resolved.clear();
      } else {
        pending.delete(name);
        resolved.delete(name);
      }
    },
  };
}

export interface JsonState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

// Pass null to stay idle. Fetches only in effects, so server rendering never starts a request.
export function useJson<T = unknown>(loader: JsonLoader, name: string | null): JsonState<T> {
  const cached = name === null ? undefined : loader.peek<T>(name);
  const [state, setState] = useState<JsonState<T>>({
    data: cached,
    loading: name !== null && cached === undefined,
    error: null,
  });

  useEffect(() => {
    if (name === null) {
      setState({ data: undefined, loading: false, error: null });
      return;
    }
    const hit = loader.peek<T>(name);
    if (hit !== undefined) {
      setState({ data: hit, loading: false, error: null });
      return;
    }
    let alive = true;
    setState({ data: undefined, loading: true, error: null });
    loader.load<T>(name).then(
      (data) => { if (alive) setState({ data, loading: false, error: null }); },
      (error) => {
        if (alive) setState({ data: undefined, loading: false, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => { alive = false; };
  }, [loader, name]);

  return state;
}

// Each bound is the highest id in its bucket (inclusive); ids above the last go to bounds.length.
export function bucketFor(id: number, bounds: readonly number[]): number {
  let b = 0;
  while (b < bounds.length && id > bounds[b]) b += 1;
  return b;
}

export function parseBounds(value: string | undefined | null): number[] {
  return (value ?? '').split(',').map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n));
}

export interface JsdelivrRepo {
  base?: string;
  owner: string;
  repo: string;
  ref: string;
  dir?: string;
}

export function jsdelivrBase({ base = 'https://cdn.jsdelivr.net/gh', owner, repo, ref, dir }: JsdelivrRepo): string {
  const root = `${base.replace(/\/$/, '')}/${owner}/${repo}@${ref}`;
  return dir ? `${root}/${dir.replace(/^\/|\/$/g, '')}` : root;
}

export function trimSlash(url: string | undefined | null): string {
  return (url ?? '').replace(/\/+$/, '');
}
