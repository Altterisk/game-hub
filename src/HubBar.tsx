import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { GAMES, HUB, HUB_URL, getGame, type Game, type GameId } from './games.js';

export interface HomeLinkProps {
  className: string;
  children: ReactNode;
}

export interface HubBarLabels {
  switchGame: string;
  allGames: string;
  here: string;
}

const DEFAULT_LABELS: HubBarLabels = { switchGame: 'Switch game', allGames: 'All games', here: 'here' };

export interface HubBarProps {
  game: GameId | 'hub';
  logo?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
  renderHomeLink?: (props: HomeLinkProps) => ReactNode;
  homeHref?: string;
  labels?: Partial<HubBarLabels>;
}

export function GameMark({ accent }: { accent: string }) {
  return <span className="hub-mark" style={{ background: accent, boxShadow: `0 0 16px ${accent}66` }} />;
}

/** Icons live on the hub; the hub itself passes base="" to load them from its own origin. */
export function GameIcon({ game, size = 24, base = HUB_URL }: { game: Game; size?: number; base?: string }) {
  return <img className="hub-icon" src={base + game.icon} alt="" width={size} height={size} loading="lazy" />;
}

function GameSwitcher({ game, homeHref, labels }: { game: GameId | 'hub'; homeHref: string; labels: HubBarLabels }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="hub-switcher" ref={root}>
      <button
        type="button"
        className="hub-switcher__button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={labels.switchGame}
        title={labels.switchGame}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="hub-switcher__panel" id={listId}>
          <div className="hub-switcher__label">{labels.switchGame}</div>
          <ul>
            {GAMES.map((g) => {
              const current = g.id === game;
              return (
                <li key={g.id}>
                  <a
                    href={current ? homeHref : g.url}
                    className="hub-switcher__item"
                    aria-current={current ? 'true' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <GameIcon game={g} size={28} base={game === 'hub' ? '' : HUB_URL} />
                    <span className="hub-switcher__text">
                      <span className="hub-switcher__name">{g.title}</span>
                      <span className="hub-switcher__site">{g.name}</span>
                    </span>
                    {current && <span className="hub-switcher__here">{labels.here}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
          {game !== 'hub' && <a href={HUB_URL} className="hub-switcher__all">{labels.allGames}</a>}
        </div>
      )}
    </div>
  );
}

export function HubBar({ game, logo, nav, actions, renderHomeLink, homeHref = '/', labels }: HubBarProps) {
  const g = game === 'hub' ? null : getGame(game);
  const text = { ...DEFAULT_LABELS, ...labels };
  const homeLink = renderHomeLink ?? (({ className, children }: HomeLinkProps) => (
    <a href={homeHref} className={className}>{children}</a>
  ));
  return (
    <header className="hub-bar" data-game={game}>
      <div className="hub-bar__inner">
        <div className="hub-bar__brand">
          {homeLink({
            className: 'hub-bar__home',
            children: (
              <>
                {logo ?? (g ? <GameIcon game={g} /> : <GameMark accent={HUB.accent} />)}
                <span className="hub-bar__name">{(g ?? HUB).name}</span>
              </>
            ),
          })}
          <GameSwitcher game={game} homeHref={homeHref} labels={text} />
        </div>
        {nav && <nav className="hub-bar__nav" aria-label="Primary">{nav}</nav>}
        {actions && <div className="hub-bar__actions">{actions}</div>}
      </div>
    </header>
  );
}
