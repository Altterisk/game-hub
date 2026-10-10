import { readBytes, readText, urlFor, type ArchiveFiles } from './archive.js';

// pixi.js and @esotericsoftware/spine-pixi-v8 are passed in by the site, so only its own copy is ever loaded.
export type PixiModule = any;
export type SpineModule = any;

// A blob: URL has no extension, so PIXI's parser must be named or no texture is returned.
export function loadTexture(PIXI: PixiModule, name: string, files: ArchiveFiles, filename: string, data?: object): Promise<any> {
  return PIXI.Assets.load({ src: urlFor(name, files, filename), loadParser: 'loadTextures', ...(data ? { data } : {}) });
}

export interface SpineAtlasOptions {
  PIXI: PixiModule;
  spine: SpineModule;
  name: string;
  files: ArchiveFiles;
  atlasName: string;
  // Page name -> archive file to use instead (e.g. alternate textures for the same atlas).
  overrides?: Readonly<Record<string, string>>;
}

// `pma` on a page says whether its bytes are already premultiplied.
export async function loadSpineAtlas({ PIXI, spine, name, files, atlasName, overrides = {} }: SpineAtlasOptions): Promise<any> {
  const atlas = new spine.TextureAtlas(await readText(files, atlasName));
  await Promise.all(atlas.pages.map(async (page: any) => {
    const texture = await loadTexture(PIXI, name, files, overrides[page.name] ?? page.name, {
      alphaMode: page.pma ? 'premultiplied-alpha' : 'premultiply-alpha-on-upload',
    });
    page.setTexture(spine.SpineTexture.from(texture.source));
  }));
  return atlas;
}

export interface SkeletonDataOptions {
  spine: SpineModule;
  atlas: any;
  // Applied at parse time, like Unity's SkeletonDataAsset scale.
  scale?: number;
}

export function readSkeletonJson({ spine, atlas, scale }: SkeletonDataOptions, json: string | object): any {
  const parser = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas));
  if (scale !== undefined) parser.scale = scale;
  return parser.readSkeletonData(typeof json === 'string' ? JSON.parse(json) : json);
}

export function readSkeletonBinary({ spine, atlas, scale }: SkeletonDataOptions, bytes: Uint8Array): any {
  const parser = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas));
  if (scale !== undefined) parser.scale = scale;
  return parser.readSkeletonData(bytes);
}

// Picks the parser by extension: .skel/.bytes are binary, anything else JSON.
export async function readSkeletonFile(opts: SkeletonDataOptions, files: ArchiveFiles, filename: string): Promise<any> {
  return /\.(skel|bytes)$/i.test(filename)
    ? readSkeletonBinary(opts, await readBytes(files, filename))
    : readSkeletonJson(opts, await readText(files, filename));
}

export interface PixiAppOptions {
  PIXI: PixiModule;
  host: HTMLElement;
  // Checked after every await; a cancelled app is destroyed and null returned.
  cancelled?: () => boolean;
  init?: Record<string, unknown>;
  fixBlend?: boolean;
}

export interface PixiAppHandle {
  app: any;
  dispose(): void;
}

// Transparent, antialiased, autoDensity; follows the host element's size, which Pixi's resizeTo alone misses.
export async function createPixiApp({ PIXI, host, cancelled = () => false, init = {}, fixBlend = false }: PixiAppOptions): Promise<PixiAppHandle | null> {
  const app = new PIXI.Application();
  await app.init({ backgroundAlpha: 0, antialias: true, autoDensity: true, resizeTo: host, ...init });
  if (cancelled()) {
    app.destroy(true);
    return null;
  }
  if (fixBlend) fixBlendAlpha(app.renderer);
  host.replaceChildren(app.canvas);
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => app.resize());
  observer?.observe(host);
  let disposed = false;
  return {
    app,
    dispose() {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      app.destroy(true);
    },
  };
}

// Only straight compositing may write coverage: on a premultiplied transparent canvas, light blends must leave alpha alone.
export function fixBlendAlpha(renderer: unknown): void {
  const gl = (renderer as { gl?: WebGLRenderingContext })?.gl;
  const map = (renderer as { state?: { blendModesMap?: Record<string, number[]> } })?.state?.blendModesMap;
  if (!gl || !map) return;
  for (const mode of ['add', 'add-npm', 'multiply', 'screen', 'screen-npm']) {
    const factors = map[mode];
    if (factors) map[mode] = [factors[0], factors[1], gl.ZERO, gl.ONE];
  }
}

export interface Transformable {
  scale: { x: number; y: number; set(x: number, y?: number): void };
  position: { x: number; y: number; set(x: number, y: number): void };
}

export function zoomAt(root: Transformable, factor: number, x: number, y: number): void {
  const scale = root.scale.x * factor;
  root.position.set(x + (root.position.x - x) * factor, y + (root.position.y - y) * factor);
  root.scale.set(scale);
}

export type DragClaim = { move: (x: number, y: number) => void; end: () => void } | null;

export interface PanZoomOptions {
  // Lets a one-finger drag go to something else (e.g. dragging a bone) before panning.
  claimDrag?: (x: number, y: number) => DragClaim;
  zoomEnabled?: () => boolean;
  panEnabled?: () => boolean;
  // After every pan or zoom, e.g. to keep an overlay layer in lockstep.
  onTransform?: (root: Transformable) => void;
  wheelStep?: number;
  dragThreshold?: number;
}

// Wheel zoom toward the cursor, drag pan past a small threshold, two-finger pinch. Returns a cleanup.
export function attachPanZoom(canvas: HTMLCanvasElement, root: Transformable, options: PanZoomOptions = {}): () => void {
  const { claimDrag, zoomEnabled, panEnabled, onTransform, wheelStep = 1.1, dragThreshold = 4 } = options;
  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let rootStart = { x: 0, y: 0 };
  let pinchDist0 = 0;
  let pinchScale0 = 1;
  let pinchMid = { x: 0, y: 0 };
  let claimed: DragClaim = null;
  let claimId = -1;
  const local = (x: number, y: number) => {
    const rect = canvas.getBoundingClientRect();
    return { x: x - rect.left, y: y - rect.top };
  };
  const endClaim = () => {
    claimed?.end();
    claimed = null;
    claimId = -1;
  };
  const applyScale = (factor: number, mx: number, my: number) => {
    if (zoomEnabled && !zoomEnabled()) return;
    zoomAt(root, factor, mx, my);
    onTransform?.(root);
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = local(e.clientX, e.clientY);
    applyScale(e.deltaY < 0 ? wheelStep : 1 / wheelStep, p.x, p.y);
  };
  const onPointerDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      pinchDist0 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchScale0 = root.scale.x;
      pinchMid = local((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      dragging = false;
      endClaim();
    } else if (pointers.size === 1) {
      dragging = false;
      dragStart = { x: e.clientX, y: e.clientY };
      rootStart = { x: root.position.x, y: root.position.y };
      const p = local(e.clientX, e.clientY);
      claimed = claimDrag?.(p.x, p.y) ?? null;
      claimId = claimed ? e.pointerId : -1;
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (pinchDist0 > 0) applyScale((pinchScale0 * dist) / pinchDist0 / root.scale.x, pinchMid.x, pinchMid.y);
      return;
    }
    if (e.buttons === 0) return;
    if (claimed && e.pointerId === claimId) {
      const p = local(e.clientX, e.clientY);
      claimed.move(p.x, p.y);
      return;
    }
    if (panEnabled && !panEnabled()) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (!dragging && Math.hypot(dx, dy) < dragThreshold) return;
    dragging = true;
    root.position.set(rootStart.x + dx, rootStart.y + dy);
    onTransform?.(root);
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (e.pointerId === claimId) endClaim();
    if (pointers.size < 2) {
      pinchDist0 = 0;
      dragging = false;
    }
    if (pointers.size === 1) {
      const pt = pointers.values().next().value as { x: number; y: number };
      dragStart = { x: pt.x, y: pt.y };
      rootStart = { x: root.position.x, y: root.position.y };
    }
  };
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  return () => {
    endClaim();
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
  };
}

// A weighted mesh maps differently per triangle in the current pose, so every triangle is measured.
export function mappedSourcePixelScale(
  verts: ArrayLike<number>,
  uvs: ArrayLike<number>,
  indices: ArrayLike<number>,
  textureWidth: number,
  textureHeight: number,
  transform: { a: number; b: number; c: number; d: number },
): number {
  let maxScale = 0;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const i0 = indices[i] * 2, i1 = indices[i + 1] * 2, i2 = indices[i + 2] * 2;
    const sx1 = (uvs[i1] - uvs[i0]) * textureWidth;
    const sy1 = (uvs[i1 + 1] - uvs[i0 + 1]) * textureHeight;
    const sx2 = (uvs[i2] - uvs[i0]) * textureWidth;
    const sy2 = (uvs[i2 + 1] - uvs[i0 + 1]) * textureHeight;
    const det = sx1 * sy2 - sx2 * sy1;
    if (Math.abs(det) < 1e-8) continue;
    const vx1 = verts[i1] - verts[i0], vy1 = verts[i1 + 1] - verts[i0 + 1];
    const vx2 = verts[i2] - verts[i0], vy2 = verts[i2 + 1] - verts[i0 + 1];
    const dx1 = transform.a * vx1 + transform.c * vy1;
    const dy1 = transform.b * vx1 + transform.d * vy1;
    const dx2 = transform.a * vx2 + transform.c * vy2;
    const dy2 = transform.b * vx2 + transform.d * vy2;
    const a = (dx1 * sy2 - dx2 * sy1) / det;
    const c = (-dx1 * sx2 + dx2 * sx1) / det;
    const b = (dy1 * sy2 - dy2 * sy1) / det;
    const d = (-dy1 * sx2 + dy2 * sx1) / det;
    const sumSq = a * a + b * b + c * c + d * d;
    const mapDet = a * d - b * c;
    const discriminant = Math.max(0, sumSq * sumSq - 4 * mapDet * mapDet);
    maxScale = Math.max(maxScale, Math.sqrt((sumSq + Math.sqrt(discriminant)) / 2));
  }
  return maxScale;
}

// Source-atlas pixels per world unit for each drawn attachment of a Spine object in its current pose.
export function attachmentScales(spineObject: any, spine: SpineModule): number[] {
  if (!spineObject?.visible) return [];
  const scales: number[] = [];
  for (const slot of spineObject.skeleton.slots) {
    const attachment = slot.getAttachment();
    const page = attachment?.region?.page;
    if (!attachment || !page?.width || !page?.height) continue;
    let vertices: Float32Array;
    let indices: ArrayLike<number>;
    if (attachment instanceof spine.RegionAttachment) {
      vertices = new Float32Array(8);
      attachment.computeWorldVertices(slot, vertices, 0, 2);
      indices = [0, 1, 2, 0, 2, 3];
    } else if (attachment instanceof spine.MeshAttachment) {
      vertices = new Float32Array(attachment.worldVerticesLength);
      attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, vertices, 0, 2);
      indices = attachment.triangles;
    } else {
      continue;
    }
    const scale = mappedSourcePixelScale(vertices, attachment.uvs, indices, page.width, page.height,
      { a: spineObject.scale.x, b: 0, c: 0, d: spineObject.scale.y });
    if (scale > 0 && Number.isFinite(scale)) scales.push(scale);
  }
  return scales;
}

// A low percentile is near-native and ignores filler regions stretched far past their own size.
export function percentileScale(scales: readonly number[], percentile = 0.1): number | null {
  if (!scales.length) return null;
  const sorted = scales.slice().sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * percentile)];
}

export interface StageRenderOptions {
  PIXI: PixiModule;
  app: any;
  root: any;
  // Source pixels per world unit; the render is scaled so one source pixel becomes one output pixel.
  pixelScale: number;
  maxDim?: number;
  // 'clamp' saves one size down when too large; 'refuse' returns null.
  oversize?: 'clamp' | 'refuse';
}

export function renderStageCanvas({ PIXI, app, root, pixelScale, maxDim = 16384, oversize = 'clamp' }: StageRenderOptions): HTMLCanvasElement | null {
  const fitScale = root.scale.x;
  const bounds = root.getBounds();
  let exportScale = 1 / pixelScale / fitScale;
  if (oversize === 'clamp') exportScale = Math.min(exportScale, maxDim / bounds.width, maxDim / bounds.height);
  const width = Math.ceil(bounds.width * exportScale);
  const height = Math.ceil(bounds.height * exportScale);
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width > maxDim || height > maxDim) return null;
  const rt = PIXI.RenderTexture.create({ width, height });
  const matrix = new PIXI.Matrix(exportScale, 0, 0, exportScale, -bounds.x * exportScale, -bounds.y * exportScale);
  app.renderer.render({ container: app.stage, target: rt, transform: matrix, clear: true });
  const canvas = app.renderer.extract.canvas({ target: rt }) as HTMLCanvasElement;
  rt.destroy(true);
  return canvas;
}

// Crops to the non-transparent pixels; null when everything is transparent.
export function tightCrop(src: HTMLCanvasElement): HTMLCanvasElement | null {
  const w = src.width, h = src.height;
  const px = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (px[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d')!.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

export function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): Promise<boolean> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(true);
    }, 'image/png');
  });
}

// Renders the stage at native resolution, tight-crops and downloads it. Resolves false when nothing was saved.
export async function saveStagePng(options: StageRenderOptions & { fileName: string }): Promise<boolean> {
  const canvas = renderStageCanvas(options);
  const cropped = canvas && tightCrop(canvas);
  return cropped ? downloadCanvas(cropped, options.fileName) : false;
}

export interface VideoRecording {
  stop(): void;
  cancel(): void;
  audio: boolean;
  width: number;
  height: number;
}

export interface CanvasVideoOptions {
  canvas: HTMLCanvasElement;
  // Without extension; .webm or .mp4 is added from what the browser recorded.
  fileName: string;
  onStop?: () => void;
  // Tracks are shared, so they are not stopped when the recording ends.
  audioTracks?: readonly MediaStreamTrack[];
  fps?: number;
  bitsPerPixel?: number;
  minBitrate?: number;
  maxBitrate?: number;
  audioBitrate?: number;
}

const VIDEO_TYPES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
const AUDIO_VIDEO_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

export function canRecordCanvas(): boolean {
  return typeof MediaRecorder !== 'undefined'
    && typeof HTMLCanvasElement !== 'undefined'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

export function startCanvasVideo(options: CanvasVideoOptions): VideoRecording | null {
  if (!canRecordCanvas()) return null;
  const {
    canvas, fileName, onStop, audioTracks = [], fps = 60, bitsPerPixel = 0.1,
    minBitrate = 6_000_000, maxBitrate = 48_000_000, audioBitrate = 160_000,
  } = options;
  const video = canvas.captureStream(fps);
  const types = audioTracks.length ? AUDIO_VIDEO_TYPES : VIDEO_TYPES;
  const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
  const stream = new MediaStream([...video.getVideoTracks(), ...audioTracks]);
  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: Math.round(Math.min(maxBitrate, Math.max(minBitrate, canvas.width * canvas.height * fps * bitsPerPixel))),
    ...(audioTracks.length ? { audioBitsPerSecond: audioBitrate } : {}),
  });
  const chunks: Blob[] = [];
  let download = true;
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.onstop = () => {
    for (const track of video.getTracks()) track.stop();
    if (download && chunks.length) {
      const type = recorder.mimeType || mimeType || 'video/webm';
      const url = URL.createObjectURL(new Blob(chunks, { type }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    onStop?.();
  };
  recorder.start(250);
  return {
    audio: audioTracks.length > 0,
    width: canvas.width,
    height: canvas.height,
    stop: () => { if (recorder.state !== 'inactive') recorder.stop(); },
    cancel: () => {
      download = false;
      if (recorder.state !== 'inactive') recorder.stop();
    },
  };
}
