import type { ReactNode } from 'react';
import { GAMES, HUB, HUB_URL, getGame, type GameId } from './games.js';

export interface FooterLink {
  label: string;
  href: string;
}

export interface HubFooterLabels {
  source: string;
  portfolio: string;
  donate: string;
  allGames: string;
  /** Legal line when the game has a named rights holder. */
  rights: (owner: string, title: string) => string;
  /** Legal line when it has none (and on the hub). */
  unowned: string;
  license: string;
}

export const LICENSE_NAME = 'AGPL-3.0';

const DEFAULT_LABELS: HubFooterLabels = {
  source: 'Source',
  portfolio: 'Portfolio',
  donate: 'Ko-fi',
  allGames: 'All games',
  rights: (owner, title) =>
    `Fan-made and unofficial. ${title} images, data and other game assets are the property of ${owner}. All rights belong to ${owner}.`,
  unowned: 'Fan-made and unofficial. Game art, audio and text belong to their respective owners.',
  license: `Site code: ${LICENSE_NAME}`,
};

export interface HubFooterProps {
  game: GameId | 'hub';
  links?: FooterLink[];
  note?: ReactNode;
  /** Replaces the automatic rights + license line; `false` hides it. */
  legal?: ReactNode | false;
  labels?: Partial<HubFooterLabels>;
}

/** The rights sentence for a game, for reuse outside the footer (about pages, READMEs). */
export function rightsText(game: GameId | 'hub', labels?: Partial<HubFooterLabels>): string {
  const text = { ...DEFAULT_LABELS, ...labels };
  if (game === 'hub') return text.unowned;
  const g = getGame(game);
  return g.rights ? text.rights(g.rights, g.title) : text.unowned;
}

export function licenseUrl(source: string): string {
  return `${source}/blob/HEAD/LICENSE`;
}

export function HubFooter({ game, links, note, legal, labels }: HubFooterProps) {
  const g = game === 'hub' ? HUB : getGame(game);
  const text = { ...DEFAULT_LABELS, ...labels };
  const own = links ?? [
    { label: text.source, href: g.source },
    { label: text.portfolio, href: 'https://altterisk.github.io/portfolio/' },
    { label: text.donate, href: HUB.donate },
  ];
  const legalLine = legal ?? (
    <>
      {rightsText(game, labels)}{' '}
      <a href={licenseUrl(g.source)} target="_blank" rel="noreferrer">{text.license}</a>
    </>
  );
  return (
    <footer className="hub-footer" data-game={game}>
      <div className="hub-footer__inner">
        <div className="hub-footer__row">
          <span className="hub-footer__name">{g.name}</span>
          {own.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </div>
        <div className="hub-footer__row hub-footer__games">
          {game !== 'hub' && <a href={HUB_URL}>{text.allGames}</a>}
          {GAMES.filter((o) => o.id !== game).map((o) => (
            <a key={o.id} href={o.url}>{o.title}</a>
          ))}
        </div>
        {note && <div className="hub-footer__note">{note}</div>}
        {legalLine !== false && <div className="hub-footer__legal">{legalLine}</div>}
      </div>
    </footer>
  );
}
