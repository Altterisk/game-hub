import { useSyncExternalStore, type ReactNode } from 'react';

/** `exchange`: battles are over, only the shop still takes the event currency. */
export type Phase = 'upcoming' | 'running' | 'exchange' | 'ended';

export interface TimeWindow {
  start?: string | number | null;
  end?: string | number | null;
  /** When the battles close inside the window (MAD's `stagesEnd`). */
  stagesEnd?: string | number | null;
}

const ms = (t: string | number | null | undefined) =>
  t === null || t === undefined || t === '' ? null : typeof t === 'number' ? t : Date.parse(t);

/** Date-only strings (`2026-10-30`) count as the whole day: an end date is still running on that day. */
const endMs = (t: string | number | null | undefined) => {
  const v = ms(t);
  return v !== null && typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t) ? v + 86_400_000 - 1 : v;
};

export function phaseOf(w: TimeWindow, now: number): Phase {
  const start = ms(w.start);
  const end = endMs(w.end);
  const stages = endMs(w.stagesEnd);
  if (start !== null && now < start) return 'upcoming';
  if (end !== null && now > end) return 'ended';
  return stages !== null && now > stages ? 'exchange' : 'running';
}

/** Milliseconds to the next phase change (start, battles end, end), or null when none is ahead. */
export function untilNext(w: TimeWindow, now: number): number | null {
  const next = [ms(w.start), endMs(w.stagesEnd), endMs(w.end)].filter((t): t is number => t !== null && t > now);
  return next.length ? Math.min(...next) - now : null;
}

export interface DurationUnits {
  d: string;
  h: string;
  m: string;
}

/** `3d 4h`, `4h 12m`, `12m`; units can be translated (`{ d: '일', h: '시간', m: '분' }`). */
export function formatRemaining(duration: number, units: DurationUnits = { d: 'd', h: 'h', m: 'm' }): string {
  const minutes = Math.max(0, Math.floor(duration / 60000));
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d) return `${d}${units.d} ${h}${units.h}`;
  if (h) return `${h}${units.h} ${m}${units.m}`;
  return `${m}${units.m}`;
}

interface Clock {
  now: number;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setInterval>;
  subscribe: (listener: () => void) => () => void;
  read: () => number;
}

const clocks = new Map<number, Clock>();

// One clock per interval with stable subscribe/read, so React never resubscribes on a re-render.
function clock(interval: number): Clock {
  let c = clocks.get(interval);
  if (c) return c;
  const created: Clock = {
    now: Date.now(),
    listeners: new Set(),
    subscribe(listener) {
      created.listeners.add(listener);
      if (!created.timer) {
        created.now = Date.now();
        created.timer = setInterval(() => {
          created.now = Date.now();
          created.listeners.forEach((fn) => fn());
        }, interval);
      }
      return () => {
        created.listeners.delete(listener);
        if (!created.listeners.size && created.timer) {
          clearInterval(created.timer);
          created.timer = undefined;
        }
      };
    },
    read: () => created.now,
  };
  clocks.set(interval, created);
  c = created;
  return c;
}

const serverNow = () => null;

/**
 * The current time, ticking every `interval` ms. `null` on the server and during hydration, so
 * prerendered HTML never bakes in a build-time "now".
 */
export function useNow(interval = 60_000): number | null {
  const c = clock(interval);
  return useSyncExternalStore(c.subscribe, c.read, serverNow);
}

export type PhaseLabels = Record<Phase, ReactNode>;

const PHASE_LABELS: PhaseLabels = { upcoming: 'Upcoming', running: 'Running', exchange: 'Exchange only', ended: 'Ended' };

/** A coloured phase pill; renders nothing until the client knows the time. */
export function LiveBadge({ window: w, labels, showEnded = false, countdown, units, className }: {
  window: TimeWindow;
  labels?: Partial<PhaseLabels>;
  showEnded?: boolean;
  /** Append the time to the next change: `Running · 3d 4h`. */
  countdown?: boolean;
  units?: DurationUnits;
  className?: string;
}) {
  const now = useNow(countdown ? 60_000 : 300_000);
  if (now === null) return null;
  const phase = phaseOf(w, now);
  if (phase === 'ended' && !showEnded) return null;
  const left = countdown ? untilNext(w, now) : null;
  const text = { ...PHASE_LABELS, ...labels };
  return (
    <span className={['hub-live', `hub-live--${phase}`, className].filter(Boolean).join(' ')}>
      {text[phase]}
      {left !== null && <span className="hub-live__time"> · {formatRemaining(left, units)}</span>}
    </span>
  );
}
