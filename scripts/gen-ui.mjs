// Compiles the hub Chakra theme into static CSS (styles/ui.css, styles/ui-reset.css) and token tables
// (src/ui/tokens.gen.ts) for the Chakra-free UI kit. Run after `npm run build:lib`: `npm run gen:ui`.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { extendTheme } = require('@chakra-ui/react');
const { hubChakraTheme } = await import(pathToUrl('dist/chakra.js'));
const { GAMES } = await import(pathToUrl('dist/games.js'));
const { accentScale, HUB_ACCENT } = await import(pathToUrl('dist/tokens.js')).then((m) => ({ ...m, HUB_ACCENT: '#a5b4fc' }));

function pathToUrl(rel) {
  return new URL(`file:///${path.join(root, rel).replace(/\\/g, '/')}`).href;
}

const BREAKPOINTS = { sm: '30em', md: '48em', lg: '62em', xl: '80em', '2xl': '96em' };
const BP_KEYS = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
const PALETTES = ['whiteAlpha', 'blackAlpha', 'gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink', 'accent'];
const SCHEMES = ['gray', 'accent', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink', 'whiteAlpha'];
const COMPONENTS = ['Accordion', 'Avatar', 'Badge', 'Button', 'Card', 'Checkbox', 'CloseButton', 'Container', 'Divider', 'Heading',
  'Input', 'Link', 'Menu', 'Modal', 'NumberInput', 'Popover', 'Select', 'Slider', 'Spinner', 'Stat', 'Table', 'Tabs', 'Tag', 'Textarea', 'Tooltip'];

// prop → [css properties, scale]
const P = (css, scale) => ({ css: Array.isArray(css) ? css : [css], scale });
const PROPS = {
  m: P('margin', 'space'), margin: P('margin', 'space'), mt: P('margin-top', 'space'), marginTop: P('margin-top', 'space'),
  mr: P('margin-right', 'space'), marginRight: P('margin-right', 'space'), mb: P('margin-bottom', 'space'), marginBottom: P('margin-bottom', 'space'),
  ml: P('margin-left', 'space'), marginLeft: P('margin-left', 'space'), mx: P(['margin-left', 'margin-right'], 'space'), marginX: P(['margin-left', 'margin-right'], 'space'),
  my: P(['margin-top', 'margin-bottom'], 'space'), marginY: P(['margin-top', 'margin-bottom'], 'space'), marginInlineStart: P('margin-inline-start', 'space'), marginInlineEnd: P('margin-inline-end', 'space'),
  me: P('margin-inline-end', 'space'), ms: P('margin-inline-start', 'space'),
  p: P('padding', 'space'), padding: P('padding', 'space'), pt: P('padding-top', 'space'), paddingTop: P('padding-top', 'space'),
  pr: P('padding-right', 'space'), paddingRight: P('padding-right', 'space'), pb: P('padding-bottom', 'space'), paddingBottom: P('padding-bottom', 'space'),
  pl: P('padding-left', 'space'), paddingLeft: P('padding-left', 'space'), px: P(['padding-left', 'padding-right'], 'space'), paddingX: P(['padding-left', 'padding-right'], 'space'),
  py: P(['padding-top', 'padding-bottom'], 'space'), paddingY: P(['padding-top', 'padding-bottom'], 'space'), paddingInlineStart: P('padding-inline-start', 'space'), paddingInlineEnd: P('padding-inline-end', 'space'),
  ps: P('padding-inline-start', 'space'), pe: P('padding-inline-end', 'space'),
  gap: P('gap', 'space'), rowGap: P('row-gap', 'space'), columnGap: P('column-gap', 'space'), gridGap: P('gap', 'space'),
  top: P('top', 'space'), right: P('right', 'space'), bottom: P('bottom', 'space'), left: P('left', 'space'), inset: P('inset', 'space'),
  insetX: P(['left', 'right'], 'space'), insetY: P(['top', 'bottom'], 'space'), insetStart: P('inset-inline-start', 'space'), insetEnd: P('inset-inline-end', 'space'),
  w: P('width', 'sizes'), width: P('width', 'sizes'), h: P('height', 'sizes'), height: P('height', 'sizes'),
  minW: P('min-width', 'sizes'), minWidth: P('min-width', 'sizes'), maxW: P('max-width', 'sizes'), maxWidth: P('max-width', 'sizes'),
  minH: P('min-height', 'sizes'), minHeight: P('min-height', 'sizes'), maxH: P('max-height', 'sizes'), maxHeight: P('max-height', 'sizes'),
  boxSize: P(['width', 'height'], 'sizes'), flexBasis: P('flex-basis', 'sizes'),
  color: P('color', 'colors'), bg: P('background', 'colors'), background: P('background', 'colors'), bgColor: P('background-color', 'colors'),
  backgroundColor: P('background-color', 'colors'), borderColor: P('border-color', 'colors'), borderTopColor: P('border-top-color', 'colors'),
  borderBottomColor: P('border-bottom-color', 'colors'), borderLeftColor: P('border-left-color', 'colors'), borderRightColor: P('border-right-color', 'colors'),
  fill: P('fill', 'colors'), stroke: P('stroke', 'colors'), outlineColor: P('outline-color', 'colors'), textDecorationColor: P('text-decoration-color', 'colors'),
  fontSize: P('font-size', 'fontSizes'), fontWeight: P('font-weight', 'fontWeights'), lineHeight: P('line-height', 'lineHeights'),
  letterSpacing: P('letter-spacing', 'letterSpacings'), fontFamily: P('font-family', 'fonts'),
  borderRadius: P('border-radius', 'radii'), rounded: P('border-radius', 'radii'),
  borderTopRadius: P(['border-top-left-radius', 'border-top-right-radius'], 'radii'), borderBottomRadius: P(['border-bottom-left-radius', 'border-bottom-right-radius'], 'radii'),
  borderLeftRadius: P(['border-top-left-radius', 'border-bottom-left-radius'], 'radii'), borderRightRadius: P(['border-top-right-radius', 'border-bottom-right-radius'], 'radii'),
  borderTopLeftRadius: P('border-top-left-radius', 'radii'), borderTopRightRadius: P('border-top-right-radius', 'radii'),
  borderBottomLeftRadius: P('border-bottom-left-radius', 'radii'), borderBottomRightRadius: P('border-bottom-right-radius', 'radii'),
  boxShadow: P('box-shadow', 'shadows'), shadow: P('box-shadow', 'shadows'), textShadow: P('text-shadow', 'shadows'), zIndex: P('z-index', 'zIndices'),
  border: P('border', 'borders'), borderTop: P('border-top', 'borders'), borderBottom: P('border-bottom', 'borders'),
  borderLeft: P('border-left', 'borders'), borderRight: P('border-right', 'borders'), outline: P('outline', 'borders'),
  borderWidth: P('border-width', 'px'), borderTopWidth: P('border-top-width', 'px'), borderBottomWidth: P('border-bottom-width', 'px'),
  borderLeftWidth: P('border-left-width', 'px'), borderRightWidth: P('border-right-width', 'px'), borderStyle: P('border-style'),
  transitionProperty: P('transition-property', 'transitionProperty'), transitionDuration: P('transition-duration', 'transitionDuration'),
  transitionTimingFunction: P('transition-timing-function', 'transitionEasing'), transition: P('transition'),
  display: P('display'), position: P('position'), pos: P('position'), overflow: P('overflow'), overflowX: P('overflow-x'), overflowY: P('overflow-y'),
  flex: P('flex'), flexDirection: P('flex-direction'), flexDir: P('flex-direction'), flexWrap: P('flex-wrap'), flexGrow: P('flex-grow'), flexShrink: P('flex-shrink'),
  alignItems: P('align-items'), alignSelf: P('align-self'), alignContent: P('align-content'), justifyContent: P('justify-content'),
  justifySelf: P('justify-self'), justifyItems: P('justify-items'), placeItems: P('place-items'), order: P('order'),
  gridTemplateColumns: P('grid-template-columns'), gridTemplateRows: P('grid-template-rows'), gridColumn: P('grid-column'), gridRow: P('grid-row'),
  gridArea: P('grid-area'), gridAutoFlow: P('grid-auto-flow'), gridAutoRows: P('grid-auto-rows'), gridAutoColumns: P('grid-auto-columns'),
  gridTemplateAreas: P('grid-template-areas'), gridColumnStart: P('grid-column-start'), gridColumnEnd: P('grid-column-end'),
  textAlign: P('text-align'), textTransform: P('text-transform'), textDecoration: P('text-decoration'), textDecor: P('text-decoration'),
  whiteSpace: P('white-space'), wordBreak: P('word-break'), overflowWrap: P('overflow-wrap'), textOverflow: P('text-overflow'),
  fontStyle: P('font-style'), fontVariantNumeric: P('font-variant-numeric'), verticalAlign: P('vertical-align'), textUnderlineOffset: P('text-underline-offset'),
  cursor: P('cursor'), opacity: P('opacity'), transform: P('transform'), transformOrigin: P('transform-origin'), pointerEvents: P('pointer-events'),
  userSelect: P('user-select'), visibility: P('visibility'), objectFit: P('object-fit'), objectPosition: P('object-position'),
  backdropFilter: P('backdrop-filter'), filter: P('filter'), boxSizing: P('box-sizing'), listStyleType: P('list-style-type'),
  listStylePosition: P('list-style-position'), resize: P('resize'), aspectRatio: P('aspect-ratio'), float: P('float'), isolation: P('isolation'),
  mixBlendMode: P('mix-blend-mode'), bgImage: P('background-image'), backgroundImage: P('background-image'), bgSize: P('background-size'),
  backgroundSize: P('background-size'), bgPosition: P('background-position'), backgroundPosition: P('background-position'),
  bgRepeat: P('background-repeat'), backgroundRepeat: P('background-repeat'), bgClip: P('background-clip'), backgroundClip: P('background-clip'),
  borderCollapse: P('border-collapse'), tableLayout: P('table-layout'), animation: P('animation'), willChange: P('will-change'),
  content: P('content'), appearance: P('appearance'), outlineOffset: P('outline-offset', 'px'), scrollBehavior: P('scroll-behavior'),
  WebkitTapHighlightColor: P('-webkit-tap-highlight-color'), scrollbarColor: P('scrollbar-color'), scrollbarWidth: P('scrollbar-width'),
  textRendering: P('text-rendering'), fontFeatureSettings: P('font-feature-settings'), WebkitLineClamp: P('-webkit-line-clamp'),
  WebkitBoxOrient: P('-webkit-box-orient'), boxDecorationBreak: P('box-decoration-break'), touchAction: P('touch-action'),
  overscrollBehavior: P('overscroll-behavior'), inlineSize: P('inline-size', 'sizes'), blockSize: P('block-size', 'sizes'),
  marginStart: P('margin-inline-start', 'space'), marginEnd: P('margin-inline-end', 'space'), paddingStart: P('padding-inline-start', 'space'),
  paddingEnd: P('padding-inline-end', 'space'), insetInlineStart: P('inset-inline-start', 'space'), insetInlineEnd: P('inset-inline-end', 'space'),
  borderStartRadius: P(['border-start-start-radius', 'border-end-start-radius'], 'radii'), borderEndRadius: P(['border-start-end-radius', 'border-end-end-radius'], 'radii'),
  borderStartWidth: P('border-inline-start-width', 'px'), borderEndWidth: P('border-inline-end-width', 'px'),
  borderStartColor: P('border-inline-start-color', 'colors'), borderEndColor: P('border-inline-end-color', 'colors'),
  borderInlineStartWidth: P('border-inline-start-width', 'px'), borderInlineEndWidth: P('border-inline-end-width', 'px'),
  borderInlineStartColor: P('border-inline-start-color', 'colors'), borderInlineEndColor: P('border-inline-end-color', 'colors'),
  borderInlineStart: P('border-inline-start', 'borders'), borderInlineEnd: P('border-inline-end', 'borders'),
  borderTopStyle: P('border-top-style'), borderBottomStyle: P('border-bottom-style'),
  stackMt: P('--stack-mt', 'space'), stackMs: P('--stack-ms', 'space'), wrapX: P('--wrap-x', 'space'), wrapY: P('--wrap-y', 'space'),
  arPad: P('--ar-pad'), gridCols: P('grid-template-columns'), bgGradient: P('background-image', 'gradient'), bgGrad: P('background-image', 'gradient'),
  borderLeftStyle: P('border-left-style'), borderRightStyle: P('border-right-style'),
};

const UNITLESS = new Set(['opacity', 'z-index', 'flex', 'flex-grow', 'flex-shrink', 'order', 'font-weight', 'line-height', '-webkit-line-clamp', 'aspect-ratio']);
const PSEUDO = {
  _hover: '&:hover', _active: '&:active, &[data-active]', _focus: '&:focus', _focusVisible: '&:focus-visible', _focusWithin: '&:focus-within',
  _disabled: '&:disabled, &[aria-disabled=true], &[data-disabled]', _readOnly: '&[readonly], &[aria-readonly=true]',
  _invalid: '&[aria-invalid=true]', _checked: '&[data-checked]', _indeterminate: '&[data-indeterminate]',
  _selected: '&[aria-selected=true]', _expanded: '&[aria-expanded=true]', _placeholder: '&::placeholder', _before: '&::before', _after: '&::after',
  _first: '&:first-of-type', _last: '&:last-of-type', _even: '&:nth-of-type(even)', _odd: '&:nth-of-type(odd)',
  _groupHover: '[role=group]:hover &', _activeLink: '&[aria-current=page]', _notFirst: '&:not(:first-of-type)',
  _notLast: '&:not(:last-of-type)', _vertical: '&[data-orientation=vertical]', _horizontal: '&[data-orientation=horizontal]',
  _groupFocusVisible: '[role=group]:focus-visible &', _peerFocusVisible: '[data-peer]:focus-visible ~ &',
  _empty: '&:empty', _pressed: '&[aria-pressed=true]', _invalidFocus: '&[aria-invalid=true]:focus',
};

// Pseudo-state style props (`_hover={{ bg }}`) → var + class; only for props states usually change.
const STATES = {
  h: '&:hover', f: '&:focus', fv: '&:focus-visible', a: '&:active, &[data-active]', d: '&:disabled, &[aria-disabled=true], &[data-disabled]',
  ph: '&::placeholder', gh: '[role=group]:hover &', sel: '&[aria-selected=true], &[aria-pressed=true]', ck: '&[data-checked]',
};
const STATE_PROPS = new Set(['bg', 'bgColor', 'color', 'borderColor', 'opacity', 'boxShadow', 'textDecoration', 'transform', 'filter',
  'outline', 'outlineColor', 'cursor', 'borderWidth', 'zIndex', 'fontWeight', 'textUnderlineOffset', 'borderBottomColor', 'fill', 'stroke',
  'backdropFilter', 'visibility', 'display', 'transitionDuration']);
// Style props that take responsive values; others only take a single value.
const RESPONSIVE = new Set(['m', 'mt', 'mr', 'mb', 'ml', 'mx', 'my', 'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py', 'gap', 'rowGap', 'columnGap',
  'top', 'right', 'bottom', 'left', 'inset', 'w', 'h', 'minW', 'maxW', 'minH', 'maxH', 'boxSize', 'flexBasis', 'display', 'position',
  'flex', 'flexDirection', 'flexWrap', 'flexShrink', 'flexGrow', 'alignItems', 'alignSelf', 'justifyContent', 'justifySelf', 'order',
  'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'fontSize', 'lineHeight', 'textAlign', 'whiteSpace',
  'overflow', 'overflowX', 'overflowY', 'borderRadius', 'borderWidth', 'borderLeftWidth', 'borderTopWidth', 'visibility', 'fontWeight',
  'letterSpacing', 'zIndex', 'textOverflow', 'aspectRatio', 'objectFit', 'stackMt', 'stackMs', 'wrapX', 'wrapY', 'arPad', 'color', 'bg']);
// Aliases share the canonical prop's classes.
const ALIAS = { margin: 'm', marginTop: 'mt', marginRight: 'mr', marginBottom: 'mb', marginLeft: 'ml', marginX: 'mx', marginY: 'my',
  padding: 'p', paddingTop: 'pt', paddingRight: 'pr', paddingBottom: 'pb', paddingLeft: 'pl', paddingX: 'px', paddingY: 'py', gridGap: 'gap',
  width: 'w', height: 'h', minWidth: 'minW', maxWidth: 'maxW', minHeight: 'minH', maxHeight: 'maxH', pos: 'position', flexDir: 'flexDirection',
  rounded: 'borderRadius', background: 'bg', backgroundColor: 'bgColor', shadow: 'boxShadow', textDecor: 'textDecoration' };
const INTRINSIC = `
/* intrinsic component styles (from the Chakra 2.5 components) */
.ui-box { min-width: 0; }
.ui-flex { display: flex; }
.ui-stack { display: flex; }
.ui-center { display: flex; align-items: center; justify-content: center; }
.ui-spacer { flex: 1; justify-self: stretch; align-self: stretch; }
.ui-grid { display: grid; }
.ui-wrap { overflow: hidden; }
.ui-wrap__list { display: flex; flex-wrap: wrap; list-style-type: none; padding: 0; margin: calc(var(--wrap-y, 0.5rem) / -2) calc(var(--wrap-x, 0.5rem) / -2); }
.ui-wrap__list > *:not(style) { margin: calc(var(--wrap-y, 0.5rem) / 2) calc(var(--wrap-x, 0.5rem) / 2) !important; }
.ui-wrap__item { display: flex; align-items: flex-start; }
.ui-aspect { position: relative; }
.ui-aspect::before { height: 0; content: ""; display: block; padding-bottom: var(--ar-pad, 75%); }
.ui-aspect > *:not(style) { overflow: hidden !important; position: absolute !important; top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important; display: flex; justify-content: center; align-items: center; width: 100% !important; height: 100% !important; }
.ui-aspect > img, .ui-aspect > video { object-fit: cover !important; }
.ui-divider { border: 0; border-style: solid; border-color: inherit; }
.ui-divider[aria-orientation=horizontal] { border-bottom-width: 1px; width: 100%; }
.ui-divider[aria-orientation=vertical] { border-left-width: 1px; height: 100%; }
.ui-button { display: inline-flex; appearance: none; align-items: center; justify-content: center; user-select: none; position: relative; white-space: nowrap; vertical-align: middle; outline: none; }
.ui-button__icon { display: inline-flex; align-self: center; flex-shrink: 0; }
.ui-button__spinner { display: flex; align-items: center; position: absolute; font-size: 1em; line-height: normal; }
.ui-button-group { display: inline-flex; }
.ui-button-group--attached > *:first-of-type:not(:last-of-type) { border-end-end-radius: 0; border-start-end-radius: 0; }
.ui-button-group--attached > *:not(:first-of-type):not(:last-of-type) { border-radius: 0; }
.ui-button-group--attached > *:not(:first-of-type):last-of-type { border-start-start-radius: 0; border-end-start-radius: 0; }
.ui-badge { display: inline-block; white-space: nowrap; vertical-align: middle; }
.ui-tag__container { display: inline-flex; vertical-align: top; align-items: center; max-width: 100%; }
.ui-tag__closeButton { display: flex; align-items: center; justify-content: center; outline: 0; }
.ui-spinner { display: inline-block; border-color: currentColor; border-style: solid; border-radius: 99999px; border-width: var(--spinner-thickness, 2px); border-bottom-color: var(--spinner-empty, transparent); border-left-color: var(--spinner-empty, transparent); animation: ui-spin var(--spinner-speed, 0.45s) linear infinite; }
@keyframes ui-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.ui-sr-only { border: 0; clip: rect(0, 0, 0, 0); height: 1px; width: 1px; margin: -1px; padding: 0; overflow: hidden; white-space: nowrap; position: absolute; }
.ui-input-group { width: 100%; display: flex; position: relative; isolation: isolate; }
.ui-input-group__addon { flex: 0 0 auto; width: auto; display: flex; align-items: center; white-space: nowrap; }
.ui-input-group__element { display: flex; align-items: center; justify-content: center; position: absolute; top: 0; z-index: 2; }
.ui-select__wrapper { width: 100%; height: fit-content; position: relative; }
.ui-select__iconWrap { position: absolute; display: inline-flex; align-items: center; justify-content: center; pointer-events: none; top: 50%; transform: translateY(-50%); }
.ui-number-input__root { position: relative; z-index: 0; }
.ui-number-input__stepperGroup { display: flex; flex-direction: column; position: absolute; top: 0; inset-inline-end: 0; margin: 1px; height: calc(100% - 2px); z-index: 1; }
.ui-number-input__stepper { display: flex; justify-content: center; align-items: center; flex: 1; user-select: none; cursor: pointer; line-height: normal; background: transparent; }
.ui-checkbox__container { cursor: pointer; display: inline-flex; align-items: center; vertical-align: top; position: relative; }
.ui-checkbox__control { display: inline-flex; align-items: center; justify-content: center; vertical-align: top; user-select: none; flex-shrink: 0; }
.ui-checkbox__input { border: 0; clip: rect(0, 0, 0, 0); height: 1px; width: 1px; margin: -1px; padding: 0; overflow: hidden; white-space: nowrap; position: absolute; }
.ui-menu__button { display: inline-flex; appearance: none; align-items: center; outline: 0; }
.ui-menu__list { outline: 0; }
.ui-menu__item { display: flex; align-items: center; width: 100%; text-align: start; text-decoration: none; outline: 0; }
.ui-modal__dialogContainer { display: flex; width: 100vw; height: 100vh; height: 100dvh; position: fixed; left: 0; top: 0; }
.ui-modal__dialog { display: flex; flex-direction: column; position: relative; width: 100%; outline: 0; }
.ui-modal__footer { display: flex; align-items: center; justify-content: flex-end; }
.ui-modal__overlay { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; }
.ui-popover__content { position: relative; display: flex; flex-direction: column; }
.ui-tabs__tab { outline: 0; display: flex; align-items: center; justify-content: center; }
.ui-tabs__tablist { display: flex; }
.ui-accordion__button { display: flex; align-items: center; width: 100%; outline: 0; }
.ui-accordion__icon { transition: transform 0.2s; transform-origin: center; }
.ui-accordion__button[aria-expanded=true] .ui-accordion__icon { transform: rotate(-180deg); }
.ui-avatar__container { display: inline-flex; align-items: center; justify-content: center; text-align: center; text-transform: uppercase; font-weight: 500; position: relative; flex-shrink: 0; }
.ui-avatar__container > img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
.ui-stat__container { position: relative; flex: 1 1 0%; }
.ui-close-button { outline: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ui-table-container { display: block; white-space: nowrap; -webkit-overflow-scrolling: touch; overflow-x: auto; overflow-y: hidden; max-width: 100%; }
.ui-tooltip { position: fixed; z-index: 1800; pointer-events: none; }
.ui-popover__popper { z-index: 1500; }
.ui-slider__container { display: inline-block; position: relative; cursor: pointer; }
.ui-slider__track { overflow: hidden; }
.ui-slider__thumb { display: flex; align-items: center; justify-content: center; position: absolute; outline: 0; }
.ui-icon { display: inline-block; line-height: 1em; flex-shrink: 0; vertical-align: middle; width: 1em; height: 1em; color: currentColor; }
.ui-collapse { overflow: hidden; }
`;
const POST = `
/* prop-driven variants Chakra computes per instance */
.ui-modal__dialogContainer.ui-modal--centered { align-items: center; }
.ui-modal__dialog.ui-modal--centered { margin: auto; }
.ui-modal__dialogContainer.ui-modal--inside { overflow: hidden; }
.ui-modal__dialog.ui-modal--inside { max-height: calc(100% - 7.5rem); }
.ui-modal__body.ui-modal--inside { overflow: auto; }
.ui-checkbox__input:focus-visible + .ui-checkbox__control { box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-c-accent-300) 28%, transparent); }
.ui-tabs__root[data-orientation=vertical] { display: flex; }
.ui-tabs__root[data-align=center] .ui-tabs__tablist { justify-content: center; }
.ui-tabs__root[data-align=end] .ui-tabs__tablist { justify-content: flex-end; }
[hidden] { display: none !important; }
.ui-select__iconWrap.ui-select__icon { position: absolute; }
`;
function kebab(s) { return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`); }

function makeResolver(theme) {
  const colorVar = (pal, shade) => `var(--ui-c-${pal}-${shade})`;
  const semantic = theme.semanticTokens?.colors ?? {};
  const scales = {
    space: theme.space, sizes: flatten(theme.sizes), fontSizes: theme.fontSizes, fontWeights: theme.fontWeights,
    lineHeights: theme.lineHeights, letterSpacings: theme.letterSpacings, radii: theme.radii, shadows: theme.shadows,
    zIndices: theme.zIndices, borders: theme.borders, fonts: theme.fonts, transitionProperty: theme.transition.property,
    transitionDuration: theme.transition.duration, transitionEasing: theme.transition.easing,
  };
  function color(v) {
    if (typeof v !== 'string') return v;
    let t = v.startsWith('colors.') ? v.slice(7) : v;
    if (semantic[t]) t = semantic[t]._dark ?? semantic[t].default ?? t;
    if (typeof t !== 'string') return t;
    const m = /^([a-zA-Z]+)\.(\d+)$/.exec(t);
    if (m && PALETTES.includes(m[1])) return colorVar(m[1], m[2]);
    const hub = /^(hub|surface)\.(\w+)$/.exec(t);
    if (hub) return `var(--ui-c-${hub[1]}-${kebab(hub[2])})`;
    if (t === 'surface') return 'var(--ui-c-surface-default)';
    return t;
  }
  function one(v, scale, cssProp) {
    if (v === null || v === undefined) return v;
    if (scale === 'colors') return color(v);
    if (typeof v === 'string' && v.startsWith('var(')) return v;
    if (scale === 'shadows' && v === 'outline') return '0 0 0 3px color-mix(in srgb, var(--ui-c-accent-300) 28%, transparent)';
    const table = scales[scale];
    if (table) {
      const neg = typeof v === 'number' ? v < 0 : typeof v === 'string' && v.startsWith('-') && table[v.slice(1)] !== undefined;
      const key = neg ? String(v).replace(/^-/, '') : String(v);
      if (table[key] !== undefined && (scale !== 'sizes' || typeof v !== 'string' || !/^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(v))) {
        const r = table[key];
        return neg ? `calc(${r} * -1)` : r;
      }
      if (scale === 'radii' && typeof v === 'string' && v.includes(' ')) return v.split(/\s+/).map((x) => one(x, 'radii')).join(' ');
      if (scale === 'borders' && typeof v === 'string') return v.replace(/\b([a-zA-Z]+\.\d+)\b/g, (x) => color(x));
    }
    if (typeof v === 'number' && cssProp && !UNITLESS.has(cssProp)) return v === 0 ? '0' : `${v}px`;
    return v;
  }
  return { one, color };
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') flatten(v, `${prefix}${k}.`, out);
    else out[`${prefix}${k}`] = v;
  }
  return out;
}

// Dark-only sites: `_dark` overrides merge into their parent (later keys win), `_light` is dropped.
function mergeDark(style) {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return style;
  const out = {};
  for (const [k, v] of Object.entries(style)) {
    if (k === '_light') continue;
    if (k === '_dark') { for (const [dk, dv] of Object.entries(mergeDark(v) ?? {})) out[dk] = dv && typeof dv === 'object' && out[dk] && typeof out[dk] === 'object' ? { ...out[dk], ...dv } : dv; continue; }
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? mergeDark(v) : v;
  }
  return out;
}

// style object → { selector: { decls }, '@media …': {...} } list of rules
function compile(style, selectors, resolver, out, media = '') {
  if (!style || typeof style !== 'object') return;
  style = mergeDark(style);
  const decls = [];
  for (const [key, raw] of Object.entries(style)) {
    if (raw === undefined || raw === null) continue;
    if (key === '_dark') { compile(raw, selectors, resolver, out, media); continue; }
    if (key === '_light') continue;
    if (key.startsWith('--')) { decls.push([key, cssVarValue(raw, resolver)]); continue; }
    if (PSEUDO[key]) { compile(raw, nest(selectors, PSEUDO[key]), resolver, out, media); continue; }
    if (key.startsWith('@media') || key.startsWith('@supports')) { compile(raw, selectors, resolver, out, `${media}${key}|`); continue; }
    const def = PROPS[key];
    if (!def) {
      if (key === 'noOfLines') { decls.push(...lineClamp(raw)); continue; }
      if (key === 'apply' || key === 'layerStyle' || key === 'textStyle' || key === 'srOnly') continue;
      if (/^[a-z][a-zA-Z]*$/.test(key) && typeof raw !== 'object') { decls.push([kebab(key), String(raw)]); continue; }
      compile(raw, key.includes('&') ? nest(selectors, key) : nest(selectors, key.split(',').map((k) => `& ${k.trim()}`).join(', ')), resolver, out, media);
      continue;
    }
    if (Array.isArray(raw) || (typeof raw === 'object')) {
      const entries = Array.isArray(raw) ? raw.map((v, i) => [BP_KEYS[i], v]) : Object.entries(raw);
      for (const [bp, v] of entries) {
        if (v === null || v === undefined) continue;
        const sub = { [key]: v };
        if (bp === 'base' || bp === '_') compile(sub, selectors, resolver, out, media);
        else if (BREAKPOINTS[bp]) compile(sub, selectors, resolver, out, `${media}@media screen and (min-width: ${BREAKPOINTS[bp]})|`);
      }
      continue;
    }
    for (const cssProp of def.css) decls.push([cssProp, String(resolver.one(raw, def.scale, cssProp))]);
  }
  if (decls.length) out.push({ media, selector: selectors.join(', '), decls });
}

function cssVarValue(raw, resolver) {
  if (typeof raw !== 'string') return String(raw);
  if (raw.startsWith('colors.')) return resolver.color(raw);
  if (/^[a-zA-Z]+\.\d+$/.test(raw)) return resolver.color(raw);
  return raw;
}

function lineClamp(n) {
  return [['overflow', 'hidden'], ['text-overflow', 'ellipsis'], ['display', '-webkit-box'], ['-webkit-box-orient', 'vertical'], ['-webkit-line-clamp', String(n)]];
}

function nest(parents, pattern) {
  const parts = pattern.split(/,(?![^(]*\))/).map((s) => s.trim());
  const out = [];
  for (const p of parents) for (const part of parts) out.push(part.includes('&') ? part.replace(/&/g, p) : `${p} ${part}`);
  return out;
}

function render(rules) {
  const groups = new Map();
  for (const r of rules) {
    const body = r.decls.map(([k, v]) => `${k}: ${v};`).join(' ');
    const key = `${r.media}\u0000${body}`;
    if (!groups.has(key)) groups.set(key, { media: r.media, body, selectors: [] });
    groups.get(key).selectors.push(r.selector);
  }
  const lines = [];
  for (const g of groups.values()) {
    let rule = `${[...new Set(g.selectors)].join(', ')} { ${g.body} }`;
    const medias = g.media.split('|').filter(Boolean);
    for (const m of medias.reverse()) rule = `${m} { ${rule} }`;
    lines.push(rule);
  }
  return lines.join('\n');
}

const call = (v, p) => (typeof v === 'function' ? v(p) : v);
const themeFor = (game) => extendTheme(hubChakraTheme(game));
const baseTheme = themeFor('lo');
const resolver = makeResolver(baseTheme);

function componentRules(theme, name, scheme, onlyScheme) {
  const c = theme.components[name];
  const cls = `ui-${kebab(name).replace(/^-/, '')}`;
  const props = (o) => ({ theme, colorMode: 'dark', colorScheme: scheme, orientation: 'horizontal', ...c.defaultProps, ...o });
  const rules = [];
  const multipart = Array.isArray(c.parts) && c.parts.length;
  const emit = (style, scope) => {
    if (!style) return;
    if (multipart) {
      for (const [part, s] of Object.entries(style)) compile(s, [`.${cls}__${part}${scope}`], resolver, rules);
      if (style.root || style.container) { /* root parts are elements too */ }
    } else compile(style, [scope ? `${scope}.${cls}` : `.${cls}`], resolver, rules);
  };
  if (!onlyScheme) {
    emit(call(c.baseStyle, props({})), multipart ? '' : '');
    for (const size of Object.keys(c.sizes ?? {})) {
      const s = call(c.sizes[size], props({ size }));
      if (multipart) emit(s, `.${cls}--size-${size}`); else compile(s, [`.${cls}.${cls}--size-${size}`], resolver, rules);
    }
  }
  for (const variant of Object.keys(c.variants ?? {})) {
    const s = call(c.variants[variant], props({ variant, colorScheme: scheme }));
    const neutral = JSON.stringify(s) === JSON.stringify(call(c.variants[variant], props({ variant, colorScheme: 'gray' })))
      && JSON.stringify(s) === JSON.stringify(call(c.variants[variant], props({ variant, colorScheme: 'red' })));
    if (neutral && onlyScheme) continue;
    const mod = neutral ? `.${cls}--${variant}` : `.${cls}--${variant}-${scheme}`;
    if (multipart) emit(s, mod); else compile(s, [`.${cls}${mod}`], resolver, rules);
  }
  return rules;
}

const ruleText = (rules) => render(rules);
const sections = [];

// palette vars
const pal = [];
for (const p of PALETTES.filter((x) => x !== 'accent')) for (const [shade, v] of Object.entries(baseTheme.colors[p])) pal.push(`--ui-c-${p}-${shade}: ${v};`);
for (const [k, v] of Object.entries(baseTheme.colors.hub)) pal.push(`--ui-c-hub-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(baseTheme.colors.surface)) pal.push(`--ui-c-surface-${kebab(k === 'DEFAULT' ? 'default' : k)}: ${v};`);
const accentVars = (hex) => Object.entries(accentScale(hex)).map(([s, v]) => `--ui-c-accent-${s}: ${v};`).join(' ');
sections.push(`:root { ${pal.join(' ')} ${accentVars(HUB_ACCENT)} }`);
for (const g of GAMES) sections.push(`[data-game="${g.id}"] { ${accentVars(g.accent)} }`);

// global styles
const globalRules = [];
const globalStyle = call(baseTheme.styles.global, { theme: baseTheme, colorMode: 'dark' });
for (const [sel, style] of Object.entries(globalStyle)) {
  if (sel.startsWith('@media')) { for (const [s2, st2] of Object.entries(style)) compile(st2, [s2], resolver, globalRules, `${sel}|`); continue; }
  compile(style, [sel.replace(/&/g, '')], resolver, globalRules);
}
sections.push('/* global */\n' + ruleText(globalRules));
sections.push(INTRINSIC.trim());

// components
const defaults = {};
for (const name of COMPONENTS) {
  const c = baseTheme.components[name];
  defaults[name] = { ...c.defaultProps, parts: c.parts ?? null, sizes: Object.keys(c.sizes ?? {}), variants: Object.keys(c.variants ?? {}) };
  const rules = [];
  rules.push(...componentRules(baseTheme, name, 'gray', false));
  for (const scheme of SCHEMES.filter((s) => s !== 'gray' && s !== 'accent')) rules.push(...componentRules(baseTheme, name, scheme, true));
  sections.push(`/* ${name} */\n${ruleText(rules)}`);
  // accent: identical across games once colours are vars, otherwise scoped per game
  const perGame = GAMES.map((g) => ({ id: g.id, text: ruleText(componentRules(themeFor(g.id), name, 'accent', true)) }));
  if (perGame.every((x) => x.text === perGame[0].text)) sections.push(perGame[0].text);
  else for (const g of perGame) sections.push(ruleText(componentRules(themeFor(g.id), name, 'accent', true).map((r) => ({ ...r, selector: r.selector.split(', ').map((s) => `[data-game="${g.id}"] ${s}`).join(', ') }))));
}

sections.push(POST.trim());

// Stack spacing as classes per space token and breakpoint (sibling margins, like Chakra's Stack).
const STACK_KEYS = ['0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '12', '14', '16'];
const stackRules = [];
for (const bp of BP_KEYS) {
  for (const k of STACK_KEYS) {
    const v = baseTheme.space[k];
    if (v === undefined) continue;
    const slug = k.replace('.', '_');
    const imp = (d) => d.replace(/;/g, ' !important;');
    const col = `.ui-sv-${slug}-${bp} > *:not(style) ~ *:not(style) { ${imp(`margin-top: ${v}; margin-inline-end: 0; margin-bottom: 0; margin-inline-start: 0;`)} }`;
    const row = `.ui-sh-${slug}-${bp} > *:not(style) ~ *:not(style) { ${imp(`margin-top: 0; margin-inline-end: 0; margin-bottom: 0; margin-inline-start: ${v};`)} }`;
    stackRules.push(bp === 'base' ? `${col}\n${row}` : `@media screen and (min-width: ${BREAKPOINTS[bp]}) { ${col} ${row} }`);
  }
}
sections.push('/* stack spacing */\n' + stackRules.join('\n'));
// responsive and hover style-prop classes
const resp = [];
const hover = [];
for (const [name, def] of Object.entries(PROPS)) {
  if (ALIAS[name]) continue;
  if (def.css.every((c) => c.startsWith('-webkit'))) continue;
  if (STATE_PROPS.has(name)) {
    for (const [prefix, sel] of Object.entries(STATES)) {
      hover.push(`${sel.split(', ').map((s) => s.replace('&', `.${prefix}-${name}`)).join(', ')} { ${def.css.map((c) => `${c}: var(--${prefix}-${name}) !important;`).join(' ')} }`);
    }
  }
  if (!RESPONSIVE.has(name)) continue;
  for (const bp of BP_KEYS) {
    const decl = def.css.map((c) => `${c}: var(--r-${name}-${bp});`).join(' ');
    const rule = `.r-${name}-${bp}.r-${name}-${bp} { ${decl} }`;
    resp.push(bp === 'base' ? rule : `@media screen and (min-width: ${BREAKPOINTS[bp]}) { ${rule} }`);
  }
}
const order = (a) => BP_KEYS.flatMap((bp) => a.filter((r) => (bp === 'base' ? !r.startsWith('@media') : r.includes(`(min-width: ${BREAKPOINTS[bp]})`))));
sections.push('/* responsive style props */\n' + order(resp).join('\n'));
sections.push('/* hover style props */\n' + hover.join('\n'));
sections.push('/* line clamp */\n.ui-clamp { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--ui-clamp); }');

const header = '/* Generated by scripts/gen-ui.mjs from the hub Chakra theme; do not edit. */\n';
fs.writeFileSync(path.join(root, 'styles', 'ui.css'), header + sections.join('\n\n') + '\n');

// reset
const resetSrc = fs.readFileSync(require.resolve('@chakra-ui/css-reset').replace(/index\.js$/, '') + fs.readdirSync(path.dirname(require.resolve('@chakra-ui/css-reset'))).find((f) => f.startsWith('chunk-') && f.endsWith('.mjs')), 'utf8');
const resetCss = /styles: css`([\s\S]*?)`\s*\}/.exec(resetSrc)?.[1];
if (!resetCss) throw new Error('could not find the Chakra CSS reset');
const vh = /var vhPolyfill = css`([\s\S]*?)`;/.exec(resetSrc)?.[1] ?? '';
fs.writeFileSync(path.join(root, 'styles', 'ui-reset.css'),
  `/* Element reset for sites leaving Chakra, from @chakra-ui/css-reset (MIT License, Copyright (c) 2019 Segun Adebayo). Generated by scripts/gen-ui.mjs. */\n${vh.trim()}\n${resetCss.replace(/\$\{scope\}\s*/g, '').replace(/\$\{vhPolyfill\}/g, '').trim()}\n`);

// tokens for the runtime resolver
const t = baseTheme;
const tokens = {
  breakpoints: BREAKPOINTS,
  scales: {
    space: t.space, sizes: flatten(t.sizes), fontSizes: t.fontSizes, fontWeights: t.fontWeights, lineHeights: t.lineHeights,
    letterSpacings: t.letterSpacings, radii: t.radii, shadows: { ...t.shadows, outline: '0 0 0 3px color-mix(in srgb, var(--ui-c-accent-300) 28%, transparent)' },
    zIndices: t.zIndices, borders: t.borders, fonts: t.fonts, transitionProperty: t.transition.property,
    transitionDuration: t.transition.duration, transitionEasing: t.transition.easing,
  },
  palettes: PALETTES,
  props: Object.fromEntries(Object.entries(PROPS).map(([k, v]) => [k, v.scale ? [v.css, v.scale] : [v.css]])),
  alias: ALIAS,
  states: { _hover: 'h', _focus: 'f', _focusVisible: 'fv', _active: 'a', _disabled: 'd', _placeholder: 'ph', _groupHover: 'gh', _selected: 'sel', _checked: 'ck' },
  stateProps: [...STATE_PROPS],
  responsive: [...RESPONSIVE],
  stackKeys: STACK_KEYS,
  components: defaults,
  headingSizes: Object.fromEntries(Object.entries(t.components.Heading.sizes).map(([k, v]) => [k, call(v, { theme: t })])),
};
fs.writeFileSync(path.join(root, 'src', 'ui', 'tokens.gen.ts'),
  `// Generated by scripts/gen-ui.mjs from the hub Chakra theme; do not edit.\n/* eslint-disable */\nexport const UI_TOKENS = ${JSON.stringify(tokens, null, 1)} as const;\n`);

const size = fs.statSync(path.join(root, 'styles', 'ui.css')).size;
console.log(`gen-ui: styles/ui.css ${(size / 1024).toFixed(1)} KiB, ui-reset.css, src/ui/tokens.gen.ts`);
