// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { SceneControls, SceneFrame, SceneTextBox, sceneTextSetting, useSceneStepper, type SceneLine } from '../src/scene';

afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); });

const LINES: (SceneLine | null)[] = [
  { name: 'Anna', text: 'one' },
  { name: 'Aria', text: 'two' },
  null,
  { text: 'four', lang: 'en' },
];

function Player({ allLines = true, onEnd, onClose, autoDelay }: {
  allLines?: boolean; onEnd?: () => void; onClose?: () => void; autoDelay?: (at: number) => number;
}) {
  const stepper = useSceneStepper({ count: LINES.length, onEnd, onClose, autoDelay });
  const [all, setAll] = useState(allLines);
  return (
    <div>
      <SceneFrame aspect="3 / 2" onAdvance={stepper.next}>
        <SceneTextBox lines={LINES} at={stepper.at} allLines={all} />
      </SceneFrame>
      <SceneControls stepper={stepper} count={LINES.length} allLines={all} onAllLines={setAll} slider onClose={onClose} />
    </div>
  );
}

describe('SceneTextBox', () => {
  it('keeps every line in the page and moves only the visible one', () => {
    const { container } = render(<Player />);
    const says = () => [...container.querySelectorAll('.hub-scene-say')];
    expect(says().map((e) => e.textContent)).toEqual(['Annaone', 'Ariatwo', 'four']);
    const first = says();
    expect(first[0].className).toContain('is-on');
    expect(first[0].getAttribute('aria-hidden')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }));
    expect(first[1].className).toContain('is-on');
    expect(first[0].className).not.toContain('is-on');
    // the same nodes: a translator's replacements survive stepping
    expect(says()).toEqual(first);
    expect(first[2].getAttribute('lang')).toBe('en');
  });

  it('hides the box on a step without text, and per line renders only the current line', () => {
    const { container } = render(<Player />);
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    expect(container.querySelector('.hub-scene-text')!.className).toContain('is-off');
    fireEvent.click(screen.getByText('Text: all lines'));
    expect(screen.getByText('Text: per line').getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByText('Back'));
    expect([...container.querySelectorAll('.hub-scene-say')].map((e) => e.textContent)).toEqual(['Ariatwo']);
  });
});

describe('useSceneStepper', () => {
  it('steps with the keyboard, ends and closes', () => {
    const onEnd = vi.fn();
    const onClose = vi.fn();
    render(<Player onEnd={onEnd} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'End' });
    expect(screen.getByText('4 / 4')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onEnd).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('3 / 4')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Home' });
    expect(screen.getByText('1 / 4')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto mode waits the given delay per step', () => {
    vi.useFakeTimers();
    render(<Player autoDelay={(at) => 1000 + at} />);
    fireEvent.click(screen.getByText('Auto'));
    act(() => { vi.advanceTimersByTime(999); });
    expect(screen.getByText('1 / 4')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByText('2 / 4')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1001); });
    expect(screen.getByText('3 / 4')).toBeTruthy();
  });

  it('the slider jumps to a step', () => {
    render(<Player />);
    fireEvent.change(screen.getByLabelText('Position in scene'), { target: { value: '3' } });
    expect(screen.getByText('4 / 4')).toBeTruthy();
  });
});

describe('sceneTextSetting', () => {
  it('reads earlier saves of booleans and bare 0/1', () => {
    localStorage.setItem('a', 'false');
    localStorage.setItem('b', '0');
    localStorage.setItem('c', '1');
    expect(sceneTextSetting('a').get()).toBe(false);
    expect(sceneTextSetting('b').get()).toBe(false);
    expect(sceneTextSetting('c').get()).toBe(true);
    expect(sceneTextSetting('d').get()).toBe(true);
    expect(sceneTextSetting('e', false).get()).toBe(false);
  });
});
