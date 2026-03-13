# Die Forward — Game Design

*Last updated: 2026-03-13*

## Overview

Die Forward is a social roguelite on Solana where players navigate procedurally generated dungeons with narrative choices, zone-specific creatures, and persistent death — every run is unique, every death feeds the world.

---

## Core Loop

### The 30-Second Loop (In-Room)

Each room presents one of five encounter types. Choices matter — resources carry over across all rooms in a run.

#### EXPLORE Rooms

Every explore room presents 2-3 options:

| Option | Cost | Outcome |
|--------|------|---------|
| **Primary** (safe advance) | Free | Move forward, no risk |
| **Secondary [RISK]** | Free | 55% item find / 30% nothing / 15% damage |
| **Tertiary [1⚡]** | 1 stamina | Intel peek at the next room |

Options are authored per zone for full-room zones (Sunken Crypt). Fragment-based zones draw from cautious/aggressive/investigative pools. A generic "Observe carefully" tertiary always appears as a fallback.

#### COMBAT Rooms

Fight enemies using the intent-reading system. See **Combat System** below for full details.

- Enemy HP and first intent are rolled deterministically from the run seed
- Run modifiers affect combat directly (see **Run Modifiers**)
- Voidblade deals -5 HP/turn while equipped; Death's Mantle can absorb one lethal hit

#### CORPSE Rooms

Find the remains of a fallen player:

- **Search** — loot their inventory items
- **Pay Respects** — tip SOL to the dead player
- **Move On** — skip it

#### CACHE Rooms

A safe supply room. Choose to heal or continue:

- Heal restores HP (amount varies)
- All healing routes through `applyHealing()` — Blood Pact modifier applies here too
- No combat, no risk

#### EXIT Room

Proceed to the next depth. Three depths total — Shallow Graves, Bone Warren, The Abyss. Rooms get harder and creatures scale up as you descend.

---

### Run Modifiers

Each run rolls exactly one modifier, determined deterministically from the run seed. The modifier badge is shown on the play screen.

| Modifier | Effect |
|----------|--------|
| 🩸 **Blood Pact** | +25% damage dealt, -30% healing received |
| 🌑 **Blind Descent** | Enemy intent is hidden on turn 1 |
| 💀 **Death's Echo** | +30% chance to find a corpse room |
| 🧊 **Numbing Cold** | Start with 2 stamina; regenerate +1 extra stamina per turn |
| 🛡️ **Iron Will** | Brace action negates all incoming damage |
| ⚡ **Glass Cannon** | Start with 60 HP; deal +50% damage |

---

### The 5-Minute Loop (Per-Run Arc)

Each run spans 10-15 rooms across 3 depths:

- **Depth 1 — Shallow Graves**: Tier 1 enemies, introductory rooms. Establishes zone flavor.
- **Depth 2 — Bone Warren**: Tier 2 enemies appear. Stamina management tightens.
- **Depth 3 — The Abyss**: Tier 3 enemies and the boss. Clear rate is intentionally low (~10-15%).

Room composition per depth is determined by the active zone. Each run includes explore, combat, corpse, and cache rooms — the exact mix is generated from the zone's room pool.

---

### Run Streak & Replayability

- Every run has a unique seed, producing deterministic but varied content
- The run modifier changes the risk/reward calculus each time
- Zone progression unlocks new content as death count increases
- Your corpse persists for others to find — your run becomes content

---

## Progression

### Death Milestones

Death is the primary progression currency. Thresholds unlock permanent perks:

| Deaths | Unlock Type | Description |
|--------|-------------|-------------|
| 10 | Title | "The Persistent" |
| 25 | Death card border | Bone frame on share cards |
| 50 | Loot pool addition | Soulstone added to possible drops |
| 100 | Title | "The Undying" |
| 250 | Start-with-item perk | Begin each run with a starting item |
| 500 | HP boost | Start every run with 110 HP instead of 100 |

When a threshold is crossed, the death screen displays a milestone banner.

---

### Zone Progression

The dungeon system supports 5 zones. Each run takes place in one zone, generating zone-specific rooms, creatures, and boss encounters.

| Zone | Type | Unlock Condition | Description |
|------|------|-----------------|-------------|
| **Sunken Crypt** | Full-room | Default (always available) | Flooded stone chambers, aquatic horrors, The Keeper boss |
| **Ashen Crypts** | Fragment | Room 8+ reached | Ash and embers, burned dead, fire-adjacent enemies |
| **Frozen Gallery** | Fragment | Room 8+ reached | Ice-encased statues, cold silence, slow dread |
| **Living Tomb** | Fragment | Room 8+ reached | Organic horror, things that grow in the dark |
| **Void Beyond** | Fragment | 3 zone clears | Reality unravels, enemies defy logic, deepest rewards |

Zone clears are tracked on the player record (`clearedZones`). Full-room zones have authored narrative options per room. Fragment zones draw from curated option pools (cautious / aggressive / investigative).

---

### Inventory & Items

#### Inventory Limit

Players can carry up to **4 items**. Finding a 5th triggers an item swap modal — keep one, drop one. There's no automatic overflow.

#### Item Rarity

All loot drops use a weighted picker:

| Rarity | Chance |
|--------|--------|
| Common | 55% |
| Uncommon | 30% |
| Rare | 12% |
| Legendary | 3% |

#### Item Effects

All items provide passive bonuses while in inventory:

| Item | Rarity | Effect |
|------|--------|--------|
| 🔦 Torch | Common | +25% damage dealt |
| 🗡️ Rusty Blade | Common | +20% damage dealt |
| 🛡️ Tattered Shield | Common | -25% damage taken |
| 🧥 Cloak | Common | +15% flee chance, +10% defense |
| 🌿 Herbs | Common | Consumable heal (not passive) |
| 💎 Soulstone | Uncommon | +10% damage / defense / flee |
| 👁️ Eye of the Hollow | Uncommon | +20% corpse and cache room discovery |
| 🪝 Bone Hook | Uncommon | +20% flee success |
| 🪙 Pale Coin | Uncommon | +10% flee success |
| 🧂 Void Salt | Rare | +40% damage vs aquatic enemies (pending bestiary annotation) |
| 🗡️ Dagger | Rare | +35% damage dealt |
| 🛡️ Shield | Rare | -25% damage taken |
| 🌑 **Death's Mantle** | Legendary | Survive one lethal hit (consumed on use) |
| ⚔️ **Voidblade** | Legendary | +50% damage dealt, -5 HP per turn |

---

## Combat System

### Philosophy

Most runs end in death. Skilled players can make it. The stamina system forces pacing — you can't spam Strike. Reading enemy intent and responding correctly is mechanically rewarded. Every decision is a real tradeoff.

### Resources

| Resource | Description |
|----------|-------------|
| ❤️ Health | 100 max (110 at 500 deaths milestone; 60 with Glass Cannon). Lose it all, you die. Persists across rooms. |
| ⚡ Stamina | 4 max. Spent on actions, regens 1 per turn (2 with Numbing Cold). |
| 🎒 Items | Up to 4 equipped items providing passive combat bonuses. |

### Enemy Properties

- **Tier**: Determines base damage (Tier 1 = 1x, Tier 2 = 1.5x, Tier 3 = 2x)
- **Intent**: Telegraphed each turn — affects damage, defense, and flee chance
- **Health**: Rolled deterministically from run seed via `getCreatureHealthSeeded`

### Enemy Tiers

| Tier | Damage | Examples |
|------|--------|----------|
| **Tier 1** | 1.0x | The Drowned, Pale Crawler, Flickering Shade |
| **Tier 2** | 1.5x | Hollow Clergy, Carrion Knight, The Congregation |
| **Tier 3** | 2.0x | The Unnamed, Mother of Tides (bosses) |

### Intent System

Enemy intent **actively affects combat**. Read it carefully:

| Intent | Enemy Damage | Takes Damage | Flee Chance | Special |
|--------|--------------|--------------|-------------|---------|
| **AGGRESSIVE** | Normal | Normal | Normal | — |
| **CHARGING** | 0.5x this turn | Normal | Normal | ⚠️ **DOUBLE damage next turn** unless you Dodge/Brace! |
| **DEFENSIVE** | 0.5x | 0.5x | +20% | Harder to hurt |
| **STALKING** | Normal | Normal | -30% | Hard to escape |
| **HUNTING** | 1.3x | Normal | -20% | Deals bonus damage |
| **ERRATIC** | 0.5x-2x random | Normal | +10% | Unpredictable |
| **RETREATING** | 0.5x | 1.2x | +30% | Vulnerable, easy to flee |

Intent is rolled deterministically via `getCreatureIntentSeeded` each turn.

### Turn Flow

```
1. Enemy intent shown (AGGRESSIVE, CHARGING, etc.)
2. Active modifier effects displayed
3. Player picks action
4. Damage calculated with ALL modifiers
5. Voidblade tick: -5 HP if equipped
6. Stamina regens, new intent chosen
7. Repeat until someone drops
```

### Actions

| Move | Cost | Base Effect |
|------|------|-------------|
| ⚔️ Strike | **2 ⚡** | Deal 20-29 damage, take 10-17. +50% bonus vs AGGRESSIVE/HUNTING. |
| 🛡️ Brace | 0 ⚡ | Take 50% reduced damage. Negates CHARGING bonus. **Iron Will: negates ALL damage.** |
| 💨 Dodge | 1 ⚡ | 65% avoid all damage. Negates CHARGING. Counter-attacks CHARGING enemies. |
| 🌿 Herbs | 0 ⚡ | Heal 20-29, but take a hit (consumes item). Healing reduced by Blood Pact. |
| 🏃 Flee | 1 ⚡ | Base 50% escape (modified by intent/items). |

### Modifier Interactions in Combat

| Modifier | Combat Effect |
|----------|--------------|
| 🩸 Blood Pact | +25% damage on all Strikes; Herbs and combat healing reduced 30% |
| 🌑 Blind Descent | Enemy intent not shown on turn 1 |
| 🛡️ Iron Will | Brace action absorbs full damage (0 taken) |
| ⚡ Glass Cannon | +50% damage on all Strikes; start HP is 60 |

### Item Combat Effects

| Item | Passive Bonus in Combat |
|------|------------------------|
| 🔦 Torch | +25% damage dealt |
| 🗡️ Dagger | +35% damage dealt |
| 🗡️ Rusty Blade | +20% damage dealt |
| 🛡️ Shield / Tattered Shield | -25% damage taken |
| 🧥 Cloak | +15% flee chance, +10% defense |
| 💎 Soulstone | +10% damage / defense / flee |
| 🪝 Bone Hook | +20% flee success |
| 🪙 Pale Coin | +10% flee success |
| 🌑 Death's Mantle | Survive one lethal hit (auto-consumed when HP would reach 0) |
| ⚔️ Voidblade | +50% damage dealt, -5 HP per turn at end of round |

### Damage Calculation

Final damage = `Base × TierMult × IntentMult × ItemMods × ChargeMult × ModifierMult`

Example: Tier 2 enemy (1.5x) with HUNTING intent (1.3x) vs player with Shield (-25%) and Glass Cannon (+50% damage dealt):
- Player base hit: 25 damage
- After Glass Cannon: 25 × 1.5 = 37.5
- Enemy base hit: 15 damage
- After tier: 15 × 1.5 = 22.5
- After intent: 22.5 × 1.3 = 29.25
- After shield: 29.25 × 0.75 = **22 damage**

### The Charge Mindgame

When you see **CHARGING**:
- Enemy deals reduced damage this turn
- But **NEXT TURN** they deal **DOUBLE** unless countered
- **Dodge** = counter-attack fires, charge is wasted
- **Brace** = charge wasted, minimal damage taken (zero with Iron Will)
- **Strike** = you hit them, but eat double damage next turn — usually a bad trade

### Death Saves & Legendaries

**Death's Mantle**: If your HP would drop to 0 or below, Death's Mantle activates automatically, leaving you at 1 HP. The item is consumed. One save per run per item (you can't carry two).

**Voidblade**: The -5 HP/turn cost applies at the end of every combat round. If this would reduce you to 0 HP, normal death rules apply — Death's Mantle can save you from it.

---

## Economy

### SOL Staking

| Stake | Outcome |
|-------|---------|
| 0.01-0.25 SOL | Locked for run duration |
| **Death** | 95% to Memorial Pool (5% fee), death hash written to Solana Memo Program |
| **Victory** | Stake returned + 50% bonus from pool |

Browser wallet users (Phantom, Solflare) get fully trustless escrow via the on-chain Anchor program. AgentWallet users use a custodial pool wallet — same mechanics, different trust model.

**Free Play** mode is available with no stake required. Deaths still count toward milestones and appear in the live feed.

### Essence Currency (Phase 2)

A dungeon-specific currency earned through play. Details planned for Phase 2.

---

## What's Coming

**Phase 2** focuses on retention: Ashen Crypts zone with BURN mechanic, daily challenges, bestiary mastery tracking, Essence currency, and run streaks.

**Phase 3** covers polish and expansion: Frozen Gallery and Living Tomb zones, cosmetics shop, difficulty scaling, and live run spectating.

See `ROADMAP.md` for the full plan.

---

## Death System

### When You Die

```
Health reaches 0 (or Voidblade tick)
       ↓
Death's Mantle check (if equipped)
       ↓
Final narrative plays
       ↓
Prompt: "Your final thought?" (1 sentence)
       ↓
Death hash written to Solana Memo Program (on-chain proof)
       ↓
Corpse enters world pool
       ↓
Stake transfers to zone memorial
       ↓
Death milestone check — banner shown if threshold crossed
       ↓
Run ends
```

### On-Chain Death Verification

Every death is cryptographically hashed and written to **Solana's Memo Program**:

```
DIE_FORWARD:v1:<sha256 hash>
```

The hash includes: wallet address, zone, room, final message, stake amount, timestamp.

- **Cost:** ~0.000005 SOL (~$0.001) per death
- **Verification:** Verifiable on Solana Explorer
- **Immutable:** Permanent on-chain proof

### What Persists

- Corpse location (room + zone)
- Inventory at death
- Final message
- Time of death
- Wallet address (for tips)
- On-chain transaction signature

### Finding Corpses

> *You find the remains of @player... they died 2 hours ago.*
> *Their final words: "...should have dodged..."*

Options: Search (get items), Pay Respects (tip SOL), Move On.

---

## Social Layer

Die Forward is **async multiplayer** — you see evidence of others through corpses, messages, and world state. Lonely but not alone.

- Live death feed via InstantDB real-time queries
- Corpse discovery woven into explore and combat rooms
- Collective deaths shape perceived danger levels
- Death cards shareable to social media (canvas-generated)

---

## Juice & Feedback

- **Screen shake**: Light (<30 dmg), Heavy (≥30 dmg)
- **Haptics**: Light (enemy defeated), Medium (taking damage), Heavy (big hit), Death pattern
- **Low HP warning**: Heartbeat sound + pulsing HP bar when ≤25 HP
- **Milestone banners**: Shown on death screen when a threshold is crossed
- **Item swap modal**: Triggered when finding a 5th item
