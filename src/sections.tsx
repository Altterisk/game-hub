import { Children, Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CopyButton, FallbackImage } from './components.js';
import { MetaChips, plainLink, type RenderLink } from './page.js';

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

// A banner (or icon) card for an event, world, chapter or mode.
export function BannerCard({ href, art, title, badge, window: when, count, renderLink = plainLink, highlight, className }: {
  href: string;
  art?: ReactNode;
  title: ReactNode;
  // e.g. "Live" / "Current event".
  badge?: ReactNode;
  window?: ReactNode;
  count?: ReactNode;
  renderLink?: RenderLink;
  highlight?: boolean;
  className?: string;
}) {
  const body = (
    <>
      {art && <span className="hub-banner-card__art">{art}</span>}
      <span className="hub-banner-card__body">
        {(badge || when) && (
          <span className="hub-banner-card__badges">
            {badge && <span className="hub-badge hub-badge--accent">{badge}</span>}
            {when && <span className="hub-banner-card__window">{when}</span>}
          </span>
        )}
        <span className="hub-banner-card__title">{title}</span>
        {count && <span className="hub-banner-card__count">{count}</span>}
      </span>
    </>
  );
  return <Fragment>{renderLink({ href, className: cx('hub-banner-card', highlight && 'hub-banner-card--highlight', className), children: body })}</Fragment>;
}

// A capped row of small icons with "+N" for the rest.
export function IconPreview({ label, count, max = 8, children, className }: {
  label: ReactNode;
  count?: number;
  max?: number;
  children: ReactNode;
  className?: string;
}) {
  const items = Children.toArray(children);
  const total = count ?? items.length;
  const shown = items.slice(0, max);
  return (
    <div className={cx('hub-icon-preview', className)}>
      <span className="hub-icon-preview__label">{label}</span>
      <span className="hub-icon-preview__items">
        {shown}
        {total > shown.length && <span className="hub-icon-preview__more">+{total - shown.length}</span>}
      </span>
    </div>
  );
}

export function StageCard({ href, title, id, meta, previews, renderLink = plainLink, className }: {
  href: string;
  title: ReactNode;
  id?: ReactNode;
  // MetaChip elements.
  meta?: ReactNode;
  // IconPreview elements.
  previews?: ReactNode;
  renderLink?: RenderLink;
  className?: string;
}) {
  const body = (
    <>
      <span className="hub-stage-card__head">
        <span className="hub-stage-card__title">{title}</span>
        {id !== undefined && <span className="hub-stage-card__id">{id}</span>}
      </span>
      {meta && <MetaChips>{meta}</MetaChips>}
      {previews}
    </>
  );
  return <Fragment>{renderLink({ href, className: cx('hub-stage-card', className), children: body })}</Fragment>;
}

export interface RewardItem {
  key?: string;
  icon: ReactNode;
  name: ReactNode;
  amount?: ReactNode;
  // 0..1; shown as a percentage.
  chance?: number;
  note?: ReactNode;
  href?: string;
}

// One decimal (two below 1%), trailing zeros dropped: 12.5%, 50%, 0.35%.
export function formatChance(chance: number): string {
  const pct = chance * 100;
  return `${parseFloat(pct.toFixed(pct >= 1 ? 1 : 2))}%`;
}

export function RewardGrid({ items, renderLink = plainLink, min = 180, className }: {
  items: readonly RewardItem[];
  renderLink?: RenderLink;
  min?: number;
  className?: string;
}) {
  return (
    <ul className={cx('hub-rewards', className)} style={{ ['--hub-reward-min' as string]: `${min}px` }}>
      {items.map((it, i) => {
        const body = (
          <>
            <span className="hub-reward__icon">{it.icon}</span>
            <span className="hub-reward__text">
              <span className="hub-reward__name">{it.name}</span>
              {it.note && <span className="hub-reward__note">{it.note}</span>}
            </span>
            {(it.amount !== undefined || it.chance !== undefined) && (
              <span className="hub-reward__nums">
                {it.amount !== undefined && <span className="hub-reward__amount">×{it.amount}</span>}
                {it.chance !== undefined && <span className="hub-reward__chance">{formatChance(it.chance)}</span>}
              </span>
            )}
          </>
        );
        return (
          <li key={it.key ?? i}>
            {it.href ? renderLink({ href: it.href, className: 'hub-reward hub-reward--link', children: body }) : <div className="hub-reward">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export interface WaveNavLabels {
  prev: string;
  next: string;
  wave: (index: number, count: number) => ReactNode;
}

// Index is 0-based; the label shows it 1-based.
export function WaveNav({ count, index, onChange, labels, className }: {
  count: number;
  index: number;
  onChange: (index: number) => void;
  labels?: Partial<WaveNavLabels>;
  className?: string;
}) {
  const t: WaveNavLabels = { prev: 'Previous wave', next: 'Next wave', wave: (i, n) => `Wave ${i + 1} / ${n}`, ...labels };
  if (count <= 1) return null;
  return (
    <div className={cx('hub-wave-nav', className)}>
      <button type="button" className="hub-btn hub-btn--sm" aria-label={t.prev} title={t.prev} disabled={index <= 0} onClick={() => onChange(index - 1)}>‹</button>
      <span className="hub-wave-nav__label" aria-live="polite">{t.wave(index, count)}</span>
      <button type="button" className="hub-btn hub-btn--sm" aria-label={t.next} title={t.next} disabled={index >= count - 1} onClick={() => onChange(index + 1)}>›</button>
    </div>
  );
}

// A slider with a number box; typing an out-of-range value clamps on blur or Enter.
export function LevelControl({ value, min, max, step = 1, onChange, label, marks, className }: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: ReactNode;
  marks?: readonly number[];
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n / step) * step));
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && draft.trim() !== '') onChange(clamp(n));
    else setDraft(String(value));
  };
  return (
    <div className={cx('hub-level', className)}>
      <label className="hub-level__label" htmlFor={`${id}-range`}>{label}</label>
      <input
        id={`${id}-range`}
        className="hub-level__range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        list={marks?.length ? `${id}-marks` : undefined}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
      />
      {marks?.length ? (
        <datalist id={`${id}-marks`}>{marks.map((m) => <option key={m} value={m} />)}</datalist>
      ) : null}
      <input
        className="hub-input hub-level__number"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-labelledby={`${id}-range`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
    </div>
  );
}

export function ProgressBar({ value, max, label, showCount = true, className }: {
  value: number;
  max: number;
  label?: ReactNode;
  showCount?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cx('hub-progress', className)}>
      {(label || showCount) && (
        <div className="hub-progress__head">
          {label && <span className="hub-progress__label">{label}</span>}
          {showCount && <span className="hub-progress__count">{value} / {max}</span>}
        </div>
      )}
      <div
        className="hub-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        <div className="hub-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  closeLabel?: string;
  wide?: boolean;
  children: ReactNode;
  className?: string;
}

// Escape or the backdrop closes it; focus moves to the dialog and back; the page behind does not scroll.
export function Modal({ open, onClose, title, closeLabel = 'Close', wide, children, className }: ModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="hub-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialog}
        className={cx('hub-modal__dialog', wide && 'hub-modal__dialog--wide', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className="hub-modal__head">
          {title && <h2 id={titleId} className="hub-modal__title">{title}</h2>}
          <button type="button" className="hub-modal__close" aria-label={closeLabel} title={closeLabel} onClick={onClose}>×</button>
        </div>
        <div className="hub-modal__body">{children}</div>
      </div>
    </div>
  );
}

export interface LightboxItem {
  // Tried in order, like FallbackImage.
  srcs: readonly (string | null | undefined)[];
  label?: ReactNode;
  alt?: string;
}

export interface LightboxLabels {
  close: string;
  prev: string;
  next: string;
  position: (index: number, count: number) => ReactNode;
}

// Arrow keys step through the items; Escape closes. index null = closed.
export function Lightbox({ items, index, onIndex, onClose, labels }: {
  items: readonly LightboxItem[];
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  labels?: Partial<LightboxLabels>;
}) {
  const t: LightboxLabels = { close: 'Close', prev: 'Previous', next: 'Next', position: (i, n) => `${i + 1} / ${n}`, ...labels };
  const open = index !== null && index >= 0 && index < items.length;
  const step = useRef((d: number) => {});
  step.current = (d: number) => {
    if (index === null || items.length < 2) return;
    onIndex((index + d + items.length) % items.length);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowRight') step.current(1);
      else if (e.key === 'ArrowLeft') step.current(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const item = open ? items[index!] : null;
  return (
    <Modal open={open} onClose={onClose} closeLabel={t.close} title={item?.label} wide className="hub-lightbox">
      {item && (
        <>
          <div className="hub-lightbox__stage">
            <FallbackImage srcs={item.srcs} alt={item.alt ?? (typeof item.label === 'string' ? item.label : '')} loading="eager" className="hub-lightbox__img" />
          </div>
          {items.length > 1 && (
            <div className="hub-lightbox__nav">
              <button type="button" className="hub-btn hub-btn--sm" onClick={() => step.current(-1)} aria-label={t.prev}>‹ {t.prev}</button>
              <span className="hub-muted hub-small">{t.position(index!, items.length)}</span>
              <button type="button" className="hub-btn hub-btn--sm" onClick={() => step.current(1)} aria-label={t.next}>{t.next} ›</button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export interface BackupPanelLabels {
  title: ReactNode;
  code: ReactNode;
  copy: ReactNode;
  copied: ReactNode;
  pasteCode: string;
  importCode: ReactNode;
  exportFile: ReactNode;
  importFile: ReactNode;
  imported: ReactNode;
}

const BACKUP_LABELS: BackupPanelLabels = {
  title: 'Backup',
  code: 'Restore code',
  copy: 'Copy code',
  copied: 'Copied',
  pasteCode: 'Paste a restore code',
  importCode: 'Restore',
  exportFile: 'Export file',
  importFile: 'Import file',
  imported: 'Restored.',
};

// Import handlers return an error message, or nothing on success.
export type ImportResult = string | null | void | Promise<string | null | void>;

export function BackupPanel({ code, onImportCode, onExportFile, onImportFile, accept = '.json,application/json', labels, className }: {
  code?: string;
  onImportCode?: (code: string) => ImportResult;
  onExportFile?: () => void;
  onImportFile?: (file: File) => ImportResult;
  accept?: string;
  labels?: Partial<BackupPanelLabels>;
  className?: string;
}) {
  const t = { ...BACKUP_LABELS, ...labels };
  const [paste, setPaste] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: ReactNode } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const run = async (fn: () => ImportResult) => {
    try {
      const err = await fn();
      setStatus(err ? { ok: false, text: err } : { ok: true, text: t.imported });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };
  return (
    <section className={cx('hub-panel hub-backup', className)}>
      <h3 className="hub-section__title">{t.title}</h3>
      {code !== undefined && (
        <div className="hub-backup__row">
          <label className="hub-backup__label">
            <span>{t.code}</span>
            <input className="hub-input hub-backup__code" readOnly value={code} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <CopyButton value={code} label={t.copy} copiedLabel={t.copied} />
        </div>
      )}
      {onImportCode && (
        <div className="hub-backup__row">
          <input className="hub-input hub-backup__code" placeholder={t.pasteCode} aria-label={t.pasteCode} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button type="button" className="hub-btn hub-btn--sm" disabled={!paste.trim()} onClick={() => run(() => onImportCode(paste.trim()))}>{t.importCode}</button>
        </div>
      )}
      {(onExportFile || onImportFile) && (
        <div className="hub-backup__row">
          {onExportFile && <button type="button" className="hub-btn hub-btn--sm" onClick={onExportFile}>{t.exportFile}</button>}
          {onImportFile && (
            <>
              <button type="button" className="hub-btn hub-btn--sm" onClick={() => fileRef.current?.click()}>{t.importFile}</button>
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                className="hub-visually-hidden"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) run(() => onImportFile(file));
                }}
              />
            </>
          )}
        </div>
      )}
      {status && <p className={cx('hub-backup__status', !status.ok && 'hub-backup__status--error')} role="status">{status.text}</p>}
    </section>
  );
}

export interface ReleaseEntry {
  kind?: string;
  text: ReactNode;
}

export interface Release {
  // ISO date (YYYY-MM-DD); also the key a site can pass to createSeenStore.
  date: string;
  title?: ReactNode;
  entries: readonly ReleaseEntry[];
}

export function ReleaseList({ releases, kindLabel, limit, className }: {
  releases: readonly Release[];
  kindLabel?: (kind: string) => ReactNode;
  limit?: number;
  className?: string;
}) {
  const shown = limit ? releases.slice(0, limit) : releases;
  return (
    <div className={cx('hub-releases', className)}>
      {shown.map((r) => (
        <section key={r.date} className="hub-release">
          <h3 className="hub-release__head">
            <time dateTime={r.date}>{r.date}</time>
            {r.title && <span className="hub-release__title">{r.title}</span>}
          </h3>
          <ul>
            {r.entries.map((e, i) => (
              <li key={i}>
                {e.kind && <span className="hub-badge">{kindLabel ? kindLabel(e.kind) : e.kind}</span>} {e.text}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// Controlled; pair with createSeenStore(...).useShouldShow(`changelog:${latest.date}`).
export function ChangelogDialog({ open, onClose, releases, title = "What's new", closeLabel, kindLabel, limit = 1, footer }: {
  open: boolean;
  onClose: () => void;
  releases: readonly Release[];
  title?: ReactNode;
  closeLabel?: string;
  kindLabel?: (kind: string) => ReactNode;
  limit?: number;
  footer?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} closeLabel={closeLabel}>
      <ReleaseList releases={releases} kindLabel={kindLabel} limit={limit} />
      {footer && <div className="hub-modal__footer">{footer}</div>}
    </Modal>
  );
}
