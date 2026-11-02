import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GAMES, HUB, HUB_URL, getGame, type Game, type GameId } from './games.js';
import { plainLink, type RenderLink } from './page.js';

export interface HomeLinkProps {
  className: string;
  children: ReactNode;
}

export interface HubBarLabels {
  switchGame: string;
  allGames: string;
  here: string;
  menu: string;
  closeMenu: string;
}

const DEFAULT_LABELS: HubBarLabels = {
  switchGame: 'Switch game', allGames: 'All games', here: 'here', menu: 'Menu', closeMenu: 'Close menu',
};

export interface HubMenuItem {
  href: string;
  label: ReactNode;
  active?: boolean;
}

export interface HubMenuGroup {
  title?: ReactNode;
  items: HubMenuItem[];
}

export interface HubBarProps {
  game: GameId | 'hub';
  logo?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
  renderHomeLink?: (props: HomeLinkProps) => ReactNode;
  homeHref?: string;
  labels?: Partial<HubBarLabels>;
  // On phones, replaces the nav row and actions with a side drawer holding both.
  menu?: HubMenuGroup[];
  renderLink?: RenderLink;
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

const PHONE = '(max-width: 767px)';

function MenuDrawer({ game, groups, actions, renderLink, labels }: {
  game: GameId | 'hub'; groups: HubMenuGroup[]; actions?: ReactNode; renderLink: RenderLink; labels: HubBarLabels;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusOnMount = useCallback((el: HTMLButtonElement | null) => el?.focus(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) setOpen(false); };
    const wide = window.matchMedia?.(PHONE);
    const onWide = () => { if (wide && !wide.matches) setOpen(false); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    wide?.addEventListener('change', onWide);
    const back = trigger.current;
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      wide?.removeEventListener('change', onWide);
      back?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={trigger} type="button" className="hub-bar__menu-button" aria-label={labels.menu}
        aria-expanded={open} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {open && createPortal(
        <div className="hub-drawer" data-game={game}>
          <div className="hub-drawer__overlay" onClick={() => setOpen(false)} />
          <div className="hub-drawer__panel" role="dialog" aria-modal="true" aria-label={labels.menu}>
            <div className="hub-drawer__head">
              <button ref={focusOnMount} type="button" className="hub-drawer__close" aria-label={labels.closeMenu}
                onClick={() => setOpen(false)}>
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {actions && <div className="hub-drawer__actions">{actions}</div>}
            <nav className="hub-drawer__nav" aria-label="Primary"
              onClick={(e) => { if ((e.target as Element).closest('a')) setOpen(false); }}>
              {groups.map((g, i) => (
                <div key={i} className="hub-drawer__group">
                  {g.title && <div className="hub-drawer__title">{g.title}</div>}
                  {g.items.map((item) => (
                    <span key={item.href} className="hub-drawer__item">
                      {renderLink({
                        href: item.href, className: 'hub-drawer__link',
                        'aria-current': item.active ? 'page' : undefined, children: item.label,
                      })}
                    </span>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function HubBar({
  game, logo, nav, actions, renderHomeLink, homeHref = '/', labels, menu, renderLink = plainLink,
}: HubBarProps) {
  const g = game === 'hub' ? null : getGame(game);
  const text = { ...DEFAULT_LABELS, ...labels };
  const homeLink = renderHomeLink ?? (({ className, children }: HomeLinkProps) => (
    <a href={homeHref} className={className}>{children}</a>
  ));
  return (
    <header className={menu ? 'hub-bar hub-bar--menu' : 'hub-bar'} data-game={game}>
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
        {menu && <MenuDrawer game={game} groups={menu} actions={actions} renderLink={renderLink} labels={text} />}
      </div>
    </header>
  );
}
