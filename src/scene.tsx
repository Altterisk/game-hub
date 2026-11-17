import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createSetting, type Setting } from './persist.js';

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

/** One text step of a scene; `null` = a step with no text box. */
export interface SceneLine {
  name?: ReactNode;
  text: ReactNode;
  /** Overrides the box's `lang` for this line (e.g. 'en' for a translated line). */
  lang?: string;
}

/**
 * The saved text mode: `true` = every line in the page up front (page translators such as
 * Chrome's reach them all), `false` = only the current line (translator extensions that handle
 * new text themselves). Reads earlier saves of `true`/`false` and bare "1"/"0".
 */
export function sceneTextSetting(key: string, initial = true): Setting<boolean> {
  return createSetting<boolean>({
    key,
    initial,
    sanitize: (raw) => (raw === false || raw === 0 || raw === '0' || raw === 'false' ? false
      : raw === true || raw === 1 || raw === '1' || raw === 'true' ? true : initial),
  });
}

export interface SceneStepperOptions {
  count: number;
  start?: number;
  /** Next on the last step. */
  onEnd?: () => void;
  /** Escape. */
  onClose?: () => void;
  /** Auto mode: ms to wait on a step before going on. */
  autoDelay?: (at: number) => number;
  /** False holds auto mode (e.g. while the step's pictures load). */
  ready?: boolean;
  /** Listen for → Space Enter (next), ← (back), Home, End and Escape on the window. */
  keys?: boolean;
}

export interface SceneStepper {
  at: number;
  go: (n: number) => void;
  next: () => void;
  back: () => void;
  atEnd: boolean;
  auto: boolean;
  setAuto: (v: boolean | ((prev: boolean) => boolean)) => void;
}

/** The current step of a scene, stepping, auto mode and the keyboard. */
export function useSceneStepper({
  count, start = 0, onEnd, onClose, autoDelay = () => 2400, ready = true, keys = true,
}: SceneStepperOptions): SceneStepper {
  const [at, setAt] = useState(start);
  const [auto, setAuto] = useState(false);
  const last = Math.max(0, count - 1);
  const go = useCallback((n: number) => setAt(Math.max(0, Math.min(last, n))), [last]);
  const atEnd = at >= last;
  const next = useCallback(() => {
    if (at < last) setAt(at + 1);
    else onEnd?.();
  }, [at, last, onEnd]);
  const back = useCallback(() => setAt((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (!auto || !ready || !count) return undefined;
    const id = window.setTimeout(next, autoDelay(at));
    return () => window.clearTimeout(id);
  }, [auto, ready, at, count, next, autoDelay]);

  useEffect(() => {
    if (!keys) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        if (t instanceof HTMLButtonElement && e.key !== 'ArrowRight') return;
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(last);
      else if (e.key === 'Escape' && onClose && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, next, back, go, last, onClose]);

  return { at, go, next, back, atEnd, auto, setAuto };
}

/** The scene's stage: a fixed aspect, scaled to its width; a click anywhere advances. */
export function SceneFrame({ aspect, onAdvance, label = 'Next line', className, children }: {
  /** CSS aspect-ratio, e.g. '3 / 2'. */
  aspect: string;
  onAdvance?: () => void;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx('hub-scene-frame', className)} style={{ aspectRatio: aspect }} onClick={onAdvance}
      role={onAdvance ? 'button' : undefined} tabIndex={onAdvance ? -1 : undefined} aria-label={onAdvance ? label : undefined}>
      {children}
    </div>
  );
}

/**
 * The dialogue box. With `allLines`, every line is in the box from the start, stacked and
 * transparent but for the current one, and never re-rendered: page translators replace the
 * text nodes once and stepping only moves the `is-on` class. Otherwise only the current line,
 * keyed so each is a fresh element (a translator-replaced node updated in place would keep
 * showing the old text). Changing `lines` rebuilds the box.
 */
export function SceneTextBox({ lines, at, allLines, hidden, lang = 'ja', className }: {
  lines: (SceneLine | null)[];
  at: number;
  allLines: boolean;
  hidden?: boolean;
  lang?: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const stack = useMemo(() => lines.map((l, k) => l && (
    <div key={k} className="hub-scene-say" data-k={k} aria-hidden="true" lang={l.lang}>
      {l.name ? <div className="hub-scene-name">{l.name}</div> : null}
      <p className="hub-scene-line">{l.text}</p>
    </div>
  )), [lines]);
  useLayoutEffect(() => {
    if (!allLines || !box.current) return;
    for (const el of box.current.querySelectorAll<HTMLElement>(':scope > .hub-scene-say')) {
      const on = el.dataset.k === String(at);
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
  }, [allLines, at, stack]);
  const cur = lines[at];
  const off = hidden || !cur;
  return (
    <div key={allLines ? 'all' : 'one'} ref={box} className={cx('hub-scene-text', off && 'is-off', className)} lang={lang}>
      {allLines ? stack : cur && (
        <div key={at} className="hub-scene-say is-on" lang={cur.lang}>
          {cur.name ? <div className="hub-scene-name">{cur.name}</div> : null}
          <p className="hub-scene-line">{cur.text}</p>
        </div>
      )}
    </div>
  );
}

export interface SceneControlsLabels {
  back: string;
  next: string;
  auto: string;
  textAll: string;
  textOne: string;
  textTitle: string;
  theater: string;
  exitTheater: string;
  close: string;
  position: string;
}

const CONTROL_LABELS: SceneControlsLabels = {
  back: 'Back',
  next: 'Next',
  auto: 'Auto',
  textAll: 'Text: all lines',
  textOne: 'Text: per line',
  textTitle: "Which works best depends on the translator. All lines: the whole scene's text is in the page up front (Chrome's built-in translation). Per line: only the current line (some translator extensions).",
  theater: 'Theater',
  exitTheater: 'Exit theater',
  close: 'Close',
  position: 'Position in scene',
};

/**
 * The player's button bar: back, an optional position slider, next, the step count, then the
 * optional Auto, text mode, the site's own buttons (`children`), Theater and Close.
 */
export function SceneControls({
  stepper, count, nextDisabled, slider, allLines, onAllLines, theater, onTheater, onClose, children, labels, className,
}: {
  stepper: SceneStepper;
  count: number;
  nextDisabled?: boolean;
  slider?: boolean;
  allLines?: boolean;
  onAllLines?: (v: boolean) => void;
  theater?: boolean;
  onTheater?: () => void;
  onClose?: () => void;
  children?: ReactNode;
  labels?: Partial<SceneControlsLabels>;
  className?: string;
}) {
  const l = { ...CONTROL_LABELS, ...labels };
  const { at, back, next, go, auto, setAuto } = stepper;
  return (
    <div className={cx('hub-scene-controls', className)} translate="no">
      <button type="button" className="hub-btn" onClick={back} disabled={at === 0}>{l.back}</button>
      {slider && count > 1 && (
        <input type="range" className="hub-scene-controls__range" min={0} max={count - 1} value={at}
          onChange={(e) => go(Number(e.target.value))} aria-label={l.position} />
      )}
      <button type="button" className="hub-btn" onClick={next} disabled={nextDisabled}>{l.next}</button>
      <span className="hub-scene-controls__count">{Math.min(at + 1, count)} / {count}</span>
      <button type="button" className="hub-btn" aria-pressed={auto} onClick={() => setAuto((v) => !v)}>{l.auto}</button>
      {onAllLines && (
        <button type="button" className="hub-btn" aria-pressed={!!allLines} onClick={() => onAllLines(!allLines)} title={l.textTitle}>
          {allLines ? l.textAll : l.textOne}
        </button>
      )}
      {children}
      {onTheater && (
        <button type="button" className="hub-btn" aria-pressed={!!theater} onClick={onTheater}>
          {theater ? l.exitTheater : l.theater}
        </button>
      )}
      {onClose && <button type="button" className="hub-btn" onClick={onClose}>{l.close}</button>}
    </div>
  );
}

/**
 * Theater: the browser's fullscreen on `ref` where an element can have it, else a full-window
 * overlay the site styles from `on` (iPhone Safari has no element fullscreen). Leaving
 * fullscreen with the browser's own controls ends it too.
 */
export function useSceneTheater(ref: RefObject<HTMLElement | null>): [boolean, () => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const change = () => { if (!document.fullscreenElement) setOn(false); };
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (on) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setOn(false);
      return;
    }
    setOn(true);
    if (el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
        (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => {});
      }, () => {});
    }
  }, [on, ref]);
  return [on, toggle];
}
