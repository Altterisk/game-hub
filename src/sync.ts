import { useSyncExternalStore } from 'react';
import { browserStorage } from './persist.js';

export interface SyncEntry {
  key: string;
  // Must return the saved value, not in-memory state that may not be restored yet.
  read(): unknown;
  write(data: unknown): void;
  subscribe(listener: () => void): () => void;
  isEmpty?(data: unknown): boolean;
}

export type SyncStatus = 'off' | 'connecting' | 'syncing' | 'synced' | 'expired' | 'conflict' | 'error';

export interface SyncState {
  status: SyncStatus;
  email: string | null;
  lastSync: number | null;
  error: string | null;
  conflicts: string[];
}

export interface SyncToken {
  token: string;
  expiresAt: number;
}

export interface DriveSyncOptions {
  clientId: string;
  fileName: string;
  entries: SyncEntry[];
  delayMs?: number;
  storage?: () => Storage | null;
  fetch?: typeof fetch;
  // Defaults to Google Identity Services; `silent` asks without a consent screen, `hint` names the account.
  requestToken?: (silent: boolean, hint?: string | null) => Promise<SyncToken>;
  revokeToken?: (token: string) => void;
  now?: () => number;
  // Least time between automatic renewal popups; `connect()` is never limited.
  autoRenewEveryMs?: number;
}

export interface DriveSync {
  start(): void;
  connect(): Promise<void>;
  disconnect(): void;
  syncNow(): Promise<void>;
  resolve(keep: 'local' | 'remote'): Promise<void>;
  getState(): SyncState;
  subscribe(listener: () => void): () => void;
  use(): SyncState;
}

interface Meta {
  connected: boolean;
  email: string | null;
  token: SyncToken | null;
  fileId: string | null;
  lastSync: number | null;
  renewedAt: number | null;
  times: Record<string, number>;
}

interface RemoteDoc {
  format: 'hub-sync';
  version: 1;
  entries: Record<string, { t: number; data: unknown }>;
}

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email';
const FILES = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const RENEW_BEFORE_MS = 5 * 60_000;
const AUTO_RENEW_EVERY_MS = 24 * 60 * 60_000;

class AuthError extends Error {}
class MissingFile extends Error {}

const OFF: SyncState = { status: 'off', email: null, lastSync: null, error: null, conflicts: [] };
const NO_META: Meta = { connected: false, email: null, token: null, fileId: null, lastSync: null, renewedAt: null, times: {} };

interface GisTokenResponse { access_token?: string; expires_in?: string | number; error?: string }
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string; scope: string; prompt?: string; login_hint?: string;
        callback: (r: GisTokenResponse) => void; error_callback?: (e: { type: string }) => void;
      }): { requestAccessToken(): void };
      revoke(token: string, done?: () => void): void;
    };
  };
}

const gis = () => (globalThis as { google?: Gis }).google;
let gisLoading: Promise<void> | null = null;

export function loadGoogleIdentity(): Promise<void> {
  if (gis()?.accounts?.oauth2) return Promise.resolve();
  if (typeof document === 'undefined') return Promise.reject(new Error('no document'));
  gisLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gisLoading = null; reject(new Error('Google sign-in failed to load')); };
    document.head.appendChild(s);
  });
  return gisLoading;
}

// Called synchronously from the click when the script is already loaded, so the popup is not blocked.
function gisToken(clientId: string, silent: boolean, hint: string | null | undefined, now: () => number): Promise<SyncToken> {
  const request = () => new Promise<SyncToken>((resolve, reject) => {
    const client = gis()!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      prompt: silent ? '' : 'select_account',
      ...(hint ? { login_hint: hint } : {}),
      callback: (r) => {
        if (r.error || !r.access_token) reject(new AuthError(r.error ?? 'no token'));
        else resolve({ token: r.access_token, expiresAt: now() + (Number(r.expires_in) || 3600) * 1000 - 60_000 });
      },
      error_callback: (e) => reject(new AuthError(e.type)),
    });
    client.requestAccessToken();
  });
  return gis()?.accounts?.oauth2 ? request() : loadGoogleIdentity().then(request);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function createDriveSync(options: DriveSyncOptions): DriveSync {
  const {
    clientId, fileName, entries, delayMs = 3000, storage = browserStorage, autoRenewEveryMs = AUTO_RENEW_EVERY_MS,
  } = options;
  const now = options.now ?? Date.now;
  const doFetch = options.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const requestToken = options.requestToken ?? ((silent: boolean, hint?: string | null) => gisToken(clientId, silent, hint, now));
  const revokeToken = options.revokeToken ?? ((token: string) => gis()?.accounts?.oauth2?.revoke(token));
  const metaKey = `${fileName}:sync`;

  let meta: Meta = NO_META;
  let state: SyncState = OFF;
  let started = false;
  let applying = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();
  let pending: { remote: RemoteDoc; keys: string[] } | null = null;
  let renewing: Promise<void> | null = null;
  const last: Record<string, string> = {};
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());
  const setState = (patch: Partial<SyncState>) => { state = { ...state, ...patch }; emit(); };

  function loadMeta(): Meta {
    try {
      const raw = JSON.parse(storage()?.getItem(metaKey) ?? 'null') as Partial<Meta> | null;
      return raw && typeof raw === 'object' ? { ...NO_META, ...raw, times: { ...raw.times } } : NO_META;
    } catch {
      return NO_META;
    }
  }
  function saveMeta(patch: Partial<Meta>) {
    meta = { ...meta, ...patch };
    try {
      storage()?.setItem(metaKey, JSON.stringify(meta));
    } catch {
      // a blocked store keeps sync for this session only
    }
  }

  const tokenValid = () => !!meta.token && meta.token.expiresAt > now();

  async function api(url: string, init: RequestInit = {}): Promise<Response> {
    if (!tokenValid()) throw new AuthError('expired');
    const res = await doFetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${meta.token!.token}` } });
    if (res.status === 401) throw new AuthError('Drive 401');
    if (res.status === 403) {
      const reason = await res.text().catch(() => '');
      if (/rateLimit|dailyLimit/i.test(reason)) throw new Error('Drive 403: rate limited');
      throw new AuthError('Drive 403');
    }
    if (res.status === 404) throw new MissingFile();
    if (!res.ok) throw new Error(`Drive ${res.status}`);
    return res;
  }

  async function findFile(): Promise<string | null> {
    const q = encodeURIComponent(`name='${fileName}'`);
    const res = await api(`${FILES}?spaces=appDataFolder&q=${q}&fields=files(id)`);
    const { files } = (await res.json()) as { files?: { id: string }[] };
    return files?.[0]?.id ?? null;
  }

  async function download(): Promise<RemoteDoc | null> {
    let id = meta.fileId ?? (await findFile());
    if (!id) return null;
    try {
      const res = await api(`${FILES}/${id}?alt=media`);
      if (id !== meta.fileId) saveMeta({ fileId: id });
      const doc = (await res.json()) as RemoteDoc;
      return doc && doc.format === 'hub-sync' && doc.entries && typeof doc.entries === 'object' ? doc : null;
    } catch (e) {
      if (!(e instanceof MissingFile)) throw e;
      saveMeta({ fileId: null });
      id = await findFile();
      return id ? download() : null;
    }
  }

  async function upload(doc: RemoteDoc): Promise<void> {
    const body = JSON.stringify(doc);
    if (meta.fileId) {
      try {
        await api(`${UPLOAD}/${meta.fileId}?uploadType=media`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
        });
        return;
      } catch (e) {
        if (!(e instanceof MissingFile)) throw e;
        saveMeta({ fileId: null });
      }
    }
    const boundary = 'hub-sync-boundary';
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`
      + `${JSON.stringify({ name: fileName, parents: ['appDataFolder'] })}\r\n`
      + `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const res = await api(`${UPLOAD}?uploadType=multipart&fields=id`, {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart,
    });
    saveMeta({ fileId: ((await res.json()) as { id: string }).id });
  }

  function apply(entry: SyncEntry, data: unknown) {
    applying = true;
    try {
      entry.write(data);
    } finally {
      applying = false;
    }
    last[entry.key] = JSON.stringify(entry.read());
  }

  async function cycle(): Promise<void> {
    if (!meta.connected) return;
    if (!tokenValid()) { setState({ status: 'expired' }); return; }
    setState({ status: 'syncing', error: null });
    try {
      const remote = await download();
      const times = { ...meta.times };
      const conflicts: string[] = [];
      let dirty = !remote;
      for (const entry of entries) {
        const r = remote?.entries[entry.key];
        const local = entry.read();
        const lt = times[entry.key];
        if (!r) {
          if (lt === undefined && !entry.isEmpty?.(local)) times[entry.key] = now();
          if (times[entry.key] !== undefined) dirty = true;
        } else if (lt === undefined) {
          if (entry.isEmpty?.(local) || same(local, r.data)) {
            apply(entry, r.data);
            times[entry.key] = r.t;
          } else conflicts.push(entry.key);
        } else if (r.t > lt) {
          apply(entry, r.data);
          times[entry.key] = r.t;
        } else if (lt > r.t) dirty = true;
      }
      saveMeta({ times });
      if (conflicts.length) {
        pending = { remote: remote!, keys: conflicts };
        setState({ status: 'conflict', conflicts });
        return;
      }
      if (dirty) {
        const out: RemoteDoc = { format: 'hub-sync', version: 1, entries: { ...remote?.entries } };
        for (const entry of entries) {
          const t = times[entry.key];
          if (t !== undefined) out.entries[entry.key] = { t, data: entry.read() };
        }
        await upload(out);
      }
      saveMeta({ lastSync: now() });
      setState({ status: 'synced', lastSync: meta.lastSync, conflicts: [] });
    } catch (e) {
      if (e instanceof AuthError) {
        saveMeta({ token: null });
        setState({ status: 'expired' });
      } else setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  }

  const run = () => (chain = chain.then(cycle));

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void run(); }, delayMs);
  }

  function onLocalChange(entry: SyncEntry) {
    if (applying) return;
    const json = JSON.stringify(entry.read());
    if (json === last[entry.key]) return;
    last[entry.key] = json;
    if (!meta.connected) return;
    saveMeta({ times: { ...meta.times, [entry.key]: now() } });
    if (state.status !== 'conflict') schedule();
  }

  // Starts inside the click: browsers block the token popup without one.
  function renew(): Promise<void> {
    saveMeta({ renewedAt: now() });
    renewing ??= requestToken(true, meta.email)
      .then((token) => {
        if (!meta.connected) { revokeToken(token.token); return undefined; }
        saveMeta({ token });
        return run();
      })
      .catch(() => {
        if (meta.connected && !tokenValid()) setState({ status: 'expired' });
      })
      .finally(() => { renewing = null; });
    return renewing;
  }

  function onClick(event: Event) {
    if (!meta.connected || renewing || state.status === 'connecting') return;
    if (meta.token && meta.token.expiresAt - now() > RENEW_BEFORE_MS) return;
    if (meta.renewedAt !== null && now() - meta.renewedAt < autoRenewEveryMs) return;
    if ((event.target as Element | null)?.closest?.('[data-hub-sync]')) return;
    void renew();
  }

  function onVisibility() {
    if (typeof document === 'undefined' || !meta.connected || state.status === 'conflict') return;
    if (document.visibilityState === 'visible') void run();
    else if (timer) { clearTimeout(timer); timer = null; void run(); }
  }

  const getState = () => state;
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  };

  async function fetchEmail(): Promise<string | null> {
    try {
      const res = await api('https://www.googleapis.com/oauth2/v3/userinfo');
      return ((await res.json()) as { email?: string }).email ?? null;
    } catch {
      return null;
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      meta = loadMeta();
      for (const entry of entries) {
        last[entry.key] = JSON.stringify(entry.read());
        entry.subscribe(() => onLocalChange(entry));
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibility);
        document.addEventListener('click', onClick, true);
      }
      if (!meta.connected) return;
      setState({ email: meta.email, lastSync: meta.lastSync, status: tokenValid() ? 'syncing' : 'expired' });
      if (!options.requestToken) void loadGoogleIdentity().catch(() => undefined);
      if (tokenValid()) void run();
    },
    async connect() {
      const silent = meta.connected;
      if (renewing) await renewing;
      if (silent && tokenValid()) return;
      setState({ status: 'connecting', error: null });
      try {
        const token = await requestToken(silent, meta.email);
        saveMeta({ connected: true, token, renewedAt: now() });
        if (!meta.email) saveMeta({ email: await fetchEmail() });
        setState({ email: meta.email });
        await run();
      } catch (e) {
        if (meta.connected) setState({ status: 'expired' });
        else setState({ ...OFF, error: e instanceof Error ? e.message : String(e) });
      }
    },
    disconnect() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
      if (meta.token) revokeToken(meta.token.token);
      saveMeta({ ...NO_META });
      setState(OFF);
    },
    syncNow: () => run(),
    async resolve(keep) {
      if (!pending) return;
      const { remote, keys } = pending;
      pending = null;
      const times = { ...meta.times };
      for (const entry of entries) {
        if (!keys.includes(entry.key)) continue;
        const r = remote.entries[entry.key];
        if (keep === 'remote') {
          apply(entry, r.data);
          times[entry.key] = r.t;
        } else times[entry.key] = Math.max(now(), r.t + 1);
      }
      saveMeta({ times });
      setState({ conflicts: [] });
      await run();
    },
    getState,
    subscribe,
    use: () => useSyncExternalStore(subscribe, getState, () => OFF),
  };
}
