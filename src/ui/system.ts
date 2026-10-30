import type { CSSProperties } from 'react';
import { UI_TOKENS } from './tokens.gen.js';

export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
const BPS: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

/** A value, or one per breakpoint (`{ base: 2, md: 4 }` or `[2, null, 4]`). */
export type Responsive<T> = T | (T | null | undefined)[] | Partial<Record<Breakpoint, T>>;

type Scale = keyof typeof UI_TOKENS.scales | 'colors' | 'px';
type PropDef = readonly [readonly string[], Scale?];

const PROPS = UI_TOKENS.props as unknown as Record<string, PropDef>;
const ALIAS = UI_TOKENS.alias as Record<string, string>;
const RESPONSIVE = new Set<string>(UI_TOKENS.responsive as readonly string[]);
const SCALES = UI_TOKENS.scales as unknown as Record<string, Record<string, string | number>>;
const PALETTES = new Set<string>(UI_TOKENS.palettes as readonly string[]);
const UNITLESS = new Set(['opacity', 'z-index', 'flex', 'flex-grow', 'flex-shrink', 'order', 'font-weight', 'line-height', '-webkit-line-clamp', 'aspect-ratio']);
const OUTLINE = '0 0 0 3px color-mix(in srgb, var(--ui-c-accent-300) 28%, transparent)';
const STATES = UI_TOKENS.states as Record<string, string>;
const STATE_PROPS = new Set<string>(UI_TOKENS.stateProps as readonly string[]);

type StyleValue = string | number | null | undefined | false;

type StateStyle = { [K in keyof typeof UI_TOKENS.props]?: StyleValue };

/** Every Chakra-style prop the kit understands, the pseudo-state props and `noOfLines`. */
export type StyleProps = {
  [K in keyof typeof UI_TOKENS.props]?: Responsive<StyleValue>;
} & {
  [K in keyof typeof UI_TOKENS.states]?: StateStyle;
} & {
  noOfLines?: number;
};

const kebabToCamel = (s: string) => s.startsWith('--') ? s : s.replace(/^-webkit-/, 'Webkit-').replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export function resolveColor(v: StyleValue): StyleValue {
  if (typeof v !== 'string') return v;
  const t = v.startsWith('colors.') ? v.slice(7) : v;
  const m = /^([a-zA-Z]+)\.(\d+)$/.exec(t);
  if (m && PALETTES.has(m[1])) return `var(--ui-c-${m[1]}-${m[2]})`;
  const hub = /^(hub|surface)\.(\w+)$/.exec(t);
  if (hub) return `var(--ui-c-${hub[1]}-${kebab(hub[2])})`;
  return t;
}

const GRADIENT_DIR: Record<string, string> = {
  'to-t': 'to top', 'to-tr': 'to top right', 'to-r': 'to right', 'to-br': 'to bottom right', 'to-b': 'to bottom', 'to-bl': 'to bottom left', 'to-l': 'to left', 'to-tl': 'to top left',
};

/** Chakra's `linear(to-t, gray.900 30%, transparent)` → a CSS gradient with theme colours. */
export function resolveGradient(v: string): string {
  const m = /^(linear|radial)\((.*)\)$/.exec(v.trim());
  if (!m) return v;
  const parts = m[2].split(/,(?![^(]*\))/).map((p) => p.trim());
  const out = parts.map((p, i) => {
    if (i === 0 && GRADIENT_DIR[p]) return GRADIENT_DIR[p];
    const [c, ...stop] = p.split(/\s+/);
    return [resolveColor(c), ...stop].join(' ');
  });
  return `${m[1]}-gradient(${out.join(', ')})`;
}

export function resolveValue(value: StyleValue, scale: Scale | undefined, cssProp?: string): StyleValue {
  if (value === null || value === undefined || value === false) return undefined;
  if (scale === 'colors') return resolveColor(value);
  if ((scale as string) === 'gradient') return typeof value === 'string' ? resolveGradient(value) : value;
  if (typeof value === 'string' && value.startsWith('var(')) return value;
  if (scale === 'shadows' && value === 'outline') return OUTLINE;
  const table = scale && scale !== 'px' ? SCALES[scale] : undefined;
  if (table) {
    const neg = typeof value === 'number' ? value < 0 : value.startsWith('-') && table[value.slice(1)] !== undefined;
    const key = neg ? String(value).replace(/^-/, '') : String(value);
    const hit = table[key];
    if (hit !== undefined) return neg ? `calc(${hit} * -1)` : hit;
    if (scale === 'radii' && typeof value === 'string' && value.includes(' ')) {
      return value.split(/\s+/).map((x) => resolveValue(x, 'radii')).join(' ');
    }
    if (scale === 'borders' && typeof value === 'string') {
      return value.replace(/\b([a-zA-Z]+\.\d+)\b/g, (x) => String(resolveColor(x)));
    }
  }
  if (typeof value === 'number' && cssProp && !UNITLESS.has(cssProp)) return value === 0 ? 0 : `${value}px`;
  return value;
}

export const isStyleProp = (key: string) => key in PROPS || key.startsWith('_') || key === 'noOfLines';

function entries(v: Responsive<StyleValue>): [Breakpoint, StyleValue][] {
  if (Array.isArray(v)) return v.map((x, i) => [BPS[i], x] as [Breakpoint, StyleValue]).filter(([b]) => b);
  if (v && typeof v === 'object') return Object.entries(v) as [Breakpoint, StyleValue][];
  return [['base', v as StyleValue]];
}

export interface Split<R> {
  style: CSSProperties;
  className: string;
  rest: R;
}

/** Turns style props into an inline style plus responsive/hover classes; the other props pass through. */
export function splitStyleProps<P extends Record<string, unknown>>(props: P): Split<Omit<P, keyof StyleProps>> {
  const style: Record<string, string | number> = {};
  const classes: string[] = [];
  const rest: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(props)) {
    if (key.startsWith('_')) {
      const prefix = STATES[key];
      if (!prefix) continue;
      for (const [hk, hv] of Object.entries((raw ?? {}) as Record<string, StyleValue>)) {
        const canon = ALIAS[hk] ?? hk;
        const def = PROPS[canon];
        if (!def || !STATE_PROPS.has(canon)) continue;
        const v = resolveValue(hv, def[1], def[0][0]);
        if (v === undefined || v === null || v === false) continue;
        style[`--${prefix}-${canon}`] = v;
        classes.push(`${prefix}-${canon}`);
      }
      continue;
    }
    if (key === 'noOfLines') {
      if (raw) {
        classes.push('ui-clamp');
        style['--ui-clamp'] = raw as number;
      }
      continue;
    }
    const def = PROPS[key];
    if (!def) {
      rest[key] = raw;
      continue;
    }
    if (raw === undefined || raw === null || raw === false) continue;
    const [cssProps, scale] = def;
    const canon = ALIAS[key] ?? key;
    const isResp = Array.isArray(raw) || (typeof raw === 'object' && raw !== null);
    if (!isResp) {
      for (const c of cssProps) {
        const v = resolveValue(raw as StyleValue, scale, c);
        if (v !== undefined && v !== null && v !== false) style[kebabToCamel(c)] = v;
      }
      continue;
    }
    const list = entries(raw as Responsive<StyleValue>);
    if (!RESPONSIVE.has(canon)) {
      const base = list.find(([b, v]) => b === 'base' && v !== null && v !== undefined)?.[1] ?? list.find(([, v]) => v !== null && v !== undefined)?.[1];
      for (const c of cssProps) {
        const v = resolveValue(base as StyleValue, scale, c);
        if (v !== undefined && v !== null && v !== false) style[kebabToCamel(c)] = v;
      }
      continue;
    }
    for (const [bp, value] of list) {
      const v = resolveValue(value, scale, cssProps[0]);
      if (v === undefined || v === null || v === false) continue;
      style[`--r-${canon}-${bp}`] = v;
      classes.push(`r-${canon}-${bp}`);
    }
  }
  return { style: style as CSSProperties, className: classes.join(' '), rest: rest as Omit<P, keyof StyleProps> };
}

export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

/** A responsive value read at one breakpoint (falls back to the nearest smaller one). */
export function valueAt<T>(v: Responsive<T> | undefined, bp: Breakpoint): T | undefined {
  if (v === undefined) return undefined;
  const list = entries(v as Responsive<StyleValue>) as [Breakpoint, T][];
  let out: T | undefined;
  for (const b of BPS) {
    const hit = list.find(([k]) => k === b);
    if (hit && hit[1] !== null && hit[1] !== undefined) out = hit[1];
    if (b === bp) break;
  }
  return out;
}

/** Maps a responsive value through `fn`, keeping its breakpoints. */
export function mapResponsive<T, U>(v: Responsive<T> | undefined, fn: (x: T) => U): Responsive<U> | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return v.map((x) => (x === null || x === undefined ? x : fn(x))) as (U | null | undefined)[];
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, T>).map(([k, x]) => [k, x === null || x === undefined ? x : fn(x)])) as Partial<Record<Breakpoint, U>>;
  return fn(v as T);
}

export const BREAKPOINTS = UI_TOKENS.breakpoints;
export const HEADING_SIZES = UI_TOKENS.headingSizes as unknown as Record<string, { fontSize?: Responsive<StyleValue>; lineHeight?: Responsive<StyleValue> }>;
export const COMPONENT_DEFAULTS = UI_TOKENS.components as unknown as Record<string, {
  size?: string; variant?: string; colorScheme?: string; parts: string[] | null; sizes: string[]; variants: string[];
}>;
