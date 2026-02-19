# Audio System

## Philosophy

Audio is half the horror. The goal is tension through sound — dynamic audio that responds to game state, with optional Audius streaming for dungeon atmosphere.

## Audio Layers

```
┌─────────────────────────────────────────────────────┐
│  AUDIUS STREAM   Optional, user-chosen playlists    │
│  └── curated crypt/horror/ambient playlists         │
├─────────────────────────────────────────────────────┤
│  AMBIENT         Constant, sets location            │
│  └── title, explore, combat, death, victory loops  │
├─────────────────────────────────────────────────────┤
│  SFX             Punctuates moments                 │
│  └── sword clash, death rattle, heal, loot, UI     │
└─────────────────────────────────────────────────────┘
```

---

## Implementation

### Platform Split

Audio is implemented differently per platform:

| Platform | Library | Notes |
|----------|---------|-------|
| Android / iOS | `expo-audio` | Native module |
| Web (desktop) | HTML `<audio>` elements | No expo-audio on web |

> ⚠️ **expo-av has been removed.** Do not re-add it.

### expo-audio Import Gotcha

`AudioPlayer` is NOT exported from `expo-audio`'s main index — that only re-exports types. Import the native module instance directly:

```typescript
import AudioModule from 'expo-audio/build/AudioModule';
const AudioPlayer = AudioModule.default.AudioPlayer;
const player = new AudioPlayer(source, 100, false); // (source, updateIntervalMs, keepActive)
```

`setAudioModeAsync` IS exported from the main package:
```typescript
import { setAudioModeAsync } from 'expo-audio';
await setAudioModeAsync({
  playsInSilentMode: true,
  interruptionMode: 'duckOthers',
  shouldPlayInBackground: false,
});
```

### Audio Manager (`lib/audio.ts`)

Single source of truth for SFX and ambient. Exports a `useAudio()` hook:

```typescript
const { playSFX, playAmbient, stopAmbient, setEnabled, ready } = useAudio();
```

- `ready` — boolean, true when audio module has finished initializing
- Always wait for `ready` before calling `playAmbient()` in `useEffect`

```typescript
// ✅ Correct
const { playAmbient, ready } = useAudio();
useEffect(() => {
  if (ready) playAmbient('ambient-title');
}, [ready]);

// ❌ Wrong — fires before module loads on Android
useEffect(() => {
  playAmbient('ambient-title');
}, []);
```

### Master Switch

`[SND]` / `[MUTE]` toggle is a true master switch. Toggling mutes/unmutes all audio without losing source preferences. Preferences persisted to AsyncStorage.

---

## SFX Library (48 sounds)

All hosted at `https://dieforward.com/audio/`.

**Combat**
- `sword-slash`, `critical-hit`, `dodge-whoosh`, `brace-impact`, `parry-clang`, `attack-miss`
- `boss-intro`, `boss-roar`, `enemy-growl`, `enemy-death`

**Player State**
- `player-death`, `heal`, `heartbeat-low`, `stamina-depleted`, `stamina-recover`

**Environment**
- `footstep`, `corpse-discover`, `water-splash`, `chains-rattle`, `eerie-whispers`
- `depth-descend`, `drip-echo`, `stone-grinding`

**Loot & Rewards**
- `loot-discover`, `tip-chime`, `victory-fanfare`, `share-click`

**UI**
- `ui-click`, `menu-open`, `menu-close`, `confirm-action`, `error-buzz`

**Flee**
- `flee-run`, `flee-fail`, `flee-caught`, `flee-stumble`

---

## Ambient Tracks (5 loops)

| Track ID | Used In |
|----------|---------|
| `ambient-title` | Home screen |
| `ambient-explore` | Play screen (room navigation) |
| `ambient-combat` | Combat screen |
| `ambient-death` | Death screen |
| `ambient-victory` | Victory screen |

---

## Audius Integration

On mobile (iOS/Android), players can stream curated playlists from Audius as their dungeon soundtrack.

### Hook: `useAudiusPlayer`

```typescript
const {
  currentTrack,    // { title, user: { name } } | null
  isPlaying,
  musicSource,     // 'audius' | 'none'
  playPlaylist,
  nextTrack,
  prevTrack,
  stop,
} = useAudiusPlayer();
```

### Curated Playlists

| ID | Name | Tracks |
|----|------|--------|
| `emQa2` | Dark Ambient Crypt | 21 |
| `DN6Pp` | Horror Atmospheres | 33 |
| `nqZmb` | Dungeon Synth | 198 |
| `3AA6Z` | Roguelike OST | 9 |
| `5ON2AWX` | Underground Beats | 331 |
| `ebd1O` | Lost Souls | 112 |

### Crossfade Behavior

- **Auto-advance** (track ends): 500ms crossfade to next track
- **Manual skip** (next/prev): immediate switch, no crossfade

### Now Playing Attribution

Current track shown in:
- Combat / play screen footer (MiniPlayer component)
- Death share card (`♪ Track · Artist`)
- Victory share card
- Leaderboard `♪ SOUNDTRACK` tab

When a player dies, the currently playing track is recorded in InstantDB alongside the death data.

### Audio Source Settings

Players can choose their audio source in any audio settings modal:
- **None** — game ambient only
- **Audius** — stream from curated playlist

Setting persists to AsyncStorage.

---

## Audio Settings UI

Two entry points, same component (`AudioSettingsSection`):
- `GameMenu` — accessible from `[=]` header button on all screens
- `AudioSettingsModal` — accessible from `⚙` button next to `[SND]`

The `AudioToggle` component renders the `[SND]`/`[MUTE]` button + `⚙` inline.

---

## Generating New SFX (ElevenLabs)

API route at `/api/audio/generate`:

```bash
curl -X POST https://dieforward.com/api/audio/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Stone door grinding open in dark cave", "filename": "door-open", "duration": 1.5}'
```

Tips:
- Add "no voice no scream" to avoid unwanted vocals
- Include environment: "in a cave, echoing"
- SFX: 0.5–2s duration. Ambient loops: 10–20s
