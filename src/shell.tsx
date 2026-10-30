import {
  Component, createElement, useEffect, useId, useLayoutEffect, useRef, useState,
  type ComponentType, type CSSProperties, type ErrorInfo, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import type { GameId } from './games.js';
import { HubBar, type HomeLinkProps, type HubBarLabels } from './HubBar.js';
import { HubFooter, type HubFooterProps } from './HubFooter.js';
import { EmptyState, plainLink, type LinkProps, type RenderLink } from './page.js';

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Closes on Escape or a pointer press outside every ref. */
export function useDismiss(open: boolean, onClose: () => void, refs: RefObject<HTMLElement | null>[]): void {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!refs.some((r) => r.current?.contains(e.target as Node))) close.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/** Fixed position under (or over) the anchor, kept inside the viewport with an 8px margin. */
export function useAnchoredPosition(
  anchor: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  open: boolean,
  placement: Placement = 'bottom-start',
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });
  useIsoLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = panel.current;
      if (!a || !p) return;
      const m = 8;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const w = Math.min(p.offsetWidth, vw - 2 * m);
      const h = p.offsetHeight;
      let left = placement.endsWith('end') ? a.right - w : a.left;
      left = Math.max(m, Math.min(left, vw - w - m));
      const below = a.bottom + 4;
      const above = a.top - 4 - h;
      const top = placement.startsWith('top')
        ? (above >= m ? above : below)
        : (below + h <= vh - m || above < m ? below : above);
      setStyle({ position: 'fixed', top, left, maxWidth: vw > 2 * m ? vw - 2 * m : undefined });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, placement]);
  return style;
}

export interface NavMenuItem {
  href: string;
  label: ReactNode;
  active?: boolean;
}

/**
 * A nav dropdown ("Etc") for the bar. The panel is portalled because the bar's nav row scrolls
 * sideways and would clip it; it stays inside the viewport on phones.
 */
export function NavMenu({ label, items, renderLink = plainLink, showActiveLabel }: {
  label: ReactNode;
  items: NavMenuItem[];
  renderLink?: RenderLink;
  /** Show the active item's label on the button instead of `label`. */
  showActiveLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const active = items.find((i) => i.active);
  useDismiss(open, () => setOpen(false), [button, panel]);
  const style = useAnchoredPosition(button, panel, open);
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>('a')?.focus();
  }, [open]);
  const onKey = (e: ReactKeyboardEvent) => {
    const links = [...(panel.current?.querySelectorAll<HTMLElement>('a') ?? [])];
    const i = links.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); links[(n + links.length) % links.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(links.length - 1);
    else if (e.key === 'Tab') setOpen(false);
  };
  return (
    <>
      <button
        ref={button}
        type="button"
        className="hub-navlink hub-navmenu__button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {showActiveLabel && active ? active.label : label}
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={panel} id={id} className="hub-navmenu__panel" style={style} onKeyDown={onKey}
          onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
          {items.map((item) => (
            <div key={item.href} className="hub-navmenu__item">
              {renderLink({
                href: item.href,
                className: cx('hub-navmenu__link', item.active && 'is-active'),
                'aria-current': item.active ? 'page' : undefined,
                children: item.label,
              })}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

export interface ErrorBoundaryLabels {
  title: ReactNode;
  hint: ReactNode;
  retry: ReactNode;
}

const ERROR_LABELS: ErrorBoundaryLabels = {
  title: 'Something went wrong on this page.',
  hint: 'Try again, or reload the page. If it keeps happening, please report it.',
  retry: 'Try again',
};

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Changing this clears the error (pass the route path so navigating away recovers). */
  resetKey?: unknown;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  labels?: Partial<ErrorBoundaryLabels>;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, { error: Error | null; key: unknown }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: { error: Error | null; key: unknown }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (!this.props.onError) console.error(error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    const t = { ...ERROR_LABELS, ...this.props.labels };
    return (
      <EmptyState
        className="hub-error"
        title={t.title}
        hint={t.hint}
        action={<button type="button" className="hub-btn" onClick={this.reset}>{t.retry}</button>}
      />
    );
  }
}

export function NotFound({ title = 'Page not found', hint = 'The link may be old, or the page has moved.', homeHref = '/', homeLabel = 'Go to the home page', renderLink = plainLink }: {
  title?: ReactNode;
  hint?: ReactNode;
  homeHref?: string;
  homeLabel?: ReactNode;
  renderLink?: RenderLink;
}) {
  return (
    <EmptyState
      className="hub-not-found"
      title={title}
      hint={hint}
      action={renderLink({ href: homeHref, className: 'hub-btn', children: homeLabel })}
    />
  );
}

/**
 * A `RenderLink` for the site's router link: `routerLinks(NextLink)` or `routerLinks(Link, 'to')`
 * for react-router.
 */
export function routerLinks(Link: ComponentType<any>, hrefProp: 'href' | 'to' = 'href'): RenderLink {
  return ({ href, ...rest }: LinkProps) => createElement(Link, { [hrefProp]: href, ...rest });
}

/** `renderHomeLink` for HubBar from the same router link. */
export function homeLink(Link: ComponentType<any>, hrefProp: 'href' | 'to' = 'href', href = '/') {
  return ({ className, children }: HomeLinkProps) => createElement(Link, { [hrefProp]: href, className }, children);
}

export interface GateProps {
  storageKey: string;
  title: ReactNode;
  children: ReactNode;
  acceptLabel: ReactNode;
  leaveLabel?: ReactNode;
  leaveHref?: string;
  /** URL param that accepts the gate without JavaScript-driven clicks (`?enter=1`). */
  param?: string;
  /** The page under the gate; it stays rendered so crawlers see it. */
  page: ReactNode;
}

const GATE_STYLE: Record<string, CSSProperties> = {
  gate: { position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, boxSizing: 'border-box', background: '#0b0e14', color: '#e6e8ef' },
  card: { maxWidth: 440, width: '100%', padding: 24, borderRadius: 12, border: '1px solid #2a2e3b', background: '#1a1d27', boxSizing: 'border-box' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 },
  button: { display: 'inline-block', padding: '10px 18px', borderRadius: 999, border: '1px solid #3a3f50', background: '#262a37',
    color: '#fff', font: '600 15px/1.2 system-ui, sans-serif', textDecoration: 'none', cursor: 'pointer' },
};

function readGate(key: string, param: string): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  if (url.searchParams.get(param) === '1') {
    url.searchParams.delete(param);
    window.history.replaceState(null, '', url.toString());
    try { localStorage.setItem(key, '1'); } catch { /* private mode: this visit only */ }
    return true;
  }
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

/**
 * A once-per-browser interstitial (age or content warning) over the page. Inline styles and a plain
 * `?param=1` link keep it usable when stylesheets fail or a tap never reaches React.
 */
export function Gate({ storageKey, title, children, acceptLabel, leaveLabel, leaveHref = 'https://www.google.com/', param = 'enter', page }: GateProps) {
  const [ok, setOk] = useState(() => readGate(storageKey, param));
  const titleId = useId();
  useEffect(() => {
    if (ok) return;
    const was = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = was; };
  }, [ok]);
  const enterHref = () => {
    if (typeof window === 'undefined') return `?${param}=1`;
    const url = new URL(window.location.href);
    url.searchParams.set(param, '1');
    return url.toString();
  };
  return (
    <>
      {page}
      {!ok && (
        <div className="hub-gate" style={GATE_STYLE.gate} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="hub-gate__card" style={GATE_STYLE.card}>
            <h2 id={titleId} style={{ marginTop: 0 }}>{title}</h2>
            {children}
            <div className="hub-gate__actions" style={GATE_STYLE.actions}>
              <a className="hub-btn" style={GATE_STYLE.button} href={enterHref()}
                onClick={(e) => {
                  e.preventDefault();
                  try { localStorage.setItem(storageKey, '1'); } catch { /* this visit only */ }
                  setOk(true);
                }}>
                {acceptLabel}
              </a>
              {leaveLabel && <a className="hub-btn" style={GATE_STYLE.button} href={leaveHref}>{leaveLabel}</a>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Floating "back to top" button, shown once the page is scrolled past `threshold`. */
export function ScrollTop({ threshold = 400, label = 'Back to top' }: { threshold?: number; label?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  if (!show) return null;
  return (
    <button type="button" className="hub-scroll-top" aria-label={label} title={label}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
        <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export interface SiteShellProps {
  game: GameId;
  nav?: ReactNode;
  actions?: ReactNode;
  logo?: ReactNode;
  renderHomeLink?: (props: HomeLinkProps) => ReactNode;
  homeHref?: string;
  barLabels?: Partial<HubBarLabels>;
  footer?: Omit<HubFooterProps, 'game'>;
  /** Clears a caught page error when it changes; pass the route path. */
  resetKey?: unknown;
  errorLabels?: Partial<ErrorBoundaryLabels>;
  skipLabel?: string;
  /** Adds the floating back-to-top button. */
  scrollTop?: boolean;
  /** `false` renders children straight into `<main>` without the width-capped container. */
  contained?: boolean;
  /** Max width of the content container (CSS length); defaults to `--hub-max-width`. */
  contentWidth?: string;
  /** Rendered between the bar and `<main>` (a phone-only settings row, a global loader). */
  belowBar?: ReactNode;
  children: ReactNode;
}

/** Bar, skip link, `<main>` with an error boundary, footer: the whole frame of a site page. */
export function SiteShell({
  game, nav, actions, logo, renderHomeLink, homeHref, barLabels, footer, resetKey, errorLabels,
  skipLabel = 'Skip to content', scrollTop, contained = true, contentWidth, belowBar, children,
}: SiteShellProps) {
  return (
    <div className="hub-shell" data-game={game}>
      <a className="hub-skip" href="#hub-main">{skipLabel}</a>
      <HubBar game={game} nav={nav} actions={actions} logo={logo} renderHomeLink={renderHomeLink} homeHref={homeHref} labels={barLabels} />
      {belowBar}
      <main id="hub-main" className="hub-shell__main" tabIndex={-1}>
        <ErrorBoundary resetKey={resetKey} labels={errorLabels}>
          {contained
            ? <div className="hub-shell__content" style={contentWidth ? { maxWidth: contentWidth } : undefined}>{children}</div>
            : children}
        </ErrorBoundary>
      </main>
      <HubFooter game={game} {...footer} />
      {scrollTop && <ScrollTop />}
    </div>
  );
}
