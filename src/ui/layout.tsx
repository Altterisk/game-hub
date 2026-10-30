import {
  Children, createElement, forwardRef, isValidElement, useEffect, useState, type ElementType, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { element, themeClasses, useUIProps, type ThemingProps, type UIProps } from './base.js';
import { cx, HEADING_SIZES, mapResponsive, valueAt, type Breakpoint, type Responsive } from './system.js';
import { UI_TOKENS } from './tokens.gen.js';

export const Box = element('Box', 'div');
export const Spacer = element('Spacer', 'div', 'ui-spacer');
export const Center = element('Center', 'div', 'ui-center');
export const Square = element('Square', 'div', 'ui-center');
export const VisuallyHidden = element('VisuallyHidden', 'span', 'ui-sr-only');

type FlexProps = UIProps & {
  direction?: Responsive<string>;
  align?: Responsive<string>;
  justify?: Responsive<string>;
  wrap?: Responsive<string>;
  basis?: Responsive<string | number>;
  grow?: Responsive<string | number>;
  shrink?: Responsive<string | number>;
};

export const Flex = forwardRef<any, FlexProps>(function Flex({ direction, align, justify, wrap, basis, grow, shrink, ...props }, ref) {
  const { as, domProps } = useUIProps({
    flexDirection: direction, alignItems: align, justifyContent: justify, flexWrap: wrap, flexBasis: basis, flexGrow: grow,
    flexShrink: shrink, ...props,
  } as UIProps, 'ui-flex');
  return createElement(as, { ...domProps, ref });
});

type StackProps = UIProps & {
  direction?: Responsive<'row' | 'column' | 'row-reverse' | 'column-reverse'>;
  spacing?: Responsive<string | number>;
  align?: Responsive<string>;
  justify?: Responsive<string>;
  wrap?: Responsive<string>;
  isInline?: boolean;
  divider?: ReactNode;
  shouldWrapChildren?: boolean;
};

const STACK_KEYS = new Set<string>(UI_TOKENS.stackKeys as readonly string[]);
const SPACE = UI_TOKENS.scales.space as Record<string, string>;
const SPACE_BY_VALUE = Object.fromEntries(Object.entries(SPACE).map(([k, v]) => [v, k]));

function stackKey(spacing: unknown): string | null {
  if (spacing === undefined || spacing === null) return null;
  const s = String(spacing);
  if (STACK_KEYS.has(s)) return s.replace('.', '_');
  const byValue = SPACE_BY_VALUE[s];
  return byValue !== undefined && STACK_KEYS.has(byValue) ? byValue.replace('.', '_') : null;
}

const BP_ORDER: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

/** Sibling-margin classes for each breakpoint where direction or spacing changes; `gap` when off the scale. */
function stackSpacing(direction: StackProps['direction'], spacing: StackProps['spacing']): { className: string; gap?: Responsive<string | number> } {
  const classes: string[] = [];
  let last = '';
  for (const bp of BP_ORDER) {
    const d = valueAt(direction as Responsive<string>, bp) ?? 'column';
    const s = valueAt(spacing as Responsive<string | number>, bp);
    const key = stackKey(s);
    if (s !== undefined && key === null) return { className: '', gap: spacing };
    const cls = key === null ? '' : `ui-s${d === 'row' || d === 'row-reverse' ? 'h' : 'v'}-${key}-${bp}`;
    const sig = `${d}|${key}`;
    if (sig !== last && cls) classes.push(cls);
    last = sig;
  }
  return { className: classes.join(' ') };
}
export const Stack = forwardRef<any, StackProps>(function Stack(
  { direction, spacing = '0.5rem', align, justify, wrap, isInline, divider, shouldWrapChildren, children, ...props }, ref,
) {
  const dir = isInline ? 'row' : direction ?? 'column';
  const sp = stackSpacing(dir, spacing);
  const { as, domProps } = useUIProps({
    flexDirection: dir, alignItems: align, justifyContent: justify, flexWrap: wrap, gap: sp.gap, ...props,
  } as UIProps, cx('ui-stack', sp.className));
  let kids: ReactNode = children;
  if (divider || shouldWrapChildren) {
    const valid = Children.toArray(children).filter(isValidElement);
    kids = valid.flatMap((child, i) => {
      const item = shouldWrapChildren ? <div className="ui-stack__item" key={child.key ?? i} style={{ display: 'inline-block', flex: '0 0 auto', minWidth: 0 }}>{child}</div> : child;
      return divider && i < valid.length - 1 ? [item, <span key={`d${i}`} className="ui-stack__divider">{divider}</span>] : [item];
    });
  }
  return createElement(as, { ...domProps, ref }, kids);
});

export const VStack = forwardRef<any, StackProps>(function VStack(props, ref) {
  return <Stack align="center" {...props} direction="column" ref={ref} />;
});

export const HStack = forwardRef<any, StackProps>(function HStack(props, ref) {
  return <Stack align="center" {...props} direction="row" ref={ref} />;
});

type GridProps = UIProps & {
  templateColumns?: Responsive<string>;
  templateRows?: Responsive<string>;
  templateAreas?: Responsive<string>;
  autoFlow?: Responsive<string>;
  autoRows?: Responsive<string>;
  autoColumns?: Responsive<string>;
  column?: Responsive<string>;
  row?: Responsive<string>;
};

export const Grid = forwardRef<any, GridProps>(function Grid(
  { templateColumns, templateRows, templateAreas, autoFlow, autoRows, autoColumns, column, row, ...props }, ref,
) {
  const { as, domProps } = useUIProps({
    gridTemplateColumns: templateColumns, gridTemplateRows: templateRows, gridTemplateAreas: templateAreas, gridAutoFlow: autoFlow,
    gridAutoRows: autoRows, gridAutoColumns: autoColumns, gridColumn: column, gridRow: row, ...props,
  } as UIProps, 'ui-grid');
  return createElement(as, { ...domProps, ref });
});

const span = (v: unknown) => (v === 'auto' ? 'auto' : v === undefined ? undefined : `span ${v}/span ${v}`);

export const GridItem = forwardRef<any, UIProps & { colSpan?: Responsive<number | 'auto'>; rowSpan?: Responsive<number | 'auto'>; colStart?: Responsive<number>; colEnd?: Responsive<number>; rowStart?: Responsive<number>; rowEnd?: Responsive<number>; area?: string }>(
  function GridItem({ colSpan, rowSpan, colStart, colEnd, rowStart, rowEnd, area, ...props }, ref) {
    const { as, domProps } = useUIProps({
      gridColumn: mapResponsive(colSpan, span), gridRow: mapResponsive(rowSpan, span), gridColumnStart: colStart as any,
      gridColumnEnd: colEnd as any, gridArea: area, ...(rowStart !== undefined ? { gridRowStart: rowStart } : {}),
      ...(rowEnd !== undefined ? { gridRowEnd: rowEnd } : {}), ...props,
    } as UIProps);
    return createElement(as, { ...domProps, ref });
  },
);

export const SimpleGrid = forwardRef<any, GridProps & { columns?: Responsive<number>; minChildWidth?: Responsive<string | number>; spacing?: Responsive<string | number>; spacingX?: Responsive<string | number>; spacingY?: Responsive<string | number> }>(
  function SimpleGrid({ columns, minChildWidth, spacing, spacingX, spacingY, ...props }, ref) {
    const templateColumns = minChildWidth !== undefined
      ? mapResponsive(minChildWidth, (w) => `repeat(auto-fit, minmax(${typeof w === 'number' ? `${w}px` : w}, 1fr))`)
      : mapResponsive(columns, (n) => `repeat(${n}, minmax(0, 1fr))`);
    return <Grid ref={ref} gap={spacing} columnGap={spacingX} rowGap={spacingY} templateColumns={templateColumns as Responsive<string>} {...props} />;
  },
);

export const Wrap = forwardRef<any, UIProps & { spacing?: Responsive<string | number>; spacingX?: Responsive<string | number>; spacingY?: Responsive<string | number>; justify?: Responsive<string>; align?: Responsive<string>; direction?: Responsive<string>; shouldWrapChildren?: boolean }>(
  function Wrap({ spacing = '0.5rem', spacingX, spacingY, justify, align, direction, shouldWrapChildren, children, ...props }, ref) {
    const { as, domProps } = useUIProps(props, 'ui-wrap');
    const list = useUIProps({ wrapX: spacingX ?? spacing, wrapY: spacingY ?? spacing, justifyContent: justify, alignItems: align, flexDirection: direction } as UIProps, 'ui-wrap__list', 'ul');
    const kids = shouldWrapChildren ? Children.map(children, (c, i) => <WrapItem key={i}>{c}</WrapItem>) : children;
    return createElement(as, { ...domProps, ref }, createElement('ul', list.domProps, kids));
  },
);

export const WrapItem = element('WrapItem', 'li', 'ui-wrap__item');

export const Container = forwardRef<any, UIProps & ThemingProps & { centerContent?: boolean }>(function Container({ centerContent, size, variant, colorScheme, ...props }, ref) {
  const { as, domProps } = useUIProps(
    centerContent ? { display: 'flex', flexDirection: 'column', alignItems: 'center', ...props } : props,
    cx('ui-container', themeClasses('Container', 'container', { size, variant, colorScheme })),
  );
  return createElement(as, { ...domProps, ref });
});

export const AspectRatio = forwardRef<any, UIProps & { ratio?: Responsive<number> }>(function AspectRatio({ ratio = 4 / 3, ...props }, ref) {
  const { as, domProps } = useUIProps({ arPad: mapResponsive(ratio, (r) => `${(1 / r) * 100}%`), ...props } as UIProps, 'ui-aspect');
  return createElement(as, { ...domProps, ref });
});

export const Divider = forwardRef<any, UIProps<'hr'> & ThemingProps & { orientation?: 'horizontal' | 'vertical' }>(function Divider({ orientation = 'horizontal', size, variant, colorScheme, ...props }, ref) {
  const { as, domProps } = useUIProps(props, cx('ui-divider', themeClasses('Divider', 'divider', { size, variant, colorScheme })), 'hr');
  return createElement(as, { 'aria-orientation': orientation, ...domProps, ref });
});

export const Text = forwardRef<any, UIProps<'p'> & { align?: Responsive<string>; casing?: Responsive<string>; decoration?: Responsive<string>; isTruncated?: boolean }>(
  function Text({ align, casing, decoration, isTruncated, ...props }, ref) {
    const { as, domProps } = useUIProps({
      textAlign: align, textTransform: casing, textDecoration: decoration, ...(isTruncated ? { noOfLines: 1 } : {}), ...props,
    } as UIProps, undefined, 'p');
    return createElement(as, { ...domProps, ref });
  },
);

const BPS: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

/** A responsive `size` composed from each size's own (responsive) font size and line height. */
function headingSizeStyles(size: Responsive<string>) {
  const fontSize: unknown[] = [];
  const lineHeight: unknown[] = [];
  for (const bp of BPS) {
    const s = valueAt(size, bp);
    const def = s ? HEADING_SIZES[s] : undefined;
    fontSize.push(def ? valueAt(def.fontSize, bp) ?? null : null);
    lineHeight.push(def ? valueAt(def.lineHeight, bp) ?? null : null);
  }
  return { fontSize, lineHeight };
}

export const Heading = forwardRef<any, UIProps<'h2'> & Omit<ThemingProps, 'size'> & { size?: Responsive<string> }>(function Heading({ size, variant, colorScheme, ...props }, ref) {
  const responsive = Array.isArray(size) || (!!size && typeof size === 'object');
  const extra = responsive ? headingSizeStyles(size as Responsive<string>) : {};
  const { as, domProps } = useUIProps({ ...extra, ...props },
    cx('ui-heading', themeClasses('Heading', 'heading', { size: responsive ? 'none' : (size as string | undefined), variant, colorScheme })), 'h2');
  return createElement(as, { ...domProps, ref });
});
export const Link = forwardRef<any, UIProps<'a'> & ThemingProps & { isExternal?: boolean }>(function Link({ isExternal, size, variant, colorScheme, ...props }, ref) {
  const { as, domProps } = useUIProps(props, cx('ui-link', themeClasses('Link', 'link', { size, variant, colorScheme })), 'a');
  return createElement(as, { ...(isExternal ? { target: '_blank', rel: 'noopener' } : {}), ...domProps, ref });
});

type ImageProps = UIProps<'img'> & { src?: string; alt?: string; fallbackSrc?: string; fallback?: ReactNode; fallbackStrategy?: 'onError' | 'beforeLoadOrError'; htmlWidth?: string | number; htmlHeight?: string | number; loading?: 'lazy' | 'eager'; ignoreFallback?: boolean };

export const Image = forwardRef<any, ImageProps>(function Image({ src, fallbackSrc, fallback, fallbackStrategy: _s, htmlWidth, htmlHeight, ignoreFallback: _i, onError, ...props }, ref) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const { as, domProps } = useUIProps(props, undefined, 'img');
  if (failed && fallback !== undefined) return <>{fallback}</>;
  return createElement(as, {
    ...domProps,
    ref,
    src: failed && fallbackSrc ? fallbackSrc : src,
    width: htmlWidth,
    height: htmlHeight,
    onError: (e: unknown) => {
      if (fallbackSrc || fallback !== undefined) setFailed(true);
      (onError as ((e: unknown) => void) | undefined)?.(e);
    },
  });
});

/** Renders children into `document.body` once mounted (nothing on the server). */
export function Portal({ children, containerRef }: { children?: ReactNode; containerRef?: { current: HTMLElement | null } }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, containerRef?.current ?? document.body);
}

/** Shows or hides its children (no height animation). */
export const Collapse = forwardRef<any, UIProps & { in?: boolean; animateOpacity?: boolean; unmountOnExit?: boolean }>(
  function Collapse({ in: open, animateOpacity: _a, unmountOnExit, ...props }, ref) {
    const { as, domProps } = useUIProps(props, 'ui-collapse');
    if (!open && unmountOnExit) return null;
    return createElement(as, { ...domProps, ref, hidden: !open || undefined });
  },
);

export type { ElementType };
