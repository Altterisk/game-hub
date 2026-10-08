export type GameId = 'aigis' | 'lo' | 'mad';

export interface GameSection {
  label: string;
  path: string;
}

export interface Game {
  id: GameId;
  name: string;
  title: string;
  tagline: string;
  url: string;
  accent: string;
  source: string;
  sections: GameSection[];
}

export const HUB_URL = 'https://altterisk.cc';

export const HUB = {
  name: 'Altterisk Games',
  url: HUB_URL,
  accent: '#a5b4fc',
  source: 'https://github.com/Altterisk/game-hub',
};

export const GAMES: Game[] = [
  {
    id: 'aigis',
    name: 'Aigis Database',
    title: "Millennium War Aigis",
    tagline: 'Units, enemies, stages, collection checker and DPS tools',
    url: 'https://aigis.altterisk.cc',
    accent: '#7aa2f7',
    source: 'https://github.com/Altterisk/Aigis-Enemy',
    sections: [
      { label: 'Units', path: '/#/units' },
      { label: 'Collection', path: '/#/collection' },
      { label: 'Enemies', path: '/#/enemies' },
      { label: 'Stages', path: '/#/stages' },
      { label: 'DPS', path: '/#/dps' },
    ],
  },
  {
    id: 'lo',
    name: 'LOMapR',
    title: 'Last Origin',
    tagline: 'Units, equipment, worlds, skins and team builder',
    url: 'https://lo.altterisk.cc',
    accent: '#f2727f',
    source: 'https://github.com/anyabot/LOMapR',
    sections: [
      { label: 'Units', path: '/units' },
      { label: 'Equipment', path: '/equipment' },
      { label: 'Enemies', path: '/enemies' },
      { label: 'World', path: '/world' },
      { label: 'Skins', path: '/skins' },
      { label: 'Team', path: '/team' },
    ],
  },
  {
    id: 'mad',
    name: 'MAD Viewer',
    title: 'Make Drama',
    tagline: 'Skin viewer, characters, stages and farm planner',
    url: 'https://mad.altterisk.cc',
    accent: '#f6c445',
    source: 'https://github.com/anyabot/MAD-Viewer',
    sections: [
      { label: 'Viewer', path: '/' },
      { label: 'Characters', path: '/characters/' },
      { label: 'Stages', path: '/stages/' },
      { label: 'Farm', path: '/farm/' },
    ],
  },
];

export function getGame(id: GameId): Game {
  const game = GAMES.find((g) => g.id === id);
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
}
