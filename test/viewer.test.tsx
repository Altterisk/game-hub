// @vitest-environment jsdom
import { ChakraProvider } from '@chakra-ui/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlSection, LayerPanel, SegmentedControl, ToggleRow, ViewerShell } from '../src/viewer';

afterEach(cleanup);

const wrap = (ui: ReactNode) => render(<ChakraProvider>{ui}</ChakraProvider>);

describe('viewer controls', () => {
  it('drops a section with no rows', () => {
    wrap(<div><ControlSection title="Empty">{false}</ControlSection><ControlSection title="Shown"><span>row</span></ControlSection></div>);
    expect(screen.queryByText('Empty')).toBeNull();
    expect(screen.getByText('Shown')).toBeTruthy();
  });

  it('reports the pressed segment and ignores the active one', () => {
    const onChange = vi.fn();
    wrap(<SegmentedControl value="a" onChange={onChange}
      options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', image: '/b.png' }]} />);
    expect(screen.getByRole('button', { name: 'A' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('spells out toggle state with translatable labels', () => {
    const onChange = vi.fn();
    wrap(<ToggleRow label="Zones" value={false} onChange={onChange} labels={{ on: '켬', off: '끔' }} />);
    expect(screen.getByText('끔')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Zones' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('hides a whole layer group and filters rows', () => {
    const onSet = vi.fn();
    wrap(<LayerPanel hidden={new Set()} onSet={onSet} onReset={() => {}} onClose={() => {}}
      items={[
        { slot: 'hair_front', attachment: 'hair_front', group: 'Hair' },
        { slot: 'hair_back', attachment: 'hair_back', group: 'Hair' },
        { slot: 'eye_L', attachment: 'eye_L_open', group: 'Face' },
      ]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hide all in Hair' }));
    expect(onSet).toHaveBeenCalledWith(['hair_front', 'hair_back'], true);
    fireEvent.change(screen.getByPlaceholderText('Filter'), { target: { value: 'eye' } });
    expect(screen.queryByText('hair_front')).toBeNull();
    expect(screen.getByText('eye_L_open')).toBeTruthy();
  });

  it('leaves theatre mode on Escape and hides the panel while in it', () => {
    const onTheaterChange = vi.fn();
    const { rerender } = wrap(<ViewerShell height="400px" stage={<div>stage</div>} panel={<div>panel</div>} />);
    expect(screen.getByText('panel')).toBeTruthy();
    rerender(<ChakraProvider><ViewerShell height="400px" theater onTheaterChange={onTheaterChange}
      stage={<div>stage</div>} panel={<div>panel</div>} /></ChakraProvider>);
    expect(screen.queryByText('panel')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onTheaterChange).toHaveBeenCalledWith(false);
  });
});
