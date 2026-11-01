import { GAMES, HUB } from '../src/games';
import { GameIcon, HubBar } from '../src/HubBar';
import { HubFooter } from '../src/HubFooter';

export const HUB_DESCRIPTION =
  'Fan-made databases and tools for Millennium War Aigis, Last Origin, Make Drama and Taimanin RPGX.';

export function Landing() {
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
          <p className="hub-muted">{HUB_DESCRIPTION}</p>
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
        <aside className="hub-panel landing__support">
          <span className="hub-muted">Find these tools useful?</span>
          <a href={HUB.donate} target="_blank" rel="noreferrer" className="hub-btn landing__kofi">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M4 5h13a3.5 3.5 0 0 1 0 7h-.6A6 6 0 0 1 10.5 18h-1A6 6 0 0 1 3.5 12V6a1 1 0 0 1 .5-1Zm13 2v3a1.5 1.5 0 0 0 0-3ZM8.2 8.4c-.9.9-.8 2.1.1 3l2.2 2.1 2.2-2.1c.9-.9 1-2.1.1-3-.7-.6-1.7-.5-2.3.2-.6-.7-1.6-.8-2.3-.2Z" />
            </svg>
            Support on Ko-fi
          </a>
        </aside>
      </main>
      <HubFooter game="hub" />
    </>
  );
}
