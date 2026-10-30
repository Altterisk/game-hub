import { createElement, type ComponentType, type ReactElement, type ReactNode } from 'react';
import type { HeadTag, PageMeta, SiteMeta } from './meta.js';

export interface NextRouterLike {
  pathname: string;
  asPath: string;
  query: Record<string, string | string[] | undefined>;
  isReady: boolean;
}

export interface CreateSeoOptions {
  site: SiteMeta;
  /** `next/head`'s default export. */
  Head: ComponentType<{ children: ReactNode }>;
  /** `next/router`'s `useRouter`. */
  useRouter: () => NextRouterLike;
  /**
   * Query-routed pages (`/units/detail` + `?id=`): the params that name the entity. Their canonical
   * keeps only these, and waits for `isReady` so prerendered HTML never names the bare route.
   */
  identityParams?: Record<string, string[]>;
  /** Public base path when the site is served under one (stripped from canonicals). */
  basePath?: string;
}

export type SeoProps = Partial<PageMeta>;

/** Renders head tags as keyed elements, so `next/head` replaces rather than duplicates them. */
export function tagElements(tags: HeadTag[]): ReactElement[] {
  return tags.map((t) => {
    if (t.tag === 'title') return createElement('title', { key: 'title' }, t.text);
    if (t.tag === 'script') return createElement('script', { key: t.key, ...t.attrs, dangerouslySetInnerHTML: { __html: t.text } });
    return createElement(t.tag, { key: t.key, ...t.attrs });
  });
}

export function createSeo({ site, Head, useRouter, identityParams = {}, basePath = '' }: CreateSeoOptions) {
  function useCanonical(): string | null {
    const { pathname, asPath, query, isReady } = useRouter();
    const route = pathname.replace(/\/$/, '') || '/';
    const keep = identityParams[route];
    if (keep && !isReady) return null;
    let path = asPath.split(/[?#]/)[0];
    if (basePath && path.startsWith(basePath)) path = path.slice(basePath.length) || '/';
    if (!path.endsWith('/')) path = `${path}/`;
    return site.canonicalUrl(path, query, keep);
  }

  function Seo(props: SeoProps) {
    const url = useCanonical();
    return createElement(Head, null, ...tagElements(site.headTags(props, props.noindex ? null : url)));
  }

  return { Seo, useCanonical };
}
