import { useSyncExternalStore } from 'react';

export type ClipSource = () => Promise<Blob | string | null | undefined>;

export interface Player {
  /** Plays `id`, replacing whatever is playing. Resolves false if it was replaced first or failed. */
  play(id: string, source: ClipSource): Promise<boolean>;
  stop(): void;
  /** Plays `id`, or stops it when it is the one playing. */
  toggle(id: string, source: ClipSource): Promise<boolean>;
  playing(): string | null;
  subscribe(listener: () => void): () => void;
  useNowPlaying(): string | null;
}

/** One clip at a time across the page; blobs become object URLs kept in a capped cache. */
export function createPlayer({ cacheSize = 200, volume }: { cacheSize?: number; volume?: number } = {}): Player {
  let audio: HTMLAudioElement | null = null;
  let token = 0;
  let current: string | null = null;
  const listeners = new Set<() => void>();
  const urls = new Map<string, string>();

  const setPlaying = (id: string | null) => {
    current = id;
    listeners.forEach((l) => l());
  };

  const element = () => {
    if (!audio) {
      audio = new Audio();
      if (volume !== undefined) audio.volume = volume;
      audio.addEventListener('ended', () => setPlaying(null));
      audio.addEventListener('error', () => setPlaying(null));
    }
    return audio;
  };

  const remember = (id: string, url: string) => {
    urls.set(id, url);
    if (urls.size > cacheSize) {
      const [oldId, oldUrl] = urls.entries().next().value as [string, string];
      URL.revokeObjectURL(oldUrl);
      urls.delete(oldId);
    }
  };

  const stop = () => {
    token += 1;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setPlaying(null);
  };

  const play = async (id: string, source: ClipSource) => {
    const mine = ++token;
    let url = urls.get(id);
    if (!url) {
      const got = await source().catch(() => null);
      if (mine !== token || !got) return false;
      if (typeof got === 'string') url = got;
      else {
        url = URL.createObjectURL(got);
        remember(id, url);
      }
    }
    const el = element();
    el.src = url;
    el.currentTime = 0;
    setPlaying(id);
    try {
      await el.play();
      return true;
    } catch {
      if (mine === token) setPlaying(null);
      return false;
    }
  };

  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  };

  return {
    play,
    stop,
    toggle: (id, source) => {
      if (current === id) {
        stop();
        return Promise.resolve(false);
      }
      return play(id, source);
    },
    playing: () => current,
    subscribe,
    useNowPlaying: () => useSyncExternalStore(subscribe, () => current, () => null),
  };
}
