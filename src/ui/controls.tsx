import {
  Children, cloneElement, createContext, createElement, forwardRef, isValidElement, useContext, type ReactElement, type ReactNode,
} from 'react';
import { themeClasses, useUIProps, type ThemingProps, type UIProps } from './base.js';
import { cx } from './system.js';
import { CloseIcon, SmallCloseIcon } from './icons.js';

type ButtonGroupCtx = ThemingProps & { isDisabled?: boolean };
const ButtonGroupContext = createContext<ButtonGroupCtx>({});

export type ButtonProps = UIProps<'button'> & ThemingProps & {
  isDisabled?: boolean;
  isLoading?: boolean;
  isActive?: boolean;
  loadingText?: ReactNode;
  leftIcon?: ReactElement;
  rightIcon?: ReactElement;
  iconSpacing?: string | number;
  spinner?: ReactNode;
  spinnerPlacement?: 'start' | 'end';
  type?: 'button' | 'submit' | 'reset';
};

function ButtonIcon({ children, side, spacing }: { children: ReactElement; side: 'left' | 'right'; spacing: string | number }) {
  const margin = typeof spacing === 'number' ? `${spacing * 0.25}rem` : spacing;
  return (
    <span className="ui-button__icon" style={side === 'left' ? { marginInlineEnd: margin } : { marginInlineStart: margin }} aria-hidden>
      {isValidElement(children) ? cloneElement(children as ReactElement<any>, { 'aria-hidden': true, focusable: false }) : children}
    </span>
  );
}

export const Button = forwardRef<any, ButtonProps>(function Button(props, ref) {
  const group = useContext(ButtonGroupContext);
  const {
    size = group.size, variant = group.variant, colorScheme = group.colorScheme, isDisabled = group.isDisabled, isLoading, isActive,
    loadingText, leftIcon, rightIcon, iconSpacing = '0.5rem', spinner, spinnerPlacement = 'start', type, children, as, ...rest
  } = props;
  const { as: tag, domProps } = useUIProps({ as, ...rest } as UIProps, cx('ui-button', themeClasses('Button', 'button', { size, variant, colorScheme })), 'button');
  const isNative = tag === 'button';
  const spin = spinner ?? <Spinner color="currentColor" width="1em" height="1em" />;
  return createElement(tag, {
    ...domProps,
    ref,
    type: isNative ? type ?? 'button' : undefined,
    disabled: isNative ? isDisabled || isLoading : undefined,
    'aria-disabled': !isNative && (isDisabled || isLoading) ? true : undefined,
    'data-active': isActive ? '' : undefined,
    'data-loading': isLoading ? '' : undefined,
  },
  isLoading && spinnerPlacement === 'start' && (
    <span className="ui-button__spinner" style={loadingText ? { position: 'relative', marginInlineEnd: '0.5rem' } : undefined}>{spin}</span>
  ),
  isLoading
    ? loadingText ?? <span style={{ opacity: 0 }}>{leftIcon && <ButtonIcon side="left" spacing={iconSpacing}>{leftIcon}</ButtonIcon>}{children}{rightIcon && <ButtonIcon side="right" spacing={iconSpacing}>{rightIcon}</ButtonIcon>}</span>
    : <>{leftIcon && <ButtonIcon side="left" spacing={iconSpacing}>{leftIcon}</ButtonIcon>}{children}{rightIcon && <ButtonIcon side="right" spacing={iconSpacing}>{rightIcon}</ButtonIcon>}</>,
  isLoading && spinnerPlacement === 'end' && (
    <span className="ui-button__spinner" style={{ position: 'relative', marginInlineStart: '0.5rem' }}>{spin}</span>
  ));
});

export const IconButton = forwardRef<any, ButtonProps & { icon?: ReactElement; isRound?: boolean; 'aria-label': string }>(
  function IconButton({ icon, isRound, children, ...props }, ref) {
    const element = icon ?? children;
    const child = isValidElement(element) ? cloneElement(element as ReactElement<any>, { 'aria-hidden': true, focusable: false }) : element;
    return <Button padding="0" borderRadius={isRound ? 'full' : undefined} ref={ref} {...props}>{child}</Button>;
  },
);

export const ButtonGroup = forwardRef<any, UIProps & ThemingProps & { isAttached?: boolean; isDisabled?: boolean; spacing?: string | number; orientation?: 'horizontal' | 'vertical' }>(
  function ButtonGroup({ size, variant, colorScheme, isAttached, isDisabled, spacing = '0.5rem', orientation = 'horizontal', ...props }, ref) {
    const vertical = orientation === 'vertical';
    const gap = isAttached ? undefined : spacing;
    const { as, domProps } = useUIProps({ flexDirection: vertical ? 'column' : undefined, gap, ...props } as UIProps,
      cx('ui-button-group', isAttached && 'ui-button-group--attached'));
    return (
      <ButtonGroupContext.Provider value={{ size, variant, colorScheme, isDisabled }}>
        {createElement(as, { role: 'group', ...domProps, ref })}
      </ButtonGroupContext.Provider>
    );
  },
);

export const CloseButton = forwardRef<any, UIProps<'button'> & ThemingProps & { isDisabled?: boolean }>(function CloseButton({ size, variant, colorScheme, isDisabled, children, ...props }, ref) {
  const { as, domProps } = useUIProps(props, cx('ui-close-button', themeClasses('CloseButton', 'close-button', { size, variant, colorScheme })), 'button');
  return createElement(as, { type: 'button', 'aria-label': 'Close', disabled: isDisabled, ...domProps, ref },
    children ?? <CloseIcon width="1em" height="1em" />);
});

export const Badge = forwardRef<any, UIProps<'span'> & ThemingProps>(function Badge({ size, variant, colorScheme, ...props }, ref) {
  const { as, domProps } = useUIProps(props, cx('ui-badge', themeClasses('Badge', 'badge', { size, variant, colorScheme })), 'span');
  return createElement(as, { ...domProps, ref });
});

const TagContext = createContext<string>('');

export const Tag = forwardRef<any, UIProps<'span'> & ThemingProps>(function Tag({ size, variant, colorScheme, ...props }, ref) {
  const mods = themeClasses('Tag', 'tag', { size, variant, colorScheme });
  const { as, domProps } = useUIProps(props, cx('ui-tag__container', mods), 'span');
  return <TagContext.Provider value={mods}>{createElement(as, { ...domProps, ref })}</TagContext.Provider>;
});

export const TagLabel = forwardRef<any, UIProps>(function TagLabel(props, ref) {
  const mods = useContext(TagContext);
  const { as, domProps } = useUIProps({ noOfLines: 1, ...props } as UIProps, cx('ui-tag__label', mods), 'span');
  return createElement(as, { ...domProps, ref });
});

export const TagLeftIcon = forwardRef<any, UIProps>(function TagLeftIcon({ as: IconC, ...props }, ref) {
  const { domProps } = useUIProps({ verticalAlign: 'top', marginEnd: '0.5rem', ...props } as UIProps, 'ui-icon');
  return IconC ? createElement(IconC, { ...domProps, ref }) : null;
});

export const TagRightIcon = forwardRef<any, UIProps>(function TagRightIcon({ as: IconC, ...props }, ref) {
  const { domProps } = useUIProps({ verticalAlign: 'top', marginStart: '0.5rem', ...props } as UIProps, 'ui-icon');
  return IconC ? createElement(IconC, { ...domProps, ref }) : null;
});

export const TagCloseButton = forwardRef<any, UIProps<'button'> & { isDisabled?: boolean }>(function TagCloseButton({ isDisabled, children, ...props }, ref) {
  const mods = useContext(TagContext);
  const { as, domProps } = useUIProps(props, cx('ui-tag__closeButton', mods), 'button');
  return createElement(as, { type: 'button', 'aria-label': 'close', disabled: isDisabled, ...domProps, ref }, children ?? <SmallCloseIcon width="1em" height="1em" />);
});

export const Spinner = forwardRef<any, Omit<UIProps, 'label'> & ThemingProps & { thickness?: string; speed?: string; emptyColor?: string; label?: string }>(
  function Spinner({ size, variant, colorScheme, thickness, speed, emptyColor, label = 'Loading...', ...props }, ref) {
    const { as, domProps } = useUIProps(props, cx('ui-spinner', themeClasses('Spinner', 'spinner', { size, variant, colorScheme })));
    const vars: Record<string, string> = {};
    if (thickness) vars['--spinner-thickness'] = thickness;
    if (speed) vars['--spinner-speed'] = speed;
    if (emptyColor) vars['--spinner-empty'] = emptyColor.includes('.') ? `var(--ui-c-${emptyColor.replace('.', '-')})` : emptyColor;
    return createElement(as, { ...domProps, style: { ...vars, ...domProps.style }, ref }, label && <span className="ui-sr-only">{label}</span>);
  },
);

function initials(name: string) {
  const [first, last] = name.trim().split(/\s+/);
  return first && last ? `${first.charAt(0)}${last.charAt(0)}` : first?.charAt(0) ?? '';
}

// Same colour-from-name idea as Chakra's Avatar: a stable hue per name.
function nameColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  let color = '#';
  for (let j = 0; j < 3; j++) color += `00${((hash >> (j * 8)) & 0xff).toString(16)}`.slice(-2);
  return color;
}

const isDark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 128;
};

export const Avatar = forwardRef<any, UIProps<'span'> & ThemingProps & { name?: string; src?: string; icon?: ReactElement; loading?: 'lazy' | 'eager' }>(
  function Avatar({ size, variant, colorScheme, name, src, icon, loading, children, ...props }, ref) {
    const bg = name ? nameColor(name) : undefined;
    const { as, domProps } = useUIProps({ bg, color: bg ? (isDark(bg) ? 'white' : 'gray.800') : undefined, ...props } as UIProps,
      cx('ui-avatar__container', themeClasses('Avatar', 'avatar', { size, variant, colorScheme })), 'span');
    return createElement(as, { ...domProps, ref },
      src ? <img src={src} alt={name} loading={loading} />
        : name ? <span role="img" aria-label={name}>{initials(name)}</span>
          : icon ?? <svg viewBox="0 0 128 128" width="100%" height="100%" role="img" aria-label=" avatar"><path fill="currentColor" d="M103,102.1388 C93.094,111.92 79.3504,118 64.1638,118 C48.8056,118 34.9294,111.768 25,101.7892 L25,95.2 C25,86.8096 31.981,80 40.6,80 L87.4,80 C96.019,80 103,86.8096 103,95.2 L103,102.1388 Z" /><path fill="currentColor" d="M63.9961647,24 C51.2938136,24 41,34.2938136 41,46.9961647 C41,59.7061864 51.2938136,70 63.9961647,70 C76.6985159,70 87,59.7061864 87,46.9961647 C87,34.2938136 76.6985159,24 63.9961647,24" /></svg>,
      children);
  },
);

export { Children };
