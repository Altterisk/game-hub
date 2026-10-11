// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listState, useUrlText, type ParamAdapter } from '../src/filters';
import {
  Breadcrumbs, EmptyState, EntityTile, FilterPanel, ListToolbar, LoadState, MetaChip, PageHeader, Panel, StatRows, tabParam,
  UrlTabs, type RenderLink,
} from '../src/page';

afterEach(cleanup);

function memory(init: Record<string, string> = {}): ParamAdapter & { values: Record<string, string> } {
  const values = { ...init };
  return {
    values,
    get: (k) => values[k] ?? null,
    set(u) {
      for (const [k, v] of Object.entries(u)) {
        if (v === null) delete values[k];
        else values[k] = v;
      }
    },
  };
}

const routerLink: RenderLink = ({ href, children, ...rest }) => <a data-router="yes" href={`#${href}`} {...rest}>{children}</a>;

describe('Breadcrumbs', () => {
  it('links every item but the last, through renderLink', () => {
    render(<Breadcrumbs renderLink={routerLink} items={[{ label: 'Stages', href: '/stages' }, { label: 'Event', href: '/stages?g=1' }, { label: 'Stage 3' }]} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
    expect(screen.getByText('Stages').getAttribute('data-router')).toBe('yes');
    expect(screen.getByText('Stage 3').getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Stage 3').tagName).toBe('SPAN');
  });

  it('never links the last item even with an href', () => {
    render(<Breadcrumbs items={[{ label: 'Only', href: '/x' }]} />);
    expect(screen.getByText('Only').tagName).toBe('SPAN');
  });
});

describe('PageHeader, MetaChip, Panel, StatRows', () => {
  it('renders the parts with the requested heading level', () => {
    render(
      <PageHeader level={2} title="Valkyrie" id="#101" subtitle="ヴァルキリー" art={<img alt="" src="/a.png" />}
        meta={<MetaChip label="Rarity" value="SSR" href="/units?rarity=ssr" renderLink={routerLink} />}
        actions={<button>Share</button>} />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Valkyrie' })).toBeTruthy();
    expect(screen.getByText('#101')).toBeTruthy();
    expect(screen.getByText('SSR').closest('a')!.getAttribute('href')).toBe('#/units?rarity=ssr');
  });

  it('Panel shows title, note and actions; StatRows is a dl', () => {
    const { container } = render(
      <Panel title="Stats" note="At max level" actions={<button>Copy</button>}>
        <StatRows rows={[{ label: 'HP', value: 2480 }, { label: 'ATK', value: 812, id: 'atk' }]} />
      </Panel>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Stats' })).toBeTruthy();
    expect(screen.getByText('At max level')).toBeTruthy();
    expect(container.querySelectorAll('dl dt').length).toBe(2);
    expect(screen.getByText('2480').tagName).toBe('DD');
  });
});

describe('UrlTabs + tabParam', () => {
  const tabs = [
    { id: 'stats', label: 'Stats' },
    { id: 'skills', label: 'Skills', count: 3 },
    { id: 'tokens', label: 'Tokens', hidden: true },
    { id: 'quotes', label: 'Quotes' },
  ];

  it('defaults to the first visible tab, keeps the default out of the URL, never resets page', () => {
    const a = memory({ page: '4', tab: 'tokens' });
    const [active, setActive] = tabParam(a, tabs);
    expect(active).toBe('stats');
    setActive('quotes');
    expect(a.values).toEqual({ page: '4', tab: 'quotes' });
    expect(tabParam(a, tabs)[0]).toBe('quotes');
    tabParam(a, tabs)[1]('stats');
    expect(a.values).toEqual({ page: '4' });
  });

  it('drops hidden tabs and moves with the keyboard', () => {
    const onChange = vi.fn();
    render(<UrlTabs tabs={tabs} active="stats" onChange={onChange} label="Unit" idBase="u" />);
    const shown = screen.getAllByRole('tab');
    expect(shown.map((t) => t.textContent)).toEqual(['Stats', 'Skills3', 'Quotes']);
    expect(shown[0].getAttribute('aria-selected')).toBe('true');
    expect(shown[0].getAttribute('aria-controls')).toBe('u-panel-stats');
    expect(shown[1].tabIndex).toBe(-1);
    fireEvent.keyDown(shown[0], { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('quotes');
    fireEvent.keyDown(shown[0], { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('quotes');
    fireEvent.click(shown[1]);
    expect(onChange).toHaveBeenLastCalledWith('skills');
  });
});

describe('states and list parts', () => {
  it('EmptyState and LoadState', () => {
    const retry = vi.fn();
    const { rerender, container } = render(<LoadState loading />);
    expect(screen.getByRole('status').textContent).toContain('Loading');
    rerender(<LoadState error={new Error('x')} retry={retry} labels={{ retry: 'Again' }} />);
    fireEvent.click(screen.getByText('Again'));
    expect(retry).toHaveBeenCalled();
    rerender(<LoadState />);
    expect(container.innerHTML).toBe('');
    rerender(<EmptyState title="No stages match" hint="Try another category" />);
    expect(screen.getByText('No stages match')).toBeTruthy();
  });

  it('ListToolbar shows clear only with active filters', () => {
    const clear = vi.fn();
    const { rerender } = render(<ListToolbar count="12 units" onClearFilters={clear} activeFilters={0} />);
    expect(screen.queryByText('Clear filters')).toBeNull();
    rerender(<ListToolbar count="12 units" onClearFilters={clear} activeFilters={2} />);
    fireEvent.click(screen.getByText('Clear filters'));
    expect(clear).toHaveBeenCalled();
    expect(screen.getByText('12 units')).toBeTruthy();
  });

  it('FilterPanel toggles and reports state', () => {
    const toggle = vi.fn();
    render(<FilterPanel open={false} onToggle={toggle} activeCount={3}><p>filters</p></FilterPanel>);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.textContent).toContain('3');
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalled();
  });

  it('EntityTile links through renderLink or renders a plain box', () => {
    const { rerender, container } = render(<EntityTile href="/units/1" renderLink={routerLink} title="Valkyrie" subtitle="Heavy" />);
    expect(container.querySelector('a.hub-tile')!.getAttribute('href')).toBe('#/units/1');
    rerender(<EntityTile title="Plain" />);
    expect(container.querySelector('div.hub-tile')).not.toBeNull();
  });
});

describe('useUrlText', () => {
  it('hydrates once when ready, then local state leads', () => {
    const a = memory({ q: 'val' });
    const { result, rerender } = renderHook(({ ready }) => useUrlText(listState(a), ready), { initialProps: { ready: false } });
    expect(result.current[0]).toBe('');
    rerender({ ready: true });
    expect(result.current[0]).toBe('val');
    act(() => result.current[1]('valk'));
    expect(result.current[0]).toBe('valk');
    expect(a.values.q).toBe('valk');
    a.values.q = 'stale';
    rerender({ ready: true });
    expect(result.current[0]).toBe('valk');
  });
});
