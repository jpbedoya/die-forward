# Die Forward — Content System

This document explains how zones are built and content is structured. It covers both the existing full-variation approach (Sunken Crypt) and the recommended modular fragment system (new zones). Read this before building a zone.

---

## 1. Overview

### Why Content Is Structured This Way

Die Forward is a procedurally experienced game, not a procedurally generated one. The difference matters: rooms aren't assembled from random phrases by an algorithm — they're authored narratives selected from a curated library. Every sentence a player reads was written by a human who understood the zone's tone, the room's purpose, and the game's voice.

The content system exists to balance two competing goals:

1. **Variety** — players should encounter different rooms across runs
2. **Quality** — every room should feel considered and on-voice

Both systems below serve these goals, just with different tradeoffs.

### Two Approaches

| Approach | Used In | Writing Effort | Variety |
|---|---|---|---|
| **Full Variations** | Sunken Crypt | High (write each room in full) | Moderate (per-template pool) |
| **Modular Fragments** | New zones (recommended) | Moderate (write fragments, not full rooms) | High (combinatorial) |

### When to Use Each

**Full Variations** — Use when you need precise narrative control over every room. Every variation is a complete, self-contained narrative. Good for launch-quality zones where the writing needs to land exactly right, or for rooms that have a specific beat (like a boss intro) that can't be assembled from parts.

**Modular Fragments** — Use for new zones. You write fewer strings (30 fragments instead of 50+ full variations), but the runtime assembles them into ~1,000 unique room narratives. Less writing, more variety, and the zone still feels authored because you wrote every piece.

Both approaches can coexist in a single zone — use full variations for boss rooms, fragments for everything else.

---

## 2. Zone Package Schema

A zone is a single JSON file in `zones/`. The full schema:

```jsonc
{
  "id": "zone-id",           // kebab-case, unique, used as file name
  "version": "1.0.0",        // semver
  "meta": { ... },           // display info, theming
  "lore": "...",             // lore blurb for loading screen
  "rooms": { ... },          // OPTION A: full variation narratives
  "fragments": { ... },      // OPTION B: modular narrative pieces
  "bestiary": { ... },       // local creatures + shared references
  "depths": [ ... ],         // dungeon depth layers
  "dungeonLayout": { ... },  // ordered room sequence
  "boss": "Boss Name",       // references a bestiary creature
  "audio": { ... }           // ambient + sfx paths
}
```

### `id`

```jsonc
"id": "sunken-crypt"
```

Kebab-case string. Must be unique across the registry. Used as the filename (`zones/sunken-crypt.json`) and as the canonical reference throughout the codebase.

### `version`

```jsonc
"version": "1.0.0"
```

Semver string. Bump patch for writing edits, minor for schema additions, major for structural overhauls.

### `meta`

```jsonc
"meta": {
  "name": "THE SUNKEN CRYPT",    // ALL CAPS recommended — matches UI style
  "tagline": "The first descent. Nothing here is alive.",  // shown on zone select
  "element": "water",            // thematic element: water | fire | shadow | earth | void | ice | etc.
  "difficulty": 1,               // 1 = beginner, 2 = intermediate, 3 = expert
  "colors": {
    "primary": "#1e3a5f",        // dominant background color
    "accent": "#4a9eff",         // highlight / interactive elements
    "text": "#a8d4ff"            // readable text on this background
  },
  "mechanic": null,              // optional mechanic label (e.g. "CHILL", "FLUX") — null if none
  "unlockRequirement": null,     // unlock condition string — null = always available (future use)
  "emoji": "🌊"                  // zone emoji for lists and titles
}
```

### `lore`

```jsonc
"lore": "Ancient stairs carved by forgotten hands lead down into flooded halls..."
```

One to three sentences. Shown on the zone detail / loading screen. This is the player's first impression of the zone's atmosphere. Write it like the opening of the Content Bible's zone section — evocative, second-person present, leading with sensation.

### `rooms`

The full variation system. See Section 3 for full details.

```jsonc
"rooms": {
  "explore": [ { "template": "...", "variations": [ ... ] } ],
  "combat":  [ { "template": "...", "variations": [ ... ] } ],
  "corpse":  [ { "template": "...", "variations": [ ... ] } ],
  "cache":   [ { "template": "...", "variations": [ ... ] } ],
  "exit":    [ { "template": "...", "variations": [ ... ] } ]
}
```

### `fragments`

The modular fragment system. See Section 4 for full details.

```jsonc
"fragments": {
  "explore": { "opening": [...], "middle": [...], "closing": [...] },
  "combat":  { "opening": [...], "middle": [...], "closing": [...] },
  "corpse":  { "framing": [...], "discoveryBeats": [...] },
  "cache":   { "locationLines": [...], "toneClosers": [...] },
  "exit":    { "opening": [...], "middle": [...], "closing": [...] },
  "options": { "cautious": [...], "aggressive": [...], "investigative": [...], "retreat": [...] }
}
```

### `bestiary`

```jsonc
"bestiary": {
  "shared": [],          // creature names from the global bestiary (content.ts)
  "local": [ ... ]       // zone-specific creatures defined inline
}
```

See Section 5 for full details.

### `depths`

```jsonc
"depths": [
  {
    "name": "THE UPPER CRYPT",
    "tier": 1,
    "roomRange": [1, 4],
    "description": "The entrance. Cold stone and shallow water."
  },
  {
    "name": "THE FLOODED HALLS",
    "tier": 2,
    "roomRange": [5, 8],
    "description": "Deeper now. The water rises to your chest."
  },
  {
    "name": "THE ABYSS",
    "tier": 3,
    "roomRange": [9, 12],
    "description": "The true depths. Few return from here."
  }
]
```

Defines the dungeon's named layers. Each depth has a tier that affects enemy damage scaling (Tier 1 = 1×, Tier 2 = 1.5×, Tier 3 = 2×). The `roomRange` maps rooms to a depth — rooms 1–4 encounter tier 1 enemies, 5–8 encounter tier 2, etc. Three depths is standard; adjust ranges to suit your zone's pacing.

### `dungeonLayout`

```jsonc
"dungeonLayout": {
  "totalRooms": 12,
  "structure": [
    { "type": "explore", "template": "descent" },
    { "type": "combat",  "template": "ambush" },
    { "type": "corpse",  "template": "fresh" },
    { "type": "combat",  "template": "confrontation" },
    { "type": "explore", "template": "flooded" },
    { "type": "combat",  "template": "guardian" },
    { "type": "cache",   "template": "alcove" },
    { "type": "combat",  "template": "territorial" },
    { "type": "explore", "template": "chamber" },
    { "type": "corpse",  "template": "heroic" },
    { "type": "combat",  "template": "pursuit" },
    { "type": "combat",  "template": "arena", "boss": true }
  ]
}
```

Defines the exact order of rooms the player encounters. `type` determines which room pool to draw from. `template` specifies which template within that pool to use (must match a template name defined in `rooms`). The final room should be `"boss": true` — this triggers boss encounter logic and intro audio.

When using fragments, `template` is still used to select the fragment category, but narratives are assembled from fragment pieces rather than full variations.

### `boss`

```jsonc
"boss": "The Keeper"
```

Name string matching a creature in `bestiary.local` or `bestiary.shared`. This creature appears in the final boss room with special intro audio and narrative treatment.

### `audio`

```jsonc
"audio": {
  "ambient": {
    "explore": "/audio/ambient-explore.mp3",  // looping background for explore rooms
    "combat":  "/audio/ambient-combat.mp3"    // looping background during combat
  },
  "sfx": {
    "footstep":    "/audio/footstep.mp3",
    "descend":     "/audio/depth-descend.mp3",
    "environment": ["/audio/water-drip.mp3", "/audio/drip-echo.mp3", "/audio/water-splash.mp3"],
    "atmosphere":  ["/audio/eerie-whispers.mp3", "/audio/stone-grinding.mp3"],
    "boss": {
      "intro": "/audio/boss-intro.mp3",
      "roar":  "/audio/boss-roar.mp3"
    }
  }
}
```

See Section 6 for full audio details.

---

## 3. The Full Variation System

### How It Works

Each room type (`explore`, `combat`, `corpse`, `cache`, `exit`) contains a list of **templates**. Each template has a list of **variations** — complete, authored narratives. At runtime, the engine picks a template from the dungeon layout, then randomly selects one variation from that template's pool to display.

```
dungeonLayout → picks template type
     ↓
rooms[type] → finds template by name
     ↓
variations[] → random pick
     ↓
Player sees narrative
```

The template name in `dungeonLayout` must exactly match the `template` field in `rooms`. If the zone is using OPTION A exclusively, every template referenced in the layout must have a corresponding entry with variations.

### Room Types and Required Fields

| Room Type | Required Fields | Optional Fields |
|---|---|---|
| `explore` | `id`, `narrative`, `options` | — |
| `combat` | `id`, `narrative`, `enemy` | — |
| `corpse` | `id`, `narrative`, `player_name`, `final_message` | — |
| `cache` | `id`, `narrative` | — |
| `exit` | `id`, `narrative` | — |

**`explore`** — Traversal rooms. Player sees two or more choices. `options` is a string array of choice labels.

```jsonc
{
  "id": "corridor_1",
  "narrative": "Water drips somewhere ahead. The passage narrows, walls slick with something that isn't quite water. Your torch pushes back the dark. The dark pushes back.",
  "options": ["Press forward", "Examine the walls"]
}
```

**`combat`** — Enemy encounter rooms. `enemy` must match a creature name in `bestiary.local` or `bestiary.shared`.

```jsonc
{
  "id": "ambush_1",
  "narrative": "The room seems empty. Still water, still air. Then you see it — the surface rippling where nothing moved. Rising. It was waiting beneath.",
  "enemy": "The Drowned"
}
```

**`corpse`** — Dead player discovery rooms. `player_name` and `final_message` are template placeholders filled at runtime with real player data.

```jsonc
{
  "id": "fresh_1",
  "narrative": "The blood hasn't dried. They fell here moments ago — or years. Time lies down here. Their hand still reaches toward the wall, where words are scratched:",
  "player_name": "{PLAYER}",
  "final_message": "{MESSAGE}"
}
```

**`cache`** — Loot/rest rooms. Narrative only — no choices, no enemies.

```jsonc
{
  "id": "alcove_1",
  "narrative": "A gap in the wall, above the waterline. Dry. Almost warm. Someone left supplies here. Maybe they made it out. Maybe they just left everything behind."
}
```

**`exit`** — Final room. Player escapes. Narrative only.

```jsonc
{
  "id": "exit_earned_1",
  "narrative": "The final door. It was sealed. Now it opens. You earned this. Whatever judges in the dark has weighed you and found you sufficient. Step through, survivor."
}
```

### Writing Guidelines Per Room Type

**Explore rooms**
- Lead with sensation (sound, smell, cold) before sight
- Keep under 50 words
- Options should feel meaningfully different — not just "go left or right" but choices with different risk profiles
- The room should build tension, not resolve it
- End on unease or implication

**Combat rooms**
- The creature should be revealed through behavior, not described directly
- Show the moment *before* violence — the tension is more interesting than the fight
- Describe what the creature is *doing*, not what it looks like
- Player should feel the threat without it being stated

**Corpse rooms**
- Treat the corpse as a real person who tried and failed
- Their final words should feel like they carry weight
- The narrative should frame *how* their message appears (scratched into stone, still-warm blood, etc.)
- Somber, respectful — not clinical

**Cache rooms**
- Brief moment of relief — but tinged with unease
- Nothing is fully safe down here
- The supplies matter less than the story of how they got here
- Leave the player curious about the previous occupant

**Exit rooms**
- Earned, not given
- The underworld *releases* you — it doesn't fail to stop you
- Hint that you'll return
- The world above should feel slightly wrong now

### When to Use Full Variations

- You need exact narrative control over specific moments
- The zone has a flagship encounter that needs precise writing (boss intro, unique corpse)
- You're writing the first pass and want to iterate on complete rooms before fragmenting
- The zone has very few room types and variety through fragments isn't needed

---

## 4. The Modular Fragment System

### How Fragment Assembly Works

Instead of writing complete room narratives, you write short, composable pieces — **fragments** — that the runtime assembles into full narratives at play time.

A standard room is assembled from three fragment types:

```
opening + middle + closing = full room narrative
```

The engine picks one fragment from each pool independently, so any opening can be combined with any middle and any closing.

### The Math

With 10 fragments per slot:

```
10 openings × 10 middles × 10 closings = 1,000 unique combinations
```

You write **30 short fragments** and get **1,000 unique rooms**. Compare to full variations, where 1,000 unique rooms would require writing 1,000 complete narratives.

Even with 5 per slot, that's 125 combinations. Most zones don't need 1,000 unique rooms per run — they need enough that players rarely see the same room twice across multiple runs. 5–10 per slot is the practical sweet spot.

### Fragment Types and Structure

**`explore` fragments**

```jsonc
"explore": {
  "opening": [
    // 1-2 sentences. Pure sensory immersion. No plot, no enemy.
    // Lead with what you feel/hear/smell before what you see.
    "Frost in your lungs before the room takes shape. The cold is the first thing, always the cold.",
    "Water to your knees. Still as a held breath."
  ],
  "middle": [
    // The discovery or tension beat. Something is wrong here.
    // What you notice. A detail that makes the player uneasy.
    "Scratch marks line the walls. Something was dragged through here. The marks lead deeper.",
    "Candles burn ahead. Who lights them? The wax is fresh."
  ],
  "closing": [
    // Final line. Dread lands here. Short. Often a sentence fragment.
    // End on implication, not explanation.
    "The only path forward.",
    "Something knows you're here."
  ]
}
```

**`combat` fragments**

```jsonc
"combat": {
  "opening": [
    // How the room feels before the enemy is visible. The moment before.
    // Build dread before the reveal.
    "The air is wrong in here. Warmer than it should be.",
    "The silence is too deliberate."
  ],
  "middle": [
    // The enemy reveal. The moment tension breaks.
    // This is the turn — from dread to threat.
    "It rises from the water. Bloated. Pale. Its eyes are gone but it sees you anyway.",
    "You hear it a half-second before you see it. Then you see it."
  ],
  "closing": [
    // The last beat before the player must choose. Stakes are clear.
    // End just before action. Player should feel urgency.
    "There is no way around. Only through.",
    "It hasn't decided to attack. Yet."
  ]
}
```

**`corpse` fragments**

Corpse rooms use a different two-part structure:

```jsonc
"corpse": {
  "framing": [
    // How death looks in this specific zone. Not generic.
    // A crypt corpse ≠ a jungle corpse ≠ an ice gallery corpse.
    "The water preserved them — too well. You can still see the expression they wore.",
    "They made themselves comfortable before the end."
  ],
  "discoveryBeats": [
    // What you notice before you see the body. The environmental tell.
    // A smell, a shadow, a sound, an absence.
    "Something scraped against this wall recently. The marks are fresh.",
    "Their torch still burns. That's how fresh."
  ]
}
```

**`cache` fragments**

```jsonc
"cache": {
  "locationLines": [
    // Where the cache is. Zone-specific detail.
    // The safe(ish) space, described in a way native to your zone.
    "A gap in the wall, above the waterline. Dry.",
    "A natural pocket in the stone. Small enough to miss."
  ],
  "toneClosers": [
    // How safety feels in this zone. Never fully safe.
    // The tension is the zone's personality showing through the relief.
    "Someone left these. Maybe they made it out.",
    "Nothing is truly safe down here. But this is close."
  ]
}
```

**`exit` fragments**

```jsonc
"exit": {
  "opening": [
    // The first sign of escape. What does 'out' look like in this zone?
    // Not relief — recognition.
    "Light. Actual light, not torchlight.",
    "The darkness recedes behind you."
  ],
  "middle": [
    // The transition. What you leave behind.
    // The zone releases you — or lets you go.
    "The water doesn't follow past this point.",
    "Something unclenches. Something vast, with countless fingers."
  ],
  "closing": [
    // Last line before escape. Bittersweet. Hint you'll return.
    "For now.",
    "They always come back."
  ]
}
```

**`options` fragments**

Player choice labels, zone-flavored:

```jsonc
"options": {
  "cautious":     ["Wade carefully", "Move along the walls", "Advance slowly"],
  "aggressive":   ["Push through", "Rush forward", "Move fast"],
  "investigative": ["Examine the walls", "Search carefully", "Look closer"],
  "retreat":      ["Step back", "Wait", "Consider your options"]
}
```

Flavor these to your zone where possible. "Wade carefully" fits a water zone. "Crawl through the ash" fits a fire zone. The options become part of the zone's voice.

### The Compatibility Rule

**This is the critical rule for fragment writing:** any opening must work grammatically and tonally with any middle, and any middle with any closing.

Fragment assembly is random. The engine doesn't know which opening it paired with which middle. If opening fragment 3 assumes the player is in a corridor, but middle fragment 7 describes an open chamber, the assembled room is incoherent.

**How to ensure compatibility:**

1. **Write in second person, present tense** — all fragments use the same grammatical subject and tense
2. **Don't reference specific room geometry** — "the space ahead" not "the corridor ahead" or "the chamber ahead"
3. **Don't carry information between fragments** — each fragment stands alone; openings don't set up something middles must resolve
4. **Keep tone consistent** — all fragments in a category should sit at the same dread register; don't mix black comedy with sincere horror in the same pool
5. **End openings open** — don't land the tension in the opening; leave it for middle and closing
6. **Test by combining randomly** — read opening[0] + middle[5] + closing[8] and see if it coheres. Try several random combos.

**Good opening:**
> Water to your knees. Black. Cold.

Works with any middle — it establishes environment without constraining what comes next.

**Bad opening:**
> You enter the bone gallery and see the altar.

This specifies room type and introduces an element (altar) that no middle was written to follow.

### When to Use Modular Fragments

- New zones (this is the recommended default)
- Zones with high room counts where variety matters
- Zones where you want to iterate on writing quickly
- Any zone where the full variation approach would require 50+ complete narratives

---

## 5. The Bestiary System

### Local vs Shared Creatures

Every zone has a `bestiary` object with two arrays:

```jsonc
"bestiary": {
  "shared": ["The Drowned", "Pale Crawler"],  // names from the global bestiary
  "local": [ { ... }, { ... } ]               // creatures defined in this zone file
}
```

**`shared`** — References creatures defined in the global bestiary (`content.ts`). These are cross-zone creatures that can appear in multiple zones without being redefined. Sunken Crypt doesn't use any shared creatures — all of its bestiary is local. Future zones with tier 1 horrors that fit multiple themes can pull from the global pool.

**`local`** — Zone-specific creatures defined inline in the zone file. These are creatures that belong to this zone and shouldn't appear elsewhere (or haven't been promoted to the global bestiary yet).

### Creature Schema

```jsonc
{
  "name": "The Drowned",
  "tier": 1,
  "health": { "min": 45, "max": 65 },
  "behaviors": ["AGGRESSIVE", "ERRATIC", "DEFENSIVE"],
  "description": "Waterlogged husks animated by the underworld's hunger. They move wrong.",
  "emoji": "🧟"
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name. Referenced by `enemy` in combat rooms and by `boss`. |
| `tier` | 1 \| 2 \| 3 | Damage multiplier tier. Tier 1 = 1×, Tier 2 = 1.5×, Tier 3 = 2×. |
| `health` | `{ min, max }` | HP range. Final HP is randomized within this range each encounter. |
| `behaviors` | string[] | Valid intent types this creature can use. See table below. |
| `description` | string | Short lore description shown in creature inspect modal. |
| `emoji` | string | Emoji displayed with creature name in combat UI. |

### Intent Types

The `behaviors` array lists the intents a creature can be assigned. The engine selects from these randomly each combat turn, weighted by the creature's nature.

| Intent | Player Impact | Notes |
|---|---|---|
| `AGGRESSIVE` | Normal damage, normal defense | Standard attack pattern |
| `DEFENSIVE` | 0.5× damage dealt, 0.5× damage taken, +20% flee | Circling, guarding |
| `CHARGING` | 0.5× this turn, 2× next turn (unless dodged/braced) | Read carefully — don't ignore |
| `ERRATIC` | 0.5×–2× random damage | Unpredictable, Brace is safest |
| `HUNTING` | 1.3× damage dealt, −20% flee chance | Patient, methodical |
| `STALKING` | Normal damage, −30% flee chance | Watching, learning patterns |
| `RETREATING` | 0.5× damage dealt, +30% flee, takes 1.2× damage | Vulnerable, possibly baiting |

### Tier System and Damage

| Tier | Damage Multiplier | Health Range | Examples |
|---|---|---|---|
| 1 | 1.0× | 25–80 HP | The Drowned, Pale Crawler, Flickering Shade |
| 2 | 1.5× | 60–130 HP | Hollow Clergy, Carrion Knight, The Congregation |
| 3 | 2.0× | 120–220 HP | The Unnamed, Mother of Tides, zone bosses |

Boss creatures should always be Tier 3 with health at the upper range (180–220). The final room's boss should feel genuinely threatening after the player has already spent resources getting there.

### Writing New Creatures: Behavior-First Design

Start with behavior, not appearance. The Content Bible principle: "It's circling" is scarier than "10 damage."

**Design sequence:**

1. **What does it do?** How does it move, what's its pattern of threat, what's its relationship to the zone's element
2. **What behaviors does that imply?** A patient hunter uses STALKING and HUNTING. Something erratic and desperate uses ERRATIC and RETREATING.
3. **How does the player learn to read it?** The behaviors should feel legible from the description — CHARGING should be visible in the creature's posture
4. **What do you hear before you see it?** Audio defines presence in this game — give the creature a sound signature
5. **What was it before?** The best creatures in the Sunken Crypt were once human. Imply the before without explaining it.

**Example creature design (backward from behavior):**

> Behaviors I want: STALKING, CHARGING, AGGRESSIVE
>
> This creature is patient until it acts, then explosive. It studies the player before committing.
>
> That implies: a predator. Something that observes from safety, then lunges.
>
> Zone element is fire/ash: so it moves through embers, hiding in heat haze, then bursts through when it commits.
>
> Description: "Something moves in the heat shimmer. Not fire — the suggestion of something larger, using the flames as cover. It knows you saw it. It doesn't care."

---

## 6. Zone Audio

### Philosophy

Audio is as important as the writing. The Content Bible is explicit: less is more, silence builds tension, diegetic sounds over "soundtrack." Every audio decision should serve the zone's identity.

### Audio Schema

```jsonc
"audio": {
  "ambient": {
    "explore": "/audio/ambient-explore.mp3",
    "combat":  "/audio/ambient-combat.mp3"
  },
  "sfx": {
    "footstep":    "/audio/footstep.mp3",
    "descend":     "/audio/depth-descend.mp3",
    "environment": ["/audio/water-drip.mp3", "/audio/drip-echo.mp3", "/audio/water-splash.mp3"],
    "atmosphere":  ["/audio/eerie-whispers.mp3", "/audio/stone-grinding.mp3"],
    "boss": {
      "intro": "/audio/boss-intro.mp3",
      "roar":  "/audio/boss-roar.mp3"
    }
  }
}
```

| Field | Purpose |
|---|---|
| `ambient.explore` | Looping background track for exploration rooms |
| `ambient.combat` | Looping background track during combat encounters |
| `sfx.footstep` | Footstep sound on movement |
| `sfx.descend` | Sound played when entering a new depth layer |
| `sfx.environment` | Array of environmental sounds played periodically (e.g., drips, echoes) |
| `sfx.atmosphere` | Rarer atmospheric sounds (eerie whispers, settling stone) |
| `sfx.boss.intro` | Dramatic sting on boss room entry |
| `sfx.boss.roar` | Boss attack/aggression sound |

### Zone-Specific vs Shared/Global Audio

The Sunken Crypt reuses the global audio assets from `/audio/`. This works for zones with a similar sonic character (dark, wet, ancient). New zones with a distinct element should have their own ambient tracks — an ice zone should sound different from a water zone.

For community-submitted zones, audio files should be hosted and referenced by full URL:

```jsonc
"ambient": {
  "explore": "https://your-cdn.example.com/my-zone/ambient-explore.mp3",
  "combat":  "https://your-cdn.example.com/my-zone/ambient-combat.mp3"
}
```

Local paths (`/audio/...`) reference files in the game's `/public/audio/` directory. Only use these for zones included in the base game distribution.

### Audio Design by Room Type

| Room Type | Ambient | SFX Priority | Music Direction |
|---|---|---|---|
| Explore | Full ambient layers | Environment sounds | Near-silence, minimal |
| Combat | Tension version of ambient | Creature sounds dominate | Pulse builds under combat |
| Corpse | Softens — single mournful tone | Silence during reading | Sustained note, fades |
| Cache | Slightly lighter ambient | Nothing alarming | Almost safe (but not quite) |
| Exit | Ambient fades toward surface sounds | Wind from above? | First moment of resolution |

---

## 7. Writing Guidelines for Zone Creators

### Tone Rules

From the Content Bible — distilled:

1. **Second person, present tense.** Always. "You descend. The air grows cold." Not "You descended" or "The player descends."

2. **Lead with sensation.** Sound and smell before sight. The player's body registers the zone before their eyes do.

3. **Short sentences are your tool.** Fragments are welcome. They're not lazy — they're rhythmic. "Stone. Water. Silence. Then: not silence."

4. **Dread through understatement.** Horror implied, not stated. "Something moves in the water" is scarier than "A monster lurks beneath the surface."

5. **No exclamation marks.** Ever. If something is urgent, make it urgent through word choice and sentence compression — not punctuation.

6. **No clichés.** "Suddenly" is never correct. "Very" adds nothing. If you're reaching for an emphasis word, rewrite the sentence.

7. **Under 50 words for room descriptions.** This is a guide, not a hard limit, but it keeps narratives tight and readable on mobile.

### Zone Identity Principles

Every zone needs three things to cohere: **element**, **mechanic**, and **boss** that are thematically unified.

| Zone | Element | Mechanic | Boss |
|---|---|---|---|
| Sunken Crypt | Water / stone | None (introductory) | The Keeper — eternal guardian |
| Frozen Gallery | Ice / memory | CHILL accumulation | The Glacial Sovereign — ancient cold |
| Void Beyond | Reality / absence | FLUX / CLARITY drain | The Unwritten — built from your unchosen paths |

If your element is fire and your boss is an undead knight with no fire connection, the zone lacks identity. The element should show up in: creature names, room descriptions, audio, mechanics, and the final encounter.

**Zone identity checklist:**
- [ ] Element is present in room descriptions (sensory — what does the element smell, sound, feel like?)
- [ ] At least two creatures are directly tied to the element
- [ ] Mechanic (if present) emerges naturally from the element
- [ ] Boss embodies the zone's ultimate expression of the element
- [ ] Audio reinforces the element (an ice zone sounds different from a fire zone)
- [ ] Color palette reflects the element

### Fragment Compatibility Rules

Fragments must work with any partner from the same category. Before submitting, do the random-combo test:

1. Pick opening[0], middle[4], closing[8] — does it read coherently?
2. Pick opening[7], middle[1], closing[3] — same test
3. Do five more random combinations

If any combo produces something grammatically broken or tonally inconsistent, revise until all combos work.

**Common compatibility failures:**

- Opening introduces a specific object that middle ignores ("The altar dominates the room" → middle talks about a corridor)
- Opening uses first-person verb tense that middle breaks ("As you enter" → "Entering, you notice" — tense mismatch)
- Closing resolves tension the opening hadn't established ("You chose correctly" when no choice was established)
- Middle references something established in a *specific* opening, not the general opening pool

### Common Mistakes to Avoid

**Overwriting.** Zone descriptions should leave room for the player's imagination. "A shape in the water" is more disturbing than "a twelve-foot pale humanoid with no eyes and elongated fingers."

**Explaining the horror.** Don't name what's wrong. Describe the wrongness. "The handprints are facing the wrong direction" — not "Something was running away in panic."

**Generic room text.** Every room should feel like it could only belong to your zone. If "Stone walls. Darkness ahead. Something moves." could be in any zone, rewrite it to be specific.

**Mechanical language in narrative.** "You take 30 damage" never appears in room text. Even in death text, keep it experiential: "The cold reaches your chest" not "Your HP drops to 0."

**Modern vocabulary.** The underworld predates electricity, technology, and most of recorded history. No: signal, digital, data, energy (as a game term), stats, level. Yes: cold, damp, stone, whisper, hollow, pale, ancient.

**Starting too many sentences with "You."** Vary the sentence structure. "The water rises" is as valid as "You watch the water rise."

### The Vocabulary Bank Approach

Before writing fragments or variations, define the 20–30 words that belong to your zone. Not just nouns — verbs, adjectives, even the rhythm of sentences.

**Example: Frozen Gallery vocabulary bank**

Nouns: ice, crystal, frost, glass, preservation, stillness, amber, silence
Verbs: crystallize, hold, seal, fracture, slow, stop, suspend
Adjectives: pale, translucent, absolute, cold, ancient, perfect, frozen
Rhythm: longer sentences — the cold has all the time in the world

If you write a sentence and it doesn't use vocabulary that belongs to your zone, either rewrite it or add the new word to your bank. Vocabulary banks are what make a zone *sound* like itself.

---

## 8. Creating a New Zone — Step by Step

### Step 1: Define Zone Identity

Before touching the template, define your zone in a separate document (see `docs/zones/FROZEN-GALLERY.md` for reference format):

- **Element** — What is this zone made of? What's its sensory signature?
- **Setting** — Where are we? What happened here?
- **Mechanic** — What unique gameplay rule does this zone introduce? (Can be null for introductory zones)
- **Tone** — How is the dread different from other zones? (Cold patience vs. wet wrongness vs. reality failure)
- **Bestiary** — What 5–10 creatures live here? What were they before?
- **Boss** — Who guards the exit, and why are they here?
- **Vocabulary bank** — 20–30 words that belong to this zone

The zone bible should be written before any JSON. It's the source of truth for all creative decisions.

### Step 2: Copy the Template

```bash
cp zones/template.json zones/your-zone-id.json
```

The template contains both OPTION A (`rooms`) and OPTION B (`fragments`) sections with inline documentation. Read the comments. They explain every field.

### Step 3: Fill In Meta, Lore, Bestiary, Depths

These sections don't require writing room narratives — do them first.

```jsonc
// Fill these in order:
"id": "your-zone-id",
"version": "1.0.0",
"meta": { ... },
"lore": "One to three sentences. Zone's first impression.",
"bestiary": {
  "shared": [],        // reference global creatures if applicable
  "local": [
    // Write all your creatures here before writing rooms
    // Having the bestiary in front of you while writing
    // rooms keeps combat narration consistent with creature behavior
  ]
},
"depths": [
  // Three layers, tier 1/2/3, room ranges that make sense for your pacing
]
```

### Step 4: Write Fragments (Recommended) or Full Variations

**If using fragments (OPTION B):**

Work one fragment category at a time. Write all `explore.opening` fragments before moving to `explore.middle`. This keeps your vocabulary bank active and your tone consistent within each category.

Target: 10 per slot for explore/combat/exit, 8–10 for corpse and cache, 3–6 per options category.

**If using full variations (OPTION A):**

Write templates in the order they appear in your planned dungeon layout. Start with the types you'll use most (usually `explore` and `combat`).

**If using both:**

Fragments handle the majority of rooms. Write full variations only for rooms that require precise narrative control (boss intro room, specific corpse scenario, unique cache).

### Step 5: Define Dungeon Layout

```jsonc
"dungeonLayout": {
  "totalRooms": 12,
  "structure": [
    // Room 1: Ease in — explore or simple combat
    // Room 2-4: Tier 1 encounters, first corpse opportunity
    // Room 5-8: Difficulty ramps, tier 2 enemies appear
    // Room 9-11: Tier 3 enemies, second corpse opportunity
    // Room 12: Boss (always "boss": true)
  ]
}
```

Standard pacing for a 12-room zone:
- 3 explore rooms
- 5–6 combat rooms (1 boss)
- 1–2 corpse rooms
- 1 cache room
- 1 exit room (appended automatically, or placed explicitly in layout)

Every `template` value in the structure must match a template defined in `rooms` (OPTION A) or a fragment category in `fragments` (OPTION B).

### Step 6: Set `boss` and Audio

```jsonc
"boss": "Your Boss Name",   // must exactly match bestiary creature name
"audio": {
  "ambient": {
    "explore": "/audio/ambient-explore.mp3",  // use global assets or zone-specific
    "combat":  "/audio/ambient-combat.mp3"
  },
  "sfx": {
    // Reference existing global assets or host zone-specific ones
    "boss": {
      "intro": "/audio/boss-intro.mp3",
      "roar":  "/audio/boss-roar.mp3"
    }
  }
}
```

### Step 7: Validate and Submit for Review

Before submitting, check:

- [ ] All template names in `dungeonLayout.structure` exist in `rooms` or `fragments`
- [ ] All enemy names in `rooms.combat[*].variations[*].enemy` exist in `bestiary.local` or `bestiary.shared`
- [ ] `boss` name matches a Tier 3 creature in the bestiary
- [ ] Fragment combos pass the random-combo test (5+ combos per category)
- [ ] Vocabulary bank was applied consistently
- [ ] All narrative text is second person, present tense
- [ ] No exclamation marks, no modern vocabulary, no clichés
- [ ] Zone is registered in `zones/registry.json`

**Submit for review:** Open a PR against the main repo. Include your zone bible doc alongside the zone JSON. For community submissions, the on-chain registry integration is in development.

---

## 9. The Registry

### How `zones/registry.json` Works

The registry is the source of truth for which zones are available in the game. The engine reads this file at startup to build the zone selection screen and validate zone references.

```jsonc
{
  "version": "1.0.0",
  "zones": [
    {
      "id": "sunken-crypt",
      "file": "zones/sunken-crypt.json",
      "meta": {
        "name": "THE SUNKEN CRYPT",
        "tagline": "The first descent. Nothing here is alive.",
        "element": "water",
        "difficulty": 1,
        "mechanic": null,
        "emoji": "🌊",
        "colors": {
          "primary": "#1e3a5f",
          "accent": "#4a9eff",
          "text": "#a8d4ff"
        },
        "unlockRequirement": null
      },
      "enabled": true
    }
  ]
}
```

The registry `meta` is a copy of the zone file's `meta`. It exists in the registry so the engine can display the zone selection screen without loading every zone file.

**Keep registry meta in sync with zone meta.** If you change the zone file's name, tagline, or colors, update the registry too.

### Adding a Zone to the Registry

1. Add your zone JSON to `zones/your-zone-id.json`
2. Add an entry to the `zones` array in `zones/registry.json`:

```jsonc
{
  "id": "your-zone-id",
  "file": "zones/your-zone-id.json",
  "meta": {
    // copy from your zone file's meta
  },
  "enabled": true   // set to false to include but not yet expose to players
}
```

3. Set `"enabled": true` when the zone is ready for players. Use `false` during development to include the zone in the build without exposing it.

### Unlock Requirements

`unlockRequirement` in `meta` is a future-use field for zone progression gates. Planned values:

- `null` — always available
- `"complete:sunken-crypt"` — require a clear on the specified zone
- `"deaths:10"` — require N lifetime deaths
- `"kills:50"` — require N lifetime enemy kills
- `"stake:0.5"` — require N total SOL staked

The field is parsed but not enforced yet. Fill it in when designing your zone — it'll be enforced in a future update without needing zone file changes.

### Future: Community Submissions

The roadmap includes an on-chain zone registry on Solana. Community creators will be able to:

1. Submit a zone file to the registry smart contract
2. Have it reviewed (automated validation + community vote or curator review)
3. Once approved, the zone becomes available to all players
4. Creator receives a share of stake from runs in their zone

For now: submit zones as PRs to the main repo. The registry format is designed to migrate to on-chain without structural changes — the JSON schema you write today will be the schema the contract stores.

---

## Appendix: Quick Reference

### Room Type → Required Fields

| Type | Required | Notes |
|---|---|---|
| explore | `id`, `narrative`, `options[]` | 2+ options |
| combat | `id`, `narrative`, `enemy` | enemy must be in bestiary |
| corpse | `id`, `narrative`, `player_name`, `final_message` | use `{PLAYER}` and `{MESSAGE}` |
| cache | `id`, `narrative` | no enemy, no options |
| exit | `id`, `narrative` | no enemy, no options |

### Intent Types Quick Reference

`AGGRESSIVE` | `DEFENSIVE` | `CHARGING` | `ERRATIC` | `HUNTING` | `STALKING` | `RETREATING`

### Tier Damage Multipliers

Tier 1 = **1.0×** | Tier 2 = **1.5×** | Tier 3 = **2.0×**

### Fragment Slot Targets

| Category | Recommended Count |
|---|---|
| explore.opening / middle / closing | 10 each |
| combat.opening / middle / closing | 10 each |
| exit.opening / middle / closing | 8 each |
| corpse.framing / discoveryBeats | 10 each |
| cache.locationLines / toneClosers | 8 each |
| options.cautious / aggressive / investigative / retreat | 3–6 each |

### Vocabulary to Avoid

modern words, digital, suddenly, very, really, exclamation marks, stat names in narrative, HP/damage as narrative

---

*When in doubt: return to the Content Bible. It's the source of truth for voice, tone, and the world's nature.*
