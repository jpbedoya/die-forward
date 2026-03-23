# Die Forward — Player's Handbook

*A complete guide to surviving (and dying well in) the dungeons of Die Forward.*

*Last updated: 2026-03-22*

---

## What Is Die Forward?

A mobile roguelite on Solana where **death is not the end — it's content.** When you die, your corpse, inventory, and final words persist for future players to discover. Stake SOL for real stakes, or play empty-handed for free. Every run is different. Every death matters.

---

## How a Run Works

1. **Choose a zone** — Start with the Sunken Crypt; unlock more as you progress
2. **Stake or go empty-handed** — Risk SOL for a payout, or play free
3. **Descend 13 rooms** — Navigate explore rooms, fight creatures, find loot, discover corpses
4. **Survive to the boss** — Defeat the zone boss in room 13
5. **Escape or die** — Victory pays out your stake + bonus; death leaves your corpse behind

Each run takes roughly 8–15 minutes. A random **run modifier** changes the rules each time.

---

## Room Types

Your dungeon is 13 rooms across 3 depths. Each room is one of these types:

### Explore Rooms
Three choices per room:

| Option | Risk | Effect |
|--------|------|--------|
| **Primary** (safe path) | None | Advance to next room |
| **Secondary** (risk path) | Medium | 55% find item, 30% nothing, 15% take 8–15 damage |
| **Tertiary** (intel path) | 1 stamina | Peek at what's in the next room |

### Combat Rooms
Turn-based fights against zone creatures. See **Combat** below.

### Corpse Rooms
Discover real corpses left by other players. Options:
- **Search the body** — Chance to find their loot
- **Pay respects** — Honor the fallen
- **Tip** — Send 0.01 SOL to the dead player (wallet users only)

Discovery chance scales by depth: 50% (rooms 1–4), 65% (rooms 5–8), 80% (rooms 9–13).

### Cache Rooms
Supply rooms. Heal **+30 HP** (subject to modifier penalties and HP cap).

### Boss Room (Room 13)
Guaranteed boss fight. Defeat the boss to reach the exit.

### Exit Room
After the boss, choose **"Ascend to victory!"** to claim your reward.

---

## Combat

### Actions

| Action | Stamina | What Happens |
|--------|---------|--------------|
| **Strike** | 2 | Deal 15–25 base damage (+ item/modifier bonuses). Take enemy counter-attack. 15% critical hit chance (1.75x damage) |
| **Dodge** | 1 | 65% success: negate all damage. 35% fail: take 5–9 damage. If enemy is CHARGING: deal 8–14 counter damage |
| **Brace** | 0 | Reduce incoming damage by 50%. Still take 6–12 base damage |
| **Flee** | 1 | 50% base escape chance. Success: leave combat (60% clean, 40% take 5–12 damage). Fail: take 8–19 damage |

### Stamina
- Start each run with **3 stamina** (max 4)
- Regenerate **+1 per turn**
- Some modifiers change starting stamina and regen rate

### Enemy Intents
Each turn, the enemy telegraphs their next move. Read the intent to choose your action wisely.

| Intent | What It Means | Best Counter |
|--------|---------------|--------------|
| **AGGRESSIVE** | Normal attack | Strike back |
| **CHARGING** | Weak now, **double damage next turn** | Dodge (deals counter damage + avoids the charge) |
| **DEFENSIVE** | Guarding — takes half damage, deals half | Strike (still worth it at reduced damage) |
| **HUNTING** | +30% damage, harder to flee | Brace or strike |
| **STALKING** | Normal damage, −30% flee chance | Don't try to flee |
| **ERRATIC** | Random damage (0.5–2x) | Brace for safety |
| **RETREATING** | Weak attack, easier to flee | Flee or strike freely |

### Counter-Play Bonus
Choosing the right action against an intent gives **+50% damage bonus**:
- Strike vs AGGRESSIVE or HUNTING
- Dodge vs CHARGING

### Charge Mechanic
When an enemy shows CHARGING, they deal half damage that turn but **double damage next turn** if you don't dodge. Dodging a charging enemy also deals counter damage to them.

---

## Items & Inventory

### Inventory Limit: 4 Slots
When you find a 5th item, choose which slot to swap — or leave it behind.

### Rarity & Drop Rates

| Rarity | Drop Rate | Color |
|--------|-----------|-------|
| Common | 55% | — |
| Uncommon | 30% | — |
| Rare | 12% | — |
| Legendary | 3% | — |

### Item List

**Weapons**

| Item | Rarity | Effect |
|------|--------|--------|
| Rusty Blade ⚔️ | Common | +20% damage |
| Torch 🔥 | Uncommon | +25% damage |
| Dagger 🗡️ | Uncommon | +35% damage |
| Bone Hook 🪝 | Uncommon | +20% flee chance |
| Voidblade ⚔️ | **Legendary** | +50% damage, but **take 5 damage per combat turn** |

**Armor**

| Item | Rarity | Effect |
|------|--------|--------|
| Tattered Shield 🛡️ | Common | +25% defense |
| Shield 🛡️ | Uncommon | +25% defense |
| Cloak 🧥 | Uncommon | +10% defense, +15% flee chance |
| Bone Charm 💀 | Uncommon | +15% defense |
| Ancient Scroll 📜 | Rare | +20% defense, +10% flee chance |

**Consumables**

| Item | Rarity | Effect |
|------|--------|--------|
| Herbs 🌿 | Common | Heal 25–40 HP (single use) |
| Pale Rations 🍖 | Common | Restore full stamina (single use) |
| Bone Dust 💨 | Common | Reveal hidden paths |
| Poison Vial 🧪 | Rare | +40% damage (passive) |
| Void Salt 🧂 | Uncommon | +40% damage vs aquatic enemies |

**Artifacts**

| Item | Rarity | Effect |
|------|--------|--------|
| Pale Coin 🪙 | Common | +10% flee chance |
| Eye of the Hollow 👁️ | Rare | +20% corpse discovery chance |
| Soulstone 💎 | Rare | +10% to all stats. *Unlocks at 50 deaths* |
| Heartstone 💎 | **Legendary** | Near-death warning |
| Death's Mantle 🌑 | **Legendary** | Survive one lethal hit with 1 HP. **Consumed on use** |

### Special Item Mechanics
- **Voidblade** deals 5 self-damage at the end of each combat turn — can trigger Death's Mantle
- **Death's Mantle** activates automatically when HP would drop to 0. You survive with 1 HP, and the mantle is destroyed
- **Soulstone** only appears in the loot pool after you've died 50+ times

---

## Zones

### Zone List

| Zone | Unlock Condition |
|------|-----------------|
| **The Sunken Crypt** 🌊 | Always available |
| **The Ashen Crypts** 🔥 | Reach room 8 in any run |
| **The Frozen Gallery** ❄️ | Reach room 8 in any run |
| **The Living Tomb** 🩸 | Reach room 8 in any run |
| **The Void Beyond** 🌑 | Clear 3 different zone bosses |

### Dungeon Structure (All Zones)

| Rooms | Depth | Creature Tier |
|-------|-------|---------------|
| 1–4 | Upper | Tier 1 (easiest) |
| 5–8 | Middle | Tier 2 (moderate) |
| 9–12 | Deep | Tier 3 (hardest) |
| 13 | Boss | Zone boss |

Each zone has its own bestiary of local creatures plus shared creatures from the global pool. Zones also have unique narrative text assembled from fragment pools, creating thousands of possible room descriptions.

---

## Creatures

### Tier 1 (Rooms 1–4)

| Creature | HP | Behaviors |
|----------|----|-----------|
| The Drowned 🧟 | 45–65 | Aggressive, Erratic, Defensive |
| Pale Crawler 🕷️ | 35–50 | Stalking, Aggressive, Hunting |
| The Hollow 👤 | 40–55 | Stalking, Erratic, Charging |
| Bloated One 🫧 | 55–75 | Aggressive, Charging, Erratic |
| Flickering Shade 👻 | 30–45 | Erratic, Stalking, Retreating |
| The Hunched 🐺 | 50–70 | Hunting, Aggressive, Stalking |
| Tideborn 🌊 | 60–80 | Charging, Aggressive, Defensive |

### Tier 2 (Rooms 5–8)

| Creature | HP | Behaviors |
|----------|----|-----------|
| Hollow Clergy 🧙 | 70–90 | Charging, Defensive, Aggressive |
| The Bound ⛓️ | 80–100 | Hunting, Aggressive, Charging |
| Forgotten Guardian 🗿 | 90–110 | Defensive, Aggressive, Charging |
| The Weeping 😢 | 60–80 | Stalking, Erratic, Charging |
| Carrion Knight ⚔️ | 85–105 | Aggressive, Defensive, Charging |
| The Congregation 👥 | 100–130 | Aggressive, Charging, Stalking |

### Tier 3 / Bosses (Rooms 9–13)

| Creature | HP | Behaviors |
|----------|----|-----------|
| The Unnamed ❓ | 120–150 | Erratic, Charging, Stalking |
| Mother of Tides 🌊 | 130–160 | Charging, Aggressive, Defensive |
| The Keeper 👁️ | 180–220 | Charging, Aggressive, Defensive |

Bosses hit harder (Tier 3 = 2x damage multiplier) and have much larger HP pools. The Keeper is the toughest encounter in the game.

---

## Run Modifiers

Every run rolls one random modifier that changes the rules for that descent.

| Modifier | Effect |
|----------|--------|
| 🩸 **Blood Pact** | +25% damage dealt, −30% healing received |
| 🌑 **Blind Descent** | Enemy intents hidden on the first turn of each combat |
| 💀 **Death's Echo** | +30% corpse discovery chance |
| 🧊 **Numbing Cold** | Start with 2 stamina (not 3), but regen +1 extra per turn |
| 🛡️ **Iron Will** | Brace negates ALL damage, but costs 1 stamina |
| ⚡ **Glass Cannon** | Start at 60 HP, deal +50% damage |

---

## Death Milestones

Every death moves you closer to permanent rewards. Death is progression.

| Deaths | Reward |
|--------|--------|
| 10 | Title: **"The Persistent"** |
| 25 | Border: **Bone Frame** |
| 50 | **Soulstone** added to loot pool (+10% all stats) |
| 100 | Title: **"The Undying"** |
| 250 | Perk: **Start each run with a random item** |
| 500 | Perk: **Start each run with 110 HP** (instead of 100) |

Titles and borders are cosmetic — displayed on your death cards and profile.

---

## Staking & Economy

### Stake Options
Choose your risk before each run:

| Stake | Victory Payout | Loss |
|-------|---------------|------|
| Empty-handed | 0 SOL | Nothing |
| 0.01 SOL | 0.015 SOL | 0.01 SOL |
| 0.05 SOL | 0.075 SOL | 0.05 SOL |
| 0.10 SOL | 0.15 SOL | 0.10 SOL |
| 0.25 SOL | 0.375 SOL | 0.25 SOL |

Victory bonus is **50%** of your stake (configurable by admin).

### Empty-Handed Mode
- Free to play — no wallet required
- Full gameplay, full progression, full milestones
- Guest accounts can link a wallet later to start staking

### What Happens When You Die
- Your stake goes to the **Memorial Pool** (funds future victory payouts)
- Your corpse appears in-game for other players to find
- Your death is recorded in the global death feed
- Your death count advances your milestones

### What Happens When You Win
- You receive your stake back + 50% bonus from the Memorial Pool
- Your zone clear is recorded (counts toward unlocking Void Beyond)
- Your stats are updated (totalClears, totalEarned, highestRoom)

---

## Social Features

### Corpses
When you die, your corpse persists in the dungeon at the room where you fell. Future players may discover it and see:
- Your name and final message
- One random item from your inventory
- Option to tip you

### Tipping
Wallet users can tip **0.01 SOL** directly to the wallet of a fallen player. Tips are tracked on your profile as totalTipsReceived.

### Death Feed
A real-time feed of recent deaths across all players. See who died, where, and their final words.

---

## Tips for Survival

- **Read the intent.** CHARGING enemies telegraph double damage — always dodge them
- **Manage stamina.** Don't blow all your stamina on strikes. Keep 1 pip for emergency dodges
- **Brace is free.** When in doubt and low on stamina, brace. 50% reduction beats taking full damage
- **Risk the secondary path** in early rooms when HP is high — finding items early compounds across the run
- **Voidblade is a gamble.** +50% damage is incredible, but 5 self-damage per turn means you need to end fights fast
- **Death's Mantle is insurance.** Don't swap it out for a damage item unless you're confident
- **Flee from Tier 3 enemies** if you're low on HP. Living to fight the boss matters more than killing every creature
- **Don't flee from STALKING enemies** — their −30% flee penalty makes escape unlikely
- **Counter-play bonus matters.** Striking an AGGRESSIVE enemy or dodging a CHARGING one gives +50% damage — learn the matchups

---

*Die Forward. Die often. Die well.*
