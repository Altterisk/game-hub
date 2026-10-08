import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { GAMES, HUB, HUB_URL, getGame, type GameId } from './games.js';

export interface HomeLinkProps {
  className: string;
  children: ReactNode;
}

export interface HubBarProps {
  game: GameId | 'hub';
  logo?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
  renderHomeLink?: (props: HomeLinkProps) => ReactNode;
}

export function GameMark({ accent }: { accent: string }) {
  return <span className="hub-mark" style={{ background: accent, boxShadow: `0 0 16px ${accent}66` }} />;
}

function GameSwitcher({ game }: { game: GameId | 'hub' }) {
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
        aria-label="Switch game"
        title="Switch game"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="hub-switcher__panel" id={listId}>
          <div className="hub-switcher__label">Switch game</div>
          <ul>
            {GAMES.map((g) => {
              const current = g.id === game;
              return (
                <li key={g.id}>
                  <a
                    href={current ? '/' : g.url}
                    className="hub-switcher__item"
                    aria-current={current ? 'true' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <GameMark accent={g.accent} />
                    <span className="hub-switcher__text">
                      <span className="hub-switcher__name">{g.title}</span>
                      <span className="hub-switcher__site">{g.name}</span>
                    </span>
                    {current && <span className="hub-switcher__here">here</span>}
                  </a>
                </li>
              );
            })}
          </ul>
          {game !== 'hub' && <a href={HUB_URL} className="hub-switcher__all">All games</a>}
        </div>
      )}
    </div>
  );
}

const defaultHomeLink = ({ className, children }: HomeLinkProps) => (
  <a href="/" className={className}>{children}</a>
);

export function HubBar({ game, logo, nav, actions, renderHomeLink = defaultHomeLink }: HubBarProps) {
  const g = game === 'hub' ? HUB : getGame(game);
  return (
    <header className="hub-bar" data-game={game}>
      <div className="hub-bar__inner">
        <div className="hub-bar__brand">
          {renderHomeLink({
            className: 'hub-bar__home',
            children: (
              <>
                {logo ?? <GameMark accent={g.accent} />}
                <span className="hub-bar__name">{g.name}</span>
              </>
            ),
          })}
          <GameSwitcher game={game} />
        </div>
        {nav && <nav className="hub-bar__nav" aria-label="Primary">{nav}</nav>}
        {actions && <div className="hub-bar__actions">{actions}</div>}
      </div>
    </header>
  );
}
