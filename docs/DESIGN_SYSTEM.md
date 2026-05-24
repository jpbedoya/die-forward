# Design System

One palette, two platforms, three places it shows up.

## Source of truth

`mobile/lib/theme.js` — plain CJS module exporting `{ palette }`. Every other surface reads from this file directly or mirrors its values; nothing else in the codebase should ship a one-off hex string.

```js
// mobile/lib/theme.js
const palette = {
  crypt:    { bg, surface, border, 'border-light' },
  amber:    { DEFAULT, light, dark },
  bone:     { DEFAULT, muted, dark, faint },
  blood:    { DEFAULT, light, dark },
  ethereal: { DEFAULT, light },
  victory:  { DEFAULT, light },
};
```

## Consumers

**Mobile (`mobile/`)** — Tailwind config imports the palette and emits classes:
- `mobile/tailwind.config.js` does `require('./lib/theme.js')` → NativeWind generates `text-bone-muted`, `bg-crypt-surface`, `border-blood/30`, etc.
- For inline styles where Tailwind classes can't reach (computed colours, animated values), import the palette directly: `import { palette } from '../lib/theme'`.

**Web (`src/`)** — `src/app/globals.css` mirrors the palette into CSS variables so existing pages keep using `var(--text-muted)` etc. without rewriting:
- `--bg-base`, `--bg-surface`, `--bg-elevated` ← `crypt.bg`, `crypt.surface`, +1
- `--text-primary` / `-secondary` / `-muted` / `-dim` / `-faint` ← bone tiers
- Accent colours (`--amber`, `--red`, `--purple`, `--green`) are identical hexes on both sides; the divergence is only in greyscale + surface tones.

**Live reference** — [`/design`](https://dieforward.com/design) (or [`src/app/design/page.tsx`](../src/app/design/page.tsx)). Renders every token with its WCAG contrast ratio computed against `crypt.bg`, plus do/don't rules and composite UI examples. Imports `palette` from the same `mobile/lib/theme.js` so the page never drifts.

## Text hierarchy (what to reach for)

| Token | Hex | Contrast | When to use |
|---|---|---|---|
| `bone` | `#e7e5e4` | ~18:1 AAA | Headlines, primary narrative |
| `bone.muted` | `#a8a29e` | ~7.9:1 AAA | Body copy, default for paragraphs |
| `bone.dark` | `#8e8780` | ~5.0:1 AA | Secondary info — footnotes, `//`-style labels |
| `bone.faint` | `#5c5854` | ~2.6:1 — fails AA | **Decorative only** (placeholders, `// COMING SOON`, version stamps) |

`bone.faint` is the explicit "intentionally sub-AA" tier. Use it for metadata the player doesn't *need* to read. Anything informational must be `bone.dark` or brighter.

## Rules

1. **Never bake a hex string into a component.** Import the token. New colour? Add it to `mobile/lib/theme.js`, restart the dev server, use it via Tailwind class or `palette.x.y`.
2. **No new greyscale below ~5:1 unless it's `bone.faint`** — and even then, mark with a comment if it's not obvious it's intentional.
3. **Don't add tokens to `globals.css` directly.** The web side is a mirror of mobile; add new colours to `mobile/lib/theme.js` and reflect into `globals.css`.
4. **The `/design` page enumerates the theme.** New tokens should appear there too — it's the QA artifact for the system.

## Why warm tones

The original web theme used neutral greys (`#666`, `#888`, `#bbb`). The mobile palette uses warm stone/bone tones (`#5c5854`, `#8e8780`, `#a8a29e`). Both platforms now use the warm version — better thematic match for "crypt, bones, depth" than "VS Code colour scheme". Also fixed the `--text-dim` AA bug (was 3.45:1, now 5:1) as a side-effect.

## Related

- [`mobile/lib/theme.js`](../mobile/lib/theme.js) — palette definition
- [`mobile/tailwind.config.js`](../mobile/tailwind.config.js) — Tailwind mapping
- [`src/app/globals.css`](../src/app/globals.css) — CSS-var mirror for web
- [`src/app/design/page.tsx`](../src/app/design/page.tsx) — live reference page
- Memory: `native-rendering-gotchas` — Android-specific rendering quirks (separate concern, but tied to "why some inline styles broke")
