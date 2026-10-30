import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml, headHtml, type HeadTag } from './meta.js';

export function sitemapXml(urls: string[]): string {
  const body = [...new Set(urls)].map((u) => `  <url><loc>${escapeHtml(u)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function robotsTxt(origin: string, opts: { disallow?: string[]; sitemap?: boolean } = {}): string {
  const lines = ['User-agent: *', 'Allow: /', ...(opts.disallow ?? []).map((p) => `Disallow: ${p}`)];
  if (opts.sitemap !== false) lines.push('', `Sitemap: ${origin.replace(/\/$/, '')}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

export function writeSitemap(outDir: string, urls: string[]): number {
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml(urls));
  return new Set(urls).size;
}

export function writeRobots(outDir: string, origin: string, opts?: { disallow?: string[]; sitemap?: boolean }): void {
  fs.writeFileSync(path.join(outDir, 'robots.txt'), robotsTxt(origin, opts));
}

/** Routes of the `.html` files under `dir`: `units/index.html` and `units.html` → `/units/`. */
export function htmlRoutes(dir: string, opts: { exclude?: (route: string) => boolean } = {}): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.html')) {
        const rel = path.relative(dir, full).replace(/\\/g, '/').replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '/');
        const route = `/${rel}`.replace(/\/+$/, '/') || '/';
        if (!opts.exclude?.(route)) out.push(route);
      }
    }
  };
  walk(dir);
  return out.sort();
}

export function countFiles(dir: string, skip: string[] = []): number {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => (skip.includes(e.name) ? n : n + (e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1)),
    0,
  );
}

/** Replaces the template's head tags with `tags` and fills the empty `#root` with `body`. */
export function renderStatic(template: string, tags: HeadTag[], body: string): string {
  let out = template.replace(/<title>[\s\S]*?<\/title>/, '');
  for (const t of tags) {
    if (t.tag === 'title' || t.tag === 'script') continue;
    const a = t.attrs;
    const attr = a.rel ? `rel="${a.rel}"` : a.property ? `property="${a.property}"` : `name="${a.name}"`;
    out = out.replace(new RegExp(`\\s*<${t.tag}\\s[^>]*${attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>`, 'g'), '');
  }
  out = out.replace('</head>', `${headHtml(tags).split('\n').map((l) => `  ${l}`).join('\n')}\n  </head>`);
  const filled = out.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  if (body && filled === out) throw new Error('renderStatic: template has no empty <div id="root"></div>');
  return filled;
}

export interface PrerenderPage {
  /** Site path, e.g. `/units` (written as `units.html`) or `/units/` (`units/index.html`). */
  path: string;
  tags: HeadTag[];
  /** Plain HTML shown inside `#root` until React replaces it. */
  body?: string;
}

export interface PrerenderOptions {
  /** Called after the bundle is written. `publicDir` is Vite's public dir. */
  pages: (ctx: { outDir: string; publicDir: string }) => { pages: PrerenderPage[]; extraUrls?: string[] };
  /** Absolute URL of a site path, for the sitemap. */
  url: (path: string) => string;
  origin: string;
  robots?: { disallow?: string[] } | false;
  /** Warn above this many deployed files (Cloudflare Pages caps at 20,000). */
  fileBudget?: number;
  /** Top-level names not deployed, skipped by the file count. */
  localOnly?: string[];
}

/** Vite plugin: static HTML per page, sitemap.xml and robots.txt after `vite build`. */
export function prerenderPlugin(opts: PrerenderOptions) {
  let outDir = '';
  let publicDir = '';
  return {
    name: 'hub-prerender',
    apply: 'build' as const,
    configResolved(c: { root: string; build: { outDir: string }; publicDir: string }) {
      outDir = path.resolve(c.root, c.build.outDir);
      publicDir = c.publicDir;
    },
    closeBundle() {
      const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      const { pages, extraUrls = [] } = opts.pages({ outDir, publicDir });
      for (const page of pages) {
        const rel = page.path === '/' ? 'index.html'
          : page.path.endsWith('/') ? `${page.path.slice(1)}index.html` : `${page.path.slice(1)}.html`;
        const file = path.join(outDir, ...rel.split('/'));
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, renderStatic(template, page.tags, page.body ?? ''));
      }
      const count = writeSitemap(outDir, [...pages.filter((p) => !isNoindex(p)).map((p) => opts.url(p.path)), ...extraUrls]);
      if (opts.robots !== false) writeRobots(outDir, opts.origin, opts.robots);
      const total = countFiles(outDir, opts.localOnly);
      console.log(`prerender: ${pages.length} pages, ${count} URLs in sitemap.xml, ${total} files in ${path.basename(outDir)}`);
      if (opts.fileBudget && total > opts.fileBudget) console.warn(`prerender: ${total} files is over the budget of ${opts.fileBudget}`);
    },
  };
}

const isNoindex = (p: PrerenderPage) => p.tags.some((t) => t.tag === 'meta' && t.attrs.name === 'robots' && /noindex/.test(t.attrs.content));
