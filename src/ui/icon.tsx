import { createElement, forwardRef, type ElementType } from 'react';
import { useUIProps, type UIProps } from './base.js';

type IconProps = UIProps & { viewBox?: string; focusable?: boolean };

/** An SVG icon sized 1em in the current colour; `as` renders another icon component (react-icons). */
export const Icon = forwardRef<any, IconProps>(function Icon({ viewBox = '0 0 24 24', focusable = false, children, as, ...props }, ref) {
  if (as && as !== 'svg') {
    const { domProps } = useUIProps(props, 'ui-icon');
    return createElement(as as ElementType, { ...domProps, ref, focusable, 'aria-hidden': props['aria-label'] ? undefined : true });
  }
  const { domProps } = useUIProps(props, 'ui-icon');
  return createElement('svg', {
    viewBox, focusable, 'aria-hidden': props['aria-label'] ? undefined : true, ...domProps, ref,
  }, children);
});

export function createIcon(name: string, viewBox: string, inner: string) {
  const C = forwardRef<any, IconProps>(function NamedIcon(props, ref) {
    const { domProps } = useUIProps(props, 'ui-icon');
    return createElement('svg', {
      viewBox, focusable: false, 'aria-hidden': props['aria-label'] ? undefined : true, ...domProps, ref,
      dangerouslySetInnerHTML: { __html: inner },
    });
  });
  C.displayName = name;
  return C;
}
