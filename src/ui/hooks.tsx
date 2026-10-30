import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { copyText } from '../components.js';
import { BREAKPOINTS, valueAt, type Breakpoint, type Responsive } from './system.js';

export function useDisclosure({ defaultIsOpen = false, isOpen: controlled, onOpen, onClose }: {
  defaultIsOpen?: boolean; isOpen?: boolean; onOpen?: () => void; onClose?: () => void;
} = {}) {
  const [inner, setInner] = useState(defaultIsOpen);
  const isOpen = controlled ?? inner;
  const open = useCallback(() => { if (controlled === undefined) setInner(true); onOpen?.(); }, [controlled, onOpen]);
  const close = useCallback(() => { if (controlled === undefined) setInner(false); onClose?.(); }, [controlled, onClose]);
  const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, open, close]);
  return { isOpen, onOpen: open, onClose: close, onToggle: toggle };
}

export function useClipboard(initial: string, timeout = 1500) {
  const [value, setValue] = useState(initial);
  const [hasCopied, setHasCopied] = useState(false);
  useEffect(() => setValue(initial), [initial]);
  useEffect(() => {
    if (!hasCopied) return;
    const t = setTimeout(() => setHasCopied(false), timeout);
    return () => clearTimeout(t);
  }, [hasCopied, timeout]);
  const onCopy = useCallback(() => { void copyText(value).then((ok) => setHasCopied(ok)); }, [value]);
  return { value, setValue, onCopy, hasCopied };
}

const ORDER: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

function currentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'base';
  let bp: Breakpoint = 'base';
  for (const b of ORDER.slice(1)) {
    if (window.matchMedia(`(min-width: ${BREAKPOINTS[b as keyof typeof BREAKPOINTS]})`).matches) bp = b;
  }
  return bp;
}

function subscribeResize(cb: () => void) {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
}

/** The value for the current breakpoint; `fallback` (or base) on the server and during hydration. */
export function useBreakpointValue<T>(values: Responsive<T>, opts?: { fallback?: Breakpoint; ssr?: boolean } | Breakpoint): T | undefined {
  const fallback = typeof opts === 'string' ? opts : opts?.fallback ?? 'base';
  const bp = useSyncExternalStore(subscribeResize, currentBreakpoint, () => fallback);
  return valueAt(values, bp);
}

export function useMediaQuery(query: string | string[], opts?: { fallback?: boolean | boolean[]; ssr?: boolean }): boolean[] {
  const queries = Array.isArray(query) ? query : [query];
  const read = () => queries.map((q) => (typeof window === 'undefined' ? false : window.matchMedia(q).matches)).join(',');
  const fb = () => queries.map((_q, i) => (Array.isArray(opts?.fallback) ? !!opts!.fallback[i] : !!opts?.fallback)).join(',');
  const s = useSyncExternalStore(subscribeResize, read, fb);
  return s.split(',').map((x) => x === 'true');
}

export interface ToastOptions {
  title?: ReactNode;
  description?: ReactNode;
  status?: 'info' | 'success' | 'warning' | 'error' | 'loading';
  duration?: number | null;
  isClosable?: boolean;
  position?: string;
  id?: string;
}

interface ToastItem extends ToastOptions { key: number }

let toasts: ToastItem[] = [];
let nextKey = 1;
const toastListeners = new Set<() => void>();
const emitToasts = () => toastListeners.forEach((l) => l());

function removeToast(key: number) {
  toasts = toasts.filter((t) => t.key !== key);
  emitToasts();
}

/** Shows a toast in the `<Toaster />` region (render it once, e.g. in the app shell). */
export function toast(opts: ToastOptions): number {
  const key = nextKey++;
  toasts = [...toasts.filter((t) => !opts.id || t.id !== opts.id), { ...opts, key }];
  emitToasts();
  const duration = opts.duration === undefined ? 5000 : opts.duration;
  if (duration !== null) setTimeout(() => removeToast(key), duration);
  return key;
}

export function useToast(defaults: ToastOptions = {}) {
  return useCallback((opts: ToastOptions) => toast({ ...defaults, ...opts }), [JSON.stringify(defaults)]);
}

const STATUS_COLOR: Record<string, string> = {
  info: 'var(--ui-c-blue-200)', success: 'var(--ui-c-green-200)', warning: 'var(--ui-c-orange-200)', error: 'var(--ui-c-red-200)', loading: 'var(--ui-c-blue-200)',
};

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => { toastListeners.add(l); return () => { toastListeners.delete(l); }; },
    () => toasts,
    () => toasts,
  );
  if (!list.length) return null;
  return (
    <div className="ui-toaster" role="region" aria-live="polite"
      style={{ position: 'fixed', bottom: 16, left: 0, right: 0, zIndex: 1700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none', padding: '0 8px' }}>
      {list.map((t) => (
        <div key={t.key} role="status" style={{
          pointerEvents: 'auto', maxWidth: 560, width: '100%', display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px',
          borderRadius: 'var(--hub-radius-md, 10px)', background: STATUS_COLOR[t.status ?? 'info'], color: 'var(--ui-c-gray-900)',
          boxShadow: 'var(--hub-shadow-popover)', fontSize: 14,
        }}>
          <div style={{ flex: 1 }}>
            {t.title && <div style={{ fontWeight: 700 }}>{t.title}</div>}
            {t.description && <div>{t.description}</div>}
          </div>
          {t.isClosable && <button type="button" aria-label="Close" onClick={() => removeToast(t.key)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', fontSize: 16 }}>×</button>}
        </div>
      ))}
    </div>
  );
}
