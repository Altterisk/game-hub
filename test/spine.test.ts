// @vitest-environment jsdom
import { Blob as NodeBlob } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import {
  attachPanZoom, createPixiApp, loadSpineAtlas, mappedSourcePixelScale, percentileScale, readSkeletonFile, zoomAt,
  type Transformable,
} from '../src/spine';

function root(): Transformable {
  const r = {
    scale: { x: 1, y: 1, set(x: number, y = x) { r.scale.x = x; r.scale.y = y; } },
    position: { x: 0, y: 0, set(x: number, y: number) { r.position.x = x; r.position.y = y; } },
  };
  return r;
}

describe('zoomAt', () => {
  it('keeps the point under the cursor fixed', () => {
    const r = root();
    r.position.set(100, 50);
    zoomAt(r, 2, 120, 70);
    expect(r.scale.x).toBe(2);
    expect(r.position).toMatchObject({ x: 80, y: 30 });
  });
});

describe('attachPanZoom', () => {
  it('zooms on wheel and reports every transform', () => {
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({ left: 10, top: 20 } as DOMRect);
    const r = root();
    const onTransform = vi.fn();
    const detach = attachPanZoom(canvas, r, { onTransform });
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, clientX: 10, clientY: 20, cancelable: true }));
    expect(r.scale.x).toBeCloseTo(1.1);
    expect(onTransform).toHaveBeenCalledTimes(1);
    detach();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -1 }));
    expect(onTransform).toHaveBeenCalledTimes(1);
  });

  it('respects the zoom gate', () => {
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 } as DOMRect);
    const r = root();
    attachPanZoom(canvas, r, { zoomEnabled: () => false });
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, cancelable: true }));
    expect(r.scale.x).toBe(1);
  });
});

describe('pixel scale', () => {
  it('measures a 1:1 mapped quad as scale 1 and a doubled one as 2', () => {
    const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    const verts = [0, 0, 64, 0, 64, 64, 0, 64];
    const idx = [0, 1, 2, 0, 2, 3];
    const id = { a: 1, b: 0, c: 0, d: 1 };
    expect(mappedSourcePixelScale(verts, uvs, idx, 64, 64, id)).toBeCloseTo(1);
    expect(mappedSourcePixelScale(verts, uvs, idx, 64, 64, { a: 2, b: 0, c: 0, d: 2 })).toBeCloseTo(2);
  });

  it('percentileScale ignores high outliers', () => {
    expect(percentileScale([])).toBeNull();
    expect(percentileScale([1, 1.1, 1.2, 9, 30, 1.05, 1.15, 1.3, 1.25, 1.02, 50])).toBe(1.02);
  });
});

describe('spine loading with injected modules', () => {
  // jsdom's Blob lacks text()/arrayBuffer(); browsers and Node have them.
  const blob = (part: string | Uint8Array) => new NodeBlob([part]) as unknown as Blob;
  const files = new Map<string, Blob>([
    ['rig.atlas', blob('atlas text')],
    ['rig.json', blob('{"a":1}')],
    ['rig.skel', blob(new Uint8Array([1, 2, 3]))],
    ['p0.png', blob('png')],
    ['p0_alt.png', blob('png2')],
  ]);
  const loaded: unknown[] = [];
  const PIXI = { Assets: { load: vi.fn(async (o: unknown) => { loaded.push(o); return { source: 'src' }; }) } };
  class TextureAtlas {
    pages = [{ name: 'p0.png', pma: true, texture: null as unknown, setTexture(t: unknown) { this.texture = t; } }];
    constructor(readonly text: string) {}
  }
  const spine = {
    TextureAtlas,
    SpineTexture: { from: (s: unknown) => ({ wrapped: s }) },
    AtlasAttachmentLoader: class { constructor(readonly atlas: unknown) {} },
    SkeletonJson: class { scale = 1; constructor(readonly l: unknown) {} readSkeletonData(j: unknown) { return { kind: 'json', j, scale: this.scale }; } },
    SkeletonBinary: class { scale = 1; constructor(readonly l: unknown) {} readSkeletonData(b: Uint8Array) { return { kind: 'bin', n: b.length, scale: this.scale }; } },
  };
  URL.createObjectURL = vi.fn((b: Blob) => `blob:${(b as Blob).size}`);

  it('loads atlas pages with alpha mode and overrides', async () => {
    const atlas = await loadSpineAtlas({ PIXI, spine, name: 'rig', files, atlasName: 'rig.atlas', overrides: { 'p0.png': 'p0_alt.png' } });
    expect(atlas.text).toBe('atlas text');
    expect(atlas.pages[0].texture).toEqual({ wrapped: 'src' });
    expect(loaded[0]).toMatchObject({ loadParser: 'loadTextures', data: { alphaMode: 'premultiplied-alpha' }, src: 'blob:4' });
  });

  it('picks JSON or binary skeleton parsing and applies scale', async () => {
    const atlas = new TextureAtlas('');
    expect(await readSkeletonFile({ spine, atlas }, files, 'rig.json')).toEqual({ kind: 'json', j: { a: 1 }, scale: 1 });
    expect(await readSkeletonFile({ spine, atlas, scale: 0.5 }, files, 'rig.skel')).toEqual({ kind: 'bin', n: 3, scale: 0.5 });
  });
});

describe('createPixiApp', () => {
  it('destroys and returns null when cancelled during init', async () => {
    const destroy = vi.fn();
    class Application { init = async () => {}; destroy = destroy; canvas = document.createElement('canvas'); resize() {} }
    const host = document.createElement('div');
    expect(await createPixiApp({ PIXI: { Application }, host, cancelled: () => true })).toBeNull();
    expect(destroy).toHaveBeenCalledWith(true);
    const handle = await createPixiApp({ PIXI: { Application }, host });
    expect(host.firstChild).toBe(handle!.app.canvas);
    handle!.dispose();
    handle!.dispose();
    expect(destroy).toHaveBeenCalledTimes(2);
  });
});
