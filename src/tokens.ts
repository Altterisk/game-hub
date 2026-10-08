export const gray = {
  50: '#f6f7fb',
  100: '#eceef4',
  200: '#d8dce7',
  300: '#b7bece',
  400: '#929bad',
  500: '#707a8f',
  600: '#515b70',
  700: '#353d4d',
  800: '#1b2230',
  900: '#0b0f17',
} as const;

export const tokens = {
  color: {
    bg: gray[900],
    surface: '#121825',
    surfaceRaised: gray[800],
    surfaceHover: '#222a3a',
    border: '#262e3e',
    borderStrong: gray[700],
    text: gray[100],
    textMuted: gray[400],
    textSubtle: gray[500],
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
    info: '#60a5fa',
  },
  font: {
    body: 'Inter, "Noto Sans JP", "Noto Sans KR", Pretendard, "Hiragino Sans", Meiryo, system-ui, sans-serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
  radius: { sm: '6px', md: '10px', lg: '14px', xl: '18px', full: '9999px' },
  shadow: {
    panel: '0 18px 45px rgba(0, 0, 0, 0.22)',
    popover: '0 12px 32px rgba(0, 0, 0, 0.45)',
  },
  layout: { barHeight: '56px', maxWidth: '90rem' },
} as const;

export type AccentScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// The given accent becomes the 300 step, the shade used for text and active states on the dark background.
export function accentScale(hex: string): AccentScale {
  const base = parseHex(hex);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [11, 15, 23];
  return {
    50: mix(base, white, 0.88),
    100: mix(base, white, 0.7),
    200: mix(base, white, 0.45),
    300: hex,
    400: mix(base, black, 0.12),
    500: mix(base, black, 0.25),
    600: mix(base, black, 0.4),
    700: mix(base, black, 0.55),
    800: mix(base, black, 0.7),
    900: mix(base, black, 0.84),
  };
}
