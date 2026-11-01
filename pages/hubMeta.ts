import { GAMES, HUB, HUB_URL } from '../src/games';
import { jsonLdText, type HeadTag } from '../src/meta';
import { HUB_DESCRIPTION } from './Landing';

const TITLE = 'Altterisk Games — Aigis, Last Origin, Make Drama and Taimanin RPGX tools';
const URL = `${HUB_URL}/`;

const meta = (key: string, attrs: Record<string, string>): HeadTag => ({ tag: 'meta', key, attrs });
const og = (property: string, content: string) => meta(property, { property, content });
const ld = (key: string, data: object): HeadTag =>
  ({ tag: 'script', key, attrs: { type: 'application/ld+json' }, text: jsonLdText(data) });

export const HUB_TAGS: HeadTag[] = [
  { tag: 'title', key: 'title', text: TITLE },
  meta('description', { name: 'description', content: HUB_DESCRIPTION }),
  { tag: 'link', key: 'canonical', attrs: { rel: 'canonical', href: URL } },
  meta('theme-color', { name: 'theme-color', content: HUB.accent }),
  og('og:site_name', HUB.name),
  og('og:type', 'website'),
  og('og:title', TITLE),
  og('og:description', HUB_DESCRIPTION),
  og('og:url', URL),
  meta('twitter:card', { name: 'twitter:card', content: 'summary' }),
  ld('ld-website', {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: HUB.name,
    url: URL,
    description: HUB_DESCRIPTION,
    author: { '@type': 'Person', name: 'Altterisk', sameAs: ['https://github.com/Altterisk', HUB.donate] },
  }),
  ld('ld-games', {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: GAMES.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'WebSite', name: g.name, url: `${g.url}/`, description: `${g.title}: ${g.tagline}` },
    })),
  }),
];
