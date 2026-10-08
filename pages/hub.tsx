import { createRoot } from 'react-dom/client';
import { GAMES, GameIcon, HubBar, HubFooter } from '../src';
import '../styles/hub.css';
import '../styles/base.css';
import '../styles/components.css';
import './hub.css';

function Hub() {
  return (
    <>
      <HubBar
        game="hub"
        nav={GAMES.map((g) => (
          <a key={g.id} href={g.url}>{g.title}</a>
        ))}
      />
      <main className="hub-main landing">
        <header className="landing__head">
          <h1>Altterisk Games</h1>
          <p className="hub-muted">
            Fan-made databases and tools for Millennium War Aigis, Last Origin and Make Drama.
          </p>
        </header>
        <div className="landing__grid">
          {GAMES.map((g) => (
            <section key={g.id} className="hub-panel landing__card" data-game={g.id}>
              <a href={g.url} className="landing__main">
                <div className="landing__title">
                  <GameIcon game={g} size={48} base="" />
                  <div>
                    <h2>{g.title}</h2>
                    <div className="landing__site">{g.name}</div>
                  </div>
                </div>
                <p className="hub-muted">{g.tagline}</p>
              </a>
              <div className="landing__sections" aria-label={`${g.title} sections`}>
                {g.sections.map((s) => (
                  <a key={s.path} href={g.url + s.path} className="landing__chip">{s.label}</a>
                ))}
              </div>
              <a href={g.url} className="hub-btn hub-btn--primary landing__open">
                Open {g.name}
              </a>
            </section>
          ))}
        </div>
      </main>
      <HubFooter game="hub" />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Hub />);
