import type { ReactNode } from 'react';
import { GAMES, HUB, HUB_URL, getGame, type GameId } from './games.js';

export interface FooterLink {
  label: string;
  href: string;
}

export interface HubFooterLabels {
  source: string;
  portfolio: string;
  allGames: string;
}

const DEFAULT_LABELS: HubFooterLabels = { source: 'Source', portfolio: 'Portfolio', allGames: 'All games' };

export interface HubFooterProps {
  game: GameId | 'hub';
  links?: FooterLink[];
  note?: ReactNode;
  labels?: Partial<HubFooterLabels>;
}

export function HubFooter({ game, links, note, labels }: HubFooterProps) {
  const g = game === 'hub' ? HUB : getGame(game);
  const text = { ...DEFAULT_LABELS, ...labels };
  const own = links ?? [
    { label: text.source, href: g.source },
    { label: text.portfolio, href: 'https://altterisk.github.io/portfolio/' },
  ];
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
      </div>
    </footer>
  );
}
