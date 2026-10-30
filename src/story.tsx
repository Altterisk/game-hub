import type { ReactNode } from 'react';
import { plainLink, type RenderLink } from './page.js';

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

/** A dialogue line already mapped from the site's data; `text` is rendered by the site (e.g. RichText). */
export type StoryLineView =
  | { kind: 'place'; text: ReactNode }
  | { kind: 'narration'; text: ReactNode }
  | { kind: 'choice'; text: ReactNode }
  | { kind: 'options'; label?: ReactNode; options: { text: ReactNode; lines: StoryLineView[] }[] }
  | { kind: 'say'; text: ReactNode; name?: ReactNode; nameHref?: string; highlight?: boolean; avatar?: ReactNode; action?: ReactNode };

/** A script read as a column of lines: place headers, narration, choices, speaker rows. */
export function StoryLines({ lines, empty = 'No dialogue in this scene.', lang, renderLink = plainLink, optionsLabel = 'Choice', className }: {
  lines: StoryLineView[];
  empty?: ReactNode;
  lang?: string;
  renderLink?: RenderLink;
  optionsLabel?: ReactNode;
  className?: string;
}) {
  if (!lines.length) return <p className="hub-story__empty">{empty}</p>;
  return (
    <div className={cx('hub-story', className)} lang={lang}>
      {lines.map((line, i) => {
        switch (line.kind) {
          case 'place':
            return <p key={i} className="hub-story__place">— {line.text} —</p>;
          case 'narration':
            return <p key={i} className="hub-story__narration">{line.text}</p>;
          case 'choice':
            return <div key={i} className="hub-story__choice">{line.text}</div>;
          case 'options':
            return (
              <div key={i} className="hub-story__options">
                <p className="hub-story__options-label">{line.label ?? optionsLabel}</p>
                {line.options.map((opt, j) => (
                  <div key={j} className="hub-story__option">
                    <div className="hub-story__choice">{opt.text}</div>
                    {opt.lines.length > 0 && (
                      <div className="hub-story__branch">
                        <StoryLines lines={opt.lines} empty={empty} renderLink={renderLink} optionsLabel={optionsLabel} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          default:
            return (
              <div key={i} className="hub-story__say">
                <div className="hub-story__avatar">{line.avatar}</div>
                <div className="hub-story__body">
                  {line.name && (
                    <div className={cx('hub-story__name', line.highlight && 'is-highlight')}>
                      {line.nameHref ? renderLink({ href: line.nameHref, children: line.name }) : line.name}
                    </div>
                  )}
                  <p className="hub-story__text">{line.text}</p>
                </div>
                {line.action}
              </div>
            );
        }
      })}
    </div>
  );
}

export interface VoiceLineItem {
  id: string;
  tag: ReactNode;
  text?: ReactNode;
  /** False greys out the play button (no clip in this dub, still loading…). */
  available?: boolean;
  note?: ReactNode;
}

export interface VoiceLineLabels {
  play: (tag: string) => string;
  stop: string;
}

const VOICE_LABELS: VoiceLineLabels = { play: (tag) => `Play ${tag}`, stop: 'Stop' };

/** Rows of voice lines with play/stop buttons, two columns on wide screens. */
export function VoiceLineList({ items, playing, onPlay, onStop, lang, labels }: {
  items: VoiceLineItem[];
  playing: string | null;
  onPlay: (id: string) => void;
  onStop?: () => void;
  lang?: string;
  labels?: Partial<VoiceLineLabels>;
}) {
  const t = { ...VOICE_LABELS, ...labels };
  return (
    <div className="hub-voice-list">
      {items.map((item) => {
        const active = playing === item.id;
        const tag = typeof item.tag === 'string' ? item.tag : '';
        return (
          <div key={item.id} className={cx('hub-voice', active && 'is-playing')}>
            <button
              type="button"
              className="hub-voice__play"
              aria-label={active ? t.stop : t.play(tag)}
              aria-pressed={active}
              disabled={item.available === false}
              onClick={() => (active && onStop ? onStop() : onPlay(item.id))}
            >
              <span aria-hidden="true">{active && onStop ? '■' : '▶'}</span>
            </button>
            <div className="hub-voice__body">
              <span className="hub-badge hub-voice__tag">{item.tag}</span>
              {item.text && <p className="hub-voice__text" lang={lang}>{item.text}</p>}
              {item.note && <p className="hub-voice__note">{item.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
