// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FallbackImage, Pager, SearchBox } from '../src/components';
import { createJsonLoader, useJson } from '../src/data';
import { listState, useUrlText, type ParamAdapter } from '../src/filters';
import { UrlTabs } from '../src/page';
import { LevelControl, WaveNav } from '../src/sections';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SearchBox with debounce', () => {
  it('a value set from outside cancels a pending debounced change', () => {
    vi.useFakeTimers();
    function Host() {
      const [q, setQ] = useState('');
      return (
        <>
          <SearchBox value={q} onChange={setQ} debounceMs={300} placeholder="Search" />
          <button onClick={() => setQ('')}>clear</button>
          <output data-testid="q">{q}</output>
        </>
      );
    }
    render(<Host />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'abc' } });
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByTestId('q').textContent).toBe('abc');
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'abcd' } });
    fireEvent.click(screen.getByText('clear'));
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByTestId('q').textContent).toBe('');
    expect((screen.getByLabelText('Search') as HTMLInputElement).value).toBe('');
  });
});

describe('useUrlText', () => {
  function urlAdapter() {
    const values: Record<string, string> = {};
    const adapter: ParamAdapter = {
      get: (k) => values[k] ?? null,
      set(u) {
        for (const [k, v] of Object.entries(u)) {
          if (v === null) delete values[k];
          else values[k] = v;
        }
      },
    };
    return { values, adapter };
  }

  it('follows a change made elsewhere (clear filters, back/forward)', () => {
    const { values, adapter } = urlAdapter();
    const { result, rerender } = renderHook(() => useUrlText(listState(adapter), true));
    act(() => result.current[1]('sword'));
    expect(values.q).toBe('sword');
    delete values.q;
    rerender();
    expect(result.current[0]).toBe('');
    values.q = 'shield';
    rerender();
    expect(result.current[0]).toBe('shield');
  });

  it('does not jump back while its own writes are still landing', () => {
    const { values, adapter } = urlAdapter();
    const writes: (string | null)[] = [];
    const lagging: ParamAdapter = { get: adapter.get, set: (u) => { writes.push(u.q ?? null); } };
    const { result, rerender } = renderHook(() => useUrlText(listState(lagging), true));
    act(() => result.current[1]('a'));
    act(() => result.current[1]('ab'));
    act(() => result.current[1]('abc'));
    values.q = 'a';
    rerender();
    expect(result.current[0]).toBe('abc');
    values.q = 'ab';
    rerender();
    expect(result.current[0]).toBe('abc');
    values.q = 'abc';
    rerender();
    expect(result.current[0]).toBe('abc');
    expect(writes).toEqual(['a', 'ab', 'abc']);
  });
});

describe('useJson', () => {
  it('never returns the previous name\'s data after the name changes', async () => {
    let resolveB: (v: Response) => void = () => {};
    const loader = createJsonLoader({
      urls: (n) => [n],
      fetch: (async (url: string) => (url === 'a'
        ? new Response(JSON.stringify({ id: 'a' }))
        : new Promise((r) => { resolveB = r; }))) as typeof fetch,
    });
    await loader.load('a');
    const seen: unknown[] = [];
    const { rerender } = renderHook(({ name }) => {
      const s = useJson<{ id: string }>(loader, name);
      seen.push({ name, data: s.data?.id ?? null, loading: s.loading });
      return s;
    }, { initialProps: { name: 'a' } });
    rerender({ name: 'b' });
    expect(seen.filter((s) => (s as { name: string }).name === 'b')).toEqual(
      seen.filter((s) => (s as { name: string }).name === 'b').map(() => ({ name: 'b', data: null, loading: true })),
    );
    resolveB(new Response(JSON.stringify({ id: 'b' })));
  });
});

describe('FallbackImage', () => {
  it('starts a new source list from its first source on the first render', () => {
    const { container, rerender } = render(<FallbackImage srcs={['/a.gif', '/a.png']} alt="" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/a.png');
    const observer = new MutationObserver(() => {});
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'], attributeOldValue: true });
    rerender(<FallbackImage srcs={['/b.gif', '/b.png']} alt="" />);
    const records = observer.takeRecords();
    observer.disconnect();
    // One src change straight from the old image to the new first source: no stop at /b.png, no placeholder swap.
    expect(records.map((r) => (r.type === 'attributes' ? r.oldValue : 'node swap'))).toEqual(['/a.png']);
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/b.gif');
  });
});

describe('out-of-range input', () => {
  it('WaveNav clamps an index past the last wave', () => {
    const onChange = vi.fn();
    render(<WaveNav count={3} index={5} onChange={onChange} />);
    expect(screen.getByText('Wave 3 / 3')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Previous wave'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('Pager shows a page past the end as the last page', () => {
    const onPage = vi.fn();
    render(<Pager page={9} pages={3} onPage={onPage} />);
    expect(screen.getByText('Page 3 / 3')).toBeTruthy();
    fireEvent.click(screen.getByText('‹ Prev'));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('UrlTabs keeps one tab reachable by keyboard when active matches none', () => {
    render(<UrlTabs tabs={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} active="gone" onChange={() => {}} />);
    expect(screen.getAllByRole('tab').map((t) => t.tabIndex)).toEqual([0, -1]);
  });

  it('LevelControl steps from min, not from zero', () => {
    const onChange = vi.fn();
    render(<LevelControl label="Grade" value={1} min={1} max={9} step={2} onChange={onChange} />);
    const box = screen.getByRole('spinbutton');
    fireEvent.change(box, { target: { value: '4' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect([3, 5]).toContain(onChange.mock.calls[0][0]);
    expect(onChange.mock.calls[0][0] % 2).toBe(1);
  });

  it('LevelControl keeps decimal steps exact', () => {
    const onChange = vi.fn();
    render(<LevelControl label="Speed" value={1} min={0.1} max={3} step={0.1} onChange={onChange} />);
    const box = screen.getByRole('spinbutton');
    fireEvent.change(box, { target: { value: '0.7' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(0.7);
  });

  it('LevelControl is disabled for an empty range or on request', () => {
    const { rerender } = render(<LevelControl label="Path" value={0} min={0} max={0} onChange={() => {}} />);
    expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('spinbutton') as HTMLInputElement).disabled).toBe(true);
    rerender(<LevelControl label="Path" value={1} min={0} max={5} onChange={() => {}} />);
    expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(false);
    rerender(<LevelControl label="Path" value={1} min={0} max={5} disabled onChange={() => {}} />);
    expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(true);
  });
});
