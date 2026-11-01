export type GameId = 'aigis' | 'lo' | 'mad' | 'taimanin';

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
  /** Path of the game's app icon on the hub site (public/icons). */
  icon: string;
  source: string;
  /** Rights holder of the game's art and data, named in the footer's legal line. */
  rights?: string;
  sections: GameSection[];
}

export const HUB_URL = 'https://hub.altterisk.cc';

export const HUB = {
  name: 'Altterisk Games',
  url: HUB_URL,
  accent: '#a5b4fc',
  source: 'https://github.com/Altterisk/game-hub',
  donate: 'https://ko-fi.com/altterisk',
};

export const GAMES: Game[] = [
  {
    id: 'aigis',
    name: 'Aigis Database',
    title: "Millennium War Aigis",
    tagline: 'Units, enemies, stages, collection checker and DPS tools',
    url: 'https://aigis.altterisk.cc',
    icon: '/icons/aigis.png',
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
    icon: '/icons/lo.png',
    accent: '#f2727f',
    source: 'https://github.com/anyabot/LOMapR',
    rights: 'Valofe',
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
    icon: '/icons/mad.png',
    accent: '#f6c445',
    source: 'https://github.com/anyabot/MAD-Viewer',
    rights: 'FluffyDuck and Wemade Connect',
    sections: [
      { label: 'Viewer', path: '/' },
      { label: 'Characters', path: '/characters/' },
      { label: 'Stages', path: '/stages/' },
      { label: 'Farm', path: '/farm/' },
    ],
  },
  {
    id: 'taimanin',
    name: 'Taimanin RPGX Database',
    title: 'Taimanin RPGX',
    tagline: 'Units, events, banners, story and scenes (18+)',
    url: 'https://taimanin.altterisk.cc',
    icon: '/icons/taimanin.png',
    accent: '#e879f9',
    source: 'https://github.com/anyabot/Taimanin-RPGX-Database',
    sections: [
      { label: 'Units', path: '/units' },
      { label: 'Events', path: '/events' },
      { label: 'Banners', path: '/banners' },
      { label: 'Story', path: '/story' },
      { label: 'Quests', path: '/quests' },
      { label: 'Buffs', path: '/buffs' },
    ],
  },
];

export function getGame(id: GameId): Game {
  const game = GAMES.find((g) => g.id === id);
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
}
