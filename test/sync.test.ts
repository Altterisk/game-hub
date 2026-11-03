// @vitest-environment jsdom
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

  describe('token renewal', () => {
    function signedIn(request: (silent: boolean, hint?: string | null) => Promise<{ token: string; expiresAt: number }>, fetch?: typeof globalThis.fetch) {
      const drive = fakeDrive();
      const clock = { t: 1000 };
      let value: unknown = { n: 0 };
      const calls: { silent: boolean; hint?: string | null }[] = [];
      const storage = memoryStorage();
      const sync = createDriveSync({
        clientId: 'x', fileName: 'site.json', delayMs: 0, storage: () => storage,
        fetch: fetch ?? drive.fetch, now: () => clock.t, revokeToken: () => undefined,
        entries: [{
          key: 'site.data', read: () => value, write: (d) => { value = d; }, subscribe: () => () => undefined,
        }],
        requestToken: (silent, hint) => {
          calls.push({ silent, hint });
          return request(silent, hint).then((r) => ({ ...r, expiresAt: clock.t + r.expiresAt }));
        },
      });
      sync.start();
      return { sync, drive, clock, calls, set: (v: unknown) => { value = v; } };
    }
    const hour = 3_600_000;
    const ok = async () => ({ token: 't', expiresAt: hour });
    const settle = () => new Promise((r) => setTimeout(r, 5));

    const day = 24 * hour;

    it('stays expired until a day after sign-in, then renews on a click for the same account', async () => {
      const d = signedIn(ok);
      await d.sync.connect();
      d.clock.t += hour + 1;
      await d.sync.syncNow();
      expect(d.sync.getState().status).toBe('expired');
      document.body.click();
      await settle();
      expect(d.calls).toHaveLength(1);
      d.clock.t += day;
      document.body.click();
      await settle();
      expect(d.calls.at(-1)).toEqual({ silent: true, hint: 'a@example.com' });
      expect(d.sync.getState().status).toBe('synced');
    });

    it('does not renew while the token still has time left', async () => {
      const d = signedIn(() => ok());
      await d.sync.connect();
      d.clock.t += day;
      await d.sync.connect();
      expect(d.calls).toHaveLength(2);
      d.clock.t += hour - 6 * 60_000;
      document.body.click();
      await settle();
      expect(d.calls).toHaveLength(2);
    });

    it('waits a day after a failed renewal, but connect still works', async () => {
      let fail = false;
      const d = signedIn(() => (fail ? Promise.reject(new Error('popup_failed_to_open')) : ok()));
      await d.sync.connect();
      fail = true;
      d.clock.t += day + 1;
      document.body.click();
      await settle();
      expect(d.calls).toHaveLength(2);
      expect(d.sync.getState().status).toBe('expired');
      d.clock.t += hour;
      document.body.click();
      await settle();
      expect(d.calls).toHaveLength(2);
      fail = false;
      await d.sync.connect();
      expect(d.calls).toHaveLength(3);
      expect(d.sync.getState().status).toBe('synced');
    });

    it('leaves clicks on the sync controls alone', async () => {
      const d = signedIn(ok);
      await d.sync.connect();
      d.clock.t += day + 1;
      const control = document.createElement('button');
      control.setAttribute('data-hub-sync', '');
      document.body.appendChild(control);
      control.click();
      control.remove();
      await settle();
      expect(d.calls).toHaveLength(1);
    });

    it('does not treat a rate limit as an expired sign-in', async () => {
      const drive = fakeDrive();
      let limited = false;
      const fetch = ((input: RequestInfo | URL, init?: RequestInit) => (limited
        ? Promise.resolve(new Response(JSON.stringify({ error: { errors: [{ reason: 'userRateLimitExceeded' }] } }), { status: 403 }))
        : drive.fetch(input, init))) as typeof globalThis.fetch;
      const d = signedIn(ok, fetch);
      await d.sync.connect();
      limited = true;
      await d.sync.syncNow();
      expect(d.sync.getState().status).toBe('error');
      limited = false;
      await d.sync.syncNow();
      expect(d.sync.getState().status).toBe('synced');
    });
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
