# game-hub

Shared shell for the altterisk.cc game sites: top bar with game switcher, footer,
design tokens, a Chakra theme and plain-CSS component classes, plus the hub landing
page at `hub.altterisk.cc`.

Each game site stays in its own repo with its own build, data and deploy. They only
share this package, pinned to a tag, so updating one site never forces a rebuild of
another.

| Site | Repo | URL | Accent |
|---|---|---|---|
| Aigis Database | Altterisk/Aigis-Enemy | aigis.altterisk.cc | `#7aa2f7` |
| LOMapR | anyabot/LOMapR | lo.altterisk.cc | `#f2727f` |
| MAD Viewer | anyabot/MAD-Viewer | mad.altterisk.cc | `#f6c445` |

## What's in it

| Import | Use |
|---|---|
| `@altterisk/game-hub` | `HubBar`, `HubFooter`, `GameMark`, `GameIcon`, `GAMES`, `tokens`, `accentScale`, and the list components below |
| `@altterisk/game-hub/chakra` | `hubChakraTheme(game)` → pass to Chakra v2 `extendTheme` |
| `@altterisk/game-hub/hub.css` | Tokens as CSS variables, bar, switcher, footer. **Every site imports this.** |
| `@altterisk/game-hub/base.css` | Global element defaults (plain-CSS sites only) |
| `@altterisk/game-hub/components.css` | `.hub-panel`, `.hub-btn`, `.hub-input`, `.hub-table`, `.hub-tabs`, `.hub-badge`, `.hub-chip`, `.hub-pager`… Only `hub-*` classes and no element resets, so Chakra sites can import it too (needed for the list components). |
| `@altterisk/game-hub/codec` | Binary share/restore codes (see below) |
| `@altterisk/game-hub/data` | JSON loader and URL helpers |
| `@altterisk/game-hub/persist` | Versioned localStorage, plan-file export/import, one-time notices |
| `@altterisk/game-hub/filters` | Tri-state filters, text search, URL-backed list state |
| `@altterisk/game-hub/archive` | `.tar.br` asset archives (needs `brotli-dec-wasm` in the site) |
| `@altterisk/game-hub/spine` | Pixi/Spine viewer primitives (the site passes its own `pixi.js` and `spine-pixi-v8`) |

Put `data-game="<id>"` on `<html>` so the whole page picks up the game's accent.

## Install in a site

```sh
npm install github:Altterisk/game-hub#v0.2.0
```

`prepare` builds `dist/` on install. Bump the tag in a site's `package.json` when
that site wants the newer shell; other sites keep their pinned version.

## Shared building blocks (v0.2.0)

Lifted from code the three sites had each written or copied separately. Each site's
own formats, URLs and storage keys stay site-side; these are the mechanics.

### `/codec`

- `ByteWriter` / `ByteReader`: `byte`, `raw`, `varint` (LEB128), `text` (length-prefixed UTF-8),
  `id` (1-based index into an append-only id table, 0 + inline text otherwise), `idList`
  (count + deltas of sorted unique ids), `compactIdList` (mode 0 delta list or mode 1 bitset,
  whichever is shorter). `ByteReader(bytes, label)` errors read `"<label>: ended early"` etc.
- `base64url.encode/decode` (decode also takes standard base64), `fnv1a32`, `withChecksum` /
  `verifyChecksum` (4-byte little-endian FNV-1a trailer), `bitsetFromIds` / `idsFromBitset`.
- `deflateRaw` / `inflateRaw` and `packJson` / `unpackJson` (JSON → deflate-raw → base64url).
- Byte-for-byte compatible with Aigis `AIGC3.` codes, LOMapR `4.` team codes and Aigis DPS
  `?z=` links (golden tests in `test/codec.test.ts`).

### `/data`

- `createJsonLoader({ urls: name => string[], retry = 1, retryOn })` → `{ load, peek, forget }`.
  Concurrent loads share one request; successes are cached; failures are evicted so the next
  call refetches. Candidate URLs are tried in order (region → global, local → CDN). Network
  errors and 408/429/5xx get `retry` extra passes; pass `retryOn: () => true` to retry every
  status.
- `useJson(loader, name | null)` → `{ data, loading, error }`; fetches only in effects.
- `bucketFor(id, bounds)` + `parseBounds(csv)` (inclusive upper bounds), `jsdelivrBase(...)`,
  `trimSlash`.

### `/persist`

- `createPersisted({ key, version, empty, sanitize, migrate?, legacyKeys? })` →
  `{ load, save, clear, toRecord, fromRecord }`. Stored as `{"__v": version, "data": ...}`;
  anything without that envelope (data written before adoption) is version 0 and goes through
  `migrate(raw, 0, sourceKey)`. Every read is sanitised; failures return `empty()`.
- `fileText` / `exportFile` / `parseFile` / `readFile`: `{ format, version, ...fields }` JSON
  files (MAD's plan-file shape), refusing other formats and newer versions.
- `createSeenStore(key)` → `{ restore, isFresh, markSeen, reset, useShouldShow }` for
  once-per-release notices; nothing shows before `restore()` runs after mount.

### `/filters`

- `FilterMode` (`0 | 1 | -1`), `nextFilterMode`, `filterValueAllowed` (LOMapR semantics).
- `textMatch(query, fields)`: every token in some field, NFKC + case-insensitive.
- `listState(adapter)` / `useListState(adapter)`: text, CSV lists and tri-state modes
  (`"a,-b"`) in URL params; any filter change resets `page`. Adapters:
  `searchParamsAdapter(...useSearchParams())` (react-router) and `nextRouterAdapter(useRouter())`
  (Next pages router, shallow replace). `paginate`, `pageCount`.

### Components (root export, styled by `components.css`)

`SearchBox`, `FilterRow`, `FilterChip` (`active` or tri-state `mode`), `CheckboxGroup`,
`Pager` (1-based, translatable `labels`), `CardGrid`, `FallbackImage` (`srcs` tried in order,
then a placeholder), `CopyButton` / `ShareButton` (value may be async), `copyText`.

### `/archive`

`loadArchive(name, urlsFor, { decompress?, fetch? })` tries each URL, untars, caches per name
and evicts failures. `untar` reads USTAR including PAX names and the prefix field. `urlFor`,
`revokeArchiveUrls`, `readText`, `readBytes`, `cacheArchive` (for site-specific loaders such as
loose files), `loadBrotli` (lazy `brotli-dec-wasm`; an optional peer dependency).

### `/spine`

Pass the site's `pixi.js` and `@esotericsoftware/spine-pixi-v8` modules in.
`loadTexture`, `loadSpineAtlas({ PIXI, spine, name, files, atlasName, overrides })`,
`readSkeletonJson` / `readSkeletonBinary` / `readSkeletonFile` (scale applied at parse),
`createPixiApp({ PIXI, host, cancelled })` (autoDensity, host ResizeObserver, returns null if
cancelled mid-init), `attachPanZoom(canvas, root, { claimDrag, zoomEnabled, panEnabled,
onTransform })`, `zoomAt`, `mappedSourcePixelScale`, `attachmentScales`, `percentileScale`,
`renderStageCanvas` / `tightCrop` / `downloadCanvas` / `saveStagePng` (`oversize: 'clamp' |
'refuse'`), `canRecordCanvas` / `startCanvasVideo` (audio tracks passed in), `fixBlendAlpha`.

## Wiring

### Aigis (Vite + React Router)

```tsx
// main.tsx
import '@altterisk/game-hub/hub.css';
import '@altterisk/game-hub/base.css';
import '@altterisk/game-hub/components.css';

// App.tsx
import { HubBar, HubFooter } from '@altterisk/game-hub';
<HubBar
  game="aigis"
  logo={<img src="/logo.png" alt="" />}
  renderHomeLink={(p) => <Link to="/" {...p} />}
  nav={<><NavLink to="/units">Units</NavLink>…</>}
/>
```

React Router's `NavLink` adds `class="active"`, which the bar already styles.

Chrome text defaults to English. Translate it with `labels` on `HubBar`
(`switchGame`, `allGames`, `here`) and `HubFooter` (`source`, `portfolio`,
`allGames`). Pass `homeHref` when the site is served under a base path; the
switcher's own-site entry and the default home link use it.

### LOMapR / MAD (Next pages router + Chakra)

```tsx
// pages/_app.tsx
import '@altterisk/game-hub/hub.css';
import { hubChakraTheme } from '@altterisk/game-hub/chakra';
const theme = extendTheme(hubChakraTheme('lo'), { /* site-only overrides */ });

// components/layout.tsx
<HubBar
  game="lo"
  renderHomeLink={(p) => <NextLink href="/" {...p} />}
  nav={NAV.map((n) => <NextLink key={n.href} href={n.href} aria-current={active ? 'page' : undefined}>…</NextLink>)}
  actions={<RegionPicker />}
/>
```

```tsx
// pages/_document.tsx
<Html lang="en" data-game="lo">
```

Add `transpilePackages: ['@altterisk/game-hub']` to `next.config.js` if Next complains
about the package's ESM.

## Adding a game

Add an entry to `GAMES` in `src/games.ts`, its accent to `styles/hub.css`
(`[data-game="…"]`) and `GameId`, tag a release. Each site picks up the new switcher
entry when it bumps its pin.

## Hub page and demo

```sh
npm install
npm run dev      # http://localhost:5173 (hub) and /demo.html (component preview)
npm run build    # library → dist/, hub site → dist-site/
npm test         # vitest: codec golden tests, loaders, persistence, filters, archive, spine, components
```

Deployed by Cloudflare Pages on every push to `main` (build `npm run build`,
output `dist-site`, custom domain `hub.altterisk.cc`). The demo page renders the real bar and sample
components in each game's accent; it is the reference for the restyle.
