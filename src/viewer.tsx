import { Children, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Box, Divider, Flex, HStack, Image, Input, Menu, MenuButton, MenuItem, MenuList,
  Portal, Spinner, Text, Tooltip, VStack,
} from '@chakra-ui/react';

export type ViewerIconName =
  | 'play' | 'pause' | 'reload' | 'save' | 'loop' | 'bg' | 'face' | 'body' | 'store'
  | 'auto' | 'touch' | 'home' | 'layers' | 'chevron' | 'close' | 'jiggle' | 'overlay'
  | 'camera' | 'voice' | 'music' | 'speed' | 'aspect' | 'theater' | 'pan' | 'share'
  | 'record' | 'parts' | 'damage' | 'globe';

const ICON_PATHS: Record<ViewerIconName, string> = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
  reload: 'M17.65 6.35A8 8 0 1 0 19.73 14h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z',
  save: 'M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z',
  share: 'M18 16a3 3 0 0 0-2.4 1.2L8.9 13.8a3.2 3.2 0 0 0 0-3.6l6.7-3.4A3 3 0 1 0 15 4.2L8.3 7.6a3 3 0 1 0 0 8.8l6.7 3.4A3 3 0 1 0 18 16z',
  record: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
  loop: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  bg: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z',
  face: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 17.5c-2.3 0-4.3-1.4-5.2-3.5h10.4c-.9 2.1-2.9 3.5-5.2 3.5z',
  body: 'M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-2 5h4a2 2 0 0 1 2 2v4h-1.5l-.5 9h-4l-.5-9H8V9a2 2 0 0 1 2-2z',
  store: 'M4 4h16v4H4zm1 6h14v10H5zm4 2v6h6v-6z',
  home: 'M12 3 2 12h3v9h6v-6h2v6h6v-9h3z',
  auto: 'M7.5 5.6 5 4l1.6 2.5L5 9l2.5-1.6L10 9 8.4 6.5 10 4zM19 15l-1.9 1.2L18.3 18l-2.5-1L14 19l.9-2.4L13 15h2.4l.9-2.4L17.2 15zM11.3 8.9 3 17.2 5.8 20l8.3-8.3z',
  touch: 'M9 11V4.5a1.5 1.5 0 0 1 3 0V11h.5l3.6.7A2 2 0 0 1 18 13.7V17a4 4 0 0 1-4 4h-2.6a4 4 0 0 1-3.1-1.5l-3-3.8a1.5 1.5 0 0 1 2.2-2L9 15z',
  layers: 'M12 3 2 8.5 12 14l10-5.5zM4.2 12 2 13.2 12 18.7l10-5.5-2.2-1.2L12 16zm0 4.6L2 17.8 12 23.3l10-5.5-2.2-1.2L12 20.6z',
  overlay: 'M12 2l1.9 5.6L19.5 9.5 13.9 11.4 12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM18 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9zM5.5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  camera: 'M9 4 7.2 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.2L15 4zm3 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  chevron: 'M7 10l5 5 5-5z',
  close: 'M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z',
  voice: 'M4 9v6h4l5 4V5L8 9zm12.5 3a4 4 0 0 0-2.3-3.6v7.2A4 4 0 0 0 16.5 12zM14.2 3.2v2.1A6.8 6.8 0 0 1 14.2 18.7v2.1a8.8 8.8 0 0 0 0-17.6z',
  music: 'M12 3v10.6A4 4 0 1 0 14 17V8h5V3zM8 19a2 2 0 1 1 2-2 2 2 0 0 1-2 2z',
  speed: 'M15 1H9v2h6zm-4 12h2V8h-2zm8.03-6.61 1.42-1.42a10 10 0 0 0-1.4-1.4l-1.43 1.42A8 8 0 1 0 20 13a7.95 7.95 0 0 0-.97-3.83zM12 20a6 6 0 1 1 6-6 6 6 0 0 1-6 6z',
  jiggle: 'M3 13c1.5-2 3-2 4.5 0S10.5 15 12 13s3-2 4.5 0 3 2 4.5 0v2.5c-1.5 2-3 2-4.5 0s-3-2-4.5 0-3 2-4.5 0-3-2-4.5 0zm0-6c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0v2.5c-1.5 2-3 2-4.5 0s-3-2-4.5 0-3 2-4.5 0-3-2-4.5 0z',
  aspect: 'M2 7h20v10H2V7zM4 15h16V9H4v6z',
  theater: 'M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z',
  pan: 'M12 2l3 3h-2v5h5V8l3 3-3 3v-2h-5v5h2l-3 3-3-3h2v-5H6v2l-3-3 3-3v2h5V5H9z',
  parts: 'M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.7 2.7 0 0 1 0 5.4H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 0 1 5.4 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z',
  damage: 'M13 2 3 14h7l-1 8 10-12h-7z',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4zm.8 2H8a15.7 15.7 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4z',
};

export function ViewerIcon({ name, size = 20 }: { name: ViewerIconName; size?: number }) {
  return (
    <Box as="svg" viewBox="0 0 24 24" width={`${size}px`} height={`${size}px`}
      fill="currentColor" aria-hidden="true" flexShrink={0}>
      <path d={ICON_PATHS[name]} />
    </Box>
  );
}

// Renders nothing when it has no rows, so a heading never stands alone.
export function ControlSection({ title, children }: { title: string; children?: ReactNode }) {
  const rows = Children.toArray(children);
  if (!rows.length) return null;
  return (
    <Box>
      <Text fontSize="0.6rem" fontWeight="bold" textTransform="uppercase" letterSpacing="wide"
        color="gray.500" px={1} pb={1}>{title}</Text>
      <VStack align="stretch" spacing={1}>{rows}</VStack>
    </Box>
  );
}

export function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex align="center" gap={2} minH="30px">
      <Text fontSize="xs" color="gray.400" w="82px" flexShrink={0} noOfLines={1}>{label}</Text>
      <Flex flex="1" minW={0} justify="flex-end">{children}</Flex>
    </Flex>
  );
}

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  // Hover tooltip; the visible label stays short.
  title?: string;
  icon?: ViewerIconName;
  // Image URL drawn in place of the icon.
  image?: string;
};

export function SegmentedControl<T extends string>({ value, options, onChange, ariaLabel }: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  if (!options.length) return null;
  return (
    <HStack role="group" aria-label={ariaLabel} bg="blackAlpha.600" borderRadius="md"
      p="2px" spacing="2px" w="100%" border="1px solid" borderColor="whiteAlpha.200">
      {options.map((option) => {
        const isActive = option.value === value;
        const button = (
          <Box as="button" flex="1" minW={0} px={1.5} py={1} borderRadius="sm"
            display="flex" alignItems="center" justifyContent="center" gap={1}
            fontSize="xs" fontWeight={isActive ? 'bold' : 'normal'} lineHeight="1.4"
            bg={isActive ? 'accent.400' : 'transparent'}
            color={isActive ? 'gray.900' : 'gray.400'}
            _hover={{ bg: isActive ? 'accent.300' : 'whiteAlpha.200' }}
            transition="background 0.15s" aria-label={option.label} aria-pressed={isActive}
            onClick={() => { if (!isActive) onChange(option.value); }}>
            {option.image
              ? <Image src={option.image} alt="" boxSize="14px" flexShrink={0} />
              : option.icon ? <ViewerIcon name={option.icon} size={14} /> : null}
            <Text as="span" noOfLines={1}>{option.label}</Text>
          </Box>
        );
        return option.title
          ? (
            <Tooltip key={option.value} label={option.title} fontSize="xs" hasArrow placement="top" openDelay={400}>
              {button}
            </Tooltip>
          )
          : <Box key={option.value} flex="1" minW={0} display="flex">{button}</Box>;
      })}
    </HStack>
  );
}

// The state is spelled out rather than implied by a dimmed icon, which reads as "unavailable" as often as "off".
export function ToggleRow({ label, value, onChange, labels = { on: 'ON', off: 'OFF' } }: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  labels?: { on: string; off: string };
}) {
  return (
    <ControlRow label={label}>
      <Box as="button" onClick={() => onChange(!value)} aria-label={label} aria-pressed={value}
        display="flex" alignItems="center" gap={2} px={2} py={1} borderRadius="md" w="72px"
        justifyContent="space-between" border="1px solid" transition="all 0.15s"
        bg={value ? 'whiteAlpha.100' : 'blackAlpha.600'}
        borderColor={value ? 'accent.400' : 'whiteAlpha.200'}
        color={value ? 'accent.300' : 'gray.500'}
        _hover={{ borderColor: value ? 'accent.300' : 'whiteAlpha.400' }}>
        <Box boxSize="8px" borderRadius="full" flexShrink={0} border="1px solid"
          borderColor={value ? 'accent.300' : 'whiteAlpha.500'}
          bg={value ? 'accent.300' : 'transparent'} />
        <Text fontSize="0.65rem" fontWeight="bold" letterSpacing="wide">
          {value ? labels.on : labels.off}
        </Text>
      </Box>
    </ControlRow>
  );
}

export function ActionButton({ icon, label, onClick, disabled = false, busy = false, active = false }: {
  icon: ViewerIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  active?: boolean;
}) {
  return (
    <Box as="button" onClick={() => { if (!disabled) onClick(); }} aria-label={label}
      disabled={disabled} display="flex" alignItems="center" gap={1.5} px={2} py={1.5}
      borderRadius="md" bg="blackAlpha.600" border="1px solid"
      borderColor={active ? 'accent.400' : 'whiteAlpha.200'}
      color={disabled ? 'gray.600' : active ? 'accent.300' : 'gray.100'} opacity={disabled ? 0.5 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'} transition="all 0.15s"
      _hover={disabled ? {} : { bg: 'blackAlpha.800', borderColor: active ? 'accent.300' : 'whiteAlpha.400' }}>
      {busy ? <Spinner size="xs" /> : <ViewerIcon name={icon} size={14} />}
      <Text fontSize="xs" whiteSpace="nowrap">{label}</Text>
    </Box>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  group?: string;
  hint?: string;
};

// Portalled so the viewer's `overflow: hidden` cannot clip the open list.
export function OverlaySelect({ icon, value, options, onChange, minW = '150px', label, placeholder = '(none)' }: {
  icon: ViewerIconName;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  minW?: string;
  label?: string;
  // Shown when nothing matches `value`.
  placeholder?: string;
}) {
  const grouped = useMemo(() => {
    const out: { group: string | null; options: SelectOption[] }[] = [];
    for (const o of options) {
      const g = o.group ?? null;
      const last = out[out.length - 1];
      if (last && last.group === g) last.options.push(o);
      else out.push({ group: g, options: [o] });
    }
    return out;
  }, [options]);

  if (options.length === 0) return null;
  const current = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <Menu isLazy placement="bottom-start" autoSelect={false}>
      <Tooltip label={label ?? current} fontSize="xs" hasArrow openDelay={600}>
        <MenuButton as={Box} role="button" tabIndex={0} aria-label={label ?? current}
          bg="blackAlpha.700" borderRadius="md" px={2} py={1} minW={minW} maxW="100%"
          color="gray.200" cursor="pointer" border="1px solid" borderColor="whiteAlpha.200"
          _hover={{ bg: 'blackAlpha.800', borderColor: 'whiteAlpha.400' }}
          _focusVisible={{ outline: '2px solid', outlineColor: 'accent.400' }}
          transition="background 0.15s, border-color 0.15s">
          <Flex align="center" gap={1}>
            <ViewerIcon name={icon} size={16} />
            <Text fontSize="xs" whiteSpace="nowrap" overflow="hidden"
              textOverflow="ellipsis" flex="1" textAlign="left">{current}</Text>
            <Box color="whiteAlpha.600"><ViewerIcon name="chevron" size={14} /></Box>
          </Flex>
        </MenuButton>
      </Tooltip>
      <Portal>
        <MenuList bg="gray.800" borderColor="whiteAlpha.300" py={1} minW="220px"
          maxW="min(360px, calc(100vw - 24px))" maxH="min(60vh, 420px)" overflowY="auto"
          boxShadow="dark-lg" zIndex="popover">
          {grouped.map(({ group, options: opts }, gi) => (
            <Box key={group ?? `g${gi}`}>
              {group && (
                <Text px={3} pt={2} pb={1} fontSize="0.65rem" fontWeight="bold"
                  textTransform="uppercase" letterSpacing="wide" color="gray.500">
                  {group}
                </Text>
              )}
              {opts.map((o) => {
                const isActive = o.value === value;
                return (
                  <MenuItem key={o.value} onClick={() => onChange(o.value)}
                    bg={isActive ? 'whiteAlpha.200' : 'transparent'}
                    _hover={{ bg: 'whiteAlpha.300' }} _focus={{ bg: 'whiteAlpha.300' }}
                    fontSize="xs" py={1.5} px={3} display="block">
                    <Text color={isActive ? 'accent.300' : 'gray.100'}
                      fontWeight={isActive ? 'bold' : 'normal'}>{o.label}</Text>
                    {o.hint && (
                      <Text fontSize="0.65rem" color="gray.500" fontFamily="mono">{o.hint}</Text>
                    )}
                  </MenuItem>
                );
              })}
            </Box>
          ))}
        </MenuList>
      </Portal>
    </Menu>
  );
}

export type LayerItem = {
  slot: string;
  attachment: string;
  group: string;
};

export interface LayerPanelLabels {
  title: string;
  hidden: (n: number) => string;
  reset: string;
  showAll: string;
  close: string;
  filter: string;
  noMatch: string;
  count: (n: number) => string;
  showGroup: string;
  hideGroup: string;
  showGroupAria: (group: string) => string;
  hideGroupAria: (group: string) => string;
  showSlot: (slot: string) => string;
  hideSlot: (slot: string) => string;
}

export const LAYER_PANEL_LABELS: LayerPanelLabels = {
  title: 'Layers',
  hidden: (n) => `${n} hidden`,
  reset: 'Show all',
  showAll: 'Show all layers',
  close: 'Close layers',
  filter: 'Filter',
  noMatch: 'No match',
  count: (n) => `${n} layers`,
  showGroup: 'Show',
  hideGroup: 'Hide',
  showGroupAria: (group) => `Show all in ${group}`,
  hideGroupAria: (group) => `Hide all in ${group}`,
  showSlot: (slot) => `Show ${slot}`,
  hideSlot: (slot) => `Hide ${slot}`,
};

export function LayerPanel({ items, hidden, onSet, onReset, onClose, labels = LAYER_PANEL_LABELS }: {
  items: LayerItem[];
  hidden: ReadonlySet<string>;
  onSet: (slots: string[], hide: boolean) => void;
  onReset: () => void;
  onClose: () => void;
  labels?: LayerPanelLabels;
}) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, LayerItem[]>();
    for (const it of items) {
      if (q && !it.slot.toLowerCase().includes(q) && !it.attachment.toLowerCase().includes(q)) continue;
      const list = map.get(it.group);
      if (list) list.push(it);
      else map.set(it.group, [it]);
    }
    return Array.from(map.entries());
  }, [items, query]);

  const shown = groups.reduce((n, [, list]) => n + list.length, 0);

  return (
    <Box bg="blackAlpha.400" borderRadius="md" border="1px solid" borderColor="whiteAlpha.300"
      display="flex" flexDirection="column" overflow="hidden"
      maxH={{ base: '60vh', lg: '520px' }} minH={{ base: '240px', lg: '320px' }}>
      <Flex align="center" gap={2} px={2} py={1.5} borderBottom="1px solid" borderColor="whiteAlpha.200">
        <ViewerIcon name="layers" size={16} />
        <Text fontSize="xs" fontWeight="bold" color="gray.100" flex="1">
          {labels.title}
          {hidden.size ? ` — ${labels.hidden(hidden.size)}` : ''}
        </Text>
        {hidden.size > 0 && (
          <Box as="button" onClick={onReset} fontSize="0.65rem" color="accent.300"
            px={1.5} py={0.5} borderRadius="sm" _hover={{ bg: 'whiteAlpha.200' }}
            aria-label={labels.showAll}>{labels.reset}</Box>
        )}
        <Box as="button" onClick={onClose} color="gray.400" _hover={{ color: 'gray.100' }}
          aria-label={labels.close}><ViewerIcon name="close" size={12} /></Box>
      </Flex>

      <Box px={2} py={1.5}>
        <Input size="xs" placeholder={labels.filter} value={query} borderRadius="md"
          onChange={(e) => setQuery(e.target.value)} bg="whiteAlpha.100"
          borderColor="whiteAlpha.300" _placeholder={{ color: 'gray.500' }} />
      </Box>

      <VStack align="stretch" spacing={0} overflowY="auto" flex="1" px={1} pb={2}>
        {groups.map(([group, list]) => {
          const allHidden = list.every((it) => hidden.has(it.slot));
          return (
            <Box key={group}>
              <Flex align="center" gap={2} px={2} pt={2} pb={1}>
                <Text fontSize="0.65rem" fontWeight="bold" textTransform="uppercase"
                  letterSpacing="wide" color="gray.500" flex="1">{group}</Text>
                <Box as="button" fontSize="0.65rem" color="gray.400" _hover={{ color: 'accent.300' }}
                  aria-label={allHidden ? labels.showGroupAria(group) : labels.hideGroupAria(group)}
                  onClick={() => onSet(list.map((it) => it.slot), !allHidden)}>
                  {allHidden ? labels.showGroup : labels.hideGroup}
                </Box>
              </Flex>
              {list.map((it) => {
                const isHidden = hidden.has(it.slot);
                return (
                  <Flex key={it.slot} as="button" w="100%" align="center" gap={2.5}
                    px={2.5} py={2} minH="44px" borderRadius="sm" textAlign="left"
                    _hover={{ bg: 'whiteAlpha.100' }}
                    aria-label={isHidden ? labels.showSlot(it.slot) : labels.hideSlot(it.slot)}
                    aria-pressed={!isHidden}
                    onClick={() => onSet([it.slot], !isHidden)}>
                    <Box boxSize="16px" borderRadius="sm" border="1px solid" flexShrink={0}
                      borderColor={isHidden ? 'whiteAlpha.400' : 'accent.400'}
                      bg={isHidden ? 'transparent' : 'accent.400'} />
                    <Box minW={0} flex="1">
                      <Text fontSize="0.8rem" fontFamily="mono" color={isHidden ? 'gray.600' : 'gray.100'} noOfLines={1}>
                        {it.slot}
                      </Text>
                      {it.attachment !== it.slot && (
                        <Text fontSize="0.7rem" color="gray.600" noOfLines={1}>{it.attachment}</Text>
                      )}
                    </Box>
                  </Flex>
                );
              })}
            </Box>
          );
        })}
        {shown === 0 && <Text fontSize="xs" color="gray.500" p={3}>{labels.noMatch}</Text>}
      </VStack>

      <Divider borderColor="whiteAlpha.200" />
      <Text fontSize="0.6rem" color="gray.500" px={2} py={1}>{labels.count(items.length)}</Text>
    </Box>
  );
}

export interface ViewerShellProps {
  // The stage box: canvas host and any overlays, positioned against it.
  stage: ReactNode;
  // Side panel content; omitted or empty renders the stage alone.
  panel?: ReactNode;
  height: string | number;
  theater?: boolean;
  onTheaterChange?: (on: boolean) => void;
  labels?: { exitTheater: string };
}

// Stage beside a scrolling control panel on wide screens, stacked on phones; theatre mode fills the window with the stage.
export function ViewerShell({ stage, panel, height, theater = false, onTheaterChange, labels = { exitTheater: 'Exit theatre' } }: ViewerShellProps) {
  useEffect(() => {
    if (!theater || !onTheaterChange) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onTheaterChange(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [theater, onTheaterChange]);

  const hasPanel = !theater && Children.toArray(panel).length > 0;
  return (
    <Box {...(theater
      ? { position: 'fixed' as const, inset: 0, zIndex: 1400, bg: 'black', p: 2, display: 'flex', flexDirection: 'column' as const }
      : {})}>
      <Flex direction={{ base: 'column', lg: 'row' }} align="stretch" gap={2} h={theater ? '100%' : undefined}>
        <Box flex={{ base: '0 0 auto', lg: '1' }} minW={0} h={theater ? '100%' : height}
          bg="gray.800" borderRadius="md" overflow="hidden" position="relative"
          border="1px solid" borderColor="whiteAlpha.200">
          {stage}
          {theater && onTheaterChange && (
            <Box position="absolute" top={2} right={2} zIndex={3}>
              <ActionButton icon="close" label={labels.exitTheater} onClick={() => onTheaterChange(false)} />
            </Box>
          )}
        </Box>
        {hasPanel && (
          <VStack w={{ base: '100%', lg: '260px', xl: '300px' }} flexShrink={0} align="stretch"
            spacing={3} h={{ base: 'auto', lg: height }} maxH={{ base: '60vh', lg: height }}
            overflowY="auto" bg="gray.900" borderRadius="md" border="1px solid"
            borderColor="whiteAlpha.200" p={2}>
            {panel}
          </VStack>
        )}
      </Flex>
    </Box>
  );
}
