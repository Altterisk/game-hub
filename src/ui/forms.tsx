import {
  createContext, createElement, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState,
  type ChangeEvent, type KeyboardEvent, type ReactElement, type ReactNode,
} from 'react';
import { themeClasses, useUIProps, type ThemingProps, type UIProps } from './base.js';
import { cx } from './system.js';
import { CheckIcon, ChevronDownIcon, TriangleDownIcon, TriangleUpIcon } from './icons.js';

const FIELD_HEIGHT: Record<string, string> = { xs: '1.5rem', sm: '2rem', md: '2.5rem', lg: '3rem' };

interface GroupState {
  size?: string;
  variant?: string;
  left?: 'element' | 'addon';
  right?: 'element' | 'addon';
}
const InputGroupContext = createContext<GroupState | null>(null);

type FieldProps<T extends 'input' | 'select' | 'textarea' = 'input'> = UIProps<T> & ThemingProps & { isDisabled?: boolean; isInvalid?: boolean; isReadOnly?: boolean; isRequired?: boolean; focusBorderColor?: string };

function fieldAria({ isDisabled, isInvalid, isReadOnly, isRequired }: { isDisabled?: boolean; isInvalid?: boolean; isReadOnly?: boolean; isRequired?: boolean }) {
  return {
    disabled: isDisabled || undefined,
    readOnly: isReadOnly || undefined,
    required: isRequired || undefined,
    'aria-invalid': isInvalid || undefined,
  };
}

export const Input = forwardRef<any, FieldProps & { htmlSize?: number }>(function Input(
  { size, variant, colorScheme, isDisabled, isInvalid, isReadOnly, isRequired, focusBorderColor: _f, htmlSize, ...props }, ref,
) {
  const group = useContext(InputGroupContext);
  const s = size ?? group?.size ?? 'md';
  const h = FIELD_HEIGHT[s] ?? FIELD_HEIGHT.md;
  const pad: Record<string, unknown> = {};
  if (group?.left === 'element') pad.paddingStart = h;
  if (group?.right === 'element') pad.paddingEnd = h;
  if (group?.left === 'addon') { pad.borderTopLeftRadius = 0; pad.borderBottomLeftRadius = 0; }
  if (group?.right === 'addon') { pad.borderTopRightRadius = 0; pad.borderBottomRightRadius = 0; }
  const { as, domProps } = useUIProps({ ...pad, ...props } as UIProps,
    cx('ui-input__field', themeClasses('Input', 'input', { size: s, variant: variant ?? group?.variant, colorScheme })), 'input');
  return createElement(as, { size: htmlSize, ...fieldAria({ isDisabled, isInvalid, isReadOnly, isRequired }), ...domProps, ref });
});

/** Wraps an `Input` with left/right elements or addons; the input gets matching padding and corners. */
export const InputGroup = forwardRef<any, UIProps & ThemingProps>(function InputGroup({ size, variant, colorScheme: _c, children, ...props }, ref) {
  const state: GroupState = { size, variant };
  const visit = (nodes: ReactNode) => {
    for (const child of ([] as ReactNode[]).concat(nodes)) {
      if (!child || typeof child !== 'object' || !('type' in (child as ReactElement))) continue;
      const t = (child as ReactElement).type as { displayName?: string };
      if (t.displayName === 'InputLeftElement') state.left = 'element';
      else if (t.displayName === 'InputRightElement') state.right = 'element';
      else if (t.displayName === 'InputLeftAddon') state.left = 'addon';
      else if (t.displayName === 'InputRightAddon') state.right = 'addon';
    }
  };
  visit(children);
  const { as, domProps } = useUIProps(props, 'ui-input-group');
  return <InputGroupContext.Provider value={state}>{createElement(as, { ...domProps, ref }, children)}</InputGroupContext.Provider>;
});

function groupElement(name: string, side: 'left' | 'right') {
  const C = forwardRef<any, UIProps>(function InputElement(props, ref) {
    const group = useContext(InputGroupContext);
    const h = FIELD_HEIGHT[group?.size ?? 'md'] ?? FIELD_HEIGHT.md;
    const { as, domProps } = useUIProps({ width: h, height: h, fontSize: group?.size === 'lg' ? 'md' : 'sm', ...(side === 'left' ? { left: 0 } : { right: 0 }), ...props } as UIProps, 'ui-input-group__element');
    return createElement(as, { ...domProps, ref });
  });
  C.displayName = name;
  return C;
}

function groupAddon(name: string, side: 'left' | 'right') {
  const C = forwardRef<any, UIProps>(function InputAddon(props, ref) {
    const group = useContext(InputGroupContext);
    const radius = side === 'left' ? { borderTopRightRadius: 0, borderBottomRightRadius: 0, marginEnd: '-1px' } : { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginStart: '-1px' };
    const { as, domProps } = useUIProps({ ...radius, ...props } as UIProps,
      cx('ui-input-group__addon', 'ui-input__addon', themeClasses('Input', 'input', { size: group?.size ?? 'md', variant: group?.variant })));
    return createElement(as, { ...domProps, ref });
  });
  C.displayName = name;
  return C;
}

export const InputLeftElement = groupElement('InputLeftElement', 'left');
export const InputRightElement = groupElement('InputRightElement', 'right');
export const InputLeftAddon = groupAddon('InputLeftAddon', 'left');
export const InputRightAddon = groupAddon('InputRightAddon', 'right');

export const Textarea = forwardRef<any, FieldProps<'textarea'>>(function Textarea({ size, variant, colorScheme, isDisabled, isInvalid, isReadOnly, isRequired, focusBorderColor: _f, ...props }, ref) {
  const { as, domProps } = useUIProps(props, cx('ui-textarea', themeClasses('Textarea', 'textarea', { size, variant, colorScheme })), 'textarea');
  return createElement(as, { ...fieldAria({ isDisabled, isInvalid, isReadOnly, isRequired }), ...domProps, ref });
});

export const Select = forwardRef<any, FieldProps<'select'> & { placeholder?: string; icon?: ReactElement; iconColor?: string; iconSize?: string; rootProps?: UIProps }>(
  function Select({ size, variant, colorScheme, isDisabled, isInvalid, isReadOnly, isRequired, focusBorderColor: _f, placeholder, icon, iconColor, iconSize, rootProps, children, ...props }, ref) {
    const mods = themeClasses('Select', 'select', { size, variant, colorScheme });
    const { width, w, minW, maxW, minWidth, maxWidth, flex, m, mt, mb, ml, mr, mx, my, ...field } = props;
    const root = useUIProps({ width, w, minW, maxW, minWidth, maxWidth, flex, m, mt, mb, ml, mr, mx, my, ...rootProps } as UIProps, 'ui-select__wrapper');
    const { domProps } = useUIProps(field as UIProps, cx('ui-select__field', mods), 'select');
    return (
      <div {...root.domProps}>
        {createElement('select', { ...fieldAria({ isDisabled, isInvalid, isReadOnly, isRequired }), ...domProps, ref },
          placeholder && <option value="">{placeholder}</option>, children)}
        <div className={cx('ui-select__iconWrap', 'ui-select__icon', mods)} style={{ color: iconColor, fontSize: iconSize }} aria-hidden>
          {icon ?? <ChevronDownIcon width="1em" height="1em" />}
        </div>
      </div>
    );
  },
);

export const Checkbox = forwardRef<any, Omit<UIProps<'label'>, 'onChange' | 'defaultChecked' | 'value'> & ThemingProps & {
  isChecked?: boolean; defaultChecked?: boolean; isIndeterminate?: boolean; isDisabled?: boolean; isInvalid?: boolean; isReadOnly?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void; value?: string | number; name?: string; spacing?: string; icon?: ReactElement;
  iconColor?: string; inputProps?: Record<string, unknown>;
}>(function Checkbox({
  size, variant, colorScheme, isChecked, defaultChecked, isIndeterminate, isDisabled, isInvalid, isReadOnly, onChange, value, name,
  spacing = '0.5rem', icon, iconColor, inputProps, children, ...props
}, ref) {
  const mods = themeClasses('Checkbox', 'checkbox', { size, variant, colorScheme });
  const [inner, setInner] = useState(!!defaultChecked);
  const checked = isChecked ?? inner;
  const state = { 'data-checked': checked ? '' : undefined, 'data-indeterminate': isIndeterminate ? '' : undefined, 'data-disabled': isDisabled ? '' : undefined, 'data-invalid': isInvalid ? '' : undefined };
  const { as, domProps } = useUIProps(props, cx('ui-checkbox__container', mods), 'label');
  return createElement(as, { ...domProps, ...state },
    <input ref={ref} type="checkbox" className="ui-checkbox__input" checked={checked} disabled={isDisabled} readOnly={isReadOnly}
      aria-invalid={isInvalid || undefined} value={value} name={name} {...inputProps}
      onChange={(e) => { if (isReadOnly) return; if (isChecked === undefined) setInner(e.target.checked); onChange?.(e); }} />,
    <span className={cx('ui-checkbox__control', mods)} aria-hidden {...state}>
      {(checked || isIndeterminate) && (
        <span className={cx('ui-checkbox__icon', mods)} style={{ color: iconColor, display: 'inline-flex' }}>
          {icon ?? (isIndeterminate ? <svg viewBox="0 0 24 24" width="1em" height="1em"><line stroke="currentColor" strokeWidth="4" x1="21" x2="3" y1="12" y2="12" /></svg> : <CheckIcon width="1em" height="1em" />)}
        </span>
      )}
    </span>,
    children !== undefined && <span className={cx('ui-checkbox__label', mods)} style={{ marginInlineStart: spacing }} {...state}>{children}</span>);
});

interface NumberCtx {
  mods: string;
  inc: () => void;
  dec: () => void;
  disabled?: boolean;
  atMin: boolean;
  atMax: boolean;
  field: Record<string, unknown>;
}
const NumberInputContext = createContext<NumberCtx | null>(null);

const roundTo = (n: number, precision?: number) => (precision === undefined ? n : Number(n.toFixed(precision)));
const decimals = (n: number) => (String(n).split('.')[1] ?? '').length;

/** Number field with steppers; `onChange(valueAsString, valueAsNumber)` like Chakra's. */
export const NumberInput = forwardRef<any, Omit<UIProps, 'onChange' | 'defaultValue' | 'value' | 'onBlur'> & ThemingProps & {
  value?: string | number; defaultValue?: string | number; min?: number; max?: number; step?: number; precision?: number;
  onChange?: (valueAsString: string, valueAsNumber: number) => void; keepWithinRange?: boolean; clampValueOnBlur?: boolean;
  isDisabled?: boolean; isReadOnly?: boolean; isInvalid?: boolean; allowMouseWheel?: boolean; onBlur?: () => void;
}>(function NumberInput({
  size, variant, colorScheme, value, defaultValue, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, step = 1, precision,
  onChange, keepWithinRange = true, clampValueOnBlur = true, isDisabled, isReadOnly, isInvalid, allowMouseWheel: _w, onBlur, children, ...props
}, ref) {
  const mods = themeClasses('NumberInput', 'number-input', { size, variant, colorScheme });
  const [inner, setInner] = useState(String(defaultValue ?? ''));
  const text = value !== undefined ? String(value) : inner;
  const num = text === '' ? NaN : Number(text);
  const p = precision ?? Math.max(decimals(step), 0);
  const set = useCallback((next: string) => {
    if (value === undefined) setInner(next);
    onChange?.(next, next === '' ? NaN : Number(next));
  }, [value, onChange]);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const stepBy = (dir: number) => {
    if (isDisabled || isReadOnly) return;
    const base = Number.isNaN(num) ? (min > Number.MIN_SAFE_INTEGER ? min : 0) - (dir > 0 ? step : -step) : num;
    let next = roundTo(base + dir * step, p);
    if (keepWithinRange) next = clamp(next);
    set(next.toFixed(p));
  };
  const field = {
    value: text,
    inputMode: 'decimal',
    disabled: isDisabled,
    readOnly: isReadOnly,
    'aria-invalid': isInvalid || undefined,
    role: 'spinbutton',
    'aria-valuemin': min > Number.MIN_SAFE_INTEGER ? min : undefined,
    'aria-valuemax': max < Number.MAX_SAFE_INTEGER ? max : undefined,
    'aria-valuenow': Number.isNaN(num) ? undefined : num,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (/^-?\d*\.?\d*$/.test(v)) set(v);
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); stepBy(1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); stepBy(-1); }
    },
    onBlur: () => {
      if (clampValueOnBlur && text !== '' && !Number.isNaN(num)) {
        const c = roundTo(clamp(num), precision);
        const out = precision !== undefined ? c.toFixed(precision) : String(c);
        if (out !== text) set(out);
      }
      onBlur?.();
    },
  };
  const { as, domProps } = useUIProps(props, cx('ui-number-input__root', mods));
  return (
    <NumberInputContext.Provider value={{
      mods, inc: () => stepBy(1), dec: () => stepBy(-1), disabled: isDisabled, atMin: !Number.isNaN(num) && num <= min,
      atMax: !Number.isNaN(num) && num >= max, field,
    }}>
      {createElement(as, { ...domProps, ref }, children)}
    </NumberInputContext.Provider>
  );
});

export const NumberInputField = forwardRef<any, UIProps<'input'>>(function NumberInputField(props, ref) {
  const ctx = useContext(NumberInputContext)!;
  const { as, domProps } = useUIProps(props, cx('ui-number-input__field', ctx.mods), 'input');
  return createElement(as, { type: 'text', ...ctx.field, ...domProps, ref });
});

export const NumberInputStepper = forwardRef<any, UIProps>(function NumberInputStepper(props, ref) {
  const ctx = useContext(NumberInputContext)!;
  const { as, domProps } = useUIProps(props, cx('ui-number-input__stepperGroup', ctx.mods));
  return createElement(as, { 'aria-hidden': true, ...domProps, ref });
});

function stepper(name: string, dir: 1 | -1) {
  const C = forwardRef<any, UIProps>(function Stepper({ children, ...props }, ref) {
    const ctx = useContext(NumberInputContext)!;
    const timer = useRef<ReturnType<typeof setTimeout>>();
    const stop = () => clearTimeout(timer.current);
    useEffect(() => stop, []);
    const disabled = ctx.disabled || (dir > 0 ? ctx.atMax : ctx.atMin);
    const { as, domProps } = useUIProps(props, cx('ui-number-input__stepper', ctx.mods), 'div');
    return createElement(as, {
      ...domProps, ref, role: 'button', tabIndex: -1, 'data-disabled': disabled ? '' : undefined, 'aria-disabled': disabled || undefined,
      onPointerDown: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (disabled) return;
        (dir > 0 ? ctx.inc : ctx.dec)();
      },
      onPointerUp: stop,
      onPointerLeave: stop,
    }, children ?? (dir > 0 ? <TriangleUpIcon width="0.6em" height="0.6em" /> : <TriangleDownIcon width="0.6em" height="0.6em" />));
  });
  C.displayName = name;
  return C;
}

export const NumberIncrementStepper = stepper('NumberIncrementStepper', 1);
export const NumberDecrementStepper = stepper('NumberDecrementStepper', -1);

interface SliderCtx { mods: string; pct: number; vertical: boolean }
const SliderContext = createContext<SliderCtx | null>(null);

/** Range slider: a native range input drives the track/filled track/thumb parts drawn by the children. */
export const Slider = forwardRef<any, Omit<UIProps, 'onChange' | 'defaultValue' | 'value'> & ThemingProps & {
  value?: number; defaultValue?: number; min?: number; max?: number; step?: number; onChange?: (v: number) => void;
  onChangeEnd?: (v: number) => void; onChangeStart?: (v: number) => void; isDisabled?: boolean; isReadOnly?: boolean;
  focusThumbOnChange?: boolean; orientation?: 'horizontal' | 'vertical'; name?: string; 'aria-label'?: string;
}>(function Slider({
  size, variant, colorScheme, value, defaultValue, min = 0, max = 100, step = 1, onChange, onChangeEnd, onChangeStart, isDisabled,
  isReadOnly, focusThumbOnChange: _f, orientation = 'horizontal', name, 'aria-label': label, children, ...props
}, ref) {
  const mods = themeClasses('Slider', 'slider', { size, variant, colorScheme });
  const [inner, setInner] = useState(defaultValue ?? min);
  const v = value ?? inner;
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
  const vertical = orientation === 'vertical';
  const { as, domProps } = useUIProps({ width: vertical ? undefined : '100%', ...props } as UIProps, cx('ui-slider__container', mods));
  return (
    <SliderContext.Provider value={{ mods, pct, vertical }}>
      {createElement(as, { ...domProps, ref, 'data-disabled': isDisabled ? '' : undefined, 'data-orientation': orientation },
        children,
        <input type="range" min={min} max={max} step={step} value={v} disabled={isDisabled} name={name} aria-label={label}
          readOnly={isReadOnly}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, margin: 0, cursor: 'inherit' }}
          onPointerDown={() => onChangeStart?.(v)}
          onChange={(e) => { if (isReadOnly) return; const n = Number(e.target.value); if (value === undefined) setInner(n); onChange?.(n); }}
          onPointerUp={(e) => onChangeEnd?.(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => onChangeEnd?.(Number((e.target as HTMLInputElement).value))} />)}
    </SliderContext.Provider>
  );
});

export const SliderTrack = forwardRef<any, UIProps>(function SliderTrack(props, ref) {
  const ctx = useContext(SliderContext)!;
  const { as, domProps } = useUIProps(props, cx('ui-slider__track', ctx.mods));
  return createElement(as, { ...domProps, ref });
});

export const SliderFilledTrack = forwardRef<any, UIProps>(function SliderFilledTrack(props, ref) {
  const ctx = useContext(SliderContext)!;
  const { as, domProps } = useUIProps(props, cx('ui-slider__filledTrack', ctx.mods));
  const size = ctx.vertical ? { height: `${ctx.pct}%`, bottom: 0 } : { width: `${ctx.pct}%` };
  return createElement(as, { ...domProps, style: { ...size, ...domProps.style }, ref });
});

export const SliderThumb = forwardRef<any, UIProps>(function SliderThumb(props, ref) {
  const ctx = useContext(SliderContext)!;
  const { as, domProps } = useUIProps(props, cx('ui-slider__thumb', ctx.mods));
  const pos = ctx.vertical
    ? { bottom: `calc(${ctx.pct}% - var(--slider-thumb-size, 14px) / 2)` }
    : { left: `calc(${ctx.pct}% - var(--slider-thumb-size, 14px) / 2)` };
  return createElement(as, { ...domProps, style: { ...pos, ...domProps.style }, ref, 'aria-hidden': true });
});

export function useFormId(id?: string) {
  const auto = useId();
  return id ?? auto;
}

/** Headless number input like Chakra's: prop getters for a field and two step buttons. */
export function useNumberInput({ value, defaultValue, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, step = 1, onChange, isDisabled }: {
  value?: string | number; defaultValue?: string | number; min?: number; max?: number; step?: number;
  onChange?: (valueAsString: string, valueAsNumber: number) => void; isDisabled?: boolean;
} = {}) {
  const [inner, setInner] = useState(String(defaultValue ?? ''));
  const text = value !== undefined ? String(value) : inner;
  const num = text === '' ? NaN : Number(text);
  const set = (next: string) => {
    if (value === undefined) setInner(next);
    onChange?.(next, next === '' ? NaN : Number(next));
  };
  const stepBy = (dir: number) => {
    if (isDisabled) return;
    const base = Number.isNaN(num) ? 0 : num;
    set(String(Math.min(max, Math.max(min, base + dir * step))));
  };
  return {
    value: text,
    valueAsNumber: num,
    getInputProps: (p: Record<string, unknown> = {}) => ({
      ...p, value: text, inputMode: 'numeric' as const, disabled: isDisabled,
      onChange: (e: ChangeEvent<HTMLInputElement>) => { if (/^-?\d*\.?\d*$/.test(e.target.value)) set(e.target.value); },
      onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); stepBy(1); }
        if (e.key === 'ArrowDown') { e.preventDefault(); stepBy(-1); }
      },
    }),
    getIncrementButtonProps: (p: Record<string, unknown> = {}) => ({ ...p, type: 'button' as const, disabled: isDisabled || num >= max, onClick: () => stepBy(1) }),
    getDecrementButtonProps: (p: Record<string, unknown> = {}) => ({ ...p, type: 'button' as const, disabled: isDisabled || num <= min, onClick: () => stepBy(-1) }),
  };
}