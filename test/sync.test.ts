import { describe, expect, it } from 'vitest';
import { createDriveSync, type SyncEntry } from '../src/sync';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k); },
    setItem: (k, v) => { m.set(k, String(v)); },
  };
}

function fakeDrive() {
  const files = new Map<string, { name: string; body: string }>();
  let next = 1;
  const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
  const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? 'GET';
    if (url.pathname.endsWith('/userinfo')) return json({ email: 'a@example.com' });
    const id = url.pathname.split('/files/')[1];
    if (method === 'GET' && !id) {
      const name = /name='(.+)'/.exec(url.searchParams.get('q') ?? '')?.[1];
      return json({ files: [...files].filter(([, f]) => f.name === name).map(([fid]) => ({ id: fid })) });
    }
    if (method === 'GET') return files.has(id) ? new Response(files.get(id)!.body) : json({}, 404);
    if (method === 'PATCH') {
      if (!files.has(id)) return json({}, 404);
      files.get(id)!.body = String(init.body);
      return json({ id });
    }
    const parts = String(init.body).split(/--hub-sync-boundary(?:--)?\r?\n?/).filter((p) => p.trim());
    const [meta, body] = parts.map((p) => p.split('\r\n\r\n')[1].trim());
    const fid = `f${next++}`;
    files.set(fid, { name: JSON.parse(meta).name, body });
    return json({ id: fid });
  };
  return { fetch: fetch as typeof globalThis.fetch, files };
}

function device(drive: ReturnType<typeof fakeDrive>, clock: { t: number }, initial: unknown = { n: 0 }) {
  const storage = memoryStorage();
  let value = initial;
  const listeners = new Set<() => void>();
  const entry: SyncEntry = {
    key: 'site.data',
    read: () => value,
    write: (d) => { value = d; listeners.forEach((l) => l()); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    isEmpty: (d) => JSON.stringify(d) === JSON.stringify({ n: 0 }),
  };
  const sync = createDriveSync({
    clientId: 'x', fileName: 'site.json', entries: [entry], delayMs: 0, storage: () => storage,
    fetch: drive.fetch, now: () => clock.t,
    requestToken: async () => ({ token: 't', expiresAt: clock.t + 3_600_000 }),
    revokeToken: () => undefined,
  });
  sync.start();
  return {
    sync,
    get: () => value,
    set: (v: unknown) => { value = v; listeners.forEach((l) => l()); },
    flush: () => new Promise((r) => setTimeout(r, 0)).then(() => sync.syncNow()),
  };
}

describe('createDriveSync', () => {
  it('carries one device to another', async () => {
    const drive = fakeDrive();
    const clock = { t: 1000 };
    const pc = device(drive, clock, { n: 5 });
    await pc.sync.connect();
    expect(pc.sync.getState()).toMatchObject({ status: 'synced', email: 'a@example.com' });
    expect(drive.files.size).toBe(1);

    const phone = device(drive, clock);
    await phone.sync.connect();
    expect(phone.get()).toEqual({ n: 5 });

    clock.t = 2000;
    phone.set({ n: 7 });
    await phone.flush();
    await pc.sync.syncNow();
    expect(pc.get()).toEqual({ n: 7 });
  });

  it('asks before replacing data on a device that never synced', async () => {
    const drive = fakeDrive();
    const clock = { t: 1000 };
    const pc = device(drive, clock, { n: 5 });
    await pc.sync.connect();
    const phone = device(drive, clock, { n: 9 });
    await phone.sync.connect();
    expect(phone.sync.getState()).toMatchObject({ status: 'conflict', conflicts: ['site.data'] });
    expect(phone.get()).toEqual({ n: 9 });

    await phone.sync.resolve('local');
    await pc.sync.syncNow();
    expect(pc.get()).toEqual({ n: 9 });
  });

  it('keeps Drive data when chosen', async () => {
    const drive = fakeDrive();
    const clock = { t: 1000 };
    const pc = device(drive, clock, { n: 5 });
    await pc.sync.connect();
    const phone = device(drive, clock, { n: 9 });
    await phone.sync.connect();
    await phone.sync.resolve('remote');
    expect(phone.get()).toEqual({ n: 5 });
    expect(phone.sync.getState().status).toBe('synced');
  });

  it('the newer change wins', async () => {
    const drive = fakeDrive();
    const clock = { t: 1000 };
    const pc = device(drive, clock, { n: 1 });
    await pc.sync.connect();
    const phone = device(drive, clock);
    await phone.sync.connect();

    clock.t = 2000;
    pc.set({ n: 2 });
    clock.t = 3000;
    phone.set({ n: 3 });
    await phone.flush();
    await pc.flush();
    expect(pc.get()).toEqual({ n: 3 });
    await phone.sync.syncNow();
    expect(phone.get()).toEqual({ n: 3 });
  });

  it('pauses when the token expires and keeps local edits for later', async () => {
    const drive = fakeDrive();
    const clock = { t: 1000 };
    const pc = device(drive, clock, { n: 1 });
    await pc.sync.connect();
    clock.t += 4_000_000;
    pc.set({ n: 4 });
    await pc.flush();
    expect(pc.sync.getState().status).toBe('expired');

    await pc.sync.connect();
    const phone = device(drive, clock);
    await phone.sync.connect();
    expect(phone.get()).toEqual({ n: 4 });
  });

  it('forgets the account on disconnect', async () => {
    const drive = fakeDrive();
    const clock = { t: 1000 };
    const pc = device(drive, clock, { n: 1 });
    await pc.sync.connect();
    pc.sync.disconnect();
    expect(pc.sync.getState()).toMatchObject({ status: 'off', email: null });
    pc.set({ n: 2 });
    await pc.flush();
    expect(JSON.parse(drive.files.get('f1')!.body).entries['site.data'].data).toEqual({ n: 1 });
  });
});
