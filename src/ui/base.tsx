import { createElement, forwardRef, type AllHTMLAttributes, type ComponentPropsWithoutRef, type CSSProperties, type DOMAttributes, type ElementType, type ReactNode } from 'react';
import { COMPONENT_DEFAULTS, cx, isStyleProp, splitStyleProps, type StyleProps } from './system.js';

export type Intrinsic = keyof JSX.IntrinsicElements;

/** Props a polymorphic `as` target (a router link, an anchor) commonly needs. */
export interface AsTargetProps {
  href?: string;
  target?: string;
  rel?: string;
  to?: string;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
  shallow?: boolean;
  download?: string | boolean;
}

/** Attributes any `as` target may take; event handlers come typed from `T` instead. */
export type LooseAttrs = Omit<AllHTMLAttributes<HTMLElement>, keyof DOMAttributes<HTMLElement> | keyof StyleProps | 'size' | 'wrap' | 'as' | 'label'>
  & { viewBox?: string; xmlns?: string; focusable?: boolean; allow?: string; loading?: 'lazy' | 'eager' };

/** Style props, the DOM attributes of `T`, `as` and `sx` (flat style props only). */
export type UIProps<T extends Intrinsic = 'div'> = StyleProps
  & Omit<ComponentPropsWithoutRef<T>, keyof StyleProps | 'size' | 'wrap' | 'as'>
  & Omit<LooseAttrs, keyof ComponentPropsWithoutRef<T>>
  & AsTargetProps
  & {
    as?: ElementType;
    className?: string;
    style?: CSSProperties;
    sx?: StyleProps;
    children?: ReactNode;
  };
function mergeSx(rest: Record<string, unknown>, sx?: StyleProps): Record<string, unknown> {
  if (!sx) return rest;
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(sx)) if (isStyleProp(k)) flat[k] = v;
  return { ...rest, ...flat };
}

/** Splits style props off and returns the element type and DOM props. */
export function useUIProps(props: Record<string, any>, baseClass?: string, defaultAs: ElementType | string = 'div') {
  const { as = defaultAs as ElementType, className, style, sx, ...rest } = props;
  const split = splitStyleProps(mergeSx(rest, sx));
  return {
    as,
    domProps: {
      ...split.rest,
      className: cx(baseClass, split.className, className) || undefined,
      style: Object.keys(split.style).length || style ? { ...split.style, ...style } : undefined,
    } as Record<string, any>,
  };
}

/** A plain element with style props; `base` is its kit class, `defaults` its default style props. */
export function element<T extends Intrinsic = 'div'>(name: string, tag: T, base?: string, defaults?: Record<string, unknown>) {
  const C = forwardRef<any, UIProps<T>>(function UIElement(props, ref) {
    const { as, domProps } = useUIProps({ ...defaults, ...props }, base, tag);
    return createElement(as, { ...domProps, ref });
  });
  C.displayName = name;
  return C;
}

export interface ThemingProps {
  size?: string;
  variant?: string;
  colorScheme?: string;
}

/** Classes for a themed component's size/variant/colour scheme, with the theme's defaults. */
export function themeClasses(component: string, slug: string, { size, variant, colorScheme }: ThemingProps): string {
  const d = COMPONENT_DEFAULTS[component] ?? { parts: null, sizes: [], variants: [] };
  const s = size ?? d.size;
  const v = variant ?? d.variant;
  const c = colorScheme ?? d.colorScheme ?? 'gray';
  return cx(
    s && `ui-${slug}--size-${s}`,
    v && `ui-${slug}--${v}`,
    v && `ui-${slug}--${v}-${c}`,
  );
}

export const omitTheming = <T extends ThemingProps>(p: T) => {
  const { size: _s, variant: _v, colorScheme: _c, ...rest } = p;
  return rest;
};
