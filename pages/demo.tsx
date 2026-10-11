import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CardGrid, CheckboxGroup, FallbackImage, FilterChip, FilterRow, GAMES, GroupCard, HubBar, HubFooter, Pager, SearchBox,
  SegmentedButtons, ShareButton,
  type GameId,
} from '../src';
import { PagesDemo } from './demoPages';
import { filterValueAllowed, listState, paginate, pageCount, textMatch, type ParamAdapter } from '../src/filters';
import '../styles/hub.css';
import '../styles/base.css';
import '../styles/components.css';

const NAV: Record<GameId, string[]> = {
  aigis: ['Units', 'Collection', 'Enemies', 'Stages', 'Buffs', 'Cost Gen', 'DPS', 'Weather'],
  lo: ['Units', 'Equipment', 'Enemies', 'World', 'Sanctum', 'Infinite War', 'Skins', 'NPCs', 'Team', 'Gacha', 'Misc'],
  mad: ['Viewer', 'Characters', 'Effects', 'Stages', 'Farm', 'Changelog'],
};

const ROWS: [string, string, string, number, number][] = [
  ['Valkyrie Captain', 'SSR', 'Heavy', 2480, 812],
  ['Bunny Gunner', 'SR', 'Ranged', 1730, 1104],
  ['Iron Priest', 'R', 'Support', 1902, 455],
  ['Night Sentinel', 'SSR', 'Heavy', 2760, 690],
];

const stop = (e: { preventDefault: () => void }) => e.preventDefault();

const UNITS = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  name: ['Valkyrie', 'Gunner', 'Priest', 'Sentinel', 'Witch', 'Archer'][i % 6] + ' ' + (i + 1),
  rarity: ['SSR', 'SR', 'R'][i % 3],
  cls: ['Heavy', 'Ranged', 'Support'][i % 3 === 0 ? 0 : i % 2 ? 1 : 2],
  icon: i % 4 === 0 ? null : `https://hub.altterisk.cc/icons/${['aigis', 'lo', 'mad'][i % 3]}.png`,
}));

function useMemoryParams(): ParamAdapter {
  const [params, setParams] = useState<Record<string, string>>({});
  return useMemo(() => ({
    get: (k: string) => params[k] ?? null,
    set: (updates: Record<string, string | null>) => setParams((cur) => {
      const next = { ...cur };
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) delete next[k];
        else next[k] = v;
      }
      return next;
    }),
  }), [params]);
}

function ListDemo() {
  const list = listState(useMemoryParams());
  const rarity = list.list('rarity');
  const cls = list.modes('cls');
  const q = list.text('q');
  const shown = UNITS.filter((u) => (!rarity.length || rarity.includes(u.rarity))
    && filterValueAllowed(u.cls, cls) && textMatch(q, [u.name, u.id]));
  const pages = pageCount(shown.length, 8);
  return (
    <section style={{ marginTop: 28 }}>
      <h2>List building blocks</h2>
      <p className="hub-muted">SearchBox, FilterRow with tri-state FilterChips, CheckboxGroup, CardGrid, FallbackImage and Pager, with filter state held by listState.</p>
      <div className="hub-toolbar">
        <SearchBox value={q} onChange={(v) => list.setText('q', v)} placeholder="Search name or id" />
        <ShareButton />
      </div>
      <CheckboxGroup title="Rarity" options={['SSR', 'SR', 'R'].map((r) => ({ value: r, label: r }))}
        selected={rarity} onToggle={(v) => list.toggle('rarity', v)} />
      <FilterRow label="Class">
        {['Heavy', 'Ranged', 'Support'].map((c) => (
          <FilterChip key={c} mode={cls[c] ?? 0} onClick={() => list.cycleMode('cls', c)} title="Click: include, again: exclude">{c}</FilterChip>
        ))}
      </FilterRow>
      <p className="hub-muted hub-small">{shown.length} of {UNITS.length} units</p>
      <CardGrid min={150}>
        {paginate(shown, list.page, 8).map((u) => (
          <a key={u.id} href="#" className="hub-panel" onClick={stop} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10 }}>
            <FallbackImage srcs={[u.icon]} width={40} height={40} alt="" style={{ borderRadius: 8 }} />
            <span>
              <strong style={{ display: 'block' }}>{u.name}</strong>
              <span className={`hub-badge ${u.rarity === 'SSR' ? 'hub-badge--accent' : ''}`}>{u.rarity}</span>{' '}
              <span className="hub-muted hub-small">{u.cls}</span>
            </span>
          </a>
        ))}
      </CardGrid>
      <Pager page={Math.min(list.page, pages)} pages={pages} onPage={list.setPage} />
    </section>
  );
}

const EFFECT_ROWS: Record<string, [string, number][]> = {
  Buff: [['ATK up', 15], ['Shield', 9], ['Defence up', 6], ['Toughness up', 0]],
  Debuff: [['Attack down', 5], ['Defence down', 1]],
  Control: [['Stun', 8], ['Knockback', 7], ['Fear', 0]],
};

function EffectIndexDemo() {
  const [picked, setPicked] = useState('ATK up');
  const [side, setSide] = useState<string[]>(['ally', 'enemy']);
  const [sort, setSort] = useState('value');
  const [q, setQ] = useState('');
  const toggleSide = (v: string) => setSide((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  return (
    <section style={{ marginTop: 28 }}>
      <h2>Effect index blocks</h2>
      <p className="hub-muted">FilterRow + FilterChip with counts, a filter panel with SegmentedButtons, GroupCards in a group grid, and a table that stacks on phones.</p>
      {Object.entries(EFFECT_ROWS).map(([label, chips]) => (
        <FilterRow key={label} label={label}>
          {chips.map(([name, n]) => (
            <FilterChip key={name} count={n} active={picked === name} onClick={() => setPicked(name)}>{name}</FilterChip>
          ))}
        </FilterRow>
      ))}
      <div className="hub-toolbar hub-toolbar--panel" style={{ marginTop: 12 }}>
        <SegmentedButtons label="Side" options={[{ value: 'ally', label: 'Allies' }, { value: 'enemy', label: 'Enemies' }]}
          selected={side} onToggle={toggleSide} />
        <SegmentedButtons label="Sort" options={[{ value: 'name', label: 'A-Z' }, { value: 'value', label: 'By value' }]}
          selected={sort} onToggle={setSort} />
        <div className="hub-toolbar__end"><SearchBox value={q} onChange={setQ} placeholder="Filter units" /></div>
      </div>
      <div className="hub-group-grid">
        {['Deployment ATK', 'Sortie ATK'].map((title, gi) => (
          <GroupCard key={title} title={title} count={gi ? 40 : 361} meta="ability" note={gi ? 'Highest value applies.' : 'Rows stack additively.'}>
            <table className="hub-table hub-table--stack">
              <thead><tr><th>#</th><th>Value</th><th>Unit</th><th>Target</th></tr></thead>
              <tbody>
                {ROWS.slice(0, 4).map(([name, , , atk], i) => (
                  <tr key={name}>
                    <td data-label="#" className="num">{i + 1}</td>
                    <td data-label="Value" className="num">+{Math.round(atk / 50)}%</td>
                    <td data-label="Unit">{name}</td>
                    <td data-label="Target">all allies in range</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GroupCard>
        ))}
      </div>
    </section>
  );
}

function Demo() {
  const [game, setGame] = useState<GameId>('aigis');
  const [tab, setTab] = useState(0);
  return (
    <div data-game={game}>
      <HubBar
        game={game}
        nav={NAV[game].map((label, i) => (
          <a key={label} href="#" aria-current={i === 0 ? 'page' : undefined} onClick={stop}>{label}</a>
        ))}
        actions={<button className="hub-btn hub-btn--sm hub-btn--ghost">EN</button>}
      />
      <main className="hub-main">
        <div className="hub-toolbar">
          <span className="hub-muted hub-small">Preview as</span>
          {GAMES.map((g) => (
            <button key={g.id} data-game={g.id} onClick={() => setGame(g.id)}
              className={`hub-btn hub-btn--sm ${g.id === game ? 'hub-btn--primary' : ''}`}>{g.title}</button>
          ))}
        </div>

        <h1>Units</h1>
        <p className="hub-muted">Sample page showing the shared components in this game's accent.</p>

        <div className="hub-tabs" role="tablist">
          {['Overview', 'Skills', 'Profile', 'Drops'].map((t, i) => (
            <button key={t} role="tab" className="hub-tab" aria-selected={tab === i} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        <div className="hub-toolbar">
          <input className="hub-input" placeholder="Search by name or code" />
          <select className="hub-select" defaultValue="all">
            <option value="all">All rarities</option>
            <option>SSR</option>
            <option>SR</option>
          </select>
          <button className="hub-btn">Reset</button>
          <button className="hub-btn hub-btn--primary">Apply</button>
        </div>

        <div className="hub-grid" style={{ marginBottom: 20 }}>
          <div className="hub-panel">
            <div className="hub-muted hub-small">Units tracked</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>2,814</div>
            <span className="hub-badge hub-badge--accent">+12 this update</span>
          </div>
          <div className="hub-panel">
            <div className="hub-muted hub-small">Status</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <span className="hub-badge">Default</span>
              <span className="hub-badge hub-badge--accent">Accent</span>
              <span className="hub-badge hub-badge--success">Owned</span>
              <span className="hub-badge hub-badge--warning">Limited</span>
              <span className="hub-badge hub-badge--danger">Missing</span>
            </div>
          </div>
          <a href="#" className="hub-panel" onClick={stop}>
            <div style={{ fontWeight: 700 }}>Clickable card</div>
            <div className="hub-muted hub-small">Hover to see the accent edge</div>
          </a>
        </div>

        <div className="hub-table-wrap">
          <table className="hub-table">
            <thead>
              <tr><th>Name</th><th>Rarity</th><th>Class</th><th className="num">HP</th><th className="num">ATK</th></tr>
            </thead>
            <tbody>
              {ROWS.map(([name, rarity, cls, hp, atk]) => (
                <tr key={name}>
                  <td><a href="#" onClick={stop}>{name}</a></td>
                  <td><span className={`hub-badge ${rarity === 'SSR' ? 'hub-badge--accent' : ''}`}>{rarity}</span></td>
                  <td>{cls}</td>
                  <td className="num">{hp.toLocaleString()}</td>
                  <td className="num">{atk.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListDemo />
        <EffectIndexDemo />
        <PagesDemo />
      </main>
      <HubFooter game={game} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Demo />);
