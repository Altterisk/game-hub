import { createContext, createElement, forwardRef, useContext } from 'react';
import { themeClasses, useUIProps, type ThemingProps, type UIProps } from './base.js';
import { cx } from './system.js';

const TableContext = createContext('');

export const TableContainer = forwardRef<any, UIProps>(function TableContainer(props, ref) {
  const { as, domProps } = useUIProps(props, 'ui-table-container');
  return createElement(as, { ...domProps, ref });
});

export const Table = forwardRef<any, UIProps<'table'> & ThemingProps & { layout?: string }>(function Table({ size, variant, colorScheme, layout, ...props }, ref) {
  const mods = themeClasses('Table', 'table', { size, variant, colorScheme });
  const { as, domProps } = useUIProps({ tableLayout: layout, ...props } as UIProps, cx('ui-table__table', mods), 'table');
  return <TableContext.Provider value={mods}>{createElement(as, { ...domProps, ref })}</TableContext.Provider>;
});

function tablePart<T extends 'thead' | 'tbody' | 'tfoot' | 'tr' | 'th' | 'td' | 'caption'>(name: string, part: string, tag: T) {
  const C = forwardRef<any, UIProps<T> & { isNumeric?: boolean }>(function TablePart({ isNumeric, ...props }: UIProps & { isNumeric?: boolean }, ref) {
    const mods = useContext(TableContext);
    const { as, domProps } = useUIProps(props, cx(`ui-table__${part}`, mods), tag);
    return createElement(as, { 'data-is-numeric': isNumeric || undefined, ...domProps, ref });
  });
  C.displayName = name;
  return C;
}

export const Thead = tablePart('Thead', 'thead', 'thead');
export const Tbody = tablePart('Tbody', 'tbody', 'tbody');
export const Tfoot = tablePart('Tfoot', 'tfoot', 'tfoot');
export const Tr = tablePart('Tr', 'tr', 'tr');
export const Th = tablePart('Th', 'th', 'th');
export const Td = tablePart('Td', 'td', 'td');
export const TableCaption = tablePart('TableCaption', 'caption', 'caption');

const CardContext = createContext('');

export const Card = forwardRef<any, UIProps & ThemingProps & { direction?: string; align?: string; justify?: string }>(
  function Card({ size, variant, colorScheme, direction = 'column', align, justify, ...props }, ref) {
    const mods = themeClasses('Card', 'card', { size, variant, colorScheme });
    const { as, domProps } = useUIProps({
      display: 'flex', flexDirection: direction, alignItems: align, justifyContent: justify, position: 'relative', minWidth: 0,
      overflowWrap: 'break-word', ...props,
    } as UIProps, cx('ui-card__container', mods));
    return <CardContext.Provider value={mods}>{createElement(as, { ...domProps, ref })}</CardContext.Provider>;
  },
);

function cardPart(name: string, part: string) {
  const C = forwardRef<any, UIProps>(function CardPart(props, ref) {
    const mods = useContext(CardContext);
    const { as, domProps } = useUIProps(props, cx(`ui-card__${part}`, mods));
    return createElement(as, { ...domProps, ref });
  });
  C.displayName = name;
  return C;
}

export const CardHeader = cardPart('CardHeader', 'header');
export const CardBody = cardPart('CardBody', 'body');
export const CardFooter = cardPart('CardFooter', 'footer');

const StatContext = createContext('');

export const Stat = forwardRef<any, UIProps & ThemingProps>(function Stat({ size, variant, colorScheme, children, ...props }, ref) {
  const mods = themeClasses('Stat', 'stat', { size, variant, colorScheme });
  const { as, domProps } = useUIProps(props, cx('ui-stat__container', mods));
  return <StatContext.Provider value={mods}>{createElement(as, { ...domProps, ref }, <dl>{children}</dl>)}</StatContext.Provider>;
});

function statPart(name: string, part: string, tag: string) {
  const C = forwardRef<any, UIProps>(function StatPart(props, ref) {
    const mods = useContext(StatContext);
    const { as, domProps } = useUIProps(props, cx(`ui-stat__${part}`, mods), tag);
    return createElement(as, { ...domProps, ref });
  });
  C.displayName = name;
  return C;
}

export const StatLabel = statPart('StatLabel', 'label', 'dt');
export const StatNumber = statPart('StatNumber', 'number', 'dd');
export const StatHelpText = statPart('StatHelpText', 'helpText', 'dd');
