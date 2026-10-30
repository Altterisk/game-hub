import {
  Children, cloneElement, createContext, createElement, forwardRef, isValidElement, useContext, useId, useRef, useState,
  type KeyboardEvent, type ReactElement, type ReactNode,
} from 'react';
import { themeClasses, useUIProps, type ThemingProps, type UIProps } from './base.js';
import { cx } from './system.js';
import { ChevronDownIcon } from './icons.js';

interface AccordionCtx {
  mods: string;
  isOpen: (i: number) => boolean;
  toggle: (i: number) => void;
  reduceMotion: boolean;
}
const AccordionContext = createContext<AccordionCtx | null>(null);
interface ItemCtx { index: number; open: boolean; disabled: boolean; buttonId: string; panelId: string }
const AccordionItemContext = createContext<ItemCtx | null>(null);

/** Index of the direct child an item/tab/panel sits in, so wrapper components keep working. */
const IndexContext = createContext<number | null>(null);
const indexChildren = (children: ReactNode) => Children.map(children, (c, i) => <IndexContext.Provider value={i}>{c}</IndexContext.Provider>);

const asList = (v: number | number[] | undefined | null) => (v === undefined || v === null || v === -1 ? [] : Array.isArray(v) ? v : [v]);

export const Accordion = forwardRef<any, Omit<UIProps, 'onChange' | 'defaultValue'> & ThemingProps & {
  allowMultiple?: boolean; allowToggle?: boolean; index?: number | number[]; defaultIndex?: number | number[];
  onChange?: (i: number | number[]) => void; reduceMotion?: boolean;
}>(function Accordion({ allowMultiple, allowToggle, index, defaultIndex, onChange, reduceMotion = false, size, variant, colorScheme, children, ...props }, ref) {
  const [inner, setInner] = useState<number[]>(asList(defaultIndex));
  const open = index !== undefined ? asList(index) : inner;
  const toggle = (i: number) => {
    const isOpen = open.includes(i);
    let next: number[];
    if (allowMultiple) next = isOpen ? open.filter((x) => x !== i) : [...open, i];
    else next = isOpen ? (allowToggle ? [] : open) : [i];
    if (index === undefined) setInner(next);
    onChange?.(allowMultiple ? next : next[0] ?? -1);
  };
  const mods = themeClasses('Accordion', 'accordion', { size, variant, colorScheme });
  const { as, domProps } = useUIProps(props, cx('ui-accordion__root', mods));
  const kids = indexChildren(children);
  return (
    <AccordionContext.Provider value={{ mods, isOpen: (i) => open.includes(i), toggle, reduceMotion }}>
      {createElement(as, { ...domProps, ref }, kids)}
    </AccordionContext.Provider>
  );
});

export const AccordionItem = forwardRef<any, UIProps & { isDisabled?: boolean; isFocusable?: boolean; __index?: number }>(
  function AccordionItem({ isDisabled, isFocusable: _f, __index, children, ...props }, ref) {
    const ctx = useContext(AccordionContext)!;
    const index = __index ?? useContext(IndexContext) ?? 0;
    const id = useId();
    const open = ctx.isOpen(index);
    const { as, domProps } = useUIProps(props, cx('ui-accordion__container', ctx.mods));
    return (
      <AccordionItemContext.Provider value={{ index, open, disabled: !!isDisabled, buttonId: `${id}-b`, panelId: `${id}-p` }}>
        {createElement(as, { ...domProps, ref }, typeof children === 'function' ? (children as (p: { isExpanded: boolean; isDisabled: boolean }) => ReactNode)({ isExpanded: open, isDisabled: !!isDisabled }) : children)}
      </AccordionItemContext.Provider>
    );
  },
);

export const AccordionButton = forwardRef<any, UIProps<'button'>>(function AccordionButton({ onClick, ...props }, ref) {
  const ctx = useContext(AccordionContext)!;
  const item = useContext(AccordionItemContext)!;
  const { as, domProps } = useUIProps(props, cx('ui-accordion__button', ctx.mods), 'button');
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    const root = (e.currentTarget as HTMLElement).closest('.ui-accordion__root');
    const buttons = [...(root?.querySelectorAll<HTMLElement>('.ui-accordion__button:not([disabled])') ?? [])];
    const i = buttons.indexOf(e.currentTarget as HTMLElement);
    const go = (n: number) => { e.preventDefault(); buttons[(n + buttons.length) % buttons.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(buttons.length - 1);
  };
  return createElement(as, {
    type: 'button', id: item.buttonId, 'aria-expanded': item.open, 'aria-controls': item.panelId, disabled: item.disabled,
    ...domProps, ref, onKeyDown: onKey,
    onClick: (e: unknown) => { (onClick as ((e: unknown) => void) | undefined)?.(e); ctx.toggle(item.index); },
  });
});

export const AccordionPanel = forwardRef<any, UIProps & { motionProps?: unknown }>(function AccordionPanel({ motionProps: _m, ...props }, ref) {
  const ctx = useContext(AccordionContext)!;
  const item = useContext(AccordionItemContext)!;
  const { as, domProps } = useUIProps(props, cx('ui-accordion__panel', ctx.mods));
  return createElement(as, { role: 'region', id: item.panelId, 'aria-labelledby': item.buttonId, hidden: !item.open || undefined, ...domProps, ref });
});

export const AccordionIcon = forwardRef<any, UIProps>(function AccordionIcon(props, ref) {
  const ctx = useContext(AccordionContext)!;
  return <ChevronDownIcon className={cx('ui-accordion__icon', ctx.mods)} ref={ref} {...props} />;
});

interface TabsCtx {
  mods: string;
  selected: number;
  select: (i: number) => void;
  idBase: string;
  isLazy: boolean;
  visited: Set<number>;
  isFitted: boolean;
  orientation: 'horizontal' | 'vertical';
  manual: boolean;
}
const TabsContext = createContext<TabsCtx | null>(null);

export const Tabs = forwardRef<any, Omit<UIProps, 'onChange' | 'defaultValue'> & ThemingProps & {
  index?: number; defaultIndex?: number; onChange?: (i: number) => void; isLazy?: boolean; isFitted?: boolean;
  orientation?: 'horizontal' | 'vertical'; isManual?: boolean; align?: 'start' | 'center' | 'end'; lazyBehavior?: 'unmount' | 'keepMounted';
}>(function Tabs({
  index, defaultIndex = 0, onChange, isLazy, isFitted, orientation = 'horizontal', isManual, align, lazyBehavior = 'unmount',
  size, variant, colorScheme, ...props
}, ref) {
  const [inner, setInner] = useState(defaultIndex);
  const selected = index ?? inner;
  const visited = useRef(new Set<number>([selected])).current;
  visited.add(selected);
  if (lazyBehavior === 'unmount') for (const v of [...visited]) if (v !== selected) visited.delete(v);
  const idBase = useId();
  const mods = themeClasses('Tabs', 'tabs', { size, variant, colorScheme });
  const { as, domProps } = useUIProps(props, cx('ui-tabs__root', mods));
  return (
    <TabsContext.Provider value={{
      mods, selected, idBase, isLazy: !!isLazy, visited, isFitted: !!isFitted, orientation, manual: !!isManual,
      select: (i) => { if (index === undefined) setInner(i); onChange?.(i); },
    }}>
      {createElement(as, { 'data-orientation': orientation, 'data-align': align, ...domProps, ref })}
    </TabsContext.Provider>
  );
});

export const TabList = forwardRef<any, UIProps>(function TabList({ children, ...props }, ref) {
  const ctx = useContext(TabsContext)!;
  const { as, domProps } = useUIProps({ flexDirection: ctx.orientation === 'vertical' ? 'column' : undefined, ...props } as UIProps, cx('ui-tabs__tablist', ctx.mods));
  const kids = indexChildren(children);
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    const tabs = [...(e.currentTarget.querySelectorAll<HTMLElement>('[role=tab]:not([disabled])'))];
    const i = tabs.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const next: Record<string, number> = ctx.orientation === 'vertical' ? { ArrowDown: 1, ArrowUp: -1 } : { ArrowRight: 1, ArrowLeft: -1 };
    let to: number | null = null;
    if (next[e.key] !== undefined) to = (i + next[e.key] + tabs.length) % tabs.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = tabs.length - 1;
    if (to === null) return;
    e.preventDefault();
    tabs[to].focus();
    if (!ctx.manual) tabs[to].click();
  };
  return createElement(as, { role: 'tablist', 'aria-orientation': ctx.orientation, ...domProps, ref, onKeyDown: onKey }, kids);
});

export const Tab = forwardRef<any, UIProps<'button'> & { isDisabled?: boolean; __index?: number }>(function Tab({ isDisabled, __index: explicit, onClick, ...props }, ref) {
  const ctx = useContext(TabsContext)!;
  const __index = explicit ?? useContext(IndexContext) ?? 0;
  const selected = ctx.selected === __index;
  const { as, domProps } = useUIProps({ flex: ctx.isFitted ? 1 : undefined, ...props } as UIProps, cx('ui-tabs__tab', ctx.mods), 'button');
  return createElement(as, {
    type: 'button', role: 'tab', id: `${ctx.idBase}-t${__index}`, 'aria-controls': `${ctx.idBase}-p${__index}`, 'aria-selected': selected,
    tabIndex: selected ? 0 : -1, disabled: isDisabled, ...domProps, ref,
    onClick: (e: unknown) => { (onClick as ((e: unknown) => void) | undefined)?.(e); ctx.select(__index); },
  });
});

export const TabPanels = forwardRef<any, UIProps>(function TabPanels({ children, ...props }, ref) {
  const ctx = useContext(TabsContext)!;
  const { as, domProps } = useUIProps({ width: '100%', ...props } as UIProps, cx('ui-tabs__tabpanels', ctx.mods));
  return createElement(as, { ...domProps, ref }, indexChildren(children));
});

export const TabPanel = forwardRef<any, UIProps & { __index?: number }>(function TabPanel({ __index: explicit, children, ...props }, ref) {
  const ctx = useContext(TabsContext)!;
  const __index = explicit ?? useContext(IndexContext) ?? 0;
  const selected = ctx.selected === __index;
  const { as, domProps } = useUIProps(props, cx('ui-tabs__tabpanel', ctx.mods));
  const render = !ctx.isLazy || selected || ctx.visited.has(__index);
  return createElement(as, {
    role: 'tabpanel', id: `${ctx.idBase}-p${__index}`, 'aria-labelledby': `${ctx.idBase}-t${__index}`, tabIndex: 0, hidden: !selected || undefined,
    ...domProps, ref,
  }, render ? children : null);
});
