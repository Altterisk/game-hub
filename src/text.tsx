import { Fragment, type CSSProperties, type ReactNode } from 'react';

export interface TextStyle {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  className?: string;
}

/**
 * One markup token. `style` rules change the running style until the next style rule (colour codes
 * such as `[ff0000]…[-]`); `replace` rules render their own node and may recurse into inner text.
 * Rules are joined into one regex, so their sources must not use backreferences.
 */
export type MarkupRule =
  | { kind: 'style'; re: RegExp; apply: (m: RegExpExecArray, current: TextStyle) => TextStyle }
  | { kind: 'replace'; re: RegExp; render: (m: RegExpExecArray, inner: (text: string) => ReactNode, key: number) => ReactNode };

export type Run = { text: string; style: TextStyle } | { node: ReactNode };

/** A colour tag whose first capture group is a 6-digit hex colour. */
export const colorTag = (re: RegExp, extra: Omit<TextStyle, 'color'> = { bold: true }): MarkupRule => ({
  kind: 'style', re, apply: (m) => ({ ...extra, color: `#${m[1]}` }),
});
/** Resets the running style (`[-]`, `[/c]`). */
export const resetTag = (re: RegExp): MarkupRule => ({ kind: 'style', re, apply: () => ({}) });
/** Drops the token and keeps the style (`[c]`). */
export const ignoreTag = (re: RegExp): MarkupRule => ({ kind: 'style', re, apply: (_m, cur) => cur });
export const replaceTag = (re: RegExp, render: (m: RegExpExecArray, inner: (text: string) => ReactNode, key: number) => ReactNode): MarkupRule =>
  ({ kind: 'replace', re, render });

function combined(rules: MarkupRule[]): RegExp {
  return new RegExp(rules.map((r) => `(${r.re.source})`).join('|'), 'g');
}

function groupCounts(rules: MarkupRule[]): number[] {
  return rules.map((r) => new RegExp(`${r.re.source}|`).exec('')!.length - 1);
}

/** Splits text into styled runs and rendered nodes, left to right, first matching rule wins. */
export function tokenize(text: string, rules: MarkupRule[]): Run[] {
  if (!text) return [];
  if (!rules.length) return [{ text, style: {} }];
  const re = combined(rules);
  const counts = groupCounts(rules);
  const out: Run[] = [];
  let style: TextStyle = {};
  let at = 0;
  let m: RegExpExecArray | null;
  const push = (s: string) => { if (s) out.push({ text: s, style }); };
  while ((m = re.exec(text))) {
    if (m[0] === '') { re.lastIndex++; continue; }
    push(text.slice(at, m.index));
    let g = 1;
    for (let i = 0; i < rules.length; i++) {
      if (m[g] !== undefined) {
        const sub = [m[g], ...m.slice(g + 1, g + 1 + counts[i])] as unknown as RegExpExecArray;
        sub.index = m.index;
        sub.input = text;
        const rule = rules[i];
        if (rule.kind === 'style') style = rule.apply(sub, style);
        else out.push({ node: rule.render(sub, (inner) => <RichText text={inner} rules={rules} />, m.index) });
        break;
      }
      g += 1 + counts[i];
    }
    at = m.index + m[0].length;
  }
  push(text.slice(at));
  return out;
}

const styleOf = (s: TextStyle): CSSProperties | undefined =>
  s.color || s.bold || s.italic
    ? { color: s.color, fontWeight: s.bold ? 600 : undefined, fontStyle: s.italic ? 'italic' : undefined }
    : undefined;

/** Renders game text with the site's markup rules. */
export function RichText({ text, rules }: { text: string; rules: MarkupRule[] }) {
  return (
    <>
      {tokenize(text, rules).map((run, i) => {
        if ('node' in run) return <Fragment key={i}>{run.node}</Fragment>;
        const style = styleOf(run.style);
        return style || run.style.className
          ? <span key={i} className={run.style.className} style={style}>{run.text}</span>
          : <Fragment key={i}>{run.text}</Fragment>;
      })}
    </>
  );
}

/** The value in `lang`, then each fallback in order, then any non-empty value. */
export function pickLang<L extends string>(value: Partial<Record<L, string | null | undefined>> | null | undefined, lang: L, ...fallbacks: L[]): string {
  if (!value) return '';
  for (const l of [lang, ...fallbacks]) {
    const v = value[l];
    if (v) return v;
  }
  return (Object.values(value).find((v) => typeof v === 'string' && v) as string | undefined) ?? '';
}
