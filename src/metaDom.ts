import { useEffect } from 'react';
import type { HeadTag } from './meta.js';

const MANAGED = 'data-hub-head';
/** Static tags (e.g. from prerendered HTML) that a page may need gone. */
const OPTIONAL = 'link[rel="canonical"], meta[name="robots"], meta[property="og:url"], meta[property="og:image"]';

function selectorFor(t: Exclude<HeadTag, { tag: 'title' }>): string {
  if (t.tag === 'script') return `script[${MANAGED}="${t.key}"]`;
  const a = t.attrs;
  if (a.rel) return `link[rel="${a.rel}"]`;
  if (a.property) return `meta[property="${a.property}"]`;
  return `meta[name="${a.name}"]`;
}

/** Writes the tags into `document.head`, reusing existing tags; managed tags not in the list are removed. */
export function applyHead(tags: HeadTag[]): void {
  const keep = new Set<Element>();
  for (const t of tags) {
    if (t.tag === 'title') {
      document.title = t.text;
      continue;
    }
    let el = document.head.querySelector(selectorFor(t));
    if (!el) {
      el = document.createElement(t.tag);
      document.head.appendChild(el);
    }
    for (const [k, v] of Object.entries(t.attrs)) el.setAttribute(k, v);
    el.setAttribute(MANAGED, t.key);
    if (t.tag === 'script') el.textContent = t.text;
    keep.add(el);
  }
  document.head.querySelectorAll(`[${MANAGED}], ${OPTIONAL}`).forEach((el) => {
    if (!keep.has(el)) el.remove();
  });
}

/** Applies `tags` whenever their content changes (Vite / React Router sites). */
export function useHead(tags: HeadTag[]): void {
  const sig = JSON.stringify(tags);
  useEffect(() => {
    applyHead(JSON.parse(sig) as HeadTag[]);
  }, [sig]);
}
