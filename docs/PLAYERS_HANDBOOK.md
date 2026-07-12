# Die Forward — Player's Handbook

*A complete guide to surviving (and dying well in) the dungeons of Die Forward.*

*Last updated: 2026-07-03*

---

## What Is Die Forward?

A mobile roguelite on Solana where **death is not the end — it's content.** When you die, your corpse, inventory, and final words persist for future players to discover. Play empty-handed for free, bind **Pale Coins** you've earned in the dungeon, or stake SOL for the deepest kind of risk. Every run is a fresh branching descent. The world shifts every day. Every death matters — and feeds the next player's run.

---

## How a Run Works

1. **Choose a zone** — Start with the Sunken Crypt; unlock more as you progress
2. **Choose your offering** — Go empty-handed for free, bind Pale Coins at the Toll, or stake SOL (see **Staking & Economy**)
3. **Pick a modifier** — Before you drop, choose from a small pool of run modifiers offered that day
4. **Descend the map** — The dungeon is a branching map, not a straight line. At each depth you choose which path to take deeper; some doors are gated side chambers holding extra loot
5. **Survive to the boss** — The zone boss waits at the bottom of the descent
6. **Escape or die** — Victory returns your offering plus a bonus; death leaves your corpse behind for others to find

Each run takes roughly 8–15 minutes. Your chosen **run modifier** changes the rules for that descent, and a daily **world shift** reshapes the map and the modifier pool (see **The Daily World Shift**).

---

## Room Types

Your dungeon is a **branching map** you pick your way down — a web of connected rooms descending toward the boss, not a fixed corridor. At each room you choose which path to take deeper, so no two runs trace the same line. Each room is one of these types:

### Explore Rooms
Three choices per room:

| Option | Risk | Effect |
|--------|------|--------|
| **Primary** (safe path) | None | Advance to the next room |
| **Secondary** (risk path) | Medium | 55% find item, 30% nothing, 15% take 8–15 damage |
| **Tertiary** (intel path) | 1 stamina | Peek at what's in the next room |

### Side Chambers
Off the main descent are **gated side chambers** — optional detours holding extra loot. Some are sealed behind a required item (spend the right key and the door opens). **Bone Dust** reveals what kind of branch lies ahead before you commit, so you can scout before spending. The daily world shift can hide or reveal these doors, so what's open changes day to day.

### Combat Rooms
Turn-based fights against zone creatures. See **Combat** below.

### Corpse Rooms
Discover real corpses left by other players. Options:
- **Search the body** — Chance to find their loot
- **Pay respects** — Honor the fallen
- **Tip** — Send 0.01 SOL to the dead player (wallet users only)

Discovery chance scales with depth: shallow rooms ~50%, mid-depth ~65%, the deepest rooms ~80%.

### Cache Rooms
Supply rooms. Heal **+30 HP** (subject to modifier penalties and HP cap).

### Boss Room
At the bottom of the descent, a guaranteed boss fight. Defeat the boss to reach the exit.

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
| **Bait** | — | *"You give it what it wants. It commits."* Provoke the enemy into an all-out attack — you force its next move to be AGGRESSIVE, opening a one-shot window for a big counter-strike |
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

### Signature Behaviors
Intents tell you what an enemy will do this turn. Its **signature** tells you what kind of creature it is. Many creatures have a trick all their own — some split apart when struck, some reform after they seem to fall, some blink away, drain your strength, chant to buff themselves, or lie dormant until provoked. The Echo Husks are the strangest: **they recite the real last words of players who died before you.** Watch how a creature behaves across a couple of turns, learn its tell, and you'll know when to strike, when to wait, and when to Bait it into overcommitting.

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

| Depth | Band | Creature Tier |
|-------|------|---------------|
| Shallow | Upper | Tier 1 (easiest) |
| Mid | Middle | Tier 2 (moderate) |
| Deep | Deep | Tier 3 (hardest) |
| Bottom | Boss | Zone boss |

However you route through the branching map, danger scales with how deep you've pushed: the further down you go, the tougher the creatures, until the zone boss at the bottom. Each zone has its own bestiary of local creatures plus shared creatures from the global pool, and unique narrative text assembled from fragment pools, creating thousands of possible room descriptions.

---

## Creatures

### Tier 1 (Shallow Depths)

| Creature | HP | Behaviors |
|----------|----|-----------|
| The Drowned 🧟 | 45–65 | Aggressive, Erratic, Defensive |
| Pale Crawler 🕷️ | 35–50 | Stalking, Aggressive, Hunting |
| The Hollow 👤 | 40–55 | Stalking, Erratic, Charging |
| Bloated One 🫧 | 55–75 | Aggressive, Charging, Erratic |
| Flickering Shade 👻 | 30–45 | Erratic, Stalking, Retreating |
| The Hunched 🐺 | 50–70 | Hunting, Aggressive, Stalking |
| Tideborn 🌊 | 60–80 | Charging, Aggressive, Defensive |

### Tier 2 (Mid Depths)

| Creature | HP | Behaviors |
|----------|----|-----------|
| Hollow Clergy 🧙 | 70–90 | Charging, Defensive, Aggressive |
| The Bound ⛓️ | 80–100 | Hunting, Aggressive, Charging |
| Forgotten Guardian 🗿 | 90–110 | Defensive, Aggressive, Charging |
| The Weeping 😢 | 60–80 | Stalking, Erratic, Charging |
| Carrion Knight ⚔️ | 85–105 | Aggressive, Defensive, Charging |
| The Congregation 👥 | 100–130 | Aggressive, Charging, Stalking |

### Tier 3 / Bosses (Deep Depths)

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

Instead of one random modifier being forced on you, you now **choose** from the day's pool before you descend.

---

## The Daily World Shift

The dungeons are not the same today as they were yesterday. Every day the world **shifts**: the map is redrawn — passages and side doors open and close — and the pool of modifiers you can choose from changes too. The shift is the same for everyone, so on any given day the whole community is exploring the same reshaped world. Play a zone across several days and you'll see it breathe.

---

## The Community Layer

Everyone's deaths bleed into everyone's dungeon. Overnight, the depths take stock of where players fell, and the next day's world carries the marks:

- **Apex threats** — When one creature has claimed enough wanderers, it grows into an **apex**: bigger, meaner, tougher (more HP and harder hits). *"It has grown fat on wanderers."* Bring it down and you're rewarded with bonus loot and mastery credit for the kill.
- **Cursed rooms** — Rooms where many players died become marked. *"Many ended here."* Step carefully.
- **The Architect's wall** — The single deadliest place in the world becomes the Architect's, its walls built from the fallen. *"The walls are thick with the fallen."* The names and last words of players who died there are inscribed into it for you to read.

Offline, the world still shifts on a daily rhythm — you just won't see the live community marks until you reconnect.

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

Before each run you decide how much of yourself to offer to the depths. There are three ways to play — a ladder of rising risk. Every offering you leave behind feeds the pool that pays out the next survivor.

### The Toll — Choose Your Offering

**Empty-handed (Unbound)**
- Free to play, no wallet required — you can even play fully offline
- Full gameplay, full progression, full milestones
- Kept separate from the leaderboards and the currency economy — nothing you do here is at risk, and nothing here earns Pale Coins

**Pale Coins (Coin-Bound)**
- **Pale Coins are earned, never bought.** You earn them by descending — the deeper you go, the more you bank — plus bonuses for clearing a zone (and a first-clear bonus the first time)
- At the Toll you can **bind** your Pale Coins into a run. Escape alive and you get your coins back **plus a bonus** paid from the shared coin pool; **die and the depths keep them**, burning your stake into the pool
- The bonus is funded entirely by coins other players lost, so it's never minted out of nothing — the pool only pays what it holds

**SOL (Blood-Bound)**
- Stake real SOL through an on-chain escrow for the highest stakes. Escape and you get your stake back plus a bonus; die and it goes to the pool
- Blood-Bound staking isn't always offered — it appears only when the depths are set to accept it

### The Binding Streak
Coin-Bound clears stack into a public **Binding Streak** — each run you escape without breaking the pact adds to it, and your streak is shown to everyone as a growing seal (⟐ → ⟐⟐ → ⟐⟐⟐). Build a long enough streak and your seal climbs. But **a Coin-Bound death breaks the pact and resets the streak to zero.** The deeper your streak, the more you have to lose.

### What Happens When You Die
- Your offering feeds the depths — Pale Coins or SOL go to the shared pool that funds future payouts
- Your corpse appears in-game for other players to find
- Your death is recorded in the global death feed
- A coin-bound death **breaks your Binding Streak**
- Your death count advances your milestones

### What Happens When You Win
- You get your offering back plus a bonus from the pool
- A coin-bound escape **extends your Binding Streak**
- Your zone clear is recorded (counts toward unlocking Void Beyond)
- Your stats are updated (clears, earnings, deepest depth)

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

### Echo Husks
Some creatures — the **Echo Husks** — don't speak for themselves. They recite the **real final words of players who died before you**, over and over. The dungeon remembers what the dying said.

### The Cartographer
Because the passages move every day, **the Cartographer** can send you word when they do. *"The passages move. I can send word when they do — if you wish."* It's entirely opt-in: agree to receive **Dispatches** and you'll get a quiet notification — a warning about an apex on the prowl, a note that many ended somewhere, or word that the doors have moved — timed to your morning. Decline and the passages simply move unseen. Nothing in the game is ever locked behind turning notifications on, and you'll never get more than one dispatch a day.

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
- **Bait sets up your big hits.** Forcing an enemy to commit to an attack opens a clean counter — use it when you need to end a fight fast
- **Scout before you spend.** Bone Dust reveals what a branch holds; don't burn a gate key on a side chamber blind
- **Mind your streak.** The deeper your Binding Streak, the more a single coin-bound death costs you — bind conservatively when your seal is high

---

*Die Forward. Die often. Die well.*
