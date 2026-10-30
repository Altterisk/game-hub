// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, Gate, NavMenu, NotFound, SiteShell, routerLinks } from '../src/shell';
import { createSetting, saveBlob } from '../src/persist';
import { LiveBadge, formatRemaining, phaseOf, untilNext, useNow } from '../src/time';
import { createPlayer } from '../src/audio';
import { RichText, colorTag, ignoreTag, pickLang, replaceTag, resetTag, tokenize } from '../src/text';
import { StoryLines, VoiceLineList } from '../src/story';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function Boom({ fail }: { fail: boolean }) {
  if (fail) throw new Error('boom');
  return <p>fine</p>;
}

describe('ErrorBoundary', () => {
  it('shows a retry fallback and clears on retry or a new resetKey', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ErrorBoundary resetKey="/a"><Boom fail /></ErrorBoundary>);
    expect(screen.getByText('Something went wrong on this page.')).toBeTruthy();
    rerender(<ErrorBoundary resetKey="/b"><Boom fail={false} /></ErrorBoundary>);
    expect(screen.getByText('fine')).toBeTruthy();
    vi.restoreAllMocks();
  });
});

describe('SiteShell', () => {
  it('renders bar, main, footer legal line and catches page errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<SiteShell game="lo"><Boom fail /></SiteShell>);
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main').id).toBe('hub-main');
    expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#hub-main');
    expect(screen.getByText(/property of Valofe/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/Something went wrong/);
    vi.restoreAllMocks();
  });
});

describe('NavMenu', () => {
  const items = [
    { href: '/a', label: 'Alpha' },
    { href: '/b', label: 'Beta', active: true },
  ];

  it('opens a portalled list, moves focus with arrows and closes on Escape', () => {
    render(<NavMenu label="Etc" items={items} />);
    const button = screen.getByRole('button', { name: /Etc/ });
    expect(button.getAttribute('aria-current')).toBe('page');
    fireEvent.click(button);
    const alpha = screen.getByRole('link', { name: 'Alpha' });
    expect(document.activeElement).toBe(alpha);
    fireEvent.keyDown(alpha, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Beta' }));
    expect(screen.getByRole('link', { name: 'Beta' }).getAttribute('aria-current')).toBe('page');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('link', { name: 'Alpha' })).toBeNull();
  });

  it('can show the active label and uses the site link', () => {
    const Link = ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} data-to={to} {...rest}>{children}</a>;
    render(<NavMenu label="Etc" items={items} showActiveLabel renderLink={routerLinks(Link, 'to')} />);
    fireEvent.click(screen.getByRole('button', { name: /Beta/ }));
    expect(screen.getByRole('link', { name: 'Alpha' }).getAttribute('data-to')).toBe('/a');
  });
});

describe('NotFound', () => {
  it('links home', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'Go to the home page' }).getAttribute('href')).toBe('/');
  });
});

describe('Gate', () => {
  it('covers the page until accepted, then remembers', () => {
    const { unmount } = render(<Gate storageKey="k" title="Adults only" acceptLabel="Enter" page={<p>page</p>}><p>body</p></Gate>);
    expect(screen.getByText('page')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Enter' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();
    render(<Gate storageKey="k" title="t" acceptLabel="Enter" page={null}>b</Gate>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('createSetting', () => {
  it('shares one value across readers and persists it', () => {
    const lang = createSetting<'en' | 'ko'>({ key: 's.lang', initial: 'en', sanitize: (r) => (r === 'ko' ? 'ko' : 'en') });
    const a = renderHook(() => lang.use());
    const b = renderHook(() => lang.use());
    act(() => a.result.current[1]('ko'));
    expect(b.result.current[0]).toBe('ko');
    expect(JSON.parse(localStorage.getItem('s.lang')!)).toEqual({ __v: 1, data: 'ko' });
  });

  it('reads a bare string written before adoption', () => {
    localStorage.setItem('s.dub', 'kr');
    const dub = createSetting({ key: 's.dub', initial: 'jp', sanitize: (r) => (r === 'kr' || r === 'jp' ? r : 'jp') });
    expect(dub.get()).toBe('kr');
  });
});

describe('saveBlob', () => {
  it('clicks a download link', () => {
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    saveBlob(new Blob(['a']), 'a.txt');
    expect(click).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
    click.mockRestore();
  });
});

describe('time', () => {
  const now = Date.parse('2026-10-30T12:00:00Z');
  it('phases, including date-only end days and exchange', () => {
    expect(phaseOf({ start: '2026-11-01', end: '2026-11-10' }, now)).toBe('upcoming');
    expect(phaseOf({ start: '2026-10-01', end: '2026-10-30' }, now)).toBe('running');
    expect(phaseOf({ start: '2026-10-01', end: '2026-10-29' }, now)).toBe('ended');
    expect(phaseOf({ start: '2026-10-01', end: '2026-11-10', stagesEnd: '2026-10-29' }, now)).toBe('exchange');
    expect(phaseOf({}, now)).toBe('running');
  });

  it('time to the next change and formatting', () => {
    expect(untilNext({ end: '2026-10-30T13:00:00Z' }, now)).toBe(3_600_000);
    expect(untilNext({ end: '2026-10-29' }, now)).toBeNull();
    expect(formatRemaining(3 * 86_400_000 + 4 * 3_600_000)).toBe('3d 4h');
    expect(formatRemaining(65 * 60_000, { d: '일', h: '시간', m: '분' })).toBe('1시간 5분');
  });

  beforeEach(() => vi.useRealTimers());

  it('LiveBadge shows the phase on the client', () => {
    render(<LiveBadge window={{ start: '2000-01-01', end: '2999-01-01' }} />);
    expect(screen.getByText('Running').className).toContain('hub-live--running');
  });
});

describe('createPlayer', () => {
  it('plays one clip at a time and tracks it', async () => {
    const plays: string[] = [];
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      plays.push(this.src);
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const player = createPlayer();
    const { result } = renderHook(() => player.useNowPlaying());
    let slow!: (v: string) => void;
    const first = player.play('a', () => new Promise((r) => { slow = r; }));
    const second = player.play('b', async () => 'https://x/b.ogg');
    await act(async () => { await second; });
    slow('https://x/a.ogg');
    expect(await first).toBe(false);
    expect(result.current).toBe('b');
    expect(plays).toEqual(['https://x/b.ogg']);
    await act(async () => { await player.toggle('b', async () => null); });
    expect(result.current).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('text', () => {
  const LO = [ignoreTag(/\[c\]/), resetTag(/\[\/c\]|\[-\]/), colorTag(/\[([0-9a-fA-F]{6})\]/)];

  it('applies running colour styles like the LOMapR parser', () => {
    const runs = tokenize('a [c][ff0000]red[-] b', LO);
    expect(runs).toEqual([
      { text: 'a ', style: {} },
      { text: 'red', style: { bold: true, color: '#ff0000' } },
      { text: ' b', style: {} },
    ]);
  });

  it('replace rules recurse (ruby, player name)', () => {
    const rules = [
      replaceTag(/\{player\}/, (_m, _i, k) => <b key={k}>Commander</b>),
      replaceTag(/<ruby=([^>]*)>([\s\S]*?)<\/ruby>/, (m, inner, k) => <ruby key={k}>{inner(m[2])}<rt>{m[1]}</rt></ruby>),
    ];
    const { container } = render(<p><RichText text="Hi {player}, <ruby=かん>漢{player}</ruby>!" rules={rules} /></p>);
    expect(container.innerHTML).toBe('<p>Hi <b>Commander</b>, <ruby>漢<b>Commander</b><rt>かん</rt></ruby>!</p>');
  });

  it('pickLang falls back in order', () => {
    expect(pickLang({ en: '', ko: '한' }, 'en', 'ko')).toBe('한');
    expect(pickLang({ ja: 'j' } as Record<string, string>, 'en')).toBe('j');
    expect(pickLang(null, 'en')).toBe('');
  });
});

describe('StoryLines and VoiceLineList', () => {
  it('renders each line kind and nested options', () => {
    render(<StoryLines lines={[
      { kind: 'place', text: 'Base' },
      { kind: 'say', name: 'Alice', nameHref: '/u/1', text: 'Hello' },
      { kind: 'options', options: [{ text: 'Yes', lines: [{ kind: 'narration', text: 'She nods.' }] }] },
    ]} />);
    expect(screen.getByText('— Base —')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Alice' }).getAttribute('href')).toBe('/u/1');
    expect(screen.getByText('She nods.')).toBeTruthy();
    expect(screen.getByText('Choice')).toBeTruthy();
  });

  it('empty script', () => {
    render(<StoryLines lines={[]} empty="Nothing" />);
    expect(screen.getByText('Nothing')).toBeTruthy();
  });

  it('voice rows toggle play/stop', () => {
    function Harness() {
      const [playing, setPlaying] = useState<string | null>(null);
      return <VoiceLineList items={[{ id: 'a', tag: 'Join', text: 'Hi' }, { id: 'b', tag: 'Win', available: false }]}
        playing={playing} onPlay={setPlaying} onStop={() => setPlaying(null)} />;
    }
    render(<Harness />);
    expect((screen.getByRole('button', { name: 'Play Win' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Play Join' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByRole('button', { name: 'Play Join' })).toBeTruthy();
  });
});

describe('useNow', () => {
  it('subscribes once and does not re-render without a tick', async () => {
    let tick = 1_700_000_000_000;
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => (tick += 1));
    let renders = 0;
    function Clock() {
      renders += 1;
      const now = useNow(60_000);
      return <span>{now === null ? 'none' : 'set'}</span>;
    }
    render(<Clock />);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.getByText('set')).toBeTruthy();
    spy.mockRestore();
    expect(renders).toBeLessThanOrEqual(3);
  });
});