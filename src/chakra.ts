import { getGame, type GameId } from './games.js';
import { accentScale, gray, tokens } from './tokens.js';

const c = tokens.color;

const filledField = {
  field: {
    bg: c.surface,
    borderWidth: '1px',
    borderColor: c.border,
    _hover: { bg: c.surfaceRaised, borderColor: c.borderStrong },
    _focusVisible: { bg: c.surface, borderColor: 'accent.300', boxShadow: 'outline' },
  },
};

// Pass to Chakra v2 `extendTheme`; site-specific overrides go in a second argument.
export function hubChakraTheme(game: GameId) {
  const accent = accentScale(getGame(game).accent);
  return {
    config: { initialColorMode: 'dark', useSystemColorMode: false },
    colors: {
      gray,
      accent,
      surface: { DEFAULT: c.surface, elevated: c.surfaceRaised, hover: c.surfaceHover, border: c.border },
      hub: c,
    },
    fonts: { heading: tokens.font.body, body: tokens.font.body, mono: tokens.font.mono },
    radii: { md: tokens.radius.md, lg: tokens.radius.lg, xl: tokens.radius.xl },
    shadows: {
      outline: `0 0 0 3px ${accent[300]}47`,
      panel: tokens.shadow.panel,
    },
    styles: {
      global: {
        'html, body, #__next': { minH: '100%' },
        body: { bg: c.bg, color: c.text, overflowX: 'hidden', textRendering: 'optimizeLegibility' },
        '::selection': { bg: 'accent.300', color: c.bg },
        '*': { scrollbarColor: `${gray[600]} transparent`, scrollbarWidth: 'thin' },
        '::-webkit-scrollbar': { width: '8px', height: '8px' },
        '::-webkit-scrollbar-thumb': { bg: 'gray.600', borderRadius: 'full' },
        '::-webkit-scrollbar-track': { bg: 'transparent' },
        '*::placeholder': { color: c.textSubtle },
        '*, *::before, *::after': { borderColor: c.border },
        'a, button, input, select, textarea': { WebkitTapHighlightColor: 'transparent' },
        'a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible': {
          outline: '2px solid',
          outlineColor: 'accent.300',
          outlineOffset: '2px',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            scrollBehavior: 'auto !important',
            transitionDuration: '0.01ms !important',
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
          },
        },
      },
    },
    components: {
      Badge: {
        baseStyle: { borderRadius: 'full', fontWeight: 700, letterSpacing: '0.01em', px: 2, py: 0.5 },
        defaultProps: { colorScheme: 'accent' },
      },
      Button: {
        baseStyle: {
          borderRadius: 'lg',
          fontWeight: 700,
          transitionProperty: 'background, border-color, color, box-shadow, transform',
          transitionDuration: '160ms',
        },
        defaultProps: { colorScheme: 'gray' },
      },
      Card: {
        baseStyle: {
          container: { bg: c.surface, color: c.text, borderRadius: 'xl', borderWidth: '1px', borderColor: c.border },
        },
      },
      Input: { variants: { filled: filledField }, defaultProps: { variant: 'filled' } },
      NumberInput: { variants: { filled: filledField }, defaultProps: { variant: 'filled' } },
      Select: { variants: { filled: filledField }, defaultProps: { variant: 'filled' } },
      Textarea: { variants: { filled: filledField.field }, defaultProps: { variant: 'filled' } },
      Checkbox: { defaultProps: { colorScheme: 'accent' } },
      Radio: { defaultProps: { colorScheme: 'accent' } },
      Switch: { defaultProps: { colorScheme: 'accent' } },
      Slider: { defaultProps: { colorScheme: 'accent' } },
      Progress: { defaultProps: { colorScheme: 'accent' } },
      Spinner: { baseStyle: { color: 'accent.300' } },
      Link: { baseStyle: { color: 'accent.300' } },
      Tabs: {
        baseStyle: {
          tab: {
            color: c.textMuted,
            fontWeight: 700,
            borderRadius: 'md md 0 0',
            _hover: { color: c.text, bg: 'whiteAlpha.50' },
            _selected: { color: 'accent.300' },
          },
        },
        defaultProps: { colorScheme: 'accent' },
      },
      Table: {
        baseStyle: {
          th: { borderColor: c.border, color: c.textMuted, letterSpacing: '0.04em' },
          td: { borderColor: c.border },
        },
        variants: {
          striped: {
            th: { borderColor: c.border, color: c.textMuted },
            td: { borderColor: c.border },
            tbody: {
              tr: {
                '&:nth-of-type(odd) td': { background: 'whiteAlpha.50' },
                '&:nth-of-type(even) td': { background: 'transparent' },
              },
            },
          },
        },
      },
      Modal: {
        baseStyle: {
          dialog: { bg: c.surface, borderWidth: '1px', borderColor: c.border, borderRadius: 'xl' },
          overlay: { bg: 'blackAlpha.700', backdropFilter: 'blur(4px)' },
        },
      },
      Drawer: { baseStyle: { dialog: { bg: c.surface } } },
      Menu: {
        baseStyle: {
          list: { bg: c.surfaceRaised, borderColor: c.border, boxShadow: tokens.shadow.popover },
          item: { bg: 'transparent', _hover: { bg: c.surfaceHover }, _focus: { bg: c.surfaceHover } },
        },
      },
      Popover: {
        baseStyle: { content: { bg: c.surfaceRaised, borderColor: c.border, boxShadow: tokens.shadow.popover } },
      },
      Tooltip: {
        baseStyle: { bg: gray[700], color: gray[50], borderRadius: 'md', boxShadow: 'lg', px: 3, py: 2 },
      },
    },
  };
}
