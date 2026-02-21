# Die Forward — Shared Components

UI component reference for the mobile app (`mobile/components/`).

---

## Design Principles

**No generic spinners.** `ActivityIndicator` is not used anywhere in the app. All loading states use `AsciiLoader` — it fits the crypt aesthetic and feels intentional rather than accidental.

**ASCII art > icons.** Block characters (`░ ▒ ▓ █`) and box-drawing characters carry visual weight without images or icon fonts.

**Monospace everywhere.** All UI text uses `fontFamily: 'monospace'` (or the NativeWind `font-mono` class). Consistent spacing, consistent feel.

**Color palette** (defined in `tailwind.config.js` and mirrored as raw hex in inline-styled components):

| Token | Hex | Use |
|-------|-----|-----|
| `crypt-bg` | `#0a0806` | Background |
| `crypt-border` | `#2a2520` | Borders, dividers |
| `bone` | `#d4b896` | Primary text |
| `bone-dark` | `#78716c` | Secondary text |
| `bone-muted` | `#57534e` | Tertiary / placeholder |
| `amber` | `#f59e0b` | Highlights, CTAs |
| `blood` | `#991b1b` | Danger, death |
| `ethereal` | `#a78bfa` | Echo names, death glyphs |
| `victory` | `#86efac` | Victor names |

---

## AsciiLoader

**File:** `components/AsciiLoader.tsx`

The app-wide loading indicator. Replaces `ActivityIndicator` everywhere.

### Variants

**`sweep`** (default) — A single `▓` peak travels left→right over a `░` field with `▒` fade on either side. Matches the `AnimatedDescendButton` on the title screen.

```
░░░▓▒░░░  →  ░░░░▓▒░░  →  ░░░░░▓▒░  →  ░░░░░░▓▒  →  ...
```

Best for: full-screen loading states, skeleton placeholders.

**`pulse`** — Single character cycles `░ → ▒ → ▓ → ▒ → ░` in place.

```
░  →  ▒  →  ▓  →  ▒  →  ░  →  ...
```

Best for: inside buttons, tight spaces, inline loaders.

### Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `variant` | `'sweep' \| 'pulse'` | `'sweep'` | |
| `width` | `number` | `8` | Char count for sweep variant |
| `speed` | `number` | `90` | Tick interval in ms (lower = faster) |
| `color` | `string` | `'#3a3530'` | Text color — match button text color |
| `style` | `TextStyle` | — | Pass-through to the Text element |

### Usage

```tsx
import { AsciiLoader } from '../components/AsciiLoader';

// Skeleton while name loads (grey sweep)
<AsciiLoader />

// Inside a button (white pulse, matches button text)
{loading ? <AsciiLoader variant="pulse" color="#ffffff" /> : <Text>CONFIRM</Text>}

// Inside a dark button (amber button, dark text)
{loading ? <AsciiLoader variant="pulse" color="#0d0d0d" /> : <Text>SEAL YOUR FATE</Text>}

// Full-screen dungeon loading (wider, amber)
<AsciiLoader width={16} color="#f59e0b" style={{ fontSize: 16 }} />

// Compact inline (smaller font)
<AsciiLoader variant="pulse" color="#f59e0b" style={{ fontSize: 12 }} />
```

### Where it's used

| File | Variant | Context |
|------|---------|---------|
| `app/stake.tsx` | pulse | BIND WALLET, SEAL YOUR FATE, EMPTY-HANDED (×2) |
| `app/stake.tsx` | sweep | 🪦 nickname skeleton while DB loads |
| `app/death.tsx` | pulse | ETCH INTO STONE, SHARE DEATH CARD |
| `app/victory.tsx` | pulse | CLAIM REWARDS, SHARE |
| `app/play.tsx` | sweep | Full-screen dungeon loading |
| `app/play.tsx` | pulse | 💰 TIP button |
| `app/combat.tsx` | sweep | Full-screen combat init |
| `components/LinkWalletModal.tsx` | pulse | Link / merge wallet buttons |
| `components/MiniPlayer.tsx` | pulse | Audius track loading |

---

## DieForwardLogo

**File:** `components/DieForwardLogo.tsx`

ASCII art logo in multiple sizes. Used on title, splash, game menu, and share cards.

### Variants

```tsx
// Standard logo (DIE stacked over FORWARD)
<DieForwardLogo size="large" showGlow glowColor="#f59e0b" />
<DieForwardLogo size="medium" />
<DieForwardLogo size="small" />
<DieForwardLogo size="tiny" />   // Game menu header

// Compact inline (for share cards)
<DieForwardLogoInline color="#f59e0b" />
```

### Sizes

| Size | DIE font | FORWARD font |
|------|----------|-------------|
| `tiny` | 3px | 2px |
| `small` | 4px | 3px |
| `medium` | 5px | 4px |
| `large` | 6px | 5px |

---

## AnimatedDescendButton

**File:** `app/index.tsx` (inline, title screen only)

The DESCEND button with sweeping `░▒▓` animation flowing inward from both sides. The visual DNA that inspired `AsciiLoader`.

```
░░▒▒▓▓  DESCEND  ▓▓▒▒░░
```

Not extracted as a standalone component — specific to the title screen.

---

## CRTOverlay

**File:** `components/CRTOverlay.tsx`

Full-screen scanline + vignette effect layered on top of every screen. Renders as a `pointer-events: none` absolute overlay.

```tsx
// Always at the bottom of the screen's JSX tree
<CRTOverlay />
```

---

## NicknameModal

**File:** `components/NicknameModal.tsx`

Handles both first-time name setup and in-game editing.

```tsx
// First-time prompt (no initial value)
<NicknameModal
  visible={game.showNicknameModal}
  onSubmit={(name) => game.setNickname(name)}
  onSkip={() => game.dismissNicknameModal()}
/>

// Edit existing name (pre-filled, shows UPDATE instead of CONFIRM)
<NicknameModal
  visible={showEdit}
  initialValue={game.nickname || ''}
  onSubmit={(name) => { game.setNickname(name); setShowEdit(false); }}
  onSkip={() => setShowEdit(false)}
/>
```

**Cursor note:** Always set `textAlign` via `style={{ textAlign: 'center' }}` directly — NativeWind className alone doesn't position the cursor correctly on Android.

---

## AudioToggle

**File:** `components/AudioToggle.tsx`

Master audio on/off control. Shows `[SND]` / `[MUTE]` in monospace.

```tsx
// Inline mode (inside a header row)
<AudioToggle
  ambientTrack="ambient-title"
  inline
  onSettingsPress={() => setAudioSettingsOpen(true)}
/>
```

---

## CryptBackground

**File:** `components/CryptBackground.tsx`

Themed background with screen-specific art. Wraps each screen's root view.

```tsx
<CryptBackground screen="stake">
  {/* screen content */}
</CryptBackground>
```

Screens: `title`, `stake`, `play`, `combat`, `death`, `victory`.

---

## Adding New Components

When adding to the shared library:
1. Put it in `mobile/components/`
2. Add an entry to this doc
3. Follow the monospace + block-char aesthetic
4. Use `AsciiLoader` for any loading state (no `ActivityIndicator`)
