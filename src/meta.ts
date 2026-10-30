import { getGame, type GameId } from './games.js';

export interface PageMeta {
  /** Without the site name: the site's title format adds it. Empty = the home title. */
  title: string;
  description: string;
  /** A site path or absolute URL for og:image; null or absent uses the site default. */
  image?: string | null;
  noindex?: boolean;
  jsonLd?: object | object[];
}

export interface SiteMetaConfig {
  game: GameId;
  /** Deployed origin; defaults to the game's URL. */
  url?: string;
  name?: string;
  /** Title used when a page has none. */
  homeTitle?: string;
  format?: (title: string, site: { name: string; title: string }) => string;
  defaultDescription: string;
  defaultImage?: string;
}

export type HeadTag =
  | { tag: 'title'; key: 'title'; text: string }
  | { tag: 'meta' | 'link'; key: string; attrs: Record<string, string> }
  | { tag: 'script'; key: string; attrs: Record<string, string>; text: string };

export interface SiteMeta {
  url: string;
  name: string;
  fullTitle(title: string): string;
  /** Each path segment encoded once; a trailing slash is kept as given. */
  sitePath(path: string): string;
  /** Absolute URL; `query` is filtered to `keep` (identity params) in that order. */
  canonicalUrl(path: string, query?: Record<string, string | string[] | undefined>, keep?: string[]): string;
  absUrl(pathOrUrl: string): string;
  /** `url: null` omits canonical and og:url (e.g. a query-routed page before its query is known). */
  headTags(page: Partial<PageMeta>, url: string | null): HeadTag[];
  websiteLd(description?: string): object;
  breadcrumbLd(items: { name: string; path: string }[]): object;
}

export const defaultTitleFormat = (title: string, site: { name: string; title: string }) =>
  `${title} — ${site.title} | ${site.name}`;

export function createSiteMeta(config: SiteMetaConfig): SiteMeta {
  const game = getGame(config.game);
  const url = (config.url ?? game.url).replace(/\/$/, '');
  const name = config.name ?? game.name;
  const format = config.format ?? defaultTitleFormat;
  const homeTitle = config.homeTitle ?? name;

  const sitePath = (path: string) =>
    path.split('/').map((s) => encodeURIComponent(safeDecode(s))).join('/');
  const absUrl = (p: string) => (/^https?:\/\//.test(p) ? p : url + sitePath(p.startsWith('/') ? p : `/${p}`));
  const fullTitle = (title: string) => (title ? format(title, { name, title: game.title }) : homeTitle);

  const canonicalUrl: SiteMeta['canonicalUrl'] = (path, query, keep) => {
    const params = new URLSearchParams();
    for (const k of keep ?? []) {
      const v = query?.[k];
      const one = Array.isArray(v) ? v[0] : v;
      if (one) params.set(k, one);
    }
    const qs = params.toString();
    return url + sitePath(path) + (qs ? `?${qs}` : '');
  };

  const headTags: SiteMeta['headTags'] = (page, pageUrl) => {
    const title = fullTitle(page.title ?? '');
    const description = page.description ?? config.defaultDescription;
    const image = page.image ?? config.defaultImage;
    const tags: HeadTag[] = [
      { tag: 'title', key: 'title', text: title },
      { tag: 'meta', key: 'description', attrs: { name: 'description', content: description } },
    ];
    if (pageUrl) tags.push({ tag: 'link', key: 'canonical', attrs: { rel: 'canonical', href: pageUrl } });
    if (page.noindex) tags.push({ tag: 'meta', key: 'robots', attrs: { name: 'robots', content: 'noindex' } });
    const og = (property: string, content: string) =>
      tags.push({ tag: 'meta', key: property, attrs: { property, content } });
    og('og:site_name', name);
    og('og:type', 'website');
    og('og:title', title);
    og('og:description', description);
    if (pageUrl) og('og:url', pageUrl);
    if (image) og('og:image', absUrl(image));
    tags.push({ tag: 'meta', key: 'twitter:card', attrs: { name: 'twitter:card', content: 'summary' } });
    const ld = page.jsonLd === undefined ? [] : Array.isArray(page.jsonLd) ? page.jsonLd : [page.jsonLd];
    ld.forEach((data, i) =>
      tags.push({ tag: 'script', key: `ld-json-${i}`, attrs: { type: 'application/ld+json' }, text: jsonLdText(data) }));
    return tags;
  };

  return {
    url,
    name,
    fullTitle,
    sitePath,
    canonicalUrl,
    absUrl,
    headTags,
    websiteLd: (description) => ({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name,
      url: `${url}/`,
      description: description ?? config.defaultDescription,
    }),
    breadcrumbLd: (items) => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem', position: i + 1, name: item.name, item: absUrl(item.path),
      })),
    }),
  };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** JSON for an inline `<script type="application/ld+json">`, safe against `</script>`. */
export const jsonLdText = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c');

export const escapeHtml = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export const sentence = (...parts: (string | number | false | null | undefined)[]) =>
  parts.filter((p) => p || p === 0).join(' ');

/** Drops HTML tags and collapses whitespace; `strip` removes site-specific markup first. */
export function plainText(text: string | null | undefined, strip?: RegExp): string {
  const s = strip ? (text ?? '').replace(strip, '') : text ?? '';
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** The tags as static HTML, for prerender scripts. */
export function headHtml(tags: HeadTag[]): string {
  return tags.map((t) => {
    if (t.tag === 'title') return `<title>${escapeHtml(t.text)}</title>`;
    const attrs = Object.entries(t.attrs).map(([k, v]) => `${k}="${escapeHtml(v)}"`).join(' ');
    return t.tag === 'script' ? `<script ${attrs}>${t.text}</script>` : `<${t.tag} ${attrs} />`;
  }).join('\n');
}
