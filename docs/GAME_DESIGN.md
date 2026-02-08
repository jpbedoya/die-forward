# Game Design

## Overview

Die Forward is a text-based social roguelite. Players navigate procedurally generated dungeons through narrative choices. Death is not failure — it's contribution. Your corpse becomes content for future players.

## The Run

- Enter dungeon with a SOL stake
- Navigate 10-15 rooms
- Each room contains an encounter
- Make choices (not twitch reactions)
- Die → become content | Clear → claim rewards

## Encounter Types

| Type | Description |
|------|-------------|
| ⚔️ **Combat** | Fight enemies, risk HP for loot |
| 🪤 **Trap** | Test perception/items, failure = damage |
| 💀 **Ghost** | Find dead player's remains — loot them, read their message |
| 🎁 **Cache** | Safe loot room (rare) |
| ❓ **Mystery** | Agent-generated wildcard encounters |

## Combat System

### Philosophy

No HP trading ping-pong. Every choice is a risk/reward tradeoff. Fights are short (2-4 exchanges) but tense. **Enemies hit harder as you go deeper** — tier matters.

### Resources

| Resource | Description |
|----------|-------------|
| ❤️ Health | 100 max. Lose it all, you die |
| ⚡ Stamina | 3 max. Spent on aggressive moves, regens 1 between turns |
| 🎒 Items | Equipment that provides combat bonuses |

### Enemy Properties

- **Tier**: Determines base damage (Tier 1 = 1x, Tier 2 = 1.5x, Tier 3 = 2x)
- **Intent**: Telegraphed each turn — affects damage, defense, and flee chance
- **Health**: Varies by creature type and tier (25-160 HP)

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
| **STALKING** | Normal | Normal | -30% | Watching — hard to escape |
| **HUNTING** | 1.3x | Normal | -20% | Deals bonus damage |
| **ERRATIC** | 0.5x-2x random | Normal | +10% | Unpredictable |
| **RETREATING** | 0.5x | 1.2x | +30% | Vulnerable, easy to flee |

### Turn Flow

```
1. Enemy intent shown (AGGRESSIVE, CHARGING, etc.)
2. Combat modifiers displayed (tier, item bonuses)
3. Player picks action
4. Damage calculated with ALL modifiers
5. Stamina regens, new intent chosen
6. Repeat until someone drops
```

### Actions

| Move | Cost | Base Effect |
|------|------|-------------|
| ⚔️ Strike | 1 ⚡ | Deal 20-29 damage, take 10-17 |
| 🛡️ Brace | 0 | Take 50% reduced damage, **negates charge bonus** |
| 💨 Dodge | 1 ⚡ | 70% avoid all damage, **negates charge bonus** |
| 🌿 Herbs | 0 | Heal 20-29, but take a hit (consumes item) |
| 🏃 Flee | 1 ⚡ | Base 50% escape (modified by intent/items) |

### Item Combat Effects

Items provide **passive bonuses** while in inventory:

| Item | Effect |
|------|--------|
| 🔦 Torch | +25% damage dealt |
| 🗡️ Dagger | +35% damage dealt |
| 🗡️ Rusty Blade | +20% damage dealt |
| 🛡️ Shield / Tattered Shield | -25% damage taken |
| 🧥 Cloak | +15% flee chance, +10% defense |
| 🌿 Herbs | Consumable heal (not passive) |

### Damage Calculation

Final damage = `Base × TierMult × IntentMult × ItemMods × ChargeMult`

Example: Tier 2 enemy (1.5x) with HUNTING intent (1.3x) vs player with Shield (-25%):
- Base hit: 15 damage
- After tier: 15 × 1.5 = 22.5
- After intent: 22.5 × 1.3 = 29.25
- After shield: 29.25 × 0.75 = **22 damage**

### The Charge Mindgame

When you see **CHARGING**:
- Enemy deals reduced damage this turn
- But **NEXT TURN** they deal **DOUBLE**
- **Dodge** or **Brace** negates the charge bonus!
- Failing to counter = massive spike damage

> ⚠️ IT'S CHARGING UP!
> *DODGE or BRACE to avoid double damage!*

### Example Exchange

```
┌────────────────────────────────────────────────┐
│  🧟 THE DROWNED                 ❤️ ██████░░░░  │
│  TIER 1 • Intent: CHARGING                     │
│                                                │
│  It draws back, muscles tensing,               │
│  preparing to lunge...                         │
│                                                │
│  ⚠️ CHARGING — will deal DOUBLE next turn!     │
├────────────────────────────────────────────────┤
│  ⚔️ +25% DMG    🛡️ -25% TAKEN                  │
├────────────────────────────────────────────────┤
│  You: ❤️ 73   ⚡ 2/3   🎒 Torch, Shield, Herbs │
├────────────────────────────────────────────────┤
│  [1] ⚔️ Strike — trade blows                   │
│  [2] 🛡️ Brace — tank the hit (negates charge!) │
│  [3] 💨 Dodge — avoid damage (negates charge!) │
│  [4] 🌿 Herbs — heal now, take the hit         │
│  [5] 🏃 Flee — try to escape                   │
└────────────────────────────────────────────────┘
```

Player picks Brace → Takes minimal damage, charge is wasted. Smart play.

## Death System

### When You Die

```
Health reaches 0
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
Run ends
```

### On-Chain Death Verification

Every death is cryptographically hashed and written to **Solana's Memo Program**:

```
DIE_FORWARD:v1:<sha256 hash>
```

The hash includes: wallet address, zone, room, final message, stake amount, timestamp.

- **Cost:** ~0.000005 SOL (~$0.001) per death
- **Verification:** Anyone can look up the transaction on Solana Explorer
- **Immutable:** Permanent proof of your demise on-chain

### What Persists

- Your corpse location (room + zone)
- Your inventory at death
- Your final message
- Time of death
- Your wallet address (for tips)
- On-chain transaction signature (verifiable)

### Finding Corpses

Future players encounter your remains:

> *You find the remains of @player... they died 2 hours ago.*
> *They were carrying a Rusty Sword and 0.02 SOL worth of loot.*
> *Their final words: "...should have dodged..."*

Options:
- Search the corpse (get items)
- Pay respects (small tip to dead player)
- Read their run history
- Move on

## Progression

### Per-Run

- Health, stamina, items — reset each run
- Choices accumulate (clear rooms, kill enemies, find loot)

### Meta (Persistent)

| Unlock Type | Description |
|-------------|-------------|
| Knowledge | Hints about enemy types from past encounters |
| Zones | Successful clears unlock harder areas |
| Stats | Lifetime deaths, kills, SOL earned/lost, players helped |

## Social Layer

### Async Connection

- No real-time multiplayer
- See evidence of others through corpses, messages, world state
- "Lonely but not alone" — Dark Souls inspiration

### World State

- Collective deaths shape danger levels
- High death areas = more dangerous but more rewarding
- Successful clears temporarily "calm" zones
- Agent weaves player deaths into narrative

## Screen Layout

```
┌──────────────────────────────────────────────────┐
│  ◈ THE SUNKEN CRYPT — Room 7/12                 │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
├──────────────────────────────────────────────────┤
│                                                  │
│  You descend into a flooded chamber. Water      │
│  laps at your knees. In the corner, a corpse    │
│  slumps against the wall — @deadplayer's        │
│  remains. They died 2 hours ago.                │
│                                                  │
│  Something moves in the water.                  │
│                                                  │
├──────────────────────────────────────────────────┤
│  ❤️ 73/100    🎒 Torch, Rusty Blade, Herbs      │
│  ◎ 0.05 SOL staked                              │
├──────────────────────────────────────────────────┤
│                                                  │
│  [1] Search the corpse                          │
│  [2] Ready your blade and wait                  │
│  [3] Wade toward the exit quickly               │
│  [4] Use your torch to scan the water           │
│                                                  │
└──────────────────────────────────────────────────┘
        
        ◈ 12 adventurers died here today
```
