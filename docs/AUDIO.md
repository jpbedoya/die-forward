# Audio System

## Philosophy

Audio is half the horror. The goal is tension through sound — not just background music, but dynamic audio that responds to game state.

## Audio Layers

```
┌─────────────────────────────────────────┐
│  AMBIENT        Constant, sets location │
│  └── dripping water, distant echoes     │
├─────────────────────────────────────────┤
│  MUSIC          Evolves with tension    │
│  └── low drone → combat pulse → silence │
├─────────────────────────────────────────┤
│  SFX            Punctuates moments      │
│  └── sword clash, death rattle, loot    │
├─────────────────────────────────────────┤
│  STINGERS       Jump scares / alerts    │
│  └── enemy spotted, ghost found, death  │
└─────────────────────────────────────────┘
```

## Music States

| State | Sound | Trigger |
|-------|-------|---------|
| **Exploring** | Minimal drone, ambient noise, quiet | Default room state |
| **Tension** | Pulse builds, something's coming | Enemy in room description |
| **Combat** | Rhythmic, urgent, heartbeat bass | Player engages enemy |
| **Low HP** | Distorted, heartbeat bleeds in | Health < 20% |
| **Death** | Everything cuts → single tone → silence | Player dies |
| **Ghost** | Whispers, dissonant chord | Corpse discovered |

## Asset List (MVP)

### Music (~3 files)

```
/audio/music/
  explore.mp3      # Calm, loopable, 2-3 min
  tension.mp3      # Uneasy, loopable
  combat.mp3       # Urgent, loopable
```

### Ambient (~1 file for MVP)

```
/audio/ambient/
  crypt.mp3        # Water drips, echoes, loopable
```

### SFX (~6 files)

```
/audio/sfx/
  hit.mp3          # Damage dealt
  hurt.mp3         # Damage taken  
  death.mp3        # Player dies
  loot.mp3         # Item pickup
  ghost.mp3        # Corpse discovered
  button.mp3       # UI click
```

### Stingers (~2 files)

```
/audio/stingers/
  danger.mp3       # Enemy appears (1-2 sec)
  lowhealth.mp3    # HP critical loop
```

**Total: ~12 files for MVP**

## State Machine

```
EXPLORE ──[enemy in narrative]──▶ TENSION
   ▲                                  │
   │                           [player attacks]
   │                                  ▼
   └────[enemy defeated]────────── COMBAT
                                      │
                               [health = 0]
                                      ▼
                                   DEATH
```

## Implementation

### Audio Manager (TypeScript)

```typescript
// lib/audio.ts
import { Howl, Howler } from 'howler';

// Preload tracks
const music = {
  explore: new Howl({ src: ['/audio/music/explore.mp3'], loop: true, volume: 0.4 }),
  tension: new Howl({ src: ['/audio/music/tension.mp3'], loop: true, volume: 0.4 }),
  combat: new Howl({ src: ['/audio/music/combat.mp3'], loop: true, volume: 0.5 }),
};

const ambient = {
  crypt: new Howl({ src: ['/audio/ambient/crypt.mp3'], loop: true, volume: 0.3 }),
};

const sfx = {
  hit: new Howl({ src: ['/audio/sfx/hit.mp3'] }),
  hurt: new Howl({ src: ['/audio/sfx/hurt.mp3'] }),
  death: new Howl({ src: ['/audio/sfx/death.mp3'] }),
  loot: new Howl({ src: ['/audio/sfx/loot.mp3'] }),
  ghost: new Howl({ src: ['/audio/sfx/ghost.mp3'] }),
  button: new Howl({ src: ['/audio/sfx/button.mp3'], volume: 0.5 }),
};

const stingers = {
  danger: new Howl({ src: ['/audio/stingers/danger.mp3'] }),
  lowhealth: new Howl({ src: ['/audio/stingers/lowhealth.mp3'], loop: true, volume: 0.6 }),
};

// State management
type MusicState = 'explore' | 'tension' | 'combat' | 'silent';
let currentMusic: Howl | null = null;
let currentAmbient: Howl | null = null;
let lowHealthPlaying = false;

export function setMusicState(state: MusicState) {
  // Fade out current
  if (currentMusic) {
    const old = currentMusic;
    old.fade(old.volume(), 0, 1000);
    setTimeout(() => old.stop(), 1000);
  }

  // Fade in new
  if (state !== 'silent') {
    currentMusic = music[state];
    currentMusic.play();
    currentMusic.fade(0, music[state].volume(), 1000);
  } else {
    currentMusic = null;
  }
}

export function setAmbient(zone: 'crypt' | null) {
  if (currentAmbient) {
    currentAmbient.fade(currentAmbient.volume(), 0, 500);
    setTimeout(() => currentAmbient?.stop(), 500);
  }
  
  if (zone) {
    currentAmbient = ambient[zone];
    currentAmbient.play();
    currentAmbient.fade(0, 0.3, 500);
  }
}

export function playSfx(name: keyof typeof sfx) {
  sfx[name].play();
}

export function playStinger(name: keyof typeof stingers) {
  stingers[name].play();
}

export function setLowHealth(isLow: boolean) {
  if (isLow && !lowHealthPlaying) {
    stingers.lowhealth.play();
    lowHealthPlaying = true;
  } else if (!isLow && lowHealthPlaying) {
    stingers.lowhealth.fade(0.6, 0, 500);
    setTimeout(() => stingers.lowhealth.stop(), 500);
    lowHealthPlaying = false;
  }
}

export function stopAll() {
  Howler.stop();
  currentMusic = null;
  currentAmbient = null;
  lowHealthPlaying = false;
}

// Death sequence
export function playDeathSequence() {
  // Fade everything
  if (currentMusic) currentMusic.fade(currentMusic.volume(), 0, 500);
  if (currentAmbient) currentAmbient.fade(currentAmbient.volume(), 0, 500);
  if (lowHealthPlaying) stingers.lowhealth.stop();
  
  // Play death sound after brief silence
  setTimeout(() => {
    sfx.death.play();
  }, 600);
}
```

### React Integration

```tsx
// hooks/useGameAudio.ts
import { useEffect } from 'react';
import * as audio from '@/lib/audio';

export function useGameAudio(gameState: {
  inCombat: boolean;
  enemyNearby: boolean;
  health: number;
  maxHealth: number;
  isDead: boolean;
  zone: string;
}) {
  const { inCombat, enemyNearby, health, maxHealth, isDead, zone } = gameState;

  // Set ambient for zone
  useEffect(() => {
    if (zone === 'crypt') {
      audio.setAmbient('crypt');
    }
    return () => audio.setAmbient(null);
  }, [zone]);

  // Music state
  useEffect(() => {
    if (isDead) {
      audio.playDeathSequence();
    } else if (inCombat) {
      audio.setMusicState('combat');
    } else if (enemyNearby) {
      audio.setMusicState('tension');
    } else {
      audio.setMusicState('explore');
    }
  }, [inCombat, enemyNearby, isDead]);

  // Low health warning
  useEffect(() => {
    audio.setLowHealth(health / maxHealth < 0.2);
  }, [health, maxHealth]);

  return {
    playSfx: audio.playSfx,
    playStinger: audio.playStinger,
  };
}
```

## Integration Points

| Game Event | Audio Action |
|------------|--------------|
| Enter zone | `setAmbient(zone)` |
| Enter room (no enemy) | `setMusicState('explore')` |
| Enemy in description | `setMusicState('tension')` + `playStinger('danger')` |
| Player attacks | `setMusicState('combat')` |
| Deal damage | `playSfx('hit')` |
| Take damage | `playSfx('hurt')` |
| HP < 20% | `setLowHealth(true)` |
| HP >= 20% | `setLowHealth(false)` |
| Find corpse | `playSfx('ghost')` |
| Pick up item | `playSfx('loot')` |
| Enemy defeated | `setMusicState('explore')` |
| Player dies | `playDeathSequence()` |
| UI button click | `playSfx('button')` |

## Asset Sources (Free/CC)

| Source | Good For |
|--------|----------|
| [freesound.org](https://freesound.org) | SFX, ambience |
| [incompetech.com](https://incompetech.com) | Royalty-free music |
| [pixabay.com/music](https://pixabay.com/music) | Ambient tracks |
| [Suno](https://suno.ai) | AI-generated music (own output) |
| [Udio](https://udio.com) | AI-generated music |

## Future Enhancements (Post-MVP)

- Per-zone music tracks (chapel organs, fire crackle, void silence)
- Dynamic layering (add/remove instrument stems)
- TTS for ghost messages (ElevenLabs whispers)
- Procedural ambient (Tone.js)
- Spatial audio for immersion
- Player-controlled volume sliders
