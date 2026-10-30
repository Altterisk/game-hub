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
| Taimanin RPGX Database | anyabot/Taimanin-RPGX-Database | taimanin.altterisk.cc | `#e879f9` |

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
| `@altterisk/game-hub/meta`, `/meta/dom`, `/meta/next`, `/build`, `/time`, `/audio`, `/text` | SEO head tags and build files, event phases, one-at-a-time audio, game-text markup (see "Framework modules") |
| `@altterisk/game-hub/spine` | Pixi/Spine viewer primitives (the site passes its own `pixi.js` and `spine-pixi-v8`) |
| `@altterisk/game-hub/viewer` | Chakra v2 viewer chrome: labelled control panel pieces, layer panel, `ViewerShell` (needs `@chakra-ui/react` in the site) |

Put `data-game="<id>"` on `<html>` so the whole page picks up the game's accent.

## Install in a site

```sh
npm install github:Altterisk/game-hub#v0.4.0
```

`prepare` builds `dist/` on install. Bump the tag in a site's `package.json` when
that site wants the newer shell; other sites keep their pinned version.

## Shared building blocks (v0.2.0, `/viewer` since v0.3.0, page parts since v0.4.0)

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
  `migrate(raw, 0, sourceKey)`. Stored text that is not JSON (a bare `kr`, a raw share code)
  arrives as that string. Every read is sanitised; failures return `empty()`.
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
  (Next pages router, shallow replace). The Next adapter reads the live `location.search` (the
  `useRouter()` snapshot lags a render) and builds a second change on one whose `replace` has
  not landed yet. `paginate`, `pageCount`.

### Components (root export, styled by `components.css`)

`SearchBox`, `FilterRow`, `FilterChip` (`active` or tri-state `mode`), `CheckboxGroup`,
`Pager` (1-based, translatable `labels`), `CardGrid`, `FallbackImage` (`srcs` tried in order,
then a placeholder), `CopyButton` / `ShareButton` (value may be async), `copyText`.

Effect-index pieces (a page that lists who has an effect):

- `FilterChip` `count` prop: a muted number after the label (`.hub-chip__count`). An inactive
  chip with a count of 0 gets `.hub-chip--empty` (dimmed).
- `SegmentedButtons({ options, selected, onToggle, label })`: joined buttons (`.hub-seg`,
  `.hub-seg__btn`, `aria-pressed`). `selected` is an array for a multi-toggle group or one
  string for a switch.
- `.hub-toolbar--panel`: a `.hub-toolbar` boxed as a panel. Wrap the search box or a count in
  `.hub-toolbar__end` to push it to the right edge.
- `GroupCard({ title, count, meta, note })`: `.hub-group-card` with a head (title, accent count
  badge, meta on the right), an optional note line (colour: `--hub-group-note-color`, default
  the accent) and a body. Lay cards out with `.hub-group-grid` (two-up at desktop width, one-up
  on phones) or `.hub-group-grid--wide` (always one-up).
- `.hub-table--stack`: opt-in phone layout for any table. Under 600px each row becomes a card
  and each `td` shows its column name from `data-label`. Works without `.hub-table`.

### Page parts (v0.4.0, root export, styled by `components.css`)

Shared layout pieces for pages every site has (stage hub and detail, unit detail, entity
lists, collections). Plain React, so plain-CSS and Chakra sites both use them; all text comes
in through props or `labels`. Anything that renders a link takes `renderLink` (default
`plainLink`, a plain `<a>`), e.g. `({ href, ...p }) => <Link to={href} {...p} />` or
`({ href, ...p }) => <NextLink href={href} {...p} />`. Full comparison and adoption plan:
`D:\Project\Web\PAGE_TEMPLATES_PLAN.md` (outside this repo).

- Page skeleton: `Breadcrumbs({ items })` (last item is the current page),
  `PageHeader({ art, title, subtitle, id, badges, meta, actions, level })`,
  `MetaChips` / `MetaChip({ label, value, icon, href })`, `Panel({ title, note, actions, level })`,
  `StatRows({ rows, columns })` / `StatRow` (a `<dl>`), `EmptyState`, `LoadState({ loading, error,
  retry })`.
- Tabs: `UrlTabs({ tabs, active, onChange, label, idBase })` (WAI-ARIA tabs, arrow/Home/End keys,
  `hidden` tabs dropped, optional `count`) + `TabPanel`. `tabParam(adapter, tabs, key = 'tab')`
  returns `[active, setActive]` backed by the URL through the `/filters` adapters; the first
  visible tab is the default and keeps the URL clean, and switching tabs never resets `page`.
- Lists: `ListToolbar({ search, count, actions, activeFilters, onClearFilters })`,
  `FilterPanel({ open, onToggle, activeCount, phoneOnly })` (collapsible; with `phoneOnly`, always
  open from 768px), `EntityTile({ href, icon, title, subtitle, badges })`. `/filters` adds
  `useUrlText(list, ready, key)` for a search box that hydrates from the URL once and then leads.
- Stage pages: `BannerCard({ href, art, title, badge, window, count, highlight })`,
  `IconPreview({ label, count, max })` (capped icon row with "+N"),
  `StageCard({ href, title, id, meta, previews })`, `RewardGrid({ items })` (`amount`, `chance`
  0..1 shown via `formatChance`, optional `href`/`note`), `WaveNav({ count, index, onChange })`.
- Detail and collection: `LevelControl({ value, min, max, step, onChange, label, marks })` (slider +
  number box, clamps), `ProgressBar({ value, max, label })`, `Modal`, `Lightbox({ items, index,
  onIndex, onClose })`, `BackupPanel({ code, onImportCode, onExportFile, onImportFile })` (import
  handlers return an error message or nothing), `ReleaseList` / `ChangelogDialog` (pair with
  `createSeenStore(...).useShouldShow('changelog:' + latest.date)`).

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

### `/viewer`

Chakra v2 components for a viewer's control panel; `@chakra-ui/react` is an optional peer, so
plain-CSS sites never load it. Colours use `accent.*`; all text comes in through props.

- `ViewerShell({ stage, panel, height, theater, onTheaterChange, labels })`: stage beside a
  scrolling panel on `lg`+, stacked on phones; theatre mode fills the window with the stage
  (z-index 1400, Escape or the on-stage button leaves it).
- `ControlSection` (renders nothing without rows), `ControlRow`, `SegmentedControl` (icon or
  image per option), `ToggleRow` (spelled-out on/off, `labels`), `ActionButton`,
  `OverlaySelect` (portalled, grouped options), `LayerPanel` (grouped slots, filter, group
  hide/show, `labels`), `ViewerIcon` + `ViewerIconName`.

## Framework modules (v0.5.0)

### Legal notice

`HubFooter` prints a legal line on every site, after `note`: the game's rights holder from
`Game.rights` ("… are the property of Valofe. All rights belong to Valofe."), or generic
wording when a game has none, then "Site code: AGPL-3.0" linking to the repo's `LICENSE`.
`legal` replaces it (`false` hides it); `labels.rights(owner, title)`, `labels.unowned` and
`labels.license` translate it. `rightsText(game)` and `licenseUrl(source)` give the same text
for about pages and READMEs.

### `/meta`, `/meta/dom`, `/meta/next`

Page titles, descriptions, canonicals, Open Graph and JSON-LD from one definition, with no
Next or router dependency.

- `createSiteMeta({ game, url, homeTitle, format, defaultDescription, defaultImage })` returns
  `fullTitle`, `sitePath` (each segment encoded once), `canonicalUrl(path, query, keep)` (only
  the `keep` params, in that order), `absUrl`, `headTags(page, url)` (`url: null` omits
  canonical and `og:url`), `websiteLd`, `breadcrumbLd`. Default title format:
  `<title> — <game title> | <site name>`.
- Helpers: `clip`, `sentence`, `plainText(text, strip?)`, `escapeHtml`, `jsonLdText`,
  `headHtml(tags)` (static HTML).
- `/meta/dom`: `applyHead(tags)` / `useHead(tags)` write `document.head` (Vite sites). Tags a
  page no longer wants (canonical, robots, `og:url`, `og:image`) are removed, including ones
  baked into prerendered HTML.
- `/meta/next`: `createSeo({ site, Head, useRouter, identityParams, basePath })` → `{ Seo }`.
  Pass `next/head` and `next/router`'s `useRouter`. On query-routed pages listed in
  `identityParams` the canonical waits for `isReady`, so prerendered HTML never names the bare
  route for every entity.

### `/build` (Node)

`sitemapXml(urls)`, `robotsTxt(origin, { disallow })`, `writeSitemap`, `writeRobots`,
`htmlRoutes(dir, { exclude })` (`units/index.html` and `units.html` → `/units/`),
`countFiles`, `renderStatic(template, tags, body)` (swaps the template's head tags, fills the
empty `#root`), and `prerenderPlugin({ pages, url, origin, robots, fileBudget, localOnly })`,
a Vite plugin writing a static HTML file per page plus sitemap and robots after `vite build`.
From a CommonJS script, load it with `await import('@altterisk/game-hub/build')`.

### App shell (root export, styled by `hub.css`)

- `SiteShell({ game, nav, actions, renderHomeLink, footer, belowBar, resetKey, contentWidth, scrollTop, contained })`:
  skip link, `HubBar`, `<main id="hub-main">` inside an `ErrorBoundary`, `HubFooter`.
- `ErrorBoundary({ resetKey, fallback, onError, labels })`: a retry panel instead of a blank
  page; a new `resetKey` (the route path) clears it.
- `NotFound({ title, hint, homeHref, renderLink })`. Set `noindex` through `/meta`.
- `NavMenu({ label, items, renderLink, showActiveLabel })`: the bar's "Etc" dropdown, portalled
  (the nav row scrolls and would clip it), kept on screen, arrow keys/Home/End/Escape.
- `Gate({ storageKey, title, acceptLabel, leaveLabel, param, page })`: once-per-browser age or
  content warning over the page; works without stylesheets and through a plain `?enter=1` link.
- `ScrollTop`, `routerLinks(Link, 'href' | 'to')` → `RenderLink`, `homeLink(Link)` →
  `renderHomeLink`, `useDismiss`, `useAnchoredPosition`.

### Utilities

- `/persist` adds `createSetting({ key, initial, sanitize, legacyKeys })` → `get`, `set`,
  `reset`, `use()`: one saved preference shared by every reader (`useSyncExternalStore`;
  `initial` on the server). Bare strings stored before adoption reach `sanitize` as text.
  Also `saveBlob(blob, fileName)`.
- `/time`: `phaseOf({ start, end, stagesEnd }, now)` → `upcoming | running | exchange | ended`
  (a date-only end counts the whole day), `untilNext`, `formatRemaining(ms, units)`,
  `useNow(interval)` (`null` until hydrated), `<LiveBadge window labels countdown>`.
- `/audio`: `createPlayer({ cacheSize })` → `play(id, source)`, `toggle`, `stop`,
  `useNowPlaying()`. One clip at a time; a later `play` cancels a slower earlier load.
- `/text`: `tokenize(text, rules)` and `<RichText text rules>` with `colorTag`, `resetTag`,
  `ignoreTag`, `replaceTag` (rules are joined into one regex: no backreferences), and
  `pickLang(value, lang, ...fallbacks)`.
- Root: `StoryLines({ lines })` (place, narration, choice, options with branches, speaker rows;
  the site maps its data to `StoryLineView` and renders text) and
  `VoiceLineList({ items, playing, onPlay, onStop })`.
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

Add an entry to `GAMES` in `src/games.ts` (with `rights` when the rights holder is known), its accent to `styles/hub.css`
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
output `dist-site`, custom domain `hub.altterisk.cc`). Only the hub page is built and deployed;
`demo.html` is local-only (`npm run dev`). The demo page renders the real bar and sample
components in each game's accent; it is the reference for the restyle.

## License

The code is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-or-later):
copy, change and reuse it, as long as anything built from it, including a site that only runs
a modified copy, is released as open source under the same license.

The license covers the code only. Game names, art, audio, text and data shown by the sites
belong to their rights holders and are not covered. `HubFooter` prints this notice on every
site (`Game.rights` names the holder; games without one get generic wording).
