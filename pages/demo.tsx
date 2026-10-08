import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GAMES, HubBar, HubFooter, type GameId } from '../src';
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
      </main>
      <HubFooter game={game} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Demo />);
