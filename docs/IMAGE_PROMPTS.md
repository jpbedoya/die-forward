# Die Forward — Image Generation Prompts

All prompts are optimized for **DALL·E (ChatGPT)** but work with Midjourney and Flux too.

---

## Brand Reference

**Color palette**
- Background: near-black / charcoal `#0a0a0a`
- Amber / gold highlights `#f59e0b`
- Bone white `#d4d0c8`
- Blood red accents `#8b3a3a`
- Ethereal violet `#7c3aed`
- Victory green `#22c55e`

**Tone keywords:** terminal-gothic, dark dungeon horror, minimal CRT aesthetic, roguelite, ominous but beautiful, lonely-but-not-alone

---

## 1. App Icon

### Usage
- Android launcher + adaptive icon
- iOS App Store icon
- Square, multiple sizes (512×512 master)

### Prompt A — Blade (variant 1)

Mobile game icon. A downward-pointing rusted blade plunging into black still water, creating a single ripple. Pale bone white handle against pure black background. Amber light catching the rust on the blade. Minimal, bold, iconic. Dark souls aesthetic meets ancient flooded temple. No text. Square format, strong silhouette, readable at small sizes. Matte painterly finish.

---

### Prompt B — Skull (variant 2, currently used)

Epic mobile game app icon for a dark roguelite. Central image: a weathered skull half-submerged in perfectly still black water, a flickering amber torch flame reflected on the surface, ancient flooded stone stairs descending into darkness behind it. Color palette: deep black, abyssal dark blue, pale bone white, sickly muted green, amber gold. Style: dark gothic, hand-painted texture, painterly but readable at small sizes. Dramatic low-angle lighting, single strong light source (the torch). Atmosphere of cold ancient dread — patient, not aggressive. No text. Square composition, centered subject, bold silhouette that reads clearly at 64x64px. Ultra detailed, cinematic, 1024x1024.

---

## 2. Twitter / X Banner

### Usage
- Twitter/X profile header
- 1500×500px
- Profile avatar overlaps lower-left in display — keep lower-left clean

### Prompt

Create a **Twitter/X profile banner** (1500×500, wide landscape) for an indie dark-fantasy roguelite called **"Die Forward."**

Style: cinematic terminal-gothic. Dark, minimal, atmospheric.

**Composition:**
- Left side: smaller skull sigil / crypt symbol / subtle rune decoration
- Center (slightly left): title text **DIE FORWARD** in bold distressed monospace lettering — this is the hero element
- Right side: silhouetted lone adventurer descending stone steps into a flooded crypt corridor, seen from behind, torch in hand
- Background: dripping cavern walls, shallow reflective water, fog, distant amber torch glow
- Subtle UI motifs scattered: small HP glyphs, ASCII-style thin separator lines, cryptic symbols
- Overall: dark, wide, cinematic — like a game's title screen letterboxed to banner shape

**Colors:**
- Near-black charcoal base
- Amber highlight on the title text and torch glow
- Bone white for adventurer silhouette outline
- Blood red used very sparingly (maybe a single detail)
- Faint violet-tinted fog

**Typography feel:** brutalist, monospaced, cracked stone engraving — "DIE FORWARD" should be immediately legible

**Avoid:** bright cheerful colors, anime style, cartoon faces, sci-fi neon, watermarks, logos, clutter, illegible title text. Do not put text in lower-left corner (profile avatar area).

---

## 3. Marketing Page — Hero Section

### Usage
- `dieforward.com` landing page hero image or background
- Wide / fullscreen, darkens behind overlaid text
- Can be animated (HTML canvas) or static

### Prompt

Create a **fullscreen hero background image** for the marketing website of an indie dark-fantasy roguelite called **"Die Forward."**

Style: moody, painterly, dark atmospheric. This sits behind white/amber text overlays — must not compete visually.

**Visual concept:**
- A vast flooded underground crypt chamber, viewed as if standing inside looking down a long central corridor
- Stone archways recede into deep darkness — strong one-point perspective
- Shallow dark water covers the floor, perfectly reflecting the arches and a distant amber light source
- Scattered: fallen armor fragments, bones, small floating embers
- Atmosphere: heavy fog, volumetric light rays from a single distant source (amber/gold torchlight)
- A faint distant figure (barely visible silhouette) at the far end of the corridor — tiny, alone

**Colors:**
- Predominantly black and deep charcoal
- Reflective water surface with amber and violet streaks
- Focal amber glow at vanishing point
- Bone white stone texture on walls/arches

**Requirements:**
- Very dark overall — image should NOT overpower text overlaid on it
- Lots of "negative space" darkness around the edges (vignette naturally)
- Horizontal composition 16:9 or wider
- Cinematic, like a AAA concept art piece
- No characters with faces, no text in image

**Avoid:** bright sky, outdoor scenes, fantasy castles, colorful lighting, cartoon style.

---

## 4. Marketing Page — Descent Timeline Icons

### Usage
- Circular icon badges used in the 5-step descent timeline on `dieforward.com`
- Each step in the game loop gets a custom icon inside a circle
- Current icons are emoji — replace with custom illustrations
- 5 icons, same style set, different accent colors per step

**Shared style for all icons:**
- Minimal flat illustration inside a circle
- Dark near-black interior `#0a0a0a`, thin colored rim border
- Single primary symbol, centered, simplified — readable at 48px
- No text inside icon
- Line weight: medium, slightly rough / hand-chiseled feel
- Background should be transparent or very dark

---

### Icon 1 — STAKE YOUR SOL

**Accent color:** Amber `#f59e0b`

Create a circular icon showing a **Solana coin (◎ symbol)** falling/dropping into dark water, with a small ripple below it. The coin should be amber/gold-tinted. Simple, flat, iconic.

---

### Icon 2 — FIGHT OR FLEE

**Accent color:** Blood red `#ef4444`

Create a circular icon showing **two crossed swords** in a minimalist style — like a battle emblem. Slightly worn, not cartoonish. The swords should have a subtle glow or motion blur suggesting combat. Dark background, red-tinted blades.

---

### Icon 3 — DIE & LEAVE YOUR MARK

**Accent color:** Ethereal violet `#7c3aed`

Create a circular icon showing a **skull with a quill pen** — the quill is mid-writing, as if etching final words. The skull is simple and flat, the quill suggestion is minimal. Violet tint, bone white skull.

---

### Icon 4 — TIP THE FALLEN

**Accent color:** Victory green `#22c55e`

Create a circular icon showing a **hand dropping a coin** — a simple silhouetted hand from above, releasing a single glowing coin downward toward a small grave marker or stone below. Green-tinted coin, dark hand.

---

### Icon 5 — REST IN SOL (Tombstone)

**Accent color:** Stone grey / muted `#6b7280`

Create a circular icon of a **simple gothic tombstone** — flat, carved stone, slightly cracked. The tombstone has a minimal skull or "◈" engraved in it. No text on the stone. Muted grey, heavy shadow, mossy bottom edge suggesting depth.

---

## Generation Notes

- **DALL·E output size:** use 1024×1024 square for icons/app icon, 1792×1024 for banner + hero
- **Iteration tip:** if first result is too colorful or cartoony, add: *"Dark, almost monochromatic, matte finish, no bright colors"*
- **Style lock:** once you get a style you like for the timeline icons, paste the first result description back into subsequent prompts as a "style reference" line
- All assets should live in `art/generated/` once finalized
