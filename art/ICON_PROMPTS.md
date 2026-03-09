# Die Forward — Combat Icon Prompts

All prompts optimized for **DALL·E (ChatGPT)**. Use **512×512** square.

These are **UI icons**, not full art pieces. They replace combat action emojis in the game interface — designed to read clearly at small sizes (48–64px) while matching the crypt aesthetic.

---

## ⚠️ Shared Style Block

Every icon uses this same visual language:

> Style: dark fantasy UI icon. Flat, simplified linework on a **transparent background**. Single accent color per icon — muted, aged, no gradients, no glow, no shine. Rough-edged strokes that look hand-carved or woodcut. Icon fills 70% of the frame. No text, no borders, no UI chrome. Must read clearly at 48×48px. Same hand and aesthetic as a cursed medieval manuscript.

**Icon-specific rules:**
- One dominant accent color per icon (specified per prompt)
- Bold, simple silhouette — readable at tiny sizes
- No photorealism — this is flat iconography, not illustration
- **Transparent background** — generate with alpha, no background fill
- Export as PNG with alpha channel



---

## Combat Actions

### Strike ⚔️ — *Attack the enemy*

**Output file:** `strike.png`

```
Dark fantasy UI icon for a dungeon roguelite game.
A single broken sword blade pointing diagonally down-right.
The blade is chipped, ancient, edges rough and uneven.
Flat simplified linework. Hand-carved or woodcut aesthetic.
Dominant accent color: deep amber (#B45309). Isolated on white background (for background removal).
No gradients, no glow, no shine. Icon fills 70% of frame.
Must read clearly at 48x48px. No text, no border, no UI chrome.

Style: flat dark fantasy icon, woodcut linework, medieval manuscript aesthetic.
Muted aged palette. Rough strokes. White background. Square format 512x512.
```

---

### Dodge 💨 — *Evade the attack*

**Output file:** `dodge.png`

```
Dark fantasy UI icon for a dungeon roguelite game.
Three curved motion lines sweeping to the left — the afterimage of a body that was just there.
Abstract, implying absence more than movement. Minimal negative space composition.
Flat simplified linework. Hand-carved or woodcut aesthetic.
Dominant accent color: pale silver-grey (#9CA3AF). Isolated on white background (for background removal).
No gradients, no glow, no shine. Icon fills 70% of frame.
Must read clearly at 48x48px. No text, no border, no UI chrome.

Style: flat dark fantasy icon, woodcut linework, medieval manuscript aesthetic.
Muted aged palette. Rough strokes. White background. Square format 512x512.
```

---

### Brace 🛡️ — *Reduce damage*

**Output file:** `brace.png`

```
Dark fantasy UI icon for a dungeon roguelite game.
A cracked kite shield, no heraldry. Worn edges, a single stress fracture running
diagonally across the face. Dented in the center — it's already been hit.
Flat simplified linework. Hand-carved or woodcut aesthetic.
Dominant accent color: slate blue (#475569). Isolated on white background (for background removal).
No gradients, no glow, no shine. Icon fills 70% of frame.
Must read clearly at 48x48px. No text, no border, no UI chrome.

Style: flat dark fantasy icon, woodcut linework, medieval manuscript aesthetic.
Muted aged palette. Rough strokes. White background. Square format 512x512.
```

---

### Flee 🏃 — *Try to escape*

**Output file:** `flee.png`

```
Dark fantasy UI icon for a dungeon roguelite game.
A dark archway or doorway — a shadow-figure half-gone through it, mid-exit.
Or alternatively: two bare footprints leading off the bottom edge of the frame.
The feeling of abandonment, not speed. Something left, and did not return.
Flat simplified linework. Hand-carved or woodcut aesthetic.
Dominant accent color: sickly moss green (#4D7C0F). Isolated on white background (for background removal).
No gradients, no glow, no shine. Icon fills 70% of frame.
Must read clearly at 48x48px. No text, no border, no UI chrome.

Style: flat dark fantasy icon, woodcut linework, medieval manuscript aesthetic.
Muted aged palette. Rough strokes. White background. Square format 512x512.
```

---

### Stamina ⚡ — *Cost indicator (inline UI)*

**Output file:** `stamina.png`

```
Dark fantasy UI icon for a dungeon roguelite game.
A small lightning bolt — hand-drawn, imperfect, slightly crooked.
Heavy stroke weight relative to its size. Simple, reads instantly at 16px.
This appears inline next to numbers in the UI — it must be extremely legible at tiny sizes.
Flat simplified linework. Hand-carved or woodcut aesthetic.
Dominant accent color: cold blue (#3B82F6). Isolated on white background (for background removal).
No gradients, no glow, no shine. Icon fills 70% of frame.
No text, no border, no UI chrome.

Style: flat dark fantasy icon, woodcut linework, medieval manuscript aesthetic.
Muted aged palette. Rough strokes. White background. Square format 512x512.
```

---

## UI Indicators

### Heart ❤️ — *HP / health*

**Output file:** `heart.png`

```
Dark fantasy UI icon for a dungeon roguelite game.
A stylized heart shape — not anatomical, but not cute either. Somewhere between.
Slightly asymmetric, slightly wrong. Cracked down the center, edges worn and rough.
Feels like it's been used hard and has very little left. Still beating, barely.
Flat simplified linework. Hand-carved or woodcut aesthetic.
Dominant accent color: deep muted crimson (#991B1B). Transparent background.
No gradients, no glow. Icon fills 70% of frame.
Must read clearly at 24x24px — this appears as a tiny HP indicator. No text, no border.

Style: flat dark fantasy icon, woodcut linework, medieval manuscript aesthetic.
Muted aged palette. Rough strokes. Transparent background. Square format 512x512.
```

---

### Backpack 🎒 — *Inventory / items carried*

**Output file:** `backpack.png`

```
Dark fantasy UI icon for a dungeon roguelite game.
A worn dungeon pack — heavy leather satchel with thick buckled straps and a flap closure.
Overstuffed, bulging slightly. The leather is cracked and stained. A bone or tool handle
pokes out from a side strap. This is what a grave robber carries, not an adventurer.
Flat simplified linework. Hand-carved or woodcut aesthetic.
Dominant accent color: dark aged leather brown (#78350F). Transparent background.
No gradients, no glow. Icon fills 70% of frame.
Must read clearly at 48x48px. No text, no border, no UI chrome.

Style: flat dark fantasy icon, woodcut linework, medieval manuscript aesthetic.
Muted aged palette. Rough strokes. Transparent background. Square format 512x512.
```

---

## Usage Notes

- Generate with **transparent background** directly in the AI tool
- Save as **PNG with alpha channel**
- All final icon assets → `art/generated/icons/`
- File naming: `{kebab-name}.webp` (e.g. `strike.webp`, `brace.webp`)
- Convert to WebP (preserves transparency): `vert strike.png strike.webp`
- These go into `mobile/assets/icons/` + `public/icons/` (same dual-location pattern as items)
- Generate `strike.png` first — confirm the style lands before batching the rest
- For `heart.png` — test at **24×24px** specifically, HP indicator is tiny
- If too detailed / painterly: add *"flat, icon-style, simplified shapes only, no fine detail"*
- If too decorative: add *"brutally minimal, functional UI icon, no flourishes"*
