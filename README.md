# game-hub

Shared shell for the altterisk.cc game sites: top bar with game switcher, footer,
design tokens, a Chakra theme and plain-CSS component classes, plus the hub landing
page at `altterisk.cc`.

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
| `@altterisk/game-hub` | `HubBar`, `HubFooter`, `GameMark`, `GAMES`, `tokens`, `accentScale` |
| `@altterisk/game-hub/chakra` | `hubChakraTheme(game)` → pass to Chakra v2 `extendTheme` |
| `@altterisk/game-hub/hub.css` | Tokens as CSS variables, bar, switcher, footer. **Every site imports this.** |
| `@altterisk/game-hub/base.css` | Global element defaults (plain-CSS sites only) |
| `@altterisk/game-hub/components.css` | `.hub-panel`, `.hub-btn`, `.hub-input`, `.hub-table`, `.hub-tabs`, `.hub-badge`… (plain-CSS sites only) |

Put `data-game="<id>"` on `<html>` so the whole page picks up the game's accent.

## Install in a site

```sh
npm install github:<owner>/game-hub#v0.1.0
```

`prepare` builds `dist/` on install. Bump the tag in a site's `package.json` when
that site wants the newer shell; other sites keep their pinned version.

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
```

Deploy `dist-site/` to `altterisk.cc`. The demo page renders the real bar and sample
components in each game's accent; it is the reference for the restyle.
