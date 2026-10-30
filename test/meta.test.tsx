// @vitest-environment jsdom
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { HubFooter, licenseUrl, rightsText } from '../src/HubFooter';
import { clip, createSiteMeta, headHtml, plainText } from '../src/meta';
import { applyHead } from '../src/metaDom';
import { createSeo, type NextRouterLike } from '../src/metaNext';
import { htmlRoutes, renderStatic, robotsTxt, sitemapXml } from '../src/build';

afterEach(cleanup);

describe('HubFooter legal line', () => {
  it('names the rights holder when the game has one', () => {
    render(<HubFooter game="lo" />);
    expect(screen.getByText(/property of Valofe\. All rights belong to Valofe\./)).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Site code: AGPL-3.0' });
    expect(link.getAttribute('href')).toBe('https://github.com/anyabot/LOMapR/blob/HEAD/LICENSE');
  });

  it('uses generic wording without a rights holder, and on the hub', () => {
    expect(rightsText('mad')).toMatch(/respective owners/);
    expect(rightsText('hub')).toMatch(/respective owners/);
  });

  it('can be replaced, translated or hidden', () => {
    const { container, rerender } = render(<HubFooter game="lo" legal={false} />);
    expect(container.querySelector('.hub-footer__legal')).toBeNull();
    rerender(<HubFooter game="lo" labels={{ rights: (o) => `© ${o}`, license: 'Code' }} />);
    expect(screen.getByText(/© Valofe/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Code' })).toBeTruthy();
  });

  it('builds a license URL from the repo', () => {
    expect(licenseUrl('https://github.com/a/b')).toBe('https://github.com/a/b/blob/HEAD/LICENSE');
  });
});

const site = createSiteMeta({
  game: 'lo',
  url: 'https://lo.example/',
  homeTitle: 'Home',
  defaultDescription: 'Default',
  defaultImage: '/icon.png',
});

describe('createSiteMeta', () => {
  it('formats titles and falls back to the home title', () => {
    expect(site.fullTitle('Units')).toBe('Units — Last Origin | LOMapR');
    expect(site.fullTitle('')).toBe('Home');
  });

  it('keeps only identity params in their given order', () => {
    expect(site.canonicalUrl('/world/stage/', { tab: 'x', stage: '2', id: '1', zone: ['3', '4'] }, ['id', 'zone', 'stage']))
      .toBe('https://lo.example/world/stage/?id=1&zone=3&stage=2');
    expect(site.canonicalUrl('/units/', { id: '1' })).toBe('https://lo.example/units/');
  });

  it('encodes each path segment once', () => {
    expect(site.sitePath('/tags/魔物')).toBe('/tags/%E9%AD%94%E7%89%A9');
    expect(site.sitePath('/tags/%E9%AD%94%E7%89%A9')).toBe('/tags/%E9%AD%94%E7%89%A9');
  });

  it('emits the head tags, omitting canonical and og:url without a URL', () => {
    const tags = site.headTags({ title: 'Units', jsonLd: { a: '</script>' } }, null);
    const html = headHtml(tags);
    expect(html).toContain('<title>Units — Last Origin | LOMapR</title>');
    expect(html).toContain('content="Default"');
    expect(html).toContain('content="https://lo.example/icon.png"');
    expect(html).not.toContain('canonical');
    expect(html).not.toContain('og:url');
    expect(html).toContain('\\u003c/script>');
  });

  it('builds breadcrumb JSON-LD with absolute URLs', () => {
    const ld = site.breadcrumbLd([{ name: 'Units', path: '/units/' }]) as { itemListElement: { item: string }[] };
    expect(ld.itemListElement[0].item).toBe('https://lo.example/units/');
  });

  it('text helpers', () => {
    expect(plainText(' a <b>b</b>\n c ')).toBe('a b c');
    expect(plainText('%c[ff0000]red', /%c\[[0-9a-f]{6}\]/gi)).toBe('red');
    expect(clip('abcdef', 4)).toBe('abc…');
  });
});

describe('applyHead', () => {
  it('reuses static tags and removes optional ones the page does not want', () => {
    document.head.innerHTML = '<link rel="canonical" href="old"><meta name="description" content="old">';
    applyHead(site.headTags({ title: 'A', description: 'D' }, 'https://lo.example/a/'));
    expect(document.title).toBe('A — Last Origin | LOMapR');
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelector('meta[name="description"]')!.getAttribute('content')).toBe('D');
    applyHead(site.headTags({ title: 'B', noindex: true }, null));
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
    applyHead(site.headTags({ title: 'C' }, 'https://lo.example/c/'));
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});

describe('createSeo (Next)', () => {
  const Head = ({ children }: { children?: ReactNode }) => <div data-testid="head">{children}</div>;
  const make = (router: NextRouterLike) =>
    createSeo({ site, Head, useRouter: () => router, identityParams: { '/units/detail': ['id'] } }).Seo;

  it('holds the canonical on identity routes until the query is ready', () => {
    const Seo = make({ pathname: '/units/detail', asPath: '/units/detail', query: {}, isReady: false });
    const { container } = render(<Seo title="Unit" />);
    expect(container.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('keeps identity params once ready, drops the rest', () => {
    const Seo = make({ pathname: '/units/detail', asPath: '/units/detail?id=5&tab=skin', query: { id: '5', tab: 'skin' }, isReady: true });
    const { container } = render(<Seo title="Unit" />);
    expect(container.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://lo.example/units/detail/?id=5');
  });

  it('plain routes get a trailing-slash canonical at once', () => {
    const Seo = make({ pathname: '/units', asPath: '/units?q=a', query: { q: 'a' }, isReady: false });
    const { container } = render(<Seo title="Units" />);
    expect(container.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://lo.example/units/');
  });
});

describe('build helpers', () => {
  it('writes sitemap and robots text', () => {
    expect(sitemapXml(['https://a/?x=1&y=2', 'https://a/?x=1&y=2'])).toContain('<loc>https://a/?x=1&amp;y=2</loc>');
    expect(sitemapXml(['https://a/']).match(/<url>/g)).toHaveLength(1);
    expect(robotsTxt('https://a/', { disallow: ['/api/'] })).toBe('User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://a/sitemap.xml\n');
  });

  it('lists html routes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-routes-'));
    fs.mkdirSync(path.join(dir, 'units'));
    for (const f of ['index.html', 'units/index.html', 'gacha.html', '404.html']) fs.writeFileSync(path.join(dir, f), '');
    expect(htmlRoutes(dir, { exclude: (r) => r === '/404/' })).toEqual(['/', '/gacha/', '/units/']);
  });

  it('renders static HTML over a template', () => {
    const template = '<html><head><title>x</title><meta name="description" content="old" /></head><body><div id="root"></div></body></html>';
    const out = renderStatic(template, site.headTags({ title: 'Units' }, 'https://lo.example/units/'), '<h1>Units</h1>');
    expect(out.match(/<title>/g)).toHaveLength(1);
    expect(out).not.toContain('content="old"');
    expect(out).toContain('<link rel="canonical" href="https://lo.example/units/" />');
    expect(out).toContain('<div id="root"><h1>Units</h1></div>');
  });
});
