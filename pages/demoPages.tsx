import { useMemo, useState } from 'react';
import {
  BackupPanel, BannerCard, Breadcrumbs, CardGrid, ChangelogDialog, EmptyState, EntityTile, FallbackImage, FilterChip, FilterPanel,
  FilterRow, IconPreview, LevelControl, Lightbox, ListToolbar, LoadState, MetaChip, PageHeader, Panel, ProgressBar, RewardGrid,
  SearchBox, ShareButton, StageCard, StatRows, TabPanel, UrlTabs, WaveNav, tabParam, type RenderLink,
} from '../src';
import { listState, textMatch, type ParamAdapter } from '../src/filters';

const ICONS = ['aigis', 'lo', 'mad'].map((g) => `https://hub.altterisk.cc/icons/${g}.png`);
const icon = (i: number) => <FallbackImage srcs={[ICONS[i % 3]]} alt="" />;

// The demo is one page, so links only update the hash.
const demoLink: RenderLink = ({ href, children, ...rest }) => (
  <a href={`#${href}`} {...rest} onClick={(e) => e.preventDefault()}>{children}</a>
);

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

const STAGES = Array.from({ length: 6 }, (_, i) => ({
  id: 30101 + i,
  name: `Moonlit Beach ${i + 1}`,
  level: 30 + i * 5,
  stamina: 10 + i,
  enemies: 3 + i,
  drops: 2 + (i % 4),
}));

const TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'skills', label: 'Skills', count: 3 },
  { id: 'drops', label: 'Drops' },
  { id: 'tokens', label: 'Tokens', hidden: true },
];

export function PagesDemo() {
  const params = useMemoryParams();
  const list = listState(params);
  const [tab, setTab] = tabParam(params, TABS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [level, setLevel] = useState(60);
  const [wave, setWave] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [changelog, setChangelog] = useState(false);
  const q = list.text('q');
  const modes = list.list('mode');
  const shown = STAGES.filter((s) => textMatch(q, [s.name, s.id]) && (!modes.length || modes.includes(s.level >= 45 ? 'hard' : 'normal')));
  const active = (q ? 1 : 0) + modes.length;

  return (
    <section style={{ marginTop: 28 }}>
      <h2>Page parts</h2>
      <p className="hub-muted">Stage hub, group page and a detail page assembled only from shared parts. Filter and tab state live in listState / tabParam.</p>

      <h3>Stage hub</h3>
      <CardGrid min={220}>
        <BannerCard href="/stages?group=1" renderLink={demoLink} highlight badge="Live" window="10/01 – 10/15" count="6 stages"
          art={<FallbackImage srcs={[ICONS[0]]} alt="" style={{ aspectRatio: '2 / 1', objectFit: 'cover' }} />} title="Moonlit Beach" />
        <BannerCard href="/stages?group=2" renderLink={demoLink} count="12 stages"
          art={<FallbackImage srcs={[ICONS[1]]} alt="" style={{ aspectRatio: '2 / 1', objectFit: 'cover' }} />} title="Main Story, Chapter 4" />
        <BannerCard href="/stages?group=3" renderLink={demoLink} count="8 stages" title="Archived event (no art)" />
      </CardGrid>

      <h3 style={{ marginTop: 20 }}>Group page</h3>
      <Breadcrumbs renderLink={demoLink} items={[{ label: 'Stages', href: '/stages' }, { label: 'Events', href: '/stages?mode=event' }, { label: 'Moonlit Beach' }]} />
      <ListToolbar
        search={<SearchBox value={q} onChange={(v) => list.setText('q', v)} placeholder="Search stage or id" />}
        count={`${shown.length} stages`}
        activeFilters={active}
        onClearFilters={() => list.clear(['q', 'mode'])}
        actions={<ShareButton />}
      />
      <FilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} activeCount={modes.length}>
        <FilterRow label="Difficulty">
          {['normal', 'hard'].map((m) => (
            <FilterChip key={m} active={modes.includes(m)} onClick={() => list.toggle('mode', m)}>{m}</FilterChip>
          ))}
        </FilterRow>
      </FilterPanel>
      {shown.length ? (
        <CardGrid min={280}>
          {shown.map((s, i) => (
            <StageCard key={s.id} href={`/stage?id=${s.id}`} renderLink={demoLink} title={s.name} id={s.id}
              meta={<><MetaChip label="Lv" value={s.level} /><MetaChip label="Stamina" value={s.stamina} /></>}
              previews={(
                <>
                  <IconPreview label="Enemies" count={s.enemies} max={4}>{Array.from({ length: s.enemies }, (_, k) => <span key={k}>{icon(k + i)}</span>)}</IconPreview>
                  <IconPreview label="Drops" count={s.drops}>{Array.from({ length: s.drops }, (_, k) => <span key={k}>{icon(k)}</span>)}</IconPreview>
                </>
              )} />
          ))}
        </CardGrid>
      ) : (
        <EmptyState title="No stages match" hint="Clear the search or the difficulty filter." action={<button className="hub-btn hub-btn--sm" onClick={() => list.clear(['q', 'mode'])}>Clear filters</button>} />
      )}

      <h3 style={{ marginTop: 20 }}>Detail page</h3>
      <PageHeader
        level={2}
        art={<button type="button" onClick={() => setLightbox(0)} style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}>
          <FallbackImage srcs={[ICONS[2]]} alt="Open gallery" width={96} height={96} />
        </button>}
        title="Valkyrie Captain"
        id="#101"
        subtitle="ヴァルキリーキャプテン"
        badges={<span className="hub-badge hub-badge--accent">SSR</span>}
        meta={<><MetaChip label="Class" value="Heavy" href="/units?cls=heavy" renderLink={demoLink} /><MetaChip label="Faction" value="Royal Guard" /></>}
        actions={<><ShareButton /><button className="hub-btn hub-btn--sm" onClick={() => setChangelog(true)}>What&apos;s new</button></>}
      />
      <UrlTabs tabs={TABS} active={tab} onChange={setTab} label="Unit sections" idBase="demo-unit" />
      {tab === 'stats' && (
        <TabPanel tab="stats" idBase="demo-unit">
          <Panel title="Stats" note={`At level ${level}`}>
            <LevelControl label="Level" value={level} min={1} max={99} onChange={setLevel} />
            <StatRows rows={[
              { label: 'HP', value: (1200 + level * 14).toLocaleString() },
              { label: 'ATK', value: (300 + level * 6).toLocaleString() },
              { label: 'DEF', value: (180 + level * 4).toLocaleString() },
              { label: 'Block', value: 3 },
            ]} />
          </Panel>
          <Panel title="Collection">
            <ProgressBar label="Royal Guard owned" value={14} max={22} />
            <ProgressBar label="All SSR owned" value={131} max={340} />
          </Panel>
        </TabPanel>
      )}
      {tab === 'skills' && (
        <TabPanel tab="skills" idBase="demo-unit">
          <Panel title="Skills"><p className="hub-muted">Skill blocks stay per site; the tab and panel are shared.</p></Panel>
        </TabPanel>
      )}
      {tab === 'drops' && (
        <TabPanel tab="drops" idBase="demo-unit">
          <Panel title="Waves" actions={<WaveNav count={4} index={wave} onChange={setWave} />}>
            <CardGrid min={180}>
              {Array.from({ length: 3 + wave }, (_, k) => (
                <EntityTile key={k} icon={icon(k)} title={`Enemy ${k + 1}`} subtitle={`Wave ${wave + 1} · Lv ${40 + k}`} />
              ))}
            </CardGrid>
          </Panel>
          <Panel title="Drops">
            <RewardGrid renderLink={demoLink} items={[
              { icon: icon(0), name: 'Gold', amount: 1500 },
              { icon: icon(1), name: 'Spirit of Fire', amount: 1, chance: 0.125, href: '/items/7' },
              { icon: icon(2), name: 'Black Spirit', amount: 1, chance: 0.0035, note: 'Hard only' },
            ]} />
          </Panel>
          <LoadState loading labels={{ loading: 'Loading wave details…' }} />
        </TabPanel>
      )}
      <BackupPanel
        code="AIGC3.AAgBAQEHeAEB"
        onImportCode={(c) => (c.startsWith('AIGC') ? null : 'That is not a collection code.')}
        onExportFile={() => {}}
        onImportFile={() => {}}
      />
      <Lightbox
        items={ICONS.map((src, i) => ({ srcs: [src], label: ['Aigis', 'Last Origin', 'Make Drama'][i] }))}
        index={lightbox}
        onIndex={setLightbox}
        onClose={() => setLightbox(null)}
      />
      <ChangelogDialog
        open={changelog}
        onClose={() => setChangelog(false)}
        releases={[{ date: '2026-10-11', title: 'Page parts', entries: [{ kind: 'new', text: 'Breadcrumbs, tabs in the URL, stage cards.' }, { kind: 'fix', text: 'Filters collapse on phones.' }] }]}
      />
    </section>
  );
}
