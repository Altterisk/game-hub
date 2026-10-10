// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckboxGroup, CopyButton, FallbackImage, FilterChip, Pager, SearchBox } from '../src/components';

afterEach(cleanup);

describe('FilterChip', () => {
  it('reflects two- and three-state modes', () => {
    const onClick = vi.fn();
    render(
      <div>
        <FilterChip onClick={onClick} active>On</FilterChip>
        <FilterChip onClick={onClick} mode={-1}>Excluded</FilterChip>
        <FilterChip onClick={onClick}>Off</FilterChip>
      </div>,
    );
    expect(screen.getByText('On').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Excluded').className).toContain('hub-chip--exclude');
    expect(screen.getByText('Excluded').getAttribute('aria-pressed')).toBe('mixed');
    fireEvent.click(screen.getByText('Off'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CheckboxGroup', () => {
  it('toggles values and hides when empty', () => {
    const onToggle = vi.fn();
    render(
      <CheckboxGroup title="Rarity" options={[{ value: 'ssr', label: 'SSR' }, { value: 'sr', label: 'SR' }]} selected={['sr']} onToggle={onToggle} />,
    );
    expect((screen.getByLabelText('SR') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText('SSR'));
    expect(onToggle).toHaveBeenCalledWith('ssr');
    cleanup();
    expect(render(<CheckboxGroup title="x" options={[]} selected={[]} onToggle={onToggle} />).container.innerHTML).toBe('');
  });
});

describe('Pager', () => {
  it('is 1-based, clamps, and jumps on Enter', () => {
    const onPage = vi.fn();
    render(<Pager page={1} pages={5} onPage={onPage} />);
    expect((screen.getByText('‹ Prev') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Last »'));
    expect(onPage).toHaveBeenLastCalledWith(5);
    const jump = screen.getByLabelText('Go to page');
    fireEvent.change(jump, { target: { value: '99' } });
    fireEvent.keyDown(jump, { key: 'Enter' });
    expect(onPage).toHaveBeenLastCalledWith(5);
  });

  it('renders nothing for one page', () => {
    expect(render(<Pager page={1} pages={1} onPage={() => {}} />).container.innerHTML).toBe('');
  });
});

describe('FallbackImage', () => {
  it('steps through sources, then shows the placeholder', () => {
    const { container } = render(<FallbackImage srcs={['/a.gif', null, '/a.png']} alt="sprite" width={56} height={56} />);
    const img = () => container.querySelector('img');
    expect(img()!.getAttribute('src')).toBe('/a.gif');
    fireEvent.error(img()!);
    expect(img()!.getAttribute('src')).toBe('/a.png');
    fireEvent.error(img()!);
    expect(img()).toBeNull();
    expect(container.querySelector('.hub-img--missing')).not.toBeNull();
  });
});

describe('SearchBox', () => {
  it('reports changes and clears', () => {
    const onChange = vi.fn();
    render(<SearchBox value="val" onChange={onChange} placeholder="Search units" />);
    fireEvent.change(screen.getByLabelText('Search units'), { target: { value: 'valk' } });
    expect(onChange).toHaveBeenLastCalledWith('valk');
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});

describe('CopyButton', () => {
  it('copies lazily built values and shows the result', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CopyButton value={async () => 'https://x/#/dps?z=abc'} label="Share" />);
    await act(async () => { fireEvent.click(screen.getByText('Share')); });
    expect(writeText).toHaveBeenCalledWith('https://x/#/dps?z=abc');
    expect(screen.getByText('Copied')).toBeTruthy();
  });
});
