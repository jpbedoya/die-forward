/**
 * Die Forward — design tokens.
 *
 * Single source of truth for the palette. Imported by:
 *   - `mobile/tailwind.config.js` (className-driven styling — the default)
 *   - TS components that reach for the `style={{ color: ... }}` escape hatch
 *     (inline styles where animated/dynamic values are computed in JS)
 *
 * Text tier contrast ratios are calculated against `crypt.bg` (#0d0d0d):
 *
 *   tier               value     contrast    WCAG (normal text)
 *   bone               #e7e5e4   ~18:1       AAA — headlines, primary surface
 *   bone.muted         #a8a29e    ~7.9:1     AAA — primary body text
 *   bone.dark          #8e8780    ~5.0:1     AA  — secondary body (was #78716c, 4.3:1; bumped to comfortably clear AA)
 *   bone.faint         #5c5854    ~2.6:1     fails AA — decorative ONLY
 *                                            (placeholders, dev-comment-style labels, // COMING SOON)
 *
 * Do not hand-pick greyscale hex values inline. Either use a Tailwind class
 * (`text-bone-dark`, `text-bone-faint`, ...) or import from this file:
 *
 *   import { palette } from '../lib/theme';
 *   <View style={{ borderColor: palette.bone.dark }} />
 *
 * Same rule for off-palette accents — if you need a new colour, add it here
 * with a contrast note, don't bake the hex into a component.
 */

const palette = {
  crypt: {
    bg: '#0d0d0d',                  // app background
    surface: '#1c1917',             // raised surfaces (cards)
    border: '#292524',
    'border-light': '#44403c',
  },
  amber: {
    DEFAULT: '#f59e0b',             // primary accent (CTAs, active highlight)
    light: '#fbbf24',
    dark: '#d97706',
  },
  bone: {
    DEFAULT: '#e7e5e4',             // primary text
    muted: '#a8a29e',                // body text
    dark: '#8e8780',                 // secondary body (AA)
    faint: '#5c5854',                // decorative only (sub-AA — placeholders, comments)
  },
  blood: {
    DEFAULT: '#ef4444',             // death / damage / errors
    light: '#fca5a5',
    dark: '#7f1d1d',
  },
  ethereal: {
    DEFAULT: '#a855f7',             // mystical / void zone
    light: '#c084fc',
  },
  victory: {
    DEFAULT: '#22c55e',             // success / healing
    light: '#4ade80',
  },
};

module.exports = { palette };
