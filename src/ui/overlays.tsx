import {
  Children, cloneElement, createContext, createElement, forwardRef, isValidElement, useCallback, useContext, useEffect, useId,
  useRef, useState, type KeyboardEvent, type MutableRefObject, type ReactElement, type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { themeClasses, useUIProps, type ThemingProps, type UIProps } from './base.js';
import { cx } from './system.js';
import { useAnchoredPosition, useDismiss, type Placement } from '../shell.js';
import { CloseButton } from './controls.js';

type AnyPlacement = Placement | 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  | 'right-start' | 'right-end' | 'left-start' | 'left-end';

const toPlacement = (p?: AnyPlacement): Placement => {
  if (p === 'bottom-end' || p === 'top-end' || p === 'top-start' || p === 'bottom-start') return p;
  if (p === 'top') return 'top-start';
  return 'bottom-start';
};

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function setRef<T>(ref: unknown, value: T) {
  if (typeof ref === 'function') ref(value);
  else if (ref && typeof ref === 'object') (ref as MutableRefObject<T>).current = value;
}

/** Centered over/under the anchor, kept on screen. */
function useCenteredPosition(anchor: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, open: boolean, side: 'top' | 'bottom' | 'left' | 'right') {
  const [style, setStyle] = useState<React.CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = panel.current;
      if (!a || !p) return;
      const m = 8;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      let top: number;
      let left: number;
      if (side === 'left' || side === 'right') {
        top = a.top + a.height / 2 - h / 2;
        left = side === 'left' ? a.left - w - 8 : a.right + 8;
      } else {
        left = a.left + a.width / 2 - w / 2;
        top = side === 'top' ? a.top - h - 8 : a.bottom + 8;
        if (side === 'top' && top < m) top = a.bottom + 8;
        if (side === 'bottom' && top + h > vh - m && a.top - h - 8 > m) top = a.top - h - 8;
      }
      left = Math.max(m, Math.min(left, vw - w - m));
      top = Math.max(m, Math.min(top, vh - h - m));
      setStyle({ position: 'fixed', top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, side]);
  return style;
}

export const Tooltip = forwardRef<any, Omit<UIProps, 'aria-label'> & ThemingProps & {
  label?: ReactNode; placement?: AnyPlacement; hasArrow?: boolean; isDisabled?: boolean; openDelay?: number; closeDelay?: number;
  shouldWrapChildren?: boolean; closeOnClick?: boolean; isOpen?: boolean; 'aria-label'?: string; gutter?: number; portalProps?: unknown;
}>(function Tooltip({
  label, placement = 'bottom', hasArrow: _a, isDisabled, openDelay = 0, closeDelay = 0, shouldWrapChildren, closeOnClick = true,
  isOpen: forced, size, variant, colorScheme, children, gutter: _g, portalProps: _p, 'aria-label': ariaLabel, ...props
}, ref) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const id = useId();
  const mounted = useMounted();
  const show = forced ?? open;
  const side = (String(placement).split('-')[0] as 'top' | 'bottom' | 'left' | 'right') || 'bottom';
  const style = useCenteredPosition(anchor, panel, show && !isDisabled && !!label, side === ('auto' as string) ? 'bottom' : side);
  useEffect(() => () => clearTimeout(timer.current), []);
  const enter = (e: { currentTarget: EventTarget }) => {
    anchor.current = e.currentTarget as HTMLElement;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), openDelay);
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), closeDelay);
  };
  const handlers = {
    onPointerEnter: enter, onPointerLeave: leave, onFocus: enter, onBlur: leave,
    onClick: closeOnClick ? leave : undefined, 'aria-describedby': show && label ? id : undefined,
  };
  const child = typeof children === 'string' || shouldWrapChildren || !isValidElement(children)
    ? <span tabIndex={0} {...handlers}>{children}</span>
    : cloneElement(Children.only(children) as ReactElement<any>, {
      ...handlers,
      onPointerEnter: (e: any) => { (children as ReactElement<any>).props.onPointerEnter?.(e); enter(e); },
      onPointerLeave: (e: any) => { (children as ReactElement<any>).props.onPointerLeave?.(e); leave(); },
      onFocus: (e: any) => { (children as ReactElement<any>).props.onFocus?.(e); enter(e); },
      onBlur: (e: any) => { (children as ReactElement<any>).props.onBlur?.(e); leave(); },
    });
  const { domProps } = useUIProps(props, cx('ui-tooltip', themeClasses('Tooltip', 'tooltip', { size, variant, colorScheme })));
  return (
    <>
      {child}
      {mounted && show && !isDisabled && label !== undefined && label !== null && label !== '' && createPortal(
        <div ref={(el) => { (panel as MutableRefObject<HTMLDivElement | null>).current = el; setRef(ref, el); }} id={id} role="tooltip"
          aria-label={ariaLabel} {...domProps} style={{ ...style, ...domProps.style }}>
          {label}
        </div>,
        document.body,
      )}
    </>
  );
});

interface PopoverCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: RefObject<HTMLElement | null>;
  panel: RefObject<HTMLDivElement>;
  placement: Placement;
  id: string;
  mods: string;
  trigger: 'click' | 'hover';
  lazy: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
  closeTimer: MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  openDelay: number;
  closeDelay: number;
}
const PopoverContext = createContext<PopoverCtx | null>(null);

export function Popover({
  children, isOpen, defaultIsOpen, onOpen, onClose, placement, trigger = 'click', isLazy, size, variant, colorScheme,
  closeOnBlur = true, initialFocusRef, returnFocusOnClose: _r, openDelay = 0, closeDelay = 150,
}: ThemingProps & {
  openDelay?: number; closeDelay?: number;
  children: ReactNode | ((p: { isOpen: boolean; onClose: () => void }) => ReactNode); isOpen?: boolean; defaultIsOpen?: boolean;
  onOpen?: () => void; onClose?: () => void; placement?: AnyPlacement; trigger?: 'click' | 'hover'; isLazy?: boolean;
  closeOnBlur?: boolean; initialFocusRef?: RefObject<HTMLElement>; returnFocusOnClose?: boolean;
}) {
  const [inner, setInner] = useState(!!defaultIsOpen);
  const open = isOpen ?? inner;
  const setOpen = useCallback((v: boolean) => {
    if (isOpen === undefined) setInner(v);
    if (v) onOpen?.(); else onClose?.();
  }, [isOpen, onOpen, onClose]);
  const anchor = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const id = useId();
  useDismiss(open && closeOnBlur, () => setOpen(false), [anchor, panel]);
  const ctx: PopoverCtx = {
    open, setOpen, anchor, panel, placement: toPlacement(placement), id, trigger, lazy: !!isLazy, initialFocusRef, closeTimer, openDelay, closeDelay,
    mods: themeClasses('Popover', 'popover', { size, variant, colorScheme }),
  };
  return <PopoverContext.Provider value={ctx}>{typeof children === 'function' ? children({ isOpen: open, onClose: () => setOpen(false) }) : children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ children }: { children: ReactElement }) {
  const ctx = useContext(PopoverContext)!;
  const child = Children.only(children) as ReactElement<any>;
  const hover = ctx.trigger === 'hover';
  return cloneElement(child, {
    ref: (el: HTMLElement | null) => { (ctx.anchor as MutableRefObject<HTMLElement | null>).current = el; setRef((child as any).ref, el); },
    'aria-haspopup': 'dialog',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.id : undefined,
    onClick: (e: any) => { child.props.onClick?.(e); if (!hover) ctx.setOpen(!ctx.open); },
    ...(hover ? {
      onPointerEnter: (e: any) => { child.props.onPointerEnter?.(e); clearTimeout(ctx.closeTimer.current); ctx.closeTimer.current = setTimeout(() => ctx.setOpen(true), ctx.openDelay); },
      onPointerLeave: (e: any) => { child.props.onPointerLeave?.(e); clearTimeout(ctx.closeTimer.current); ctx.closeTimer.current = setTimeout(() => ctx.setOpen(false), ctx.closeDelay); },
      onFocus: (e: any) => { child.props.onFocus?.(e); ctx.setOpen(true); },
    } : {}),
  });
}

export const PopoverAnchor = PopoverTrigger;

export const PopoverContent = forwardRef<any, UIProps>(function PopoverContent(props, ref) {
  const ctx = useContext(PopoverContext)!;
  const mounted = useMounted();
  const style = useAnchoredPosition(ctx.anchor, ctx.panel, ctx.open, ctx.placement);
  useEffect(() => {
    if (ctx.open) (ctx.initialFocusRef?.current ?? ctx.panel.current?.querySelector<HTMLElement>('section'))?.focus?.();
  }, [ctx.open]);
  const { as, domProps } = useUIProps(props, cx('ui-popover__content', ctx.mods), 'section');
  if (!mounted || (!ctx.open && ctx.lazy)) return null;
  const hover = ctx.trigger === 'hover';
  return createPortal(
    <div ref={ctx.panel} className={cx('ui-popover__popper', ctx.mods)} style={{ ...style, display: ctx.open ? undefined : 'none' }}
      onKeyDown={(e) => { if (e.key === 'Escape') ctx.setOpen(false); }}
      onPointerEnter={hover ? () => clearTimeout(ctx.closeTimer.current) : undefined}
      onPointerLeave={hover ? () => { ctx.closeTimer.current = setTimeout(() => ctx.setOpen(false), ctx.closeDelay); } : undefined}>
      {createElement(as, { id: ctx.id, role: 'dialog', tabIndex: -1, ...domProps, ref })}
    </div>,
    document.body,
  );
});

function popoverPart(name: string, part: string, tag = 'div') {
  const C = forwardRef<any, UIProps>(function PopoverPart(props, ref) {
    const ctx = useContext(PopoverContext)!;
    const { as, domProps } = useUIProps(props, cx(`ui-popover__${part}`, ctx.mods), tag);
    return createElement(as, { ...domProps, ref });
  });
  C.displayName = name;
  return C;
}

export const PopoverHeader = popoverPart('PopoverHeader', 'header', 'header');
export const PopoverBody = popoverPart('PopoverBody', 'body');
export const PopoverFooter = popoverPart('PopoverFooter', 'footer', 'footer');
export const PopoverArrow = () => null;
export const PopoverCloseButton = forwardRef<any, UIProps<'button'>>(function PopoverCloseButton(props, ref) {
  const ctx = useContext(PopoverContext)!;
  return <CloseButton size="sm" className={cx('ui-popover__closeButton', ctx.mods)} onClick={() => ctx.setOpen(false)} ref={ref} {...props} />;
});

interface MenuCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  button: RefObject<HTMLElement | null>;
  list: RefObject<HTMLDivElement>;
  placement: Placement;
  id: string;
  mods: string;
  closeOnSelect: boolean;
  lazy: boolean;
}
const MenuContext = createContext<MenuCtx | null>(null);

export function Menu({ children, isOpen, onOpen, onClose, placement, closeOnSelect = true, isLazy, size, variant, colorScheme, autoSelect: _a }: ThemingProps & {
  children: ReactNode | ((p: { isOpen: boolean; onClose: () => void }) => ReactNode); isOpen?: boolean; onOpen?: () => void;
  onClose?: () => void; placement?: AnyPlacement; closeOnSelect?: boolean; isLazy?: boolean; autoSelect?: boolean;
}) {
  const [inner, setInner] = useState(false);
  const open = isOpen ?? inner;
  const setOpen = useCallback((v: boolean) => {
    if (isOpen === undefined) setInner(v);
    if (v) onOpen?.(); else onClose?.();
  }, [isOpen, onOpen, onClose]);
  const button = useRef<HTMLElement | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  useDismiss(open, () => setOpen(false), [button, list]);
  const ctx: MenuCtx = {
    open, setOpen, button, list, placement: toPlacement(placement), id, closeOnSelect, lazy: !!isLazy,
    mods: themeClasses('Menu', 'menu', { size, variant, colorScheme }),
  };
  return <MenuContext.Provider value={ctx}>{typeof children === 'function' ? children({ isOpen: open, onClose: () => setOpen(false) }) : children}</MenuContext.Provider>;
}

export const MenuButton = forwardRef<any, UIProps<'button'> & ThemingProps & { isDisabled?: boolean; isActive?: boolean; leftIcon?: ReactElement; rightIcon?: ReactElement; icon?: ReactElement }>(function MenuButton({ as, children, ...props }, ref) {
  const ctx = useContext(MenuContext)!;
  const isCustom = as && as !== 'button';
  const { size, variant, colorScheme, isDisabled, isActive, leftIcon, rightIcon, icon, ...own } = props;
  const passThrough = isCustom ? { size, variant, colorScheme, isDisabled, isActive, leftIcon, rightIcon, icon } : { disabled: isDisabled };
  const { domProps: ownDom } = useUIProps(own, isCustom ? undefined : cx('ui-menu__button', ctx.mods));
  const domProps = { ...ownDom, ...passThrough };
  const common = {
    ...domProps,
    ref: (el: HTMLElement | null) => { (ctx.button as MutableRefObject<HTMLElement | null>).current = el; setRef(ref, el); },
    'aria-haspopup': 'menu',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.id : undefined,
    onClick: (e: any) => { props.onClick?.(e); ctx.setOpen(!ctx.open); },
    onKeyDown: (e: KeyboardEvent) => { if (e.key === 'ArrowDown') { e.preventDefault(); ctx.setOpen(true); } },
  };
  if (isCustom) return createElement(as, common, children);
  return createElement('button', { type: 'button', ...common }, <span style={{ pointerEvents: 'none', flex: '1 1 auto', minWidth: 0 }}>{children}</span>);
});

export const MenuList = forwardRef<any, UIProps & { rootProps?: UIProps }>(function MenuList({ rootProps: _r, ...props }, ref) {
  const ctx = useContext(MenuContext)!;
  const mounted = useMounted();
  const style = useAnchoredPosition(ctx.button, ctx.list, ctx.open, ctx.placement);
  useEffect(() => {
    if (ctx.open) ctx.list.current?.querySelector<HTMLElement>('[role=menuitem]:not([disabled])')?.focus();
  }, [ctx.open]);
  const onKey = (e: KeyboardEvent) => {
    const items = [...(ctx.list.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not([disabled])') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else if (e.key === 'Escape') { ctx.setOpen(false); ctx.button.current?.focus(); }
    else if (e.key === 'Tab') ctx.setOpen(false);
  };
  const { as, domProps } = useUIProps({ zIndex: 'dropdown', ...props } as UIProps, cx('ui-menu__list', ctx.mods));
  if (!mounted || (!ctx.open && ctx.lazy)) return null;
  const z = domProps.style?.zIndex;
  return createPortal(
    <div ref={ctx.list} style={{ ...style, zIndex: z ?? 1000, display: ctx.open ? undefined : 'none' }} onKeyDown={onKey}>
      {createElement(as, { id: ctx.id, role: 'menu', ...domProps, ref })}
    </div>,
    document.body,
  );
});

export const MenuItem = forwardRef<any, UIProps<'button'> & { icon?: ReactElement; command?: ReactNode; isDisabled?: boolean; closeOnSelect?: boolean }>(
  function MenuItem({ icon, command, isDisabled, closeOnSelect, children, as, onClick, ...props }, ref) {
    const ctx = useContext(MenuContext)!;
    const { domProps } = useUIProps(props, cx('ui-menu__item', ctx.mods));
    const tag = as ?? 'button';
    return createElement(tag, {
      ...(tag === 'button' ? { type: 'button' } : {}),
      role: 'menuitem',
      tabIndex: -1,
      disabled: tag === 'button' ? isDisabled : undefined,
      'aria-disabled': isDisabled || undefined,
      ...domProps,
      ref,
      onClick: (e: any) => {
        if (isDisabled) return;
        onClick?.(e);
        if (closeOnSelect ?? ctx.closeOnSelect) ctx.setOpen(false);
      },
    },
    icon && <span className={cx('ui-menu__icon', ctx.mods)} style={{ marginInlineEnd: '0.75rem', display: 'inline-flex' }}>{icon}</span>,
    icon ? <span style={{ flex: 1 }}>{children}</span> : children,
    command && <span className={cx('ui-menu__command', ctx.mods)} style={{ marginInlineStart: 'auto' }}>{command}</span>);
  },
);

export const MenuDivider = forwardRef<any, UIProps>(function MenuDivider(props, ref) {
  const ctx = useContext(MenuContext)!;
  const { domProps } = useUIProps(props, cx('ui-menu__divider', ctx.mods), 'hr');
  return createElement('hr', { 'aria-orientation': 'horizontal', ...domProps, ref });
});

export const MenuGroup = forwardRef<any, UIProps & { title?: ReactNode }>(function MenuGroup({ title, children, ...props }, ref) {
  const ctx = useContext(MenuContext)!;
  const { domProps } = useUIProps(props);
  return <div role="group" {...domProps} ref={ref}>{title && <p className={cx('ui-menu__groupTitle', ctx.mods)}>{title}</p>}{children}</div>;
});

interface ModalCtx {
  onClose: () => void;
  mods: string;
  titleId: string;
  bodyId: string;
  scrollInside: boolean;
  centered: boolean;
  closeOnOverlayClick: boolean;
  dialog: RefObject<HTMLElement | null>;
}
const ModalContext = createContext<ModalCtx | null>(null);

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen, onClose, children, size, variant, colorScheme, isCentered, scrollBehavior = 'outside', closeOnOverlayClick = true,
  closeOnEsc = true, blockScrollOnMount = true, initialFocusRef, finalFocusRef, returnFocusOnClose = true, motionPreset: _m,
  autoFocus = true, trapFocus = true, preserveScrollBarGap: _p, allowPinchZoom: _z, lockFocusAcrossFrames: _l,
}: ThemingProps & {
  isOpen: boolean; onClose: () => void; children: ReactNode; isCentered?: boolean; scrollBehavior?: 'inside' | 'outside';
  closeOnOverlayClick?: boolean; closeOnEsc?: boolean; blockScrollOnMount?: boolean; initialFocusRef?: RefObject<HTMLElement>;
  finalFocusRef?: RefObject<HTMLElement>; returnFocusOnClose?: boolean; motionPreset?: string; autoFocus?: boolean; trapFocus?: boolean;
  preserveScrollBarGap?: boolean; allowPinchZoom?: boolean; lockFocusAcrossFrames?: boolean;
}) {
  const mounted = useMounted();
  const dialog = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    if (blockScrollOnMount) document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      if (autoFocus) (initialFocusRef?.current ?? dialog.current)?.focus();
    }, 0);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) { e.stopPropagation(); close.current(); }
      if (e.key === 'Tab' && trapFocus && dialog.current) {
        const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (!items.length) { e.preventDefault(); dialog.current.focus(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (returnFocusOnClose) (finalFocusRef?.current ?? before)?.focus?.();
    };
  }, [isOpen]);
  if (!mounted || !isOpen) return null;
  const mods = cx(themeClasses('Modal', 'modal', { size, variant, colorScheme }), isCentered && 'ui-modal--centered', scrollBehavior === 'inside' && 'ui-modal--inside');
  return createPortal(
    <ModalContext.Provider value={{ onClose, mods, titleId, bodyId, scrollInside: scrollBehavior === 'inside', centered: !!isCentered, closeOnOverlayClick, dialog }}>
      <div className="ui-modal">{children}</div>
    </ModalContext.Provider>,
    document.body,
  );
}

export const ModalOverlay = forwardRef<any, UIProps>(function ModalOverlay(props, ref) {
  const ctx = useContext(ModalContext)!;
  const { as, domProps } = useUIProps(props, cx('ui-modal__overlay', ctx.mods));
  return createElement(as, { ...domProps, ref });
});

export const ModalContent = forwardRef<any, UIProps & { containerProps?: UIProps }>(function ModalContent({ containerProps, ...props }, ref) {
  const ctx = useContext(ModalContext)!;
  const container = useUIProps(containerProps ?? {}, cx('ui-modal__dialogContainer', ctx.mods));
  const { as, domProps } = useUIProps(props, cx('ui-modal__dialog', ctx.mods), 'section');
  return (
    <div {...container.domProps} tabIndex={-1}
      onMouseDown={(e) => { if (e.target === e.currentTarget && ctx.closeOnOverlayClick) ctx.onClose(); }}>
      {createElement(as, {
        role: 'dialog', 'aria-modal': true, 'aria-labelledby': ctx.titleId, 'aria-describedby': ctx.bodyId, tabIndex: -1, ...domProps,
        ref: (el: HTMLElement | null) => { (ctx.dialog as MutableRefObject<HTMLElement | null>).current = el; setRef(ref, el); },
      })}
    </div>
  );
});

function modalPart(name: string, part: string, tag: string, idKey?: 'titleId' | 'bodyId') {
  const C = forwardRef<any, UIProps>(function ModalPart(props, ref) {
    const ctx = useContext(ModalContext)!;
    const { as, domProps } = useUIProps(props, cx(`ui-modal__${part}`, ctx.mods), tag);
    return createElement(as, { id: idKey ? ctx[idKey] : undefined, ...domProps, ref });
  });
  C.displayName = name;
  return C;
}

export const ModalHeader = modalPart('ModalHeader', 'header', 'header', 'titleId');
export const ModalBody = modalPart('ModalBody', 'body', 'div', 'bodyId');
export const ModalFooter = modalPart('ModalFooter', 'footer', 'footer');
export const ModalCloseButton = forwardRef<any, UIProps<'button'>>(function ModalCloseButton(props, ref) {
  const ctx = useContext(ModalContext)!;
  return <CloseButton className={cx('ui-modal__closeButton', ctx.mods)} onClick={ctx.onClose} ref={ref} {...props} />;
});
