# Die Forward — Game Enhancement Plan

*Deep design review and actionable roadmap for evolving Die Forward from hackathon prototype to a retainable, monetizable game.*

*Last updated: 2026-03-13*

---

## 0. CONTENT INVENTORY — What We Already Have

Before building anything, here's what's authored and sitting unused:

### Zone Content (zones/*.json)

| Zone | System | Explore | Combat | Corpse | Cache | Exit | Options | Bestiary | Boss | Depths | Layout |
|------|--------|---------|--------|--------|-------|------|---------|----------|------|--------|--------|
| **Sunken Crypt** | Full rooms | 50 vars / 10 tpl | 45 / 9 tpl | 45 / 9 tpl | 45 / 9 tpl | 35 / 7 tpl | ✅ 2-3 per room | In code (21 creatures) | The Keeper | ✅ 3 depths | ✅ 12-room |
| **Ashen Crypts** | Fragments | 36 (12+12+12) | 34 (12+12+10) | 20 (10+10) | 16 (8+8) | 24 (8+8+8) | 16 (4 pools) | 8 local + 3 shared | The Pyre Keeper | ✅ 3 depths | ✅ 12-room |
| **Frozen Gallery** | Fragments | 36 (12+12+12) | 34 (12+12+10) | 20 (10+10) | 16 (8+8) | 24 (8+8+8) | 17 (4 pools) | 4 local + 3 shared | Glacial Sovereign | ✅ 3 depths | ✅ 12-room |
| **Living Tomb** | Fragments | 36 (12+12+12) | 34 (12+12+10) | 20 (10+10) | 16 (8+8) | 24 (8+8+8) | 20 (4 pools) | 5 local + 3 shared | The Root | ✅ 3 depths | ✅ 12-room |
| **Void Beyond** | Fragments | 36 (12+12+12) | 34 (12+12+10) | 20 (10+10) | 16 (8+8) | 24 (8+8+8) | 20 (4 pools) | 4 local + 4 shared | The Unwritten | ✅ 3 depths | ✅ 12-room |

**Combined narrative permutations per fragment zone:** ~1,728 explore combos (12×12×12), ~1,440 combat combos, effectively infinite replays.

### Shared Content (mobile/content/*.json)
- combat-actions: 81 narration strings across 5 actions × outcomes
- enemy_intents: 56 descriptions across 7 intent types
- death_epitaphs: 40 strings (death moments + final words intros + corpse outros)
- Generic room templates: 44 across explore/combat/corpse/cache/exit (legacy, used by current code)

### What's Authored But Not Wired Up

1. **Explore room options** — Every Sunken Crypt explore room has 2-3 authored options ("Cross the chamber" / "Stay near the walls"). `play.tsx` ignores them and shows "Press forward"
2. **Fragment engine** — 4 zones with opening+middle+closing pools exist as data. No code assembles them
3. **Zone dungeon layouts** — Each zone JSON has a `dungeonLayout.structure` with a designed 12-room sequence. `generateRandomDungeon()` in content.ts is hardcoded and ignores them
4. **Zone bestiaries** — Each zone has local creatures + shared creatures defined. Code only uses the hardcoded BESTIARY in content.ts
5. **Zone depths** — Each zone defines named depths with tier ranges. Code uses the hardcoded DEPTHS array
6. **Zone audio** — Each zone specifies ambient/SFX paths. Not loaded
7. **Zone option pools** — Fragment zones have categorized option pools (cautious/aggressive/investigative/retreat). Not used
8. **Zone boss** — Each zone defines its boss with stats. Only The Keeper is implemented

### What This Means

The biggest win isn't writing new content — it's **connecting existing content to the game.** The zone system is a fully designed content pipeline that feeds into a dead end. Wiring it up unlocks 5 zones, ~1,800 content strings, and genuine replayability.

---

## 1. CONCEPT DEFINITION

### Current State
Die Forward is a text-based social roguelite on Solana where death is contribution — your corpse, final words, and staked SOL persist for future players. It was built for the Graveyard Hackathon (submitted Feb 2026) and has a solid prototype: 1 playable zone (Sunken Crypt), 12 rooms across 3 depths, intent-based combat, boss fight, on-chain staking, death feed, and corpse discovery.

### The One Sentence
**"A mobile roguelite where every death builds the dungeon for the next player."**

### Target Audience
- **Primary:** Mobile-native crypto gamers (18-35) who play session-based games on commute / downtime
- **Secondary:** Roguelite fans from Slay the Spire, Hades, FTL who are crypto-curious
- **Tertiary:** AI agent builders who want their agents to play games (Agent API)

### Platform Priority
1. **Mobile Web** (current — lowest friction, no app store)
2. **Android APK** (sideload / Solana dApp Store)
3. **iOS** (future — requires App Store approval)

### Team Size Reality
- 2-person team (JP + Pisco)
- This means: favor content and systems over features. Don't build what you can't maintain.

### Timeline
- **Phase 1 (Weeks 1-4):** Core loop tightening + Progression v1
- **Phase 2 (Weeks 5-8):** Economy + Second zone live
- **Phase 3 (Weeks 9-12):** Polish + Monetization + Mainnet prep

---

## 2. CORE LOOP DESIGN

### The Problem With the Current Loop

The existing loop is:
```
Connect → Stake → Navigate 12 rooms → Die or Win → Share card → Repeat?
```

**What's working:**
- The death-as-content mechanic is genuinely novel and emotionally resonant
- Intent-based combat has real depth (charge mindgame, counter system)
- The corpse discovery + tipping creates async social connection
- Share cards give a viral hook
- The CRT aesthetic and audio design create atmosphere

**What's broken or missing:**

1. **No meaningful between-room decisions.** Explore rooms are just "Press forward." The player has no agency ~40% of the time (rooms 1, 3, 5, 7, 9, 10 are non-combat). They're clicking through narrative walls.

2. **No build diversity.** Every run feels the same. You get random items passively — there's no choosing a build, no trade-offs, no "this run I'll try X."

3. **The 30-second loop is too thin.** In combat, you make one tactical choice per turn. Outside combat, you make zero choices. Compare to Slay the Spire where every card draw presents 3-5 decisions.

4. **Session length is wrong.** 12 rooms takes ~8-15 minutes. That's fine for a single run, but there's nothing pulling you into "one more run." No unlocks, no progression breadcrumbs.

5. **Death feels punishing without feeling meaningful.** You lose your SOL and get a share card. But you don't feel like you learned anything or got closer to a meta-goal.

### Proposed Loop Enhancement

#### The 30-Second Loop (In-Room)
Every room should present a **meaningful choice**:

**COMBAT ROOMS (unchanged — already good):**
Read intent → Choose action → See result → New turn

**EXPLORE ROOMS (needs overhaul):**
Current: Read text → "Press forward"
Proposed: Read text → Choose from 2-3 options with **real trade-offs**

Examples:
- "A narrow passage and a flooded tunnel. The passage is safe but you hear scratching inside. The tunnel might have supplies."
  - `[1] Narrow passage` → Skip to next room (safe)
  - `[2] Flooded tunnel` → 60% chance: find item. 40% chance: take 10-15 damage + find nothing
  - `[3] Listen carefully (costs 1⚡)` → Reveals which option is safe

- "An altar with candles still burning. Something is offered here."
  - `[1] Leave an item` → Sacrifice lowest-value item → Restore 20 HP
  - `[2] Take what's offered` → Get a random item, but next combat starts with enemy HUNTING
  - `[3] Pass by` → Nothing happens

**CORPSE ROOMS (minor tweak):**
Already have loot/pay respects. Add a third option:
- `[3] Study their wounds` → Learn what killed them → Next combat: see enemy's first 2 intents revealed (knowledge reward)

**CACHE ROOMS (minor tweak):**
Already have heal/continue. Add choice tension:
- Offer 2-3 items to choose from (pick one, lose the others)
- Or: choose between big heal vs. useful item

**WHY:** Every room should be a decision point. The game's philosophy is "every choice matters" — but right now only combat delivers on that. Making explore rooms into choice rooms doubles the decision density without adding complexity.

**EFFORT:** Medium. The room content system (`content.ts`) already supports multiple options. The play screen already renders option lists. This is mostly content + a few new action handlers.

#### The 5-Minute Loop (Per-Run Arc)
A run should feel like a story with a narrative arc:

```
ROOMS 1-4 (Upper Crypt): Gathering phase
  - More caches, more explore rooms with loot opportunities
  - Easier Tier 1 enemies
  - Player is building their loadout for the gauntlet ahead
  
ROOMS 5-8 (Flooded Halls): Commitment phase  
  - Tier 2 enemies, fewer safe rooms
  - Resource management becomes critical (HP is the real currency)
  - "Point of no return" feel — going is risky, but you've invested

ROOMS 9-11 (The Abyss): Survival phase
  - Tier 3 enemies, almost no healing
  - Every choice is life-or-death
  - Corpses are more common here — other players died too

ROOM 12 (Boss): Climax
  - The Keeper — already exists and works well
```

**ADDITION — Run Modifiers (Curses/Blessings):**
At the start of each run, apply 1 random modifier from a pool:
- 🩸 **Blood Pact:** +20% damage dealt, -20% healing received
- 🌑 **Blind Descent:** Enemy intents are hidden for the first turn of each combat
- 💀 **Death's Echo:** Corpse rooms always have real player corpses (more content, more tips)
- 🔥 **Ember Trail:** Rooms have a timer — take 5 damage if you deliberate too long
- 🧊 **Numbing Cold:** Start with 2 stamina instead of 3, but stamina regens +1 extra per turn

**WHY:** Run modifiers create variety without new content. They change how you approach the same dungeon. This is how Hades, Isaac, and Slay the Spire get hundreds of hours from limited content.

**EFFORT:** Low-Medium. A modifier is just a set of game setting overrides applied at run start. The settings system already supports all these knobs (damage multipliers, stamina pool, etc).

#### The Session Loop (What brings you back)
Currently: nothing. You play, die, maybe share a card, close the app.

**Proposed: Daily Challenges + Run Streaks**

- **Daily Challenge:** One curated run per day with fixed seed + modifier. Same dungeon for everyone. Global leaderboard for that day's challenge (deepest room, fastest clear, most damage dealt). Creates water-cooler conversation: "Did you beat today's run?"

- **Run Streak:** Consecutive days played. Streak rewards at 3, 7, 14, 30 days (cosmetic titles, death card borders, profile badges). Losing your streak costs nothing, but maintaining it feels like a quiet achievement.

**WHY:** Daily challenges are the #1 retention mechanic in roguelites (Slay the Spire, Spelunky). Fixed seed means everyone plays the same dungeon — creates shared experience and competitive comparison. Streaks add habit-forming without being predatory.

**EFFORT:** Medium. Need a daily seed generator (trivial), a "daily" run mode in the start flow, and a separate leaderboard query. Streak tracking is just a counter on the player record.

---

## 3. PROGRESSION DESIGN

### Current State
Almost none. The player record tracks:
- `highestRoom` — deepest room reached
- `totalDeaths`, `totalClears`, `totalEarned`, `totalLost`
- `totalTipsReceived`, `totalTipsSent`, `totalLikesReceived`

These stats exist but aren't surfaced meaningfully. There's no unlock tree, no skill growth, no sense of "I'm getting better at this game over time."

### Progression Philosophy
Die Forward's theme is **death as progress.** The progression system should embody that:
- **Death teaches.** Every death should unlock knowledge.
- **Knowledge is power.** Meta-knowledge makes you better without making the game easier.
- **The dungeon remembers.** Your deaths literally change future runs.

### Proposed: The Grimoire (Knowledge Progression)

A persistent book that fills up across runs. Three sections:

#### 3a. Bestiary Mastery
**Current:** The bestiary screen exists but is static — it shows all creatures.
**Proposed:** Creatures start **locked**. You unlock entries by encountering and dying to (or killing) them.

Tiers of knowledge per creature:
1. **Encountered** — Name and emoji visible. "You've seen this before."
2. **Studied** (die to it or kill it 3 times) — Full description + tier + HP range visible
3. **Mastered** (kill it 5 times) — Intent patterns revealed ("Tends to CHARGE on turn 2"), +5% damage against this creature

**WHY:** This turns the bestiary from a reference page into a progression system. It makes death feel productive: "I died to The Congregation again, but now I've Studied them." It also gives combat a knowledge edge — mastered enemies are slightly easier because you've earned understanding of their patterns.

**EFFORT:** Low-Medium. Add a `bestiaryProgress` map to the player record (`{ "The Drowned": { encounters: 7, kills: 4, deaths: 2 } }`). Update bestiary screen to show lock states. Add the +5% mastery bonus in combat damage calculation.

#### 3b. Zone Unlocks
**Current:** 5 zones defined, only Sunken Crypt enabled. Unlock conditions exist in registry but aren't implemented.
**Proposed:** Implement the unlock chain:

```
Sunken Crypt (default)
    ↓ (Complete 1 run — reach room 8+, not necessarily victory)
Ashen Crypts / Frozen Gallery / Living Tomb (pick one, others unlock after)
    ↓ (Clear 3 different zones)
The Void Beyond
```

Each zone has a **unique mechanic** (already designed in registry.json):
- Ashen Crypts: **BURN** — DoT that stacks. Kill fast or you die to ticks.
- Frozen Gallery: **CHILL** — Stamina costs increase. FREEZE enemies by dodging 3x.
- Living Tomb: **INFECTION** — Enemies leave spores. Get infected = lose max HP permanently for the run.
- Void Beyond: **FLUX** — Intents can lie. CLARITY meter protects you.

**WHY:** Zone unlocks are the #1 mid-term retention hook. The player has a clear goal: "I want to see the next zone." Each zone's unique mechanic forces you to learn new strategies, preventing staleness.

**EFFORT:** Medium-High. Zone content JSONs exist but zone-specific mechanics need code. Start with Ashen Crypts (BURN is simplest — just a DoT timer).

#### 3c. Death Milestones
Lifetime death count unlocks:

| Deaths | Unlock | 
|--------|--------|
| 10 | Title: "The Persistent" |
| 25 | Death card border: Bone frame |
| 50 | New item available in loot pool: Soulstone (+10% all stats) |
| 100 | Title: "The Undying" + unique death card background |
| 250 | Passive: Start every run with a random item |
| 500 | Title: "Death's Friend" + start with 110 HP |

**WHY:** This makes death *literally* your progression currency. The more you die, the stronger you get. It's perfectly on-theme and it means every single run — even a terrible one where you die on room 1 — moves you forward.

**EFFORT:** Low. Just check `totalDeaths` against thresholds. Titles are strings on the player record. The room-1-item is a flag check in `startGame`. HP bonus is a starting-health override.

#### 3d. Difficulty Scaling (Anti-Grind)
As the player gets stronger (mastery bonuses, death milestone perks), increase difficulty:

- Enemies gain +1% HP per 10 player deaths (caps at +30%)
- Tier 2+ enemies appear 1 room earlier after 50 deaths
- New enemy variants appear after zone clears (e.g., "Ashen Drowned" — Drowned + BURN)

**WHY:** Prevents the game from becoming trivial. The player gets stronger, but so does the dungeon. This creates a satisfying equilibrium where you're always challenged but always feel your progress.

**EFFORT:** Low. Scale enemy HP in `getCreatureHealth()` based on player death count. Adjust tier thresholds in `getTierForRoom()`.

---

## 4. ECONOMY MODELING

### Current State
- **Currency:** SOL (real money)
- **Staking:** 0.01-0.25 SOL per run
- **Win payout:** Stake + 50% bonus from Memorial Pool
- **Tipping:** 0.01 SOL to corpses
- **Monetization:** None beyond staking

### The Problem
The staking model works for crypto-native users, but it's a barrier for everyone else. Free Play exists but has no stakes (literally). There's no engagement currency, no cosmetics, no reason to spend beyond the initial stake.

### Proposed Economy: Three Tiers

#### Tier 1: Essence (Soft Currency — Earned, Never Purchased)

**What is it:** The souls of the dead. Every death in the dungeon releases Essence. You collect it passively as you play.

**How you earn it:**
| Action | Essence |
|--------|---------|
| Complete a room | 5 |
| Kill an enemy | 10-20 (by tier) |
| Discover a corpse | 8 |
| Light a candle (like a death) | 3 |
| Tip a corpse | 15 |
| Die (your own death) | 5 × room number |
| Complete a run | 100 |
| Daily challenge completion | 50 |

**What you spend it on:**
- Unlock cosmetic death card borders (50-500 Essence)
- Unlock title variations (100-1000 Essence)
- Reroll run modifier at start (25 Essence)
- Unlock zone lore entries (30 Essence each — optional reading)

**WHY:** A soft currency solves the "free play has no stakes" problem. Free players earn Essence and spend it on cosmetics. It's a progression carrot that doesn't affect gameplay balance. It also creates an economy sink for eventual monetization.

**EFFORT:** Low-Medium. Add an `essence` field to the player record. Award it at the right events. Build a simple shop screen.

#### Tier 2: SOL Staking (Unchanged — The Real Stakes)

Keep the existing model. It works. Staked runs are the high-stakes mode for crypto users:
- Stake 0.01-0.25 SOL
- Win = stake + 50% bonus
- Die = stake goes to Memorial Pool

**One change:** Allow "spectating" staked runs. When someone starts a staked run, their progress appears in a live ticker on the home screen. Creates tension for watchers.

**EFFORT:** Low. Emit run-progress events to InstantDB. Home screen already has the death feed — add a "live runs" section.

#### Tier 3: Premium Cosmetics (Future Monetization)

**NOT YET.** Build the Essence economy first. Once players value cosmetics, introduce:

- **Seasonal Death Card Themes** (1-2 SOL or $2-5 fiat)
- **Animated Death Card Borders** (rarer, more expensive)
- **Custom Epitaph Fonts** (subtle, fun)
- **Profile Frames** (for leaderboard display)

**Business model options (choose one later):**
1. **Season Pass** ($5/month) — Exclusive cosmetics + 2x Essence earn rate + daily challenge bonus rewards
2. **À la carte** — Buy individual cosmetics with SOL
3. **Battle Pass** (free track + paid track) — Most proven model in mobile gaming

**WHY NOT NOW:** Monetization before retention is putting the cart before the horse. Die Forward needs to prove that players come back *before* asking them to pay. The priority order is: Fun → Retention → Monetization.

#### Drop Rates & Item Economy

**Current items and their issues:**
- Items are randomly found in corpse/cache rooms
- No rarity system — all items feel equivalent
- No strategic choice in which items to carry
- Inventory has no limit — no tension

**Proposed changes:**

**Inventory Limit: 4 slots**
Forces trade-offs. When you find a 5th item, you must drop one. "Do I keep the Torch (+25% damage) or swap for the Shield (-25% taken)?" This is a decision point in every loot room.

**Item Rarity:**
| Rarity | Drop Rate | Items |
|--------|-----------|-------|
| Common | 60% | Herbs, Bone Dust, Pale Rations, Rusty Blade, Tattered Shield |
| Uncommon | 30% | Torch, Dagger, Shield, Cloak, Bone Charm |
| Rare | 9% | Poison Vial, Ancient Scroll, Eye of the Hollow |
| Legendary | 1% | Heartstone, new items (Voidblade, Death's Mantle) |

**New Legendary Items:**
- **Voidblade** — +50% damage, but you take 5 damage per turn (berserker build)
- **Death's Mantle** — When you would die, survive with 1 HP once (consumed on use)
- **Pale Crown** — +1 stamina max, but healing reduced by 50%

**WHY:** Item rarity creates excitement ("I found a Legendary!") and build diversity ("This run I have Voidblade + Herbs — berserker glass cannon"). Inventory limits force trade-offs. Both increase decision density.

**EFFORT:** Medium. Add a `rarity` field to items. Weighted random selection for drops. Inventory limit check in `addToInventory`. New items are just entries in the ITEM_DETAILS record.

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Wire Up the Content Engine (Weeks 1-4)

The highest-impact work is connecting existing content to the game. Everything below builds on authored content that already exists.

---

#### TASK 1.1 — Zone-Aware Content Loader
**Files:** `lib/content.ts` (rewrite core), new `lib/zone-loader.ts`
**Effort:** 2-3 days
**Impact:** Unlocks all 5 zones' content

**What:**
Create a zone content loader that reads zone JSON at runtime and replaces the hardcoded content system.

**Implementation:**
```
lib/zone-loader.ts (new)
├── loadZone(zoneId: string) → ZoneData
├── getZoneRoom(zone, roomType, template?) → RoomContent  
│   ├── For full-room zones (sunken-crypt): pick random variation from template
│   └── For fragment zones: assemble opening + middle + closing
├── getZoneCreature(zone, tier) → CreatureInfo
├── getZoneDepth(zone, roomNumber) → DepthInfo  
├── getZoneBoss(zone) → CreatureInfo
└── getZoneOptions(zone, category?) → string[]
```

**Key decisions:**
- Import zone JSONs statically (they're small, <50KB each) vs. lazy-load. Static is simpler for Expo bundling
- Fragment assembly: `opening + " " + middle + " " + closing` with seeded RNG for reproducibility
- For fragment zones, options come from the `fragments.options` pools (cautious/aggressive/investigative/retreat), mapped to room context
- Sunken Crypt keeps using its full room variations — they're richer. Don't fragment what's already whole

**Migration:** `generateRandomDungeon()` becomes `generateDungeon(zoneId, rng)` — reads the zone's `dungeonLayout.structure` and populates each room from zone content.

---

#### TASK 1.2 — Surface Explore Room Options  
**Files:** `app/play.tsx` (modify `getOptions()`)
**Effort:** 1 day
**Impact:** Doubles decision density — every room becomes a choice

**What:**
Replace hardcoded "Press forward" with the options that are already authored in zone content.

**Current code (play.tsx line ~240):**
```typescript
case 'explore':
  return [
    { id: '1', text: 'Press forward', action: 'explore' },
  ];
```

**New code:**
```typescript
case 'explore': {
  const roomOptions = room.content?.options || ['Press forward'];
  return roomOptions.map((text, i) => ({
    id: String(i + 1),
    text,
    action: i === 0 ? 'explore-primary' : i === 1 ? 'explore-secondary' : 'explore-tertiary',
  }));
}
```

**Action handlers needed:**
- `explore-primary` — Safe path. Advance to next room. (Same as current "Press forward")
- `explore-secondary` — Risk/reward path. RNG roll: 55% find item, 30% nothing, 15% take 8-15 damage + nothing. Uses seeded RNG.
- `explore-tertiary` — Intel path. Costs 1 stamina. Reveals which option is safe OR previews next room's enemy intent. Knowledge reward.

**Content mapping for fragment zones:**
Options are categorized (cautious/aggressive/investigative/retreat). Map them:
- cautious → `explore-primary` (safe)
- aggressive → `explore-secondary` (risk/reward)  
- investigative → `explore-tertiary` (intel, costs stamina)
- retreat → only available in deeper rooms (alternate flee before combat)

---

#### TASK 1.3 — Zone Bestiary Integration
**Files:** `lib/content.ts` BESTIARY, `lib/zone-loader.ts`
**Effort:** 1-2 days
**Impact:** Zone-specific creatures make each zone feel distinct

**What:**
Merge zone-local creatures into the bestiary. When generating a dungeon for a zone, use that zone's creatures (local + shared).

**Implementation:**
- Zone JSON bestiary format has `local` (full creature defs) and `shared` (names referencing the global BESTIARY)
- `getZoneCreature(zone, tier)` picks from zone-local creatures of matching tier, with shared creatures as fallbacks
- Zone bosses override The Keeper based on `zone.boss`
- Keep global BESTIARY as the master reference; zone-local creatures get merged at load time

**New creatures this unlocks:**
- Ashen Crypts: Ember Husks, Cinder Priests, The Scorched, Flame Weavers, Ashen Congregation (5 local + boss)
- Frozen Gallery: The Preserved, Ice Wraiths, Frost Sentinels, The Shattered (4 local + boss)
- Living Tomb: Mycelium Crawlers, The Incorporated, Membrane Guardian, The Bloom (4 local + boss)
- Void Beyond: Probability Shade, Echo Double, Void Architect, The Unanchored (4 local + boss)
- **Total: 17 new creatures + 4 bosses**

---

#### TASK 1.4 — Death Milestones
**Files:** `lib/instant.ts` (player schema), new `lib/milestones.ts`, `app/death.tsx`
**Effort:** 1-2 days
**Impact:** Every run feels productive. Death = progression

**What:**
Player death count unlocks persistent rewards.

**Implementation:**
```typescript
// lib/milestones.ts
const DEATH_MILESTONES = [
  { deaths: 10, type: 'title', value: 'The Persistent', description: 'Die 10 times' },
  { deaths: 25, type: 'border', value: 'bone-frame', description: 'Die 25 times' },
  { deaths: 50, type: 'item_pool', value: 'Soulstone', description: 'Die 50 times' },
  { deaths: 100, type: 'title', value: 'The Undying', description: 'Die 100 times' },
  { deaths: 250, type: 'perk', value: 'starting_item', description: 'Start with a random item' },
  { deaths: 500, type: 'perk', value: 'bonus_hp', description: 'Start with 110 HP' },
];

function getUnlockedMilestones(totalDeaths: number): Milestone[] { ... }
function getNewMilestone(prevDeaths: number, newDeaths: number): Milestone | null { ... }
```

**Player schema addition:**
```typescript
// Add to Player interface
activeTitle?: string;         // Selected title
activeBorder?: string;        // Selected death card border
unlockedTitles?: string[];    // All unlocked
unlockedBorders?: string[];   // All unlocked
```

**UI integration:**
- Death screen: If a milestone was just unlocked, show a celebratory banner before the epitaph input
- Share cards: Use active title and border
- Game start: Check perks (starting_item, bonus_hp) and apply

---

#### TASK 1.5 — Run Modifiers
**Files:** New `lib/modifiers.ts`, `lib/GameContext.tsx`, `app/stake.tsx` or new pre-run screen
**Effort:** 1-2 days  
**Impact:** Massive run variety from minimal code

**What:**
Apply 1 random modifier at run start that changes game settings for that run.

**Implementation:**
```typescript
// lib/modifiers.ts
const RUN_MODIFIERS = [
  {
    id: 'blood-pact',
    name: '🩸 Blood Pact',
    description: '+25% damage dealt, -30% healing received',
    settings: { damageBonus: 0.25, healingPenalty: 0.3 },
  },
  {
    id: 'blind-descent', 
    name: '🌑 Blind Descent',
    description: 'Enemy intents hidden on first turn of each combat',
    settings: { hideFirstIntent: true },
  },
  {
    id: 'deaths-echo',
    name: '💀 Death\'s Echo',
    description: 'More corpses appear. The dead are restless.',
    settings: { corpseChanceBonus: 0.3 },
  },
  {
    id: 'numbing-cold',
    name: '🧊 Numbing Cold',
    description: 'Start with 2 stamina. Regen +1 extra per turn.',
    settings: { startingStamina: 2, staminaRegenBonus: 1 },
  },
  {
    id: 'iron-will',
    name: '🛡️ Iron Will',
    description: 'Brace negates ALL damage but costs 1 stamina.',
    settings: { braceNegatesAll: true, braceCost: 1 },
  },
  {
    id: 'glass-cannon',
    name: '⚡ Glass Cannon',
    description: 'Start at 60 HP. +50% damage dealt.',
    settings: { startingHP: 60, damageBonus: 0.5 },
  },
];

function rollModifier(rng: SeededRng): RunModifier { ... }
```

**Integration:** 
- `GameContext.startGame()` rolls a modifier using the run seed
- Modifier stored in game state, displayed on play screen header
- Settings overrides applied in combat calculations (existing settings system makes this easy — most modifiers map to existing tunable knobs)
- Show modifier on the "entering dungeon" transition with a brief animation

---

#### TASK 1.6 — Inventory Limit + Item Rarity
**Files:** `lib/content.ts` (ITEM_DETAILS), `app/play.tsx`, `lib/GameContext.tsx`
**Effort:** 1-2 days
**Impact:** Forces meaningful choices in loot rooms

**What:**
- Cap inventory at 4 slots
- Add rarity tiers to items with weighted drop rates
- When inventory is full and you find an item, show a swap screen

**Implementation:**
```typescript
// Add to ITEM_DETAILS entries
rarity: 'common' | 'uncommon' | 'rare' | 'legendary';

// Rarity weights
const RARITY_WEIGHTS = {
  common: 0.55,     // Herbs, Bone Dust, Pale Rations, Rusty Blade, Tattered Shield
  uncommon: 0.30,   // Torch, Dagger, Shield, Cloak, Bone Charm
  rare: 0.12,       // Poison Vial, Ancient Scroll, Eye of the Hollow
  legendary: 0.03,  // Heartstone, Death's Mantle (new), Voidblade (new)
};

// New legendary items
"Death's Mantle": {
  rarity: 'legendary',
  effect: 'Survive one lethal hit with 1 HP (consumed)',
  // Implemented as a death-save check in combat damage resolution
},
"Voidblade": {
  rarity: 'legendary', 
  effect: '+50% damage, take 5 damage per turn',
  // Self-damage applied at end of each combat turn
},
```

**Inventory full UI:**
When finding a 5th item, show a modal:
```
╔═══════════════════════════╗
║  INVENTORY FULL (4/4)     ║
║                           ║
║  Found: 🗡️ Dagger [UNC]  ║
║  +35% damage              ║
║                           ║
║  ── SWAP FOR ──           ║
║  [1] 🌿 Herbs             ║
║  [2] 🛡️ Tattered Shield   ║
║  [3] 💀 Bone Charm        ║
║  [4] 🔥 Torch             ║
║                           ║
║  [5] Leave it             ║
╚═══════════════════════════╝
```

---

### Phase 2: Retention Systems (Weeks 5-8)

#### TASK 2.1 — Enable Ashen Crypts (First New Zone)
**Files:** Zone loader (from 1.1), combat system for BURN mechanic
**Effort:** 3-4 days
**Impact:** First new zone — major content expansion

**What:**
Wire up Ashen Crypts as the first fragment-based zone. All content exists. The new work is the BURN mechanic.

**BURN mechanic:**
```typescript
// Burn stacks: 0-5
// Each stack does 3 damage per turn at end of combat round
// Stacks decay by 1 per turn naturally
// Enemies can apply 1-2 burn stacks on hit
// Player can remove stacks by using Brace (fire-specific: bracing smothers flames)

interface BurnState {
  stacks: number;  // 0-5
  maxStacks: 5;
}

// In combat resolution:
// After action resolves, apply burn damage: stacks × 3
// Then decay: stacks = max(0, stacks - 1)
// On enemy hit: stacks += enemy.burnApply (1-2 based on creature)
// On Brace: stacks = max(0, stacks - 2)  
```

**Zone unlock condition:** Reach room 8+ in any run (not necessarily victory). Check `player.highestRoom >= 8`.

---

#### TASK 2.2 — Daily Challenges
**Files:** New `lib/daily.ts`, new screen `app/daily.tsx`, `lib/instant.ts` additions
**Effort:** 2-3 days
**Impact:** #1 retention mechanic in roguelites

**What:**
One curated run per day with a fixed seed. Same dungeon for everyone. Global leaderboard.

**Implementation:**
- Daily seed: `sha256("die-forward-daily-" + YYYY-MM-DD)` → deterministic
- Daily modifier: Derived from seed (always the same modifier for the same day)
- Daily zone: Rotates through enabled zones
- Tracking: `dailyChallenges` collection in InstantDB — `{ date, playerId, roomReached, enemiesKilled, score }`
- Leaderboard: Sort by score (room reached × 100 + enemies killed × 10 + HP remaining)
- One attempt per day per player (free, no stake)

**UI:** 
- Home screen: "TODAY'S CHALLENGE" card with zone, modifier, top scores
- Post-run: "Your rank: #47 of 203 today"

---

#### TASK 2.3 — Bestiary Mastery
**Files:** `lib/instant.ts` (player schema), `app/bestiary.tsx`, `lib/content.ts`
**Effort:** 2 days
**Impact:** Turns death into knowledge progression

**What:**
Track per-creature encounters. Progressive unlocks: Encountered → Studied → Mastered.

**Player schema addition:**
```typescript
bestiaryProgress?: Record<string, {
  encounters: number;
  kills: number;
  deaths: number;  // times this creature killed you
}>;
```

**Unlock tiers:**
- **Encountered** (1+ encounter): Name + emoji visible in bestiary
- **Studied** (kill or die to 3+ times): Full stats + description
- **Mastered** (5+ kills): Intent patterns shown + 5% damage bonus vs this creature

**Integration:**
- Combat end: Update bestiaryProgress for the creature fought
- Bestiary screen: Show lock states, progress bars toward next tier
- Combat damage calc: Check mastery for 5% bonus
- New creatures from zone bestiaries start locked — gives exploration incentive

---

#### TASK 2.4 — Essence Currency
**Files:** `lib/instant.ts` (player schema), new `lib/essence.ts`, new `app/shop.tsx`
**Effort:** 2-3 days
**Impact:** Engagement loop for free players, monetization foundation

**What:**
Soft currency earned through play, spent on cosmetics.

**Earn rates (per Section 4 design):**
- Complete room: 5
- Kill enemy: 10-20 (by tier)
- Discover corpse: 8
- Light candle: 3
- Tip corpse: 15
- Die: 5 × room number
- Complete run: 100
- Daily challenge: 50

**Spend on:**
- Death card borders (50-500)
- Titles (100-1000)
- Reroll run modifier at start (25)
- Zone lore entries (30 each)

---

#### TASK 2.5 — Run Streaks
**Files:** `lib/instant.ts` (player schema)
**Effort:** 0.5 days
**Impact:** Low effort habit-forming mechanic

**Player schema addition:**
```typescript
currentStreak?: number;
longestStreak?: number;
lastPlayedDate?: string;  // YYYY-MM-DD
```

**Logic:** On run start, check if `lastPlayedDate` was yesterday → increment streak. If older → reset. Reward thresholds at 3, 7, 14, 30 days.

---

### Phase 3: Polish + Expansion (Weeks 9-12)

#### TASK 3.1 — Enable Frozen Gallery + Living Tomb
**Effort:** 2-3 days each (mechanic implementation + testing)
- Frozen Gallery: CHILL (stamina costs +1 in deep rooms) + FREEZE (dodge 3x → enemy skips turn)
- Living Tomb: INFECTION (enemies leave spores, infection reduces max HP for the run)

#### TASK 3.2 — Cosmetics Shop
**Effort:** 2 days
- Spend Essence on borders, titles
- Simple grid shop screen
- Preview death card with selected cosmetics

#### TASK 3.3 — Difficulty Scaling
**Effort:** 1 day
- Enemy HP +1% per 10 player deaths (caps +30%)
- Tier 2 enemies appear 1 room earlier after 50 total deaths

#### TASK 3.4 — Live Run Spectating
**Effort:** 2-3 days
- Staked runs emit progress events to InstantDB
- Home screen "LIVE RUNS" section showing active staked runs
- Tap to see room-by-room progress

#### TASK 3.5 — Void Beyond
**Effort:** 3-4 days
- FLUX mechanic (intents can lie — shown intent has 20% chance of being wrong)
- CLARITY meter (depletes when you encounter lies, refills on correct counters)
- Unlock requires 3 zone clears

---

## 6. WHAT NOT TO DO

Things that sound good but would be traps for a 2-person team:

- ❌ **Real-time multiplayer** — Complexity explosion. The async social layer (corpses, tips, candles) is more distinctive and cheaper to maintain.
- ❌ **AI-generated narrative per room** — Latency, cost, inconsistent quality. Pre-authored content with procedural assembly (your fragment engine) is the right call.
- ❌ **$DIE token** — Don't launch a token until the game has proven retention. Token launches are a one-shot gun.
- ❌ **PvP** — Wrong genre. Die Forward's soul is "lonely but not alone" — cooperation and shared suffering, not competition (except leaderboards).
- ❌ **Complex crafting system** — Adds inventory management burden. Keep items simple: find it, use it, or drop it.

---

## 7. SUCCESS METRICS

Before building, define what "working" looks like:

| Metric | Current (est.) | Phase 1 Target | Phase 2 Target |
|--------|---------------|----------------|----------------|
| Average runs per session | 1-2 | 3-4 | 4-5 |
| Day-1 retention | ~10% | 25% | 35% |
| Day-7 retention | ~2% | 10% | 15% |
| Average run duration | 8-12 min | 6-10 min | 6-10 min |
| Decisions per room | 0.4 | 1.0+ | 1.2+ |
| Death card shares per 100 deaths | ~5 | ~10 | ~15 |
| Unique zones played (avg) | 1.0 | 2.0+ | 3.0+ |
| Daily challenge participation | N/A | 20%+ of DAU | 30%+ of DAU |

---

## 8. IMPLEMENTATION DEPENDENCY GRAPH

```
TASK 1.1 Zone Loader ──────┬──→ TASK 1.2 Explore Options
(everything depends on this)├──→ TASK 1.3 Zone Bestiary
                            ├──→ TASK 1.5 Run Modifiers
                            ├──→ TASK 2.1 Ashen Crypts
                            └──→ TASK 3.1 More Zones

TASK 1.4 Death Milestones ──→ TASK 2.4 Essence Currency ──→ TASK 3.2 Shop

TASK 1.6 Inventory Limit ──→ (standalone, no deps)

TASK 2.2 Daily Challenges ──→ (needs zone loader)
TASK 2.3 Bestiary Mastery ──→ (needs zone bestiary)
TASK 2.5 Run Streaks ──→ (standalone)
```

**Critical path:** Zone Loader (1.1) → Explore Options (1.2) + Zone Bestiary (1.3) → Ashen Crypts (2.1)

Everything starts with the zone loader. It's the foundation that unlocks everything else.

---

## 9. EFFORT SUMMARY

| Phase | Tasks | Estimated Days | What it Unlocks |
|-------|-------|---------------|-----------------|
| **Phase 1** | 1.1-1.6 | 8-12 days | Zone content live, room choices, milestones, modifiers, inventory depth |
| **Phase 2** | 2.1-2.5 | 10-13 days | Ashen Crypts, daily challenges, bestiary mastery, economy, streaks |
| **Phase 3** | 3.1-3.5 | 10-14 days | 3 more zones, shop, difficulty scaling, spectating |
| **Total** | 16 tasks | ~28-39 days | 5 playable zones, full progression, economy, retention systems |

### Phase 1 Alone Gets You:
- **5× more narrative content** surfaced (from 220 variations to 1,800+ strings)
- **2× decision density** (every room is now a choice)
- **Run variety** (modifiers make each run feel different)
- **Death as progression** (milestones)
- **Inventory trade-offs** (rarity + limit)
- Zero new content authoring needed — it's all wiring

---

*This document is the starting point for discussion, not a final spec. Every proposal above should be debated before implementation.*

---

*This document is the starting point for discussion, not a final spec. Every proposal above should be debated before implementation.*
