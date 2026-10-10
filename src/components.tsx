import { useEffect, useRef, useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from 'react';
import type { FilterMode } from './filters.js';

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  clearLabel?: string;
  // Waits this long after typing stops before calling onChange.
  debounceMs?: number;
  className?: string;
}

export function SearchBox({ value, onChange, placeholder = 'Search', label, clearLabel = 'Clear search', debounceMs = 0, className }: SearchBoxProps) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => setDraft(value), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const update = (next: string) => {
    setDraft(next);
    clearTimeout(timer.current);
    if (debounceMs > 0) timer.current = setTimeout(() => onChange(next), debounceMs);
    else onChange(next);
  };
  return (
    <div className={cx('hub-search', className)}>
      <input
        type="search"
        className="hub-input hub-search__input"
        value={draft}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        onChange={(e) => update(e.target.value)}
      />
      {draft && (
        <button type="button" className="hub-search__clear" aria-label={clearLabel} title={clearLabel} onClick={() => update('')}>
          ×
        </button>
      )}
    </div>
  );
}

export function FilterRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx('hub-filter-row', className)} role="group" aria-label={typeof label === 'string' ? label : undefined}>
      <span className="hub-filter-row__label">{label}</span>
      <div className="hub-filter-row__items">{children}</div>
    </div>
  );
}

export interface FilterChipProps {
  onClick: () => void;
  children: ReactNode;
  // Two-state chips pass `active`; tri-state chips pass `mode` (1 include, -1 exclude).
  active?: boolean;
  mode?: FilterMode;
  color?: string;
  title?: string;
  className?: string;
}

export function FilterChip({ onClick, children, active, mode, color, title, className }: FilterChipProps) {
  const state = mode ?? (active ? 1 : 0);
  return (
    <button
      type="button"
      className={cx('hub-chip', state === 1 && 'hub-chip--on', state === -1 && 'hub-chip--exclude', className)}
      aria-pressed={state === 1 ? true : state === -1 ? 'mixed' : false}
      style={color ? ({ '--hub-chip-color': color } as CSSProperties) : undefined}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export interface CheckboxOption {
  value: string;
  label: ReactNode;
}

// Multi-select within one category; an empty selection means no filter.
export function CheckboxGroup({ title, options, selected, onToggle, className }: {
  title: ReactNode;
  options: readonly CheckboxOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  className?: string;
}) {
  if (!options.length) return null;
  return (
    <FilterRow label={title} className={className}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <label key={o.value} className={cx('hub-chip', on && 'hub-chip--on')}>
            <input type="checkbox" className="hub-visually-hidden" checked={on} onChange={() => onToggle(o.value)} />
            {o.label}
          </label>
        );
      })}
    </FilterRow>
  );
}

export interface PagerLabels {
  first: string;
  prev: string;
  next: string;
  last: string;
  page: (page: number, pages: number) => string;
  jump: string;
}

const PAGER_LABELS: PagerLabels = {
  first: '« First',
  prev: '‹ Prev',
  next: 'Next ›',
  last: 'Last »',
  page: (p, n) => `Page ${p} / ${n}`,
  jump: 'Go to page',
};

// Pages are 1-based. Renders nothing for a single page.
export function Pager({ page, pages, onPage, labels, className }: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  labels?: Partial<PagerLabels>;
  className?: string;
}) {
  const [jump, setJump] = useState('');
  if (pages <= 1) return null;
  const t = { ...PAGER_LABELS, ...labels };
  const go = (p: number) => onPage(Math.min(pages, Math.max(1, p)));
  return (
    <nav className={cx('hub-pager', className)} aria-label={t.page(page, pages)}>
      <button type="button" className="hub-btn hub-btn--sm" disabled={page <= 1} onClick={() => go(1)}>{t.first}</button>
      <button type="button" className="hub-btn hub-btn--sm" disabled={page <= 1} onClick={() => go(page - 1)}>{t.prev}</button>
      <span className="hub-pager__status">{t.page(page, pages)}</span>
      <input
        className="hub-input hub-pager__jump"
        inputMode="numeric"
        placeholder="#"
        aria-label={t.jump}
        title={t.jump}
        value={jump}
        onChange={(e) => setJump(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          const n = Number(jump);
          if (Number.isFinite(n) && n >= 1) go(Math.floor(n));
          setJump('');
        }}
      />
      <button type="button" className="hub-btn hub-btn--sm" disabled={page >= pages} onClick={() => go(page + 1)}>{t.next}</button>
      <button type="button" className="hub-btn hub-btn--sm" disabled={page >= pages} onClick={() => go(pages)}>{t.last}</button>
    </nav>
  );
}

// Responsive grid: as many columns as fit at `min` px wide, one column on narrow phones.
export function CardGrid({ min = 160, gap = 12, children, className }: {
  min?: number;
  gap?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('hub-card-grid', className)} style={{ '--hub-card-min': `${min}px`, '--hub-card-gap': `${gap}px` } as CSSProperties}>
      {children}
    </div>
  );
}

export interface FallbackImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  // Tried in order; the next one loads when the current one fails.
  srcs: readonly (string | null | undefined)[];
  missing?: ReactNode;
  missingClassName?: string;
}

export function FallbackImage({ srcs, missing, missingClassName, className, alt = '', loading = 'lazy', style, width, height, ...rest }: FallbackImageProps) {
  const list = srcs.filter((s): s is string => !!s);
  const key = list.join('\n');
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [key]);
  if (index >= list.length) {
    return missing !== undefined
      ? <>{missing}</>
      : <div className={cx('hub-img--missing', missingClassName ?? className)} style={{ width, height, ...style }} role="img" aria-label={alt || undefined} />;
  }
  return (
    <img
      {...rest}
      className={className}
      style={style}
      width={width}
      height={height}
      src={list[index]}
      alt={alt}
      loading={loading}
      data-fallback={index > 0 ? index : undefined}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export interface CopyButtonProps {
  // A string, or a function for values built on click (e.g. a compressed share link).
  value: string | (() => string | Promise<string>);
  label?: ReactNode;
  copiedLabel?: ReactNode;
  failedLabel?: ReactNode;
  className?: string;
  title?: string;
  resetMs?: number;
}

export function CopyButton({
  value, label = 'Copy', copiedLabel = 'Copied', failedLabel = 'Copy failed', className, title, resetMs = 2500,
}: CopyButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const onClick = async () => {
    let ok = false;
    try {
      ok = await copyText(typeof value === 'function' ? await value() : value);
    } catch {
      ok = false;
    }
    setStatus(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), resetMs);
  };
  return (
    <button type="button" className={cx('hub-btn hub-btn--sm', className)} title={title} onClick={onClick} aria-live="polite">
      {status === 'copied' ? copiedLabel : status === 'failed' ? failedLabel : label}
    </button>
  );
}

// Copies the current page URL unless `value` builds a different one.
export function ShareButton({ value, label = 'Share link', ...rest }: Partial<CopyButtonProps>) {
  return <CopyButton value={value ?? (() => window.location.href)} label={label} {...rest} />;
}
