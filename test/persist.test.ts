// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPersisted, createSeenStore, FileFormatError, fileText, parseFile } from '../src/persist';

type Coll = { collected: Record<string, true> };
const flags = (v: unknown): Record<string, true> =>
  v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, on]) => on === true).map(([k]) => [k, true as const]))
    : {};

beforeEach(() => localStorage.clear());

describe('createPersisted', () => {
  const store = createPersisted<Coll>({
    key: 'mad.collection',
    version: 1,
    empty: () => ({ collected: {} }),
    sanitize: (raw) => ({ collected: flags((raw as Coll | undefined)?.collected) }),
  });

  it('reads pre-envelope data as version 0 and writes an envelope', () => {
    localStorage.setItem('mad.collection', JSON.stringify({ collected: { a: true, b: false } }));
    expect(store.load()).toEqual({ collected: { a: true } });
    store.save({ collected: { c: true } });
    expect(JSON.parse(localStorage.getItem('mad.collection')!)).toEqual({ __v: 1, data: { collected: { c: true } } });
    expect(store.load()).toEqual({ collected: { c: true } });
  });

  it('returns empty on missing or corrupt data', () => {
    expect(store.load()).toEqual({ collected: {} });
    localStorage.setItem('mad.collection', '{not json');
    expect(store.load()).toEqual({ collected: {} });
  });

  it('migrates legacy keys with the source key', () => {
    const teams = createPersisted<{ teams: string[] }>({
      key: 'lomapr.teams.v1',
      version: 1,
      legacyKeys: ['lomapr.team.v1'],
      empty: () => ({ teams: [] }),
      migrate: (raw, from, source) => (source === 'lomapr.team.v1' ? { teams: [String(raw)] } : raw),
      sanitize: (raw) => ({ teams: Array.isArray((raw as { teams?: unknown })?.teams) ? (raw as { teams: string[] }).teams : [] }),
    });
    localStorage.setItem('lomapr.team.v1', JSON.stringify('4.AAAA'));
    expect(teams.load()).toEqual({ teams: ['4.AAAA'] });
    localStorage.setItem('lomapr.teams.v1', JSON.stringify({ teams: ['4.BBBB'] }));
    expect(teams.load()).toEqual({ teams: ['4.BBBB'] });
  });

  it('fromRecord accepts exported records', () => {
    expect(store.fromRecord(store.toRecord({ collected: { z: true } }))).toEqual({ collected: { z: true } });
  });
});

describe('plan files', () => {
  it('keeps MAD plan file shape and refuses newer versions', () => {
    const text = fileText('mad.plan', 2, { farm: {}, collection: { collected: {} } });
    expect(JSON.parse(text)).toEqual({ format: 'mad.plan', version: 2, farm: {}, collection: { collected: {} } });
    expect(parseFile(text, 'mad.plan', 2)).toEqual({ version: 2, data: { farm: {}, collection: { collected: {} } } });
    expect(() => parseFile(text, 'mad.plan', 1)).toThrow(FileFormatError);
    expect(() => parseFile(text, 'aigis.collection', 9)).toThrow('not a aigis.collection file');
    expect(parseFile('{"format":"x"}', 'x', 1).version).toBe(1);
  });
});

describe('createSeenStore', () => {
  it('shows nothing before restore, then once per key', () => {
    const seen = createSeenStore('test.seen');
    const { result } = renderHook(() => seen.useShouldShow('changelog:2026-10-10'));
    expect(result.current).toBe(false);
    act(() => seen.restore());
    expect(seen.isFresh()).toBe(true);
    expect(result.current).toBe(true);
    act(() => seen.markSeen('changelog:2026-10-10'));
    expect(result.current).toBe(false);
    expect(JSON.parse(localStorage.getItem('test.seen')!)).toEqual({ seen: { 'changelog:2026-10-10': true } });
  });
});
