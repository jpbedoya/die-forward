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

No HP trading ping-pong. Every choice is a risk/reward tradeoff. Fights are short (2-4 exchanges) but tense.

### Resources

| Resource | Description |
|----------|-------------|
| ❤️ Health | Lose it all, you die |
| ⚡ Stamina | Spent on aggressive moves, regens between fights |
| 🎒 Items | Consumables that shift odds |

### Enemy Properties

- **Intent**: Telegraphed each turn (attacking, defending, charging, fleeing)
- **Weakness**: Discoverable through ghosts, observation, or items

### Turn Flow

```
1. Agent describes enemy + their INTENT
2. Player picks action
3. Outcome resolves
4. Repeat until someone drops
```

### Actions

| Move | Cost | Effect |
|------|------|--------|
| ⚔️ Strike | 1 ⚡ | Deal damage. Risky if they're attacking too |
| 🛡️ Brace | 0 | Reduce incoming damage. No offense |
| 🔄 Dodge | 1 ⚡ | Avoid attack IF you read intent correctly |
| 💥 Heavy | 2 ⚡ | Big damage but slow — punished if they dodge |
| 🏃 Flee | 1 ⚡ | Escape fight. Might take a hit |
| 🎒 Item | 0 | Use consumable — heals, buffs, reveals weakness |

### The Mindgame

Enemy telegraphs intent through narrative:

> *"The Drowned One raises both arms, water swirling around its fists."*

Player deduces: charging a heavy attack.

- **Strike?** Hit first, but if wrong, eat the heavy
- **Dodge?** Perfect read = free damage next turn
- **Brace?** Safe, but just stalling
- **Heavy?** Both charge up... who lands first?

### Example Exchange

```
┌────────────────────────────────────────────────┐
│  DROWNED ONE                    ❤️ ██████░░░░  │
│                                                │
│  It lunges forward, claws extended,            │
│  aiming for your throat.                       │
│                                                │
│  Intent: AGGRESSIVE                            │
├────────────────────────────────────────────────┤
│  You: ❤️ 73   ⚡ 2/3   🎒 Rusty Blade, Herbs   │
├────────────────────────────────────────────────┤
│  [1] ⚔️ Strike — trade blows                   │
│  [2] 🛡️ Brace — tank the hit                   │
│  [3] 🔄 Dodge — risky, big payoff              │
│  [4] 🎒 Herbs — heal now, take the hit         │
│  [5] 🏃 Flee — try to escape                   │
└────────────────────────────────────────────────┘
```

Player picks Dodge:

> *You sidestep as claws rake the air. The creature stumbles past — exposed.*
> 
> **Opening!** Next attack deals double damage.

## Death System

### When You Die

```
Health reaches 0
       ↓
Final narrative plays
       ↓
Prompt: "Your final thought?" (1 sentence)
       ↓
Corpse enters world pool
       ↓
Stake transfers to zone memorial
       ↓
Run ends
```

### What Persists

- Your corpse location (room + zone)
- Your inventory at death
- Your final message
- Time of death
- Your wallet address (for tips)

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
