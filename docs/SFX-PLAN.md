# Die Forward — SFX Expansion Plan

## Status

Current library: **48 sounds** (all base Threshold zone + generic combat/UI)
Target after this pass: **~95 sounds** (~47 new)

All generated via ElevenLabs API route at `/api/audio/generate`.
All hosted at `https://dieforward.com/audio/` as `.mp3`.

---

## Generation API Reference

```bash
curl -X POST https://dieforward.com/api/audio/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "...", "filename": "...", "duration": 1.5}'
```

Tips (from AUDIO.md):
- Add "no voice no scream" to avoid unwanted vocals
- Include environment context: "in a stone cave, echoing"
- SFX: 0.5–2s. Ambiance triggers: 3–6s.

---

## What's Missing (Gap Analysis)

### Threshold Zone (base zone — already good, minor gaps)
Has: water-drip, water-splash, drip-echo, eerie-whispers, stone-grinding
Missing:
- Distant creature presence (growl far away, something moving in water)
- Atmospheric one-shots (single water drop into still pool, far rumble)

### Living Tomb — NO dedicated SFX
Zone audio bible calls for: heartbeat (room, not player), organic dripping, growth sounds,
peristalsis, Incorporated speech attempts, spore burst, flesh rupture, swallowing (distant).

### Frozen Gallery — NO dedicated SFX
Zone audio bible calls for: glacial settling, frozen joint creak, Sentinel movement,
freeze trigger, chill application, cold wind passages, ice fracture, footsteps on ice,
Shattered scraping.

### Ashen Crypts — NO dedicated SFX
Zone needs: embers crackle, ash falling, fire roar, burn stack application,
ember flask extinguish, bone crumbling, distant fire.

### Void Beyond — NO dedicated SFX
Zone needs: static/reality dissolve, intent-flux sound, Echo Double appear,
dimensional tear, void presence, reality stabilize.

---

## Full SFX List — New Sounds to Generate

### CATEGORY 1: Atmospheric / Ambiance Triggers
*One-shot SFX that fire periodically during exploration to layer on top of ambient loops.*
*These are "punctuation" sounds — heard rarely, make the world feel alive.*

| Filename | Duration | ElevenLabs Prompt | Zone(s) |
|---|---|---|---|
| `water-drop-single` | 1.5s | "Single water droplet falling into a still underground pool, long reverberant echo in a vast cave" | Threshold |
| `distant-splash` | 2s | "Something large dropping into deep water far away in an underground cavern, muffled, echoing" | Threshold |
| `distant-growl-far` | 3s | "A low threatening creature growl heard from very far away through stone corridors, barely audible, deep" | All |
| `something-moves` | 2s | "Something large shifting in the dark nearby, wet stone scraping, movement, then silence. No voice." | Threshold, Tomb |
| `far-rumble` | 3s | "Deep stone rumble from somewhere below, brief, structural, like a distant collapse or something very large moving" | All |
| `whispers-word` | 2s | "Unintelligible whispers that almost resolve into a single word, echoing in a stone corridor, then silence" | Threshold |
| `drip-pool-echo` | 2s | "Three irregular water drips falling into a still underground pool, each with distinct cave echo, subtle" | Threshold |
| `distant-scream` | 2s | "A human scream heard from very far away through stone corridors, muffled, could be wind, unsettling" | Threshold, Void |

---

### CATEGORY 2: Living Tomb — Zone SFX

#### Environment / Ambiance Triggers
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `tomb-heartbeat` | 2s | "A slow biological heartbeat, 55 BPM, organic and wet, like a heartbeat heard through thick flesh, not mechanical" | Room's heartbeat (NOT player low-HP) |
| `tomb-breathing` | 4s | "A room breathing — slow deep oscillation of air, cavernous organic sound, like being inside a living body" | Ambient layer trigger |
| `tomb-drip-warm` | 1.5s | "Warm thick organic fluid dripping slowly, viscous, not water, biological, interior of a living creature sound" | Replaces water-drip in Tomb |
| `tomb-growth` | 3s | "Organic tissue slowly extending and growing on stone, wet cellular sound, very subtle, almost subsonic, biological" | Rare trigger |
| `tomb-swallow-distant` | 3s | "Something massive swallowing, deep organic gulping sound, very far away, muffled through organic material" | Rare unsettling trigger |
| `tomb-peristalsis` | 4s | "A passage contracting and relaxing rhythmically, organic pressure sound, muscular, biological, slow" | Narrow passage trigger |

#### Creature SFX
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `crawler-skitter` | 1s | "Many insect legs clicking rapidly on stone floor, erratic burst movement, wet clicking, close" | Mycelium Crawler movement |
| `crawler-inject` | 0.8s | "Sharp wet injection sound, spore puncture into flesh, brief hiss, close, no voice" | Crawler attack |
| `crawler-death` | 0.8s | "Small creature rapid clicking that stops abruptly, one soft wet sound, fluid spill, silence" | Crawler death |
| `incorporated-reach` | 2s | "Something trying to speak but unable to, wet attempted words from something partially submerged in organic material, tragic" | Incorporated idle/attack |
| `incorporated-death` | 1.5s | "A sound of relief, wet organic settling, something releasing tension, then silence. Mournful." | Incorporated death |
| `bloom-drift` | 3s | "A low warm consistent tone following a slow drifting creature, organic warmth-sound, like bioluminescence has a sound" | Bloom presence |
| `spore-burst` | 1.5s | "Soft organic explosion, spore cloud releasing from a rupturing fungal body, muffled pop then hiss" | Bloated Ones / Bloom death |
| `guardian-breathe` | 3s | "A large organic structure breathing slowly, rhythmic contraction and expansion, low pressure sound through flesh" | Membrane Guardian idle |
| `guardian-seal` | 1.5s | "A fleshy passage sealing shut, muscular contracting, thick organic closure sound, pressure" | Guardian sealing room |

#### Mechanic SFX
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `infection-gain` | 1s | "A warm creeping sensation sound, subtle organic warmth spreading under skin, biological acceptance, not painful, wrong" | Infection stack gain |
| `infection-purge` | 2s | "Painful purging of infection, burning cleanse, biological rejection, sharp then release. No voice." | Purge Salt use |
| `item-consumed` | 1.5s | "An item being absorbed and dissolved slowly, organic consumption, subtle warmth, item disappearing" | 3-stack item consume |

---

### CATEGORY 3: Frozen Gallery — Zone SFX

#### Environment / Ambiance Triggers
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `glacier-groan` | 4s | "Deep structural groan of a glacier settling, ancient ice under immense pressure finding new equilibrium, low subsonic" | Base ambient trigger |
| `ice-crack` | 1.5s | "Sharp crack of ice under pressure, echoing through frozen stone corridors, single fracture, then silence" | Periodic trigger |
| `cold-wind-tunnel` | 5s | "Cold wind breathing through ice tunnels, not howling, low and long, no source, just cold air passing" | Wind ambient trigger |
| `ice-settle` | 2s | "Ice layer settling and refreezing, creaking adjustment, structural sound, vast and old" | Rare periodic trigger |
| `absolute-silence` | 2s | "Near-total silence with only a faint room tone, the sound of cold killing all ambient noise, oppressive" | Silence as a sound |

#### Creature SFX
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `preserved-creak` | 1.5s | "Frozen human joints cracking as a preserved body begins to move, ice crystals in cartilage, cartilage working against preservation" | Preserved movement |
| `preserved-arrest` | 1s | "A moving body suddenly re-freezing, rapid ice crystallization sound, stillness after motion" | Preserved death |
| `sentinel-move` | 3s | "Massive armored figure moving, ice compressed to stone hardness grinding against floor, enormous weight shifting slowly" | Frost Sentinel movement |
| `sentinel-crack` | 3s | "Centuries of compressed ice cracking apart in layers, long slow structural release, geological sound" | Sentinel death |
| `shattered-scrape` | 3s | "Multiple ice fragments scraping across stone floor, asymmetrical, different sizes, continuous positional sound" | Shattered movement loop |
| `shattered-split` | 0.8s | "A sharp crack as an ice creature splits into more pieces, fracture then multiple smaller movements beginning" | Shattered on damage |
| `wraith-presence` | 2s | "The sound of cold air being displaced as something passes through it, a soft hiss of temperature differential, room going quiet" | Ice Wraith approach |

#### Mechanic SFX
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `chill-gain` | 1s | "Cold accumulating in the body, a contained sound like breath being held, ice crystals forming, stamina slowing" | Chill stack gain |
| `freeze-trigger` | 1s | "A crystalline arrest sound, something stopping mid-motion, ice forming rapidly over a moving target, sharp and precise" | Freeze mechanic trigger |
| `thermal-flask` | 1.5s | "Drinking something warm in extreme cold, heat spreading through a frozen body, brief relief, the warmth already fading" | Thermal Flask use |
| `temperature-drop` | 2s | "Ambient temperature dropping twenty degrees instantly, air contracting, cold rushing in to fill displaced space" | Sovereign strike aftermath |

---

### CATEGORY 4: Ashen Crypts — Zone SFX

#### Environment / Ambiance Triggers
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `embers-crackle` | 3s | "Dying embers crackling softly in a vast stone space, occasional pop, ash settling, distant and persistent" | Ambient trigger |
| `ash-fall` | 2s | "Fine ash falling in a quiet burnt corridor, barely audible, soft landing on stone, like grey snow" | Ambient trigger |
| `distant-fire` | 4s | "Distant fire burning in stone passages, crackling and roaring heard through walls, heat without light" | Ambient trigger |
| `bone-crumble` | 1.5s | "Ancient bone crumbling to ash from heat, dry fragmentation, centuries of burning completing themselves" | Environmental trigger |
| `fire-whoosh` | 1.5s | "Fire surging briefly through a stone corridor, heat displacement, roar then recede, no ongoing burn" | Combat trigger |

#### Mechanic SFX
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `burn-gain` | 0.8s | "A searing contact sound, fire catching on something, brief ignition, then the burn settling in" | Burn stack gain |
| `burn-tick` | 0.8s | "Fire burning continuously at low level, persistent searing, damage over time sound, restrained" | Per-turn burn damage |
| `ember-flask` | 1.5s | "Fire being extinguished suddenly by a flask thrown, sizzle and steam, flames going out quickly" | Ember Flask use |

---

### CATEGORY 5: Void Beyond — Zone SFX

#### Environment / Ambiance Triggers
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `void-static` | 4s | "Soft static, reality dissolving at the edges, audio interference from an adjacent space, low and textured" | Base ambient trigger |
| `bleed-through` | 3s | "Sound from another place bleeding through, a door closing, water dripping, somewhere else, then gone" | Reality bleed trigger |
| `void-silence` | 2s | "A silence that is full rather than empty, presence without sound, something there that has stopped making noise" | Presence trigger |
| `reality-shift` | 2s | "Reality momentarily failing, spatial audio distortion, a room changing its mind about what it is, brief" | Room shift trigger |

#### Mechanic / Creature SFX
| Filename | Duration | ElevenLabs Prompt | Notes |
|---|---|---|---|
| `flux-trigger` | 1s | "An intent changing mid-declaration, the sound of probability collapsing to a different outcome, brief glitch" | FLUX mechanic |
| `echo-double-appear` | 2s | "An exact duplicate of a person appearing, the sound of something that was already there becoming visible, uncanny" | Echo Double spawn |
| `void-creature-move` | 2s | "A creature that exists in probability moving through uncertain space, phase shift, between here and not-here" | Probability Shade movement |
| `dimensional-tear` | 2s | "The fabric of a space tearing briefly, a gap to somewhere else opening and closing, ozone and electricity" | Rare environmental trigger |
| `clarity-restore` | 1.5s | "Mental clarity returning, the noise of uncertainty receding, reality asserting itself briefly, relief" | Clarity mechanic restore |
| `your-voice-wrong` | 2s | "Your own voice heard from the wrong direction, disorienting, just a fragment of a word, then silence" | Rare unsettling trigger |

---

## Implementation Plan

### Phase 1 — Atmospheric / Universal (highest impact, all zones benefit)
Generate first: `water-drop-single`, `distant-growl-far`, `something-moves`, `far-rumble`, `distant-scream`, `whispers-word`

These fire universally in explore rooms as ambient punctuation. Immediate atmosphere improvement.

### Phase 2 — Living Tomb (zone 2 priority)
`tomb-heartbeat`, `tomb-breathing`, `tomb-drip-warm`, `crawler-skitter`, `crawler-inject`, `incorporated-reach`, `infection-gain`, `infection-purge`, `spore-burst`

### Phase 3 — Frozen Gallery
`glacier-groan`, `preserved-creak`, `sentinel-move`, `freeze-trigger`, `chill-gain`, `thermal-flask`, `cold-wind-tunnel`, `ice-crack`

### Phase 4 — Ashen Crypts
`embers-crackle`, `ash-fall`, `burn-gain`, `burn-tick`, `ember-flask`, `fire-whoosh`, `distant-fire`

### Phase 5 — Void Beyond
`void-static`, `flux-trigger`, `echo-double-appear`, `void-creature-move`, `dimensional-tear`, `clarity-restore`

### Phase 6 — Remaining / Polish
All remaining entries from the table above.

---

## Code Integration

### 1. Add new SoundIds to `audio.ts`

```typescript
export type SoundId = 
  // ... existing ...
  
  // Atmospheric / Universal
  | 'water-drop-single'
  | 'distant-splash'
  | 'distant-growl-far'
  | 'something-moves'
  | 'far-rumble'
  | 'whispers-word'
  | 'drip-pool-echo'
  | 'distant-scream'
  
  // Living Tomb
  | 'tomb-heartbeat'
  | 'tomb-breathing'
  | 'tomb-drip-warm'
  | 'tomb-growth'
  | 'tomb-swallow-distant'
  | 'tomb-peristalsis'
  | 'crawler-skitter'
  | 'crawler-inject'
  | 'crawler-death'
  | 'incorporated-reach'
  | 'incorporated-death'
  | 'bloom-drift'
  | 'spore-burst'
  | 'guardian-breathe'
  | 'guardian-seal'
  | 'infection-gain'
  | 'infection-purge'
  | 'item-consumed'
  
  // Frozen Gallery
  | 'glacier-groan'
  | 'ice-crack'
  | 'cold-wind-tunnel'
  | 'ice-settle'
  | 'absolute-silence'
  | 'preserved-creak'
  | 'preserved-arrest'
  | 'sentinel-move'
  | 'sentinel-crack'
  | 'shattered-scrape'
  | 'shattered-split'
  | 'wraith-presence'
  | 'chill-gain'
  | 'freeze-trigger'
  | 'thermal-flask'
  | 'temperature-drop'
  
  // Ashen Crypts
  | 'embers-crackle'
  | 'ash-fall'
  | 'distant-fire'
  | 'bone-crumble'
  | 'fire-whoosh'
  | 'burn-gain'
  | 'burn-tick'
  | 'ember-flask'
  
  // Void Beyond
  | 'void-static'
  | 'bleed-through'
  | 'void-silence'
  | 'reality-shift'
  | 'flux-trigger'
  | 'echo-double-appear'
  | 'void-creature-move'
  | 'dimensional-tear'
  | 'clarity-restore'
  | 'your-voice-wrong'
```

### 2. Ambient Trigger System (new concept)

The explore screens should fire ambient-punctuation SFX on a timer — not the player doing something, just the world making sounds. Suggested implementation:

```typescript
// In explore screen / room component
// Pick randomly from zone-appropriate ambiance triggers, fire every 15-45s
const ZONE_AMBIENT_SFX: Record<Zone, SoundId[]> = {
  threshold: ['water-drop-single', 'distant-splash', 'distant-growl-far', 'something-moves', 'far-rumble', 'drip-pool-echo'],
  livingTomb: ['tomb-heartbeat', 'tomb-breathing', 'tomb-drip-warm', 'tomb-growth', 'tomb-swallow-distant'],
  frozenGallery: ['glacier-groan', 'ice-crack', 'cold-wind-tunnel', 'ice-settle', 'wraith-presence'],
  ashenCrypts: ['embers-crackle', 'ash-fall', 'distant-fire', 'bone-crumble'],
  voidBeyond: ['void-static', 'bleed-through', 'void-silence', 'reality-shift', 'your-voice-wrong'],
};

// Rare global triggers (any zone, very low probability)
const RARE_AMBIENT: SoundId[] = ['distant-scream', 'whispers-word', 'far-rumble'];
```

### 3. Mechanic-Specific Triggers

Wire these to game state changes:

| Game Event | SFX |
|---|---|
| Infection stack +1 | `infection-gain` |
| Infection stack purged | `infection-purge` |
| Item consumed by Tomb | `item-consumed` |
| Chill stack +1 | `chill-gain` |
| Freeze triggers | `freeze-trigger` |
| Thermal Flask used | `thermal-flask` |
| Burn stack +1 | `burn-gain` |
| Burn tick damage | `burn-tick` |
| Ember Flask used | `ember-flask` |
| FLUX mechanic fires | `flux-trigger` |
| Clarity restored | `clarity-restore` |

---

## Generation Batch Script (once prompts are finalized)

```bash
#!/bin/bash
# Generate all new SFX

BASE_URL="https://dieforward.com/api/audio/generate"

generate() {
  local prompt="$1"
  local filename="$2"
  local duration="$3"
  
  echo "Generating: $filename..."
  curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": \"$prompt\", \"filename\": \"$filename\", \"duration\": $duration}"
  echo ""
  sleep 2  # rate limit buffer
}

# Phase 1: Universal atmospheric
generate "Single water droplet falling into a still underground pool, long reverberant echo in a vast cave" "water-drop-single" 1.5
generate "Something large dropping into deep water far away in an underground cavern, muffled, echoing" "distant-splash" 2.0
generate "A low threatening creature growl heard from very far away through stone corridors, barely audible, deep" "distant-growl-far" 3.0
# ... etc
```

---

*Total new sounds: ~47. Total library after: ~95.*
*Priority order: Phase 1 (universal) → Phase 2 (Living Tomb) → Phase 3 (Frozen Gallery) → Phase 4 (Crypts) → Phase 5 (Void) → Phase 6 (polish)*
