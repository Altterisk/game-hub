// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Accordion, AccordionButton, AccordionItem, AccordionPanel, Badge, Box, Button, Checkbox, HStack, Input, InputGroup, InputLeftElement,
  Menu, MenuButton, MenuItem, MenuList, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Select, SimpleGrid, Stack, Tab, TabList,
  TabPanel, TabPanels, Tabs, Tag, TagLabel, Text, Tooltip, splitStyleProps, useBreakpointValue,
} from '../src/ui';

afterEach(cleanup);

describe('style props', () => {
  it('resolves theme scales and colours inline', () => {
    const { style, className, rest } = splitStyleProps({ p: 4, mt: -2, color: 'gray.500', bg: 'accent.300', fontSize: 'sm', w: 'full', borderWidth: 1, borderRadius: 'md', onClick: 1 });
    expect(style).toMatchObject({
      padding: '1rem', marginTop: 'calc(0.5rem * -1)', color: 'var(--ui-c-gray-500)', background: 'var(--ui-c-accent-300)',
      fontSize: '0.875rem', width: '100%', borderWidth: '1px', borderRadius: '10px',
    });
    expect(className).toBe('');
    expect(rest).toEqual({ onClick: 1 });
  });

  it('turns responsive values into breakpoint vars and classes', () => {
    const { style, className } = splitStyleProps({ display: { base: 'none', md: 'flex' }, px: [2, null, 6] });
    expect(className.split(' ').sort()).toEqual(['r-display-base', 'r-display-md', 'r-px-base', 'r-px-md']);
    expect(style).toMatchObject({ '--r-display-base': 'none', '--r-display-md': 'flex', '--r-px-base': '0.5rem', '--r-px-md': '1.5rem' });
  });

  it('aliases share classes; hover becomes vars', () => {
    const { style, className } = splitStyleProps({ paddingX: { base: 1 }, _hover: { bg: 'whiteAlpha.200', textDecoration: 'none' } });
    expect(className).toContain('r-px-base');
    expect(className).toContain('h-bg');
    expect(style).toMatchObject({ '--h-bg': 'var(--ui-c-whiteAlpha-200)', '--h-textDecoration': 'none' });
  });

  it('noOfLines clamps', () => {
    render(<Text noOfLines={2}>long</Text>);
    const p = screen.getByText('long');
    expect(p.tagName).toBe('P');
    expect(p.className).toContain('ui-clamp');
    expect(p.style.getPropertyValue('--ui-clamp')).toBe('2');
  });

  it('as renders another element and keeps unknown props', () => {
    render(<Box as="a" href="/x" p={2} data-x="1">link</Box>);
    const a = screen.getByRole('link', { name: 'link' });
    expect(a.getAttribute('href')).toBe('/x');
    expect(a.getAttribute('data-x')).toBe('1');
    expect(a.style.padding).toBe('0.5rem');
  });
});

describe('layout', () => {
  it('stacks space children through vars by direction', () => {
    const { container, rerender } = render(<Stack spacing={4}><i /><i /></Stack>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('ui-stack');
    expect(el.className).toContain('ui-sv-4-base');
    rerender(<HStack spacing={2}><i /></HStack>);
    const h = container.firstElementChild as HTMLElement;
    expect(h.className).toContain('ui-sh-2-base');
    expect(h.style.alignItems).toBe('center');
  });

  it('responsive direction switches spacing classes; default spacing is token 2', () => {
    const { container } = render(<Stack direction={{ base: 'column', md: 'row' }}><i /></Stack>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('ui-sv-2-base');
    expect(el.className).toContain('ui-sh-2-md');
  });

  it('simple grid columns', () => {
    const { container } = render(<SimpleGrid columns={3} spacing={2} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect(el.style.gap).toBe('0.5rem');
  });
});

describe('themed controls', () => {
  it('button gets theme classes and disabled state', () => {
    render(<Button colorScheme="blue" size="sm" isDisabled>Go</Button>);
    const b = screen.getByRole('button', { name: 'Go' }) as HTMLButtonElement;
    expect(b.className).toContain('ui-button');
    expect(b.className).toContain('ui-button--size-sm');
    expect(b.className).toContain('ui-button--solid-blue');
    expect(b.disabled).toBe(true);
    expect(b.type).toBe('button');
  });

  it('badge defaults to the hub accent scheme', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New').className).toContain('ui-badge--subtle-accent');
  });

  it('tag parts share modifiers', () => {
    render(<Tag size="lg"><TagLabel>T</TagLabel></Tag>);
    const label = screen.getByText('T');
    expect(label.className).toContain('ui-tag__label');
    expect(label.className).toContain('ui-tag--size-lg');
  });

  it('input group pads for an element', () => {
    render(<InputGroup size="sm"><InputLeftElement>@</InputLeftElement><Input aria-label="q" onChange={(e) => e.target.value} /></InputGroup>);
    expect(screen.getByLabelText('q').style.paddingInlineStart).toBe('2rem');
  });

  it('select renders a placeholder option and icon', () => {
    render(<Select aria-label="s" placeholder="Pick"><option value="a">A</option></Select>);
    expect((screen.getByLabelText('s') as HTMLSelectElement).options[0].text).toBe('Pick');
  });

  it('checkbox reflects checked state', () => {
    function H() {
      const [on, setOn] = useState(false);
      return <Checkbox isChecked={on} onChange={(e) => setOn(e.target.checked)}>Show</Checkbox>;
    }
    render(<H />);
    const box = screen.getByLabelText('Show') as HTMLInputElement;
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(box.closest('label')!.hasAttribute('data-checked')).toBe(true);
  });

  it('number input steps and clamps', () => {
    const onChange = vi.fn();
    function H() {
      const [v, setV] = useState('9');
      return (
        <NumberInput value={v} min={1} max={10} onChange={(s, n) => { setV(s); onChange(n); }}>
          <NumberInputField aria-label="n" />
          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
        </NumberInput>
      );
    }
    render(<H />);
    const field = screen.getByLabelText('n');
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(10);
    fireEvent.change(field, { target: { value: '50' } });
    fireEvent.blur(field);
    expect((field as HTMLInputElement).value).toBe('10');
  });
});

describe('overlays', () => {
  it('menu opens, focuses the first item, closes on select', () => {
    const pick = vi.fn();
    render(<Menu><MenuButton>Open</MenuButton><MenuList><MenuItem onClick={pick}>One</MenuItem><MenuItem>Two</MenuItem></MenuList></Menu>);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const one = screen.getByRole('menuitem', { name: 'One' });
    expect(document.activeElement).toBe(one);
    fireEvent.keyDown(one, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Two' }));
    fireEvent.click(one);
    expect(pick).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('modal traps escape, labels itself, restores focus', async () => {
    vi.useFakeTimers();
    function H() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Launch</button>
          <Modal isOpen={open} onClose={() => setOpen(false)}>
            <ModalOverlay />
            <ModalContent><ModalHeader>Title</ModalHeader><ModalCloseButton /><ModalBody>Body</ModalBody></ModalContent>
          </Modal>
        </>
      );
    }
    render(<H />);
    const launch = screen.getByRole('button', { name: 'Launch' });
    launch.focus();
    fireEvent.click(launch);
    act(() => { vi.runAllTimers(); });
    const dialog = screen.getByRole('dialog', { name: 'Title' });
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(launch);
    vi.useRealTimers();
  });

  it('tooltip shows on hover', async () => {
    vi.useFakeTimers();
    render(<Tooltip label="Hint"><button type="button">Hover</button></Tooltip>);
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Hover' }));
    act(() => { vi.runAllTimers(); });
    expect(screen.getByRole('tooltip').textContent).toBe('Hint');
    vi.useRealTimers();
  });
});

describe('disclosure', () => {
  it('tabs switch by click and arrow keys', () => {
    render(
      <Tabs>
        <TabList><Tab>A</Tab><Tab>B</Tab></TabList>
        <TabPanels><TabPanel>pa</TabPanel><TabPanel>pb</TabPanel></TabPanels>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'A' }).getAttribute('aria-selected')).toBe('true');
    const a = screen.getByRole('tab', { name: 'A' });
    a.focus();
    fireEvent.keyDown(a, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'B' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('pb').hidden).toBe(false);
    expect(screen.getByText('pa').hidden).toBe(true);
  });

  it('accordion toggles a panel', () => {
    render(<Accordion allowToggle><AccordionItem><AccordionButton>Head</AccordionButton><AccordionPanel>Inside</AccordionPanel></AccordionItem></Accordion>);
    const btn = screen.getByRole('button', { name: 'Head' });
    expect(screen.getByText('Inside').hidden).toBe(true);
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Inside').hidden).toBe(false);
  });
});

describe('hooks', () => {
  it('useBreakpointValue reads matchMedia', () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('48em') || q.includes('30em'), addEventListener() {}, removeEventListener() {} })) as any;
    function H() { return <span>{useBreakpointValue({ base: 'one', md: 'two' })}</span>; }
    render(<H />);
    expect(screen.getByText('two')).toBeTruthy();
  });
});
