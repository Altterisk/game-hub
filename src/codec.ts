export type ByteSource = Uint8Array | readonly number[];

export interface IdListLimits {
  maxCount?: number;
  maxId?: number;
}

export interface CompactIdListLimits extends IdListLimits {
  maxBitsetBytes?: number;
}

const DEFAULT_LIMITS = { maxCount: 10_000, maxId: 10_000_000, maxBitsetBytes: 1_250_001 };

export function uniqueSortedIds(values: Iterable<number>): number[] {
  return [...new Set([...values].filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
}

// LSB-first: bit (id % 8) of byte floor(id / 8); id 0 is never set.
export function bitsetFromIds(ids: Iterable<number>): number[] {
  const sorted = uniqueSortedIds(ids);
  if (!sorted.length) return [];
  const out = new Array<number>(Math.floor(sorted[sorted.length - 1] / 8) + 1).fill(0);
  for (const id of sorted) out[Math.floor(id / 8)] |= 1 << (id % 8);
  return out;
}

export function idsFromBitset(bytes: ByteSource): number[] {
  const ids: number[] = [];
  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
    const byte = bytes[byteIndex];
    for (let bit = 0; bit < 8; bit += 1) {
      const id = byteIndex * 8 + bit;
      if (id > 0 && (byte & (1 << bit)) !== 0) ids.push(id);
    }
  }
  return ids;
}

export class ByteWriter {
  readonly bytes: number[] = [];

  byte(n: number): this {
    this.bytes.push(n & 0xff);
    return this;
  }

  raw(bytes: ByteSource): this {
    for (let i = 0; i < bytes.length; i += 1) this.bytes.push(bytes[i] & 0xff);
    return this;
  }

  varint(n: number): this {
    let v = Math.max(0, Math.floor(n));
    while (v >= 0x80) {
      this.byte((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    return this.byte(v);
  }

  text(value: string): this {
    const encoded = new TextEncoder().encode(value);
    this.varint(encoded.length);
    return this.raw(encoded);
  }

  // A 1-based index into a stable id table, or 0 followed by the id inline.
  id(value: string, index: ReadonlyMap<string, number>): this {
    const ref = index.get(value) ?? 0;
    this.varint(ref);
    return ref ? this : this.text(value);
  }

  // Count, then deltas between sorted unique positive ids.
  idList(values: Iterable<number>): this {
    const sorted = uniqueSortedIds(values);
    this.varint(sorted.length);
    let previous = 0;
    for (const id of sorted) {
      this.varint(id - previous);
      previous = id;
    }
    return this;
  }

  // Mode byte 0 + idList, or mode 1 + varint length + bitset; whichever is shorter.
  compactIdList(values: Iterable<number>): this {
    const sorted = uniqueSortedIds(values);
    const deltas = new ByteWriter().idList(sorted).bytes;
    const bitset = bitsetFromIds(sorted);
    const lengthBytes = new ByteWriter().varint(bitset.length).bytes;
    if (bitset.length && bitset.length + lengthBytes.length < deltas.length) {
      return this.byte(1).raw(lengthBytes).raw(bitset);
    }
    return this.byte(0).raw(deltas);
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

export class ByteReader {
  pos = 0;
  private readonly bytes: ByteSource;

  constructor(bytes: ByteSource, private readonly label = 'code') {
    this.bytes = bytes;
  }

  get length(): number {
    return this.bytes.length;
  }

  get remaining(): number {
    return this.bytes.length - this.pos;
  }

  done(): boolean {
    return this.pos >= this.bytes.length;
  }

  fail(message: string): never {
    throw new Error(`${this.label}: ${message}`);
  }

  byte(): number {
    if (this.pos >= this.bytes.length) this.fail('ended early');
    return this.bytes[this.pos++];
  }

  raw(count: number): number[] {
    if (count < 0 || count > this.remaining) this.fail('ended early');
    const out: number[] = [];
    for (let i = 0; i < count; i += 1) out.push(this.bytes[this.pos++]);
    return out;
  }

  varint(maxBytes = 5): number {
    let value = 0;
    let mul = 1;
    for (let i = 0; i < maxBytes; i += 1) {
      const b = this.byte();
      value += (b & 0x7f) * mul;
      if (!(b & 0x80)) return value;
      mul *= 128;
    }
    return this.fail('invalid varint');
  }

  text(): string {
    const length = this.varint();
    if (length > this.remaining) this.fail('invalid string');
    return new TextDecoder().decode(Uint8Array.from(this.raw(length)));
  }

  id(ids: readonly string[]): string {
    const ref = this.varint();
    if (!ref) return this.text();
    const value = ids[ref - 1];
    if (!value) this.fail('unknown id');
    return value;
  }

  idList(limits: IdListLimits = {}): number[] {
    const { maxCount, maxId } = { ...DEFAULT_LIMITS, ...limits };
    const count = this.varint();
    if (count > maxCount) this.fail('too many entries');
    const out: number[] = [];
    let previous = 0;
    for (let i = 0; i < count; i += 1) {
      const id = previous + this.varint();
      if (id <= previous || id > maxId) this.fail('invalid id');
      out.push(id);
      previous = id;
    }
    return out;
  }

  compactIdList(limits: CompactIdListLimits = {}): number[] {
    const { maxCount, maxBitsetBytes } = { ...DEFAULT_LIMITS, ...limits };
    const mode = this.byte();
    if (mode === 0) return this.idList(limits);
    if (mode !== 1) this.fail('unsupported list encoding');
    const length = this.varint();
    if (length > maxBitsetBytes || length > this.remaining) this.fail('invalid bitset');
    const ids = idsFromBitset(this.raw(length));
    if (ids.length > maxCount) this.fail('too many entries');
    return ids;
  }
}

function toBinaryString(bytes: ByteSource): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...Array.prototype.slice.call(bytes, i, i + 0x8000));
  }
  return out;
}

export const base64url = {
  encode(bytes: ByteSource): string {
    return btoa(toBinaryString(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  // Accepts base64url or standard base64, padded or not.
  decode(value: string): Uint8Array {
    const b64 = value.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
    if (!/^[A-Za-z0-9+/]*$/.test(b64)) throw new Error('invalid base64');
    const raw = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  },
};

export function fnv1a32(bytes: ByteSource): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Appends fnv1a32(body) as 4 little-endian bytes.
export function withChecksum(body: ByteSource): number[] {
  const sum = fnv1a32(body);
  return [...Array.from(body), sum & 0xff, (sum >>> 8) & 0xff, (sum >>> 16) & 0xff, (sum >>> 24) & 0xff];
}

// The body without its checksum, or null when it does not match.
export function verifyChecksum(bytes: ByteSource): number[] | null {
  if (bytes.length < 4) return null;
  const body = Array.from(bytes).slice(0, -4);
  const t = bytes.length - 4;
  const stored = (bytes[t] | (bytes[t + 1] << 8) | (bytes[t + 2] << 16) | (bytes[t + 3] << 24)) >>> 0;
  return fnv1a32(body) === stored ? body : null;
}

async function pipe(bytes: ByteSource, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export function deflateRaw(bytes: ByteSource): Promise<Uint8Array> {
  return pipe(bytes, new CompressionStream('deflate-raw'));
}

export function inflateRaw(bytes: ByteSource): Promise<Uint8Array> {
  return pipe(bytes, new DecompressionStream('deflate-raw'));
}

// JSON -> deflate-raw -> base64url, for state carried in a URL parameter.
export async function packJson(value: unknown): Promise<string> {
  return base64url.encode(await deflateRaw(new TextEncoder().encode(JSON.stringify(value))));
}

export async function unpackJson<T = unknown>(code: string): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await inflateRaw(base64url.decode(code)))) as T;
}
