// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BackupPanel, BannerCard, ChangelogDialog, formatChance, IconPreview, LevelControl, Lightbox, Modal, ProgressBar, RewardGrid,
  StageCard, WaveNav,
} from '../src/sections';
import { MetaChip } from '../src/page';

afterEach(cleanup);

describe('stage parts', () => {
  it('BannerCard and StageCard are links with their parts', () => {
    render(
      <div>
        <BannerCard href="/stages?group=7" title="Summer Event" badge="Live" window="08/01 – 08/15" count="12 stages" highlight />
        <StageCard href="/stage?id=3" title="Beach 3" id="30103"
          meta={<><MetaChip label="Lv" value="40" /><MetaChip label="Stamina" value="12" /></>}
          previews={<IconPreview label="Enemies"><img alt="a" /><img alt="b" /></IconPreview>} />
      </div>,
    );
    expect(screen.getByText('Summer Event').closest('a')!.className).toContain('hub-banner-card--highlight');
    expect(screen.getByText('Live').className).toContain('hub-badge');
    expect(screen.getByText('Beach 3').closest('a')!.getAttribute('href')).toBe('/stage?id=3');
    expect(screen.getByText('Stamina')).toBeTruthy();
  });

  it('IconPreview caps and counts the rest', () => {
    render(<IconPreview label="Drops" max={2} count={7}><i>1</i><i>2</i><i>3</i></IconPreview>);
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.getByText('+5')).toBeTruthy();
  });

  it('RewardGrid shows amount and chance', () => {
    render(<RewardGrid items={[{ icon: <img alt="" />, name: 'Gold', amount: 500, chance: 0.125 }, { icon: null, name: 'Gem', href: '/item?id=2' }]} />);
    expect(screen.getByText('×500')).toBeTruthy();
    expect(screen.getByText('12.5%')).toBeTruthy();
    expect(screen.getByText('Gem').closest('a')!.getAttribute('href')).toBe('/item?id=2');
  });

  it('formatChance picks sensible precision', () => {
    expect([formatChance(1), formatChance(0.5), formatChance(0.125), formatChance(0.0035)]).toEqual(['100%', '50%', '12.5%', '0.35%']);
  });

  it('WaveNav clamps at both ends and hides for one wave', () => {
    const onChange = vi.fn();
    const { rerender, container } = render(<WaveNav count={3} index={0} onChange={onChange} />);
    expect(screen.getByText('Wave 1 / 3')).toBeTruthy();
    expect((screen.getByLabelText('Previous wave') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Next wave'));
    expect(onChange).toHaveBeenCalledWith(1);
    rerender(<WaveNav count={1} index={0} onChange={onChange} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('detail parts', () => {
  it('LevelControl clamps typed values on Enter and blur', () => {
    const onChange = vi.fn();
    render(<LevelControl label="Level" value={10} min={1} max={90} onChange={onChange} />);
    const box = screen.getByRole('spinbutton');
    fireEvent.change(box, { target: { value: '200' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(90);
    fireEvent.change(box, { target: { value: '' } });
    fireEvent.blur(box);
    expect((box as HTMLInputElement).value).toBe('10');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '45' } });
    expect(onChange).toHaveBeenLastCalledWith(45);
  });

  it('ProgressBar exposes progress', () => {
    render(<ProgressBar label="Owned" value={30} max={120} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
    expect(screen.getByText('30 / 120')).toBeTruthy();
  });
});

describe('Modal and Lightbox', () => {
  it('Modal closes on Escape, locks scroll and restores focus', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const { rerender } = render(<Modal open onClose={onClose} title="What's new"><p>body</p></Modal>);
    expect(screen.getByRole('dialog', { name: "What's new" })).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    rerender(<Modal open={false} onClose={onClose}><p>body</p></Modal>);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('Lightbox steps with arrow keys and wraps', () => {
    const onIndex = vi.fn();
    render(<Lightbox items={[{ srcs: ['/a.png'], label: 'Art' }, { srcs: ['/b.png'], label: 'Sprite' }]} index={0} onIndex={onIndex} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Art' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(onIndex).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(onIndex).toHaveBeenLastCalledWith(1);
    expect(screen.getByText('1 / 2')).toBeTruthy();
  });

  it('ChangelogDialog lists the latest release', () => {
    render(<ChangelogDialog open onClose={() => {}} releases={[
      { date: '2026-10-11', title: 'Stage pages', entries: [{ kind: 'new', text: 'Breadcrumbs' }] },
      { date: '2026-10-01', entries: [{ text: 'Older' }] },
    ]} />);
    expect(screen.getByText('2026-10-11')).toBeTruthy();
    expect(screen.queryByText('Older')).toBeNull();
  });
});

describe('BackupPanel', () => {
  it('reports import errors and successes', async () => {
    const onImportCode = vi.fn(async (code: string) => (code.startsWith('AIGC3.') ? null : 'Not an Aigis code'));
    render(<BackupPanel code="AIGC3.abc" onImportCode={onImportCode} onExportFile={() => {}} onImportFile={() => {}} />);
    expect((screen.getByDisplayValue('AIGC3.abc') as HTMLInputElement).readOnly).toBe(true);
    const paste = screen.getByLabelText('Paste a restore code');
    fireEvent.change(paste, { target: { value: 'nope' } });
    await act(async () => { fireEvent.click(screen.getByText('Restore')); });
    expect(screen.getByRole('status').textContent).toBe('Not an Aigis code');
    fireEvent.change(paste, { target: { value: 'AIGC3.xyz' } });
    await act(async () => { fireEvent.click(screen.getByText('Restore')); });
    expect(screen.getByRole('status').textContent).toBe('Restored.');
    expect(screen.getByText('Export file')).toBeTruthy();
  });
});
