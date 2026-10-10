import { useCallback, useSyncExternalStore } from 'react';

export interface PersistedOptions<T> {
  key: string;
  version: number;
  empty: () => T;
  // Rebuilds a trusted value from anything; never throws.
  sanitize: (raw: unknown) => T;
  // Upgrades data written at an older version; data with no envelope counts as version 0.
  migrate?: (raw: unknown, fromVersion: number, sourceKey: string) => unknown;
  // Read only when `key` holds nothing; never written or removed.
  legacyKeys?: readonly string[];
  storage?: () => Storage | null;
}

export interface PersistedRecord {
  __v: number;
  data: unknown;
}

export interface Persisted<T> {
  readonly key: string;
  readonly version: number;
  load(): T;
  save(value: T): boolean;
  clear(): void;
  toRecord(value: T): PersistedRecord;
  fromRecord(raw: unknown, sourceKey?: string): T;
}

export function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(raw: unknown): raw is PersistedRecord {
  return !!raw && typeof raw === 'object' && typeof (raw as PersistedRecord).__v === 'number' && 'data' in raw;
}

export function createPersisted<T>(options: PersistedOptions<T>): Persisted<T> {
  const { key, version, empty, sanitize, migrate, legacyKeys = [], storage = browserStorage } = options;

  function fromRecord(raw: unknown, sourceKey = key): T {
    try {
      let data = isRecord(raw) ? raw.data : raw;
      const from = isRecord(raw) ? raw.__v : 0;
      if (from < version && migrate) data = migrate(data, from, sourceKey);
      return sanitize(data);
    } catch {
      return empty();
    }
  }

  function read(store: Storage, k: string): string | null {
    try {
      return store.getItem(k);
    } catch {
      return null;
    }
  }

  return {
    key,
    version,
    load() {
      const store = storage();
      if (!store) return empty();
      let source = key;
      let text = read(store, key);
      for (const legacy of legacyKeys) {
        if (text !== null) break;
        source = legacy;
        text = read(store, legacy);
      }
      if (text === null) return empty();
      try {
        return fromRecord(JSON.parse(text), source);
      } catch {
        return empty();
      }
    },
    save(value) {
      const store = storage();
      if (!store) return false;
      try {
        store.setItem(key, JSON.stringify({ __v: version, data: value } satisfies PersistedRecord));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        storage()?.removeItem(key);
      } catch {
        // a blocked store has nothing to clear
      }
    },
    toRecord(value) {
      return { __v: version, data: value };
    },
    fromRecord,
  };
}

export interface FileEnvelope {
  format: string;
  version: number;
  [field: string]: unknown;
}

// Pretty JSON with `format` and `version` beside the payload fields, the shape MAD's plan files already use.
export function fileText(format: string, version: number, data: Record<string, unknown>): string {
  return JSON.stringify({ format, version, ...data }, null, 2);
}

export function downloadText(text: string, fileName: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportFile(opts: { format: string; version: number; data: Record<string, unknown>; fileName: string }): void {
  downloadText(fileText(opts.format, opts.version, opts.data), opts.fileName);
}

export class FileFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileFormatError';
  }
}

// Files without a version are treated as version 1; newer versions than maxVersion are refused.
export function parseFile(text: string, format: string, maxVersion: number): { version: number; data: Record<string, unknown> } {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new FileFormatError('not a JSON file');
  }
  if (!doc || typeof doc !== 'object' || (doc as FileEnvelope).format !== format) {
    throw new FileFormatError(`not a ${format} file`);
  }
  const { format: _f, version: raw, ...data } = doc as FileEnvelope;
  const version = typeof raw === 'number' ? raw : 1;
  if (version > maxVersion) throw new FileFormatError(`${format} version ${version} is newer than this site supports`);
  return { version, data };
}

export async function readFile(file: Blob, format: string, maxVersion: number) {
  return parseFile(await file.text(), format, maxVersion);
}

interface SeenState {
  ready: boolean;
  fresh: boolean;
  seen: Record<string, true>;
}

export interface SeenStore {
  // Call once after mount; until then nothing shows, so the first paint matches the server render.
  restore(): void;
  isFresh(): boolean;
  markSeen(key: string): void;
  reset(key: string): void;
  useShouldShow(key: string): boolean;
}

// One-time notices. A visitor with no record at all is `fresh`: a site can mark them seen silently.
export function createSeenStore(storageKey: string, storage: () => Storage | null = browserStorage): SeenStore {
  let state: SeenState = { ready: false, fresh: false, seen: {} };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  };
  const write = () => {
    try {
      storage()?.setItem(storageKey, JSON.stringify({ seen: state.seen }));
    } catch {
      // a blocked store means the notice shows again next visit
    }
  };

  return {
    restore() {
      let seen: Record<string, true> = {};
      try {
        const doc = JSON.parse(storage()?.getItem(storageKey) ?? '{}') as { seen?: unknown };
        if (doc.seen && typeof doc.seen === 'object') {
          seen = Object.fromEntries(Object.entries(doc.seen as Record<string, unknown>)
            .filter(([, on]) => on === true).map(([k]) => [k, true as const]));
        }
      } catch {
        seen = {};
      }
      state = { ready: true, fresh: Object.keys(seen).length === 0, seen };
      emit();
    },
    isFresh: () => state.fresh,
    markSeen(key) {
      if (state.seen[key]) return;
      state = { ...state, seen: { ...state.seen, [key]: true } };
      write();
      emit();
    },
    reset(key) {
      const seen = { ...state.seen };
      delete seen[key];
      state = { ...state, seen };
      write();
      emit();
    },
    useShouldShow(key) {
      const get = useCallback(() => state.ready && !state.seen[key], [key]);
      return useSyncExternalStore(subscribe, get, () => false);
    },
  };
}
