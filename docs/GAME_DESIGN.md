# Die Forward — Game Design

*Last updated: 2026-07-11*

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

### The Dungeon Graph (Per-Run Arc)

Dungeons are no longer a fixed linear sequence — each zone is authored as a branching **DAG node graph** (`generateDungeonGraph`, `mobile/lib/zone-loader.ts`), built from `ZoneNode`/`ZoneGraphLayout` types. All 5 zones ship full branching graphs of **20-23 nodes** each, validated by `validateZoneGraph`. Edges always descend exactly one depth — you can branch sideways within a depth, but never skip or go back up.

- **`currentRoom`** is a canonical **1-based depth projection** carried through `GameContext`, the server session routes, and the on-chain `u8` run-record field — so "depth" stays a stable, comparable number even though the underlying graph is branching, not linear.
- **Side chambers** (`side: true` nodes) are client-only optional detours, gated by an item (`gate: { item, consumes }`) — you need the right item to unlock them, and it's consumed on entry. **Bone Dust** reveals a branch's type before you commit to it.
- Enemy tier still scales with depth, and Tier 3 enemies (bosses) cluster at the deepest reachable nodes. Clear rate at the deepest nodes is intentionally low.

Room composition along the graph is determined by the active zone. Each run includes explore, combat, corpse, and cache rooms — the exact mix is generated from the zone's room pool and the daily **world shift** (see **World Shift & Community Layer** below), which masks certain edges/side doors per zone per day.

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
| 🎯 Bait | `baitCost` ⚡ | Forces the enemy's next intent to AGGRESSIVE — a one-shot crit setup (`onBait` in `creature-rules.ts`). |

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

All damage math lives in one place: **`mobile/lib/combat-math.ts`** — pure, unit-tested functions. `combat.tsx` only wires the outputs into UI/state; it does not compute damage itself.

Final damage = `Base × TierMult × IntentMult × ItemMods × ChargeMult × ModifierMult`

Example: Tier 2 enemy (1.5x) with HUNTING intent (1.3x) vs player with Shield (-25%) and Glass Cannon (+50% damage dealt):
- Player base hit: 25 damage
- After Glass Cannon: 25 × 1.5 = 37.5
- Enemy base hit: 15 damage
- After tier: 15 × 1.5 = 22.5
- After intent: 22.5 × 1.3 = 29.25
- After shield: 29.25 × 0.75 = **22 damage**

**Apex creatures** get a **+15% HP/damage buff** (`applyApexBuff` in `combat-math.ts`) on top of the above, plus a bounty (bonus loot roll + bestiary-mastery credit) on kill. Apex status is assigned by the community layer (see below), not rolled per-run.

### Signature Rules & Bait

Beyond tier/intent, individual creatures carry **signature rules** — special-cased behavior defined in `creature-rules.ts`. There are 11: **rupture, reform, multiply, blink, absorb, drain, chant, pounce, honor, dormant,** and **repeating** (added with the Echo Husk in phase 4b — recites a moderated player phrase mid-fight; see **UGC Moderation** below).

Players have a **Bait** verb (`onBait`) available in combat: it forces the enemy's next intent to AGGRESSIVE, opening a one-shot crit window at the cost of `baitCost` stamina (admin-tunable via `/api/admin/settings`).

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

## Economy — The Offering Ladder

Staking is now a three-rung ladder ("The Shift", phase 3b). Each rung trades risk for reward differently:

| Rung | Stake | Notes |
|------|-------|-------|
| **Unbound** | None | Free play, offline-capable, firewalled from the leaderboard and any currency. |
| **Coin-Bound** | Pale Coins (`COIN_STAKE_OPTIONS = [60, 120, 240]`) | Earned-only in-game currency; staked at the Toll. |
| **Blood-Bound** | SOL (on-chain escrow) | Only shown when the `stakingPosture` admin setting (hidden / ritual / open) allows it. |

### Pale Coins (replaces the old "Essence" plan)

An earlier design called for a Phase 2 currency named **Essence** — that plan was superseded. The currency that actually shipped is **Pale Coins** (`src/lib/coins.ts` / `mobile/lib/coins.ts`): earned only through play, never purchasable.

- **Earning:** `computeCoinEarn` pays out a concave depth income — `floor(4·√min(depth, 13))` — plus flat clear and first-clear bonuses.
- **Coin-Bound stake:** at the Toll, players stake Pale Coins from `COIN_STAKE_OPTIONS`.
  - **Death** burns the stake into a pool-funded `coinPool`.
  - **Escape** returns the stake plus a pool-funded bonus (`coinBonusPercent`, default 50%), capped by the pool so payouts are population-net-negative — coins are never minted out of nowhere.
- **Binding Streak:** consecutive Coin-Bound clears build a public **seal tier** (`nextStreak`/`sealTier`, tiers 0/1/2/3 at streak 3/7/15). A Coin-Bound death resets the streak.

### SOL Staking (Blood-Bound)

| Stake | Outcome |
|-------|---------|
| 0.01-0.25 SOL | Locked for run duration |
| **Death** | 95% to Memorial Pool (5% fee), death hash written to Solana Memo Program |
| **Victory** | Stake returned + 50% bonus from pool |

Browser wallet users (Phantom, Solflare) get fully trustless escrow via the on-chain Anchor program. AgentWallet users use a custodial pool wallet — same mechanics, different trust model. Blood-Bound staking only appears when `stakingPosture` allows it; it's not the default entry point anymore.

**Unbound / Free Play** is available with no stake required. Deaths still count toward milestones and appear in the live feed.

---

## World Shift & Community Layer

### Daily World Shift

A daily seeded world shift (`mobile/lib/world-shift.ts`, keyed on UTC day + zone) drives each day's modifier-choice pool and masks map edges/side doors, deterministically per zone. Toggle via the `dailyShiftEnabled` game setting in `/admin`.

### Community Layer

A nightly server-receipted aggregation cron (`/api/game/shift`) rolls up the previous 24h of runs and writes the deny-by-default `worldShifts` InstantDB namespace with three community-driven features:

- **Apex creature** — a buffed (+15% HP/damage, see **Damage Calculation**) creature with a kill bounty.
- **Curse nodes** — nodes with a mass-death rate above `curseNodeThreshold` (default 10) get marked as dangerous.
- **Architect node** — the single deadliest node network-wide gets a special inscription (see **UGC Moderation** below).

Integrity is receipts-only — aggregation counts distinct accounts, applies per-account caps, and only trusts `runReceipts` (server-written on every death/victory), never forgeable client data. Clients merge the community layer additively on top of the seeded daily shift (`fetchCommunityShift`/`mergeShift`), degrading gracefully to the seeded-only layer when offline.

### Dispatch & Notifications

A shared `renderDispatch` pipeline (`mobile/lib/dispatch.ts`) surfaces the day's shift on the home panel and zone-select screen, in three rotating registers (warning / lament / invitation) with a scarcity rule of at most one per day.

Push notifications (`expo-notifications`) are opt-in and diegetic — the prompt appears after a player's first death, nothing is gated on granting permission. An hourly fan-out cron (`/api/game/dispatch`, `selectFanoutRecipients` in `src/lib/dispatch-fanout.ts`) sends each player their day's dispatch at their local morning, respecting the same one-per-day scarcity rule. Push body text is English-only for now; the personal "Architect built your corpse into the walls" push is deferred to a later pass.

### UGC Moderation

Anything written by one player that another player will see — a death's final message, an Echo Husk's recital, an Architect wall inscription — passes through a server-authoritative moderation core (`src/lib/moderation.ts`): NFKC normalization, Cyrillic/Greek homoglyph folding, leet-speak folding, and generic-TLD/handle URL blocking, with trust-weighting by account age/staked history/wallet-auth and fail-closed handling for unknown authors. Players can report content via the authenticated `/api/moderation/report` endpoint; repeated distinct reports suppress a phrase. Display surfaces (corpse, home feed, feed screen) also run a client-side mirror filter as a second layer.

---

## What's Coming

All originally-planned phases have shipped as of "The Shift": tags/synergies/enemy signature rules/stamina (Phase 1), branching DAG maps + side chambers + Pale Coin earn (2a/2b), daily world shift + modifier choice + Coin-Bound staking + staking posture (3a/3b), a dedicated security pass (coin IDOR fixes, admin/cron/perms hardening), the community aggregation layer (apex buff+bounty, curse/Architect nodes), the dispatch/push pipeline, and A2 UGC moderation (Echo Husks, Architect walls).

What remains is **launch hardening**, not new features: push notification credentials, an iOS local build script (currently Android-only), setting `CRON_SECRET` in production, and closing the remaining pre-mainnet security residuals (see `CLAUDE.md` for the current list).

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
