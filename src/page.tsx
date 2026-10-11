import { Fragment, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { ParamAdapter } from './filters.js';

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

export interface LinkProps {
  href: string;
  className?: string;
  title?: string;
  'aria-current'?: 'page';
  children: ReactNode;
}

// The site's router link (react-router <Link to>, next/link); a plain <a> by default.
export type RenderLink = (props: LinkProps) => ReactNode;

export const plainLink: RenderLink = ({ href, ...rest }) => <a href={href} {...rest} />;

export interface Crumb {
  label: ReactNode;
  href?: string;
}

// The last item is the current page and is never a link.
export function Breadcrumbs({ items, renderLink = plainLink, label = 'Breadcrumb', className }: {
  items: readonly Crumb[];
  renderLink?: RenderLink;
  label?: string;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <nav className={cx('hub-crumbs', className)} aria-label={label}>
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i}>
              {!last && item.href
                ? renderLink({ href: item.href, className: 'hub-crumbs__link', children: item.label })
                : <span className="hub-crumbs__current" aria-current={last ? 'page' : undefined}>{item.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function MetaChips({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('hub-meta-chips', className)}>{children}</div>;
}

// A label/value chip; with href it links (e.g. back to a filtered list).
export function MetaChip({ label, value, icon, href, title, renderLink = plainLink, className }: {
  label?: ReactNode;
  value?: ReactNode;
  icon?: ReactNode;
  href?: string;
  title?: string;
  renderLink?: RenderLink;
  className?: string;
}) {
  const body = (
    <>
      {icon && <span className="hub-meta-chip__icon">{icon}</span>}
      {label !== undefined && <span className="hub-meta-chip__label">{label}</span>}
      {value !== undefined && <span className="hub-meta-chip__value">{value}</span>}
    </>
  );
  const cls = cx('hub-meta-chip', href && 'hub-meta-chip--link', className);
  return href ? <>{renderLink({ href, className: cls, title, children: body })}</> : <span className={cls} title={title}>{body}</span>;
}

type HeadingLevel = 1 | 2 | 3 | 4;

function Heading({ level, className, children }: { level: HeadingLevel; className: string; children: ReactNode }) {
  const Tag = `h${level}` as 'h1';
  return <Tag className={className}>{children}</Tag>;
}

export function PageHeader({ art, title, subtitle, id, badges, meta, actions, level = 1, className }: {
  art?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  id?: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  level?: HeadingLevel;
  className?: string;
}) {
  return (
    <header className={cx('hub-page-header', className)}>
      {art && <div className="hub-page-header__art">{art}</div>}
      <div className="hub-page-header__main">
        <div className="hub-page-header__title-row">
          <Heading level={level} className="hub-page-header__title">{title}</Heading>
          {id !== undefined && <span className="hub-page-header__id">{id}</span>}
          {badges}
        </div>
        {subtitle && <div className="hub-page-header__subtitle">{subtitle}</div>}
        {meta && <div className="hub-page-header__meta">{meta}</div>}
      </div>
      {actions && <div className="hub-page-header__actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, note, actions, level = 3, children, className }: {
  title?: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  level?: HeadingLevel;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('hub-panel hub-section', className)}>
      {(title || actions) && (
        <div className="hub-section__head">
          {title && <Heading level={level} className="hub-section__title">{title}</Heading>}
          {actions && <div className="hub-section__actions">{actions}</div>}
        </div>
      )}
      {note && <p className="hub-section__note">{note}</p>}
      {children}
    </section>
  );
}

export interface StatItem {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  id?: string;
}

// Label/value pairs as a <dl>: one column on phones, `columns` across from tablet width.
export function StatRows({ rows, columns = 2, children, className }: {
  rows?: readonly StatItem[];
  columns?: 1 | 2 | 3;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <dl className={cx('hub-stats', `hub-stats--${columns}`, className)}>
      {rows?.map((r, i) => <StatRow key={r.id ?? i} label={r.label} value={r.value} icon={r.icon} />)}
      {children}
    </dl>
  );
}

export function StatRow({ label, value, icon }: StatItem) {
  return (
    <div className="hub-stat">
      <dt>{icon && <span className="hub-stat__icon">{icon}</span>}{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export interface TabItem {
  id: string;
  label: ReactNode;
  count?: ReactNode;
  // Tabs with nothing to show are left out entirely.
  hidden?: boolean;
}

// Arrow keys, Home and End move between tabs (WAI-ARIA tabs, automatic activation).
export function UrlTabs({ tabs, active, onChange, label, idBase, className }: {
  tabs: readonly TabItem[];
  active: string;
  onChange: (id: string) => void;
  label?: string;
  idBase?: string;
  className?: string;
}) {
  const auto = useId();
  const base = idBase ?? auto;
  const shown = tabs.filter((t) => !t.hidden);
  // If `active` matches no visible tab, the first one still takes keyboard focus.
  const focusable = Math.max(0, shown.findIndex((t) => t.id === active));
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (e: KeyboardEvent, i: number) => {
    const last = shown.length - 1;
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
        : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(shown[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div className={cx('hub-tabs', className)} role="tablist" aria-label={label}>
      {shown.map((t, i) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={i === focusable ? 0 : -1}
            className="hub-tab"
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => move(e, i)}
          >
            {t.label}
            {t.count !== undefined && <span className="hub-tab__count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ tab, idBase, children, className }: { tab: string; idBase: string; children: ReactNode; className?: string }) {
  return (
    <div role="tabpanel" id={`${idBase}-panel-${tab}`} aria-labelledby={`${idBase}-tab-${tab}`} className={className}>
      {children}
    </div>
  );
}

// The open tab lives in ?<key>=; the first visible tab is the default and keeps the URL clean. Never resets ?page=.
export function tabParam(adapter: ParamAdapter, tabs: readonly TabItem[], key = 'tab'): [string, (id: string) => void] {
  const ids = tabs.filter((t) => !t.hidden).map((t) => t.id);
  const fallback = ids[0] ?? '';
  const requested = adapter.get(key);
  const active = requested && ids.includes(requested) ? requested : fallback;
  return [active, (id) => adapter.set({ [key]: id === fallback ? null : id })];
}

export function EmptyState({ title, hint, action, className }: { title: ReactNode; hint?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('hub-empty', className)} role="status">
      <p className="hub-empty__title">{title}</p>
      {hint && <p className="hub-empty__hint">{hint}</p>}
      {action && <div className="hub-empty__action">{action}</div>}
    </div>
  );
}

export interface LoadStateLabels {
  loading: ReactNode;
  error: ReactNode;
  retry: ReactNode;
}

const LOAD_LABELS: LoadStateLabels = { loading: 'Loading…', error: 'Could not load this data.', retry: 'Try again' };

// Renders nothing once loaded without error, so it can sit above the content.
export function LoadState({ loading, error, retry, labels, className }: {
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
  labels?: Partial<LoadStateLabels>;
  className?: string;
}) {
  const t = { ...LOAD_LABELS, ...labels };
  if (error) {
    return (
      <div className={cx('hub-load hub-load--error', className)} role="alert">
        <span>{t.error}</span>
        {retry && <button type="button" className="hub-btn hub-btn--sm" onClick={retry}>{t.retry}</button>}
      </div>
    );
  }
  if (loading) {
    return (
      <div className={cx('hub-load', className)} role="status" aria-live="polite">
        <span className="hub-spinner" aria-hidden="true" />
        <span>{t.loading}</span>
      </div>
    );
  }
  return null;
}

export interface ListToolbarLabels {
  clearFilters: ReactNode;
}

export function ListToolbar({ search, count, actions, activeFilters = 0, onClearFilters, labels, className }: {
  search?: ReactNode;
  count?: ReactNode;
  actions?: ReactNode;
  activeFilters?: number;
  onClearFilters?: () => void;
  labels?: Partial<ListToolbarLabels>;
  className?: string;
}) {
  const t = { clearFilters: 'Clear filters', ...labels };
  return (
    <div className={cx('hub-toolbar hub-list-toolbar', className)}>
      {search}
      {onClearFilters && activeFilters > 0 && (
        <button type="button" className="hub-btn hub-btn--sm hub-btn--ghost" onClick={onClearFilters}>
          {t.clearFilters} <span className="hub-badge hub-badge--accent">{activeFilters}</span>
        </button>
      )}
      <div className="hub-toolbar__end">
        {count !== undefined && <span className="hub-list-toolbar__count" aria-live="polite">{count}</span>}
        {actions}
      </div>
    </div>
  );
}

export interface FilterPanelLabels {
  filters: ReactNode;
  show: string;
  hide: string;
}

// Collapsible filter block. phoneOnly: always open from tablet width, toggleable on phones.
export function FilterPanel({ open, onToggle, activeCount = 0, phoneOnly = true, labels, children, className }: {
  open: boolean;
  onToggle: () => void;
  activeCount?: number;
  phoneOnly?: boolean;
  labels?: Partial<FilterPanelLabels>;
  children: ReactNode;
  className?: string;
}) {
  const t = { filters: 'Filters', show: 'Show filters', hide: 'Hide filters', ...labels };
  const bodyId = useId();
  return (
    <div className={cx('hub-filter-panel', open && 'hub-filter-panel--open', phoneOnly && 'hub-filter-panel--phone-only', className)}>
      <button
        type="button"
        className="hub-filter-panel__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        title={open ? t.hide : t.show}
        onClick={onToggle}
      >
        <span>{t.filters}</span>
        {activeCount > 0 && <span className="hub-badge hub-badge--accent">{activeCount}</span>}
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="hub-filter-panel__chevron">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={bodyId} className="hub-filter-panel__body">{children}</div>
    </div>
  );
}

export function EntityTile({ href, icon, title, subtitle, badges, renderLink = plainLink, active, className }: {
  href?: string;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  renderLink?: RenderLink;
  active?: boolean;
  className?: string;
}) {
  const cls = cx('hub-tile', active && 'hub-tile--active', className);
  const body = (
    <>
      {icon && <span className="hub-tile__icon">{icon}</span>}
      <span className="hub-tile__text">
        <span className="hub-tile__title">{title}</span>
        {subtitle && <span className="hub-tile__subtitle">{subtitle}</span>}
        {badges && <span className="hub-tile__badges">{badges}</span>}
      </span>
    </>
  );
  return href ? <Fragment>{renderLink({ href, className: cls, children: body })}</Fragment> : <div className={cls}>{body}</div>;
}
