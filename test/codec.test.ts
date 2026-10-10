import { describe, expect, it } from 'vitest';
import {
  ByteReader, ByteWriter, base64url, bitsetFromIds, fnv1a32, idsFromBitset,
  packJson, unpackJson, verifyChecksum, withChecksum,
} from '../src/codec';

// Reference copy of Aigis web/src/pages/Collection.tsx (AIGC3 encoder/decoder), kept verbatim for golden comparison.
const aigis = (() => {
  const CODE_PREFIX = 'AIGC3.';
  function uniqueSorted(values: number[]): number[] {
    return [...new Set(values.filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
  }
  function pushVarint(out: number[], value: number) {
    let n = value >>> 0;
    while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n >>>= 7; }
    out.push(n);
  }
  function pushIdList(out: number[], values: number[]) {
    const sorted = uniqueSorted(values);
    pushVarint(out, sorted.length);
    let previous = 0;
    sorted.forEach((id) => { pushVarint(out, id - previous); previous = id; });
  }
  function pushCompactIdList(out: number[], values: number[]) {
    const sorted = uniqueSorted(values);
    const deltas: number[] = [];
    pushIdList(deltas, sorted);
    const bitset = sorted.length ? new Array(Math.floor(sorted[sorted.length - 1] / 8) + 1).fill(0) : [];
    sorted.forEach((id) => { bitset[Math.floor(id / 8)] |= 1 << (id % 8); });
    const bitsetLength: number[] = [];
    pushVarint(bitsetLength, bitset.length);
    if (bitset.length && bitset.length + bitsetLength.length < deltas.length) out.push(1, ...bitsetLength, ...bitset);
    else out.push(0, ...deltas);
  }
  function checksum(bytes: number[]): number {
    let hash = 0x811c9dc5;
    bytes.forEach((byte) => { hash ^= byte; hash = Math.imul(hash, 0x01000193); });
    return hash >>> 0;
  }
  function encode(units: number[], princes: number[], hall: Record<number, number>, bond: number[]): string {
    const payload: number[] = [];
    pushCompactIdList(payload, units);
    pushCompactIdList(payload, princes);
    for (const tier of [1, 2, 3]) pushCompactIdList(payload, Object.keys(hall).map(Number).filter((id) => hall[id] === tier));
    pushCompactIdList(payload, bond);
    const sum = checksum(payload);
    payload.push(sum & 0xff, (sum >>> 8) & 0xff, (sum >>> 16) & 0xff, (sum >>> 24) & 0xff);
    return CODE_PREFIX + btoa(String.fromCharCode(...payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return { encode, uniqueSorted };
})();

// Reference copy of LOMapR lib/team.ts ByteWriter + base64UrlEncode.
class LoByteWriter {
  bytes: number[] = [];
  byte(n: number) { this.bytes.push(n & 0xff); }
  varint(n: number) {
    n = Math.max(0, Math.floor(n));
    while (n >= 0x80) { this.byte((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
    this.byte(n);
  }
  text(value: string) {
    const encoded = new TextEncoder().encode(value);
    this.varint(encoded.length);
    for (let i = 0; i < encoded.length; i++) this.byte(encoded[i]);
  }
  id(value: string, index: Map<string, number>) {
    const ref = index.get(value) ?? 0;
    this.varint(ref);
    if (!ref) this.text(value);
  }
}
const loB64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Reference copy of Aigis web/src/pages/Dps.tsx encodeShare (minus the state-to-tuple step).
async function dpsEncode(compact: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(compact));
  const out = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(out).arrayBuffer());
  let bin = '';
  bytes.forEach((x) => { bin += String.fromCharCode(x); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sharedAigisEncode(units: number[], princes: number[], hall: Record<number, number>, bond: number[]): string {
  const w = new ByteWriter().compactIdList(units).compactIdList(princes);
  for (const tier of [1, 2, 3]) w.compactIdList(Object.keys(hall).map(Number).filter((id) => hall[id] === tier));
  w.compactIdList(bond);
  return 'AIGC3.' + base64url.encode(withChecksum(w.bytes));
}

function sharedAigisDecode(code: string) {
  const body = verifyChecksum(base64url.decode(code.slice('AIGC3.'.length)));
  if (!body) throw new Error('checksum');
  const r = new ByteReader(body, 'collection code');
  const units = r.compactIdList();
  const princes = r.compactIdList();
  const hall: Record<number, number> = {};
  for (const tier of [1, 2, 3]) r.compactIdList().forEach((id) => { hall[id] = tier; });
  const bond = r.compactIdList();
  expect(r.done()).toBe(true);
  return { units, princes, hall, bond };
}

let seed = 12345;
const rand = (n: number) => {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed % n;
};
const randomIds = (count: number, max: number) => Array.from({ length: count }, () => 1 + rand(max));

describe('Aigis AIGC3 collection code', () => {
  const fixed = {
    units: [1, 2, 3, 10, 128, 129, 2049, 5000],
    princes: [7],
    hall: { 3: 1, 10: 2, 2049: 3 } as Record<number, number>,
    bond: [] as number[],
  };

  it('matches the site encoder byte for byte on a fixed collection', () => {
    const ref = aigis.encode(fixed.units, fixed.princes, fixed.hall, fixed.bond);
    expect(sharedAigisEncode(fixed.units, fixed.princes, fixed.hall, fixed.bond)).toBe(ref);
    expect(ref).toMatchInlineSnapshot(`"AIGC3.AAgBAQEHdgGAD4cXAAEHAAEDAAEKAAGBEAAAEsH-1w"`);
  });

  it('decodes a code produced by the site encoder', () => {
    const decoded = sharedAigisDecode(aigis.encode(fixed.units, fixed.princes, fixed.hall, fixed.bond));
    expect(decoded.units).toEqual(fixed.units);
    expect(decoded.princes).toEqual(fixed.princes);
    expect(decoded.hall).toEqual(fixed.hall);
    expect(decoded.bond).toEqual([]);
  });

  it('matches on random sparse and dense collections', () => {
    for (let i = 0; i < 200; i += 1) {
      const dense = i % 2 === 0;
      const units = randomIds(dense ? 1500 : 40, dense ? 3000 : 200_000);
      const princes = randomIds(rand(20), 500);
      const hall: Record<number, number> = {};
      randomIds(rand(60), 3000).forEach((id) => { hall[id] = 1 + rand(3); });
      const bond = randomIds(rand(80), 3000);
      const ref = aigis.encode(units, princes, hall, bond);
      expect(sharedAigisEncode(units, princes, hall, bond)).toBe(ref);
      const back = sharedAigisDecode(ref);
      expect(back.units).toEqual(aigis.uniqueSorted(units));
      expect(back.bond).toEqual(aigis.uniqueSorted(bond));
    }
  });

  it('rejects a damaged code', () => {
    const code = aigis.encode(fixed.units, fixed.princes, fixed.hall, fixed.bond);
    const damaged = code.slice(0, -3) + (code[code.length - 3] === 'A' ? 'B' : 'A') + code.slice(-2);
    expect(verifyChecksum(base64url.decode(damaged.slice(6)))).toBeNull();
  });
});

describe('LOMapR team-code ByteWriter', () => {
  it('writes the same bytes as the site writer', () => {
    const index = new Map([['Char_A', 1], ['Char_B', 2]]);
    for (let i = 0; i < 300; i += 1) {
      const ref = new LoByteWriter();
      const shared = new ByteWriter();
      const n = rand(2 ** 31);
      ref.byte(4); shared.byte(4);
      ref.varint(n); shared.varint(n);
      ref.id('Char_B', index); shared.id('Char_B', index);
      ref.id('Char_한글_' + i, index); shared.id('Char_한글_' + i, index);
      expect(shared.bytes).toEqual(ref.bytes);
      expect(base64url.encode(shared.bytes)).toBe(loB64(ref.bytes));
      const r = new ByteReader(base64url.decode(loB64(ref.bytes)), 'team code');
      expect(r.byte()).toBe(4);
      expect(r.varint()).toBe(n);
      expect(r.id(['Char_A', 'Char_B'])).toBe('Char_B');
      expect(r.id(['Char_A', 'Char_B'])).toBe('Char_한글_' + i);
      expect(r.done()).toBe(true);
    }
  });

  it('reports truncated input with its label', () => {
    expect(() => new ByteReader([0x80], 'team code').varint()).toThrow('team code: ended early');
  });
});

describe('Aigis DPS ?z= share link', () => {
  it('packJson produces the same link text and round-trips', async () => {
    const compact = [2, 101, 0, 0, 1, 2, 3, '', [12000, 300, 50], 0, 10, { a: 1, b: true }, ['x'], {}, [[5, 1, 2, 0, 3, 'row1']], 0];
    const ref = await dpsEncode(compact);
    expect(await packJson(compact)).toBe(ref);
    expect(await unpackJson(ref)).toEqual(compact);
  });
});

describe('primitives', () => {
  it('fnv1a32 matches known vectors', () => {
    expect(fnv1a32([])).toBe(0x811c9dc5);
    expect(fnv1a32(new TextEncoder().encode('a'))).toBe(0xe40c292c);
  });

  it('bitsets round-trip and skip id 0', () => {
    expect(idsFromBitset(bitsetFromIds([0, 1, 9, 9, 64]))).toEqual([1, 9, 64]);
  });

  it('base64url accepts standard base64 and handles large inputs', () => {
    const big = Uint8Array.from({ length: 200_000 }, (_, i) => i & 0xff);
    expect(base64url.decode(base64url.encode(big))).toEqual(big);
    expect(Array.from(base64url.decode('+/8='))).toEqual([0xfb, 0xff]);
    expect(() => base64url.decode('a b')).toThrow();
  });

  it('idList enforces limits', () => {
    const bytes = new ByteWriter().idList([5, 50]).bytes;
    expect(() => new ByteReader(bytes).idList({ maxId: 10 })).toThrow('invalid id');
    expect(() => new ByteReader(bytes).idList({ maxCount: 1 })).toThrow('too many entries');
  });
});
