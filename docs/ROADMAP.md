# Die Forward — Roadmap

*Updated: 2026-03-13*

---

## ✅ Phase 0 — Hackathon Prototype (Feb 2026)

Built in ~1 week for the Colosseum Agent Hackathon (deadline Feb 12, 2026).

- Core game loop: 3 depths, 12 rooms, boss fight (The Keeper)
- Intent-based combat system with 7 enemy intents and 5 actions
- Death flow: final message → corpse persisted → on-chain hash
- SOL staking on devnet with escrow and victory payout (+50% bonus)
- InstantDB real-time death feed
- Corpse discovery in gameplay
- Mobile Wallet Adapter (Phantom/Solflare on Android)
- Agent API (`/api/agent/*`) with skill.md for agent discovery
- AgentWallet integration for custodial agent staking
- On-chain death verification via Solana Memo Program
- Share cards (death/victory), screen shake, haptic feedback
- 40+ ElevenLabs-generated SFX + 5 ambient loops
- Deployed on Vercel

---

## ✅ Phase 1 — Content Engine + Progression (Mar 2026)

Wired up the existing content engine and added progression systems. All items shipped.

### 1.1 Zone-Aware Content Loader ✅
- `zone-loader.ts` now powers dungeon generation
- `generateDungeon(zoneId, rng)` replaces the hardcoded room generator
- 5 zones defined: Sunken Crypt, Ashen Crypts, Frozen Gallery, Living Tomb, Void Beyond
- Zone unlock gates: Ashen/Frozen/Living unlock at room 8+; Void Beyond after 3 zone clears
- `clearedZones` tracked on player record

### 1.2 Explore Room Options ✅
- Every explore room shows 2-3 choice options (replaces "Press forward")
- Option types: primary (safe), secondary [RISK] (55% item / 30% nothing / 15% damage), tertiary [1⚡] (intel peek)
- Options sourced from zone JSON data; fallback "Observe carefully" tertiary always available

### 1.3 Zone Bestiary Integration ✅
- 17 new creatures + 4 zone-specific bosses now active
- Zone-specific creature pools, depths, and boss encounters wired to dungeon generator
- Tier 1/2/3 enemy assignments per zone

### 1.4 Death Milestones ✅
- 6 thresholds: 10 / 25 / 50 / 100 / 250 / 500 deaths
- Unlocks: titles, death card border (bone frame), Soulstone in loot pool, start-with-item perk, 110 HP start
- Death screen shows milestone banner when a threshold is crossed

### 1.5 Run Modifiers ✅
- 1 random modifier per run, rolled deterministically from run seed
- 6 modifiers: 🩸 Blood Pact, 🌑 Blind Descent, 💀 Death's Echo, 🧊 Numbing Cold, 🛡️ Iron Will, ⚡ Glass Cannon
- Modifier badge visible on play screen

### 1.6 Inventory Limit + Item Rarity ✅
- 4-slot inventory cap; finding a 5th item triggers a swap modal
- Item rarities: Common 55% / Uncommon 30% / Rare 12% / Legendary 3%
- 2 new Legendaries: Death's Mantle 🌑 (death save, consumed) and Voidblade ⚔️ (+50% dmg, -5 HP/turn)
- `rollRandomItem(rng)` weighted picker used for all loot drops

### Also Shipped ✅
- All items now have active combat effects (Soulstone, Eye of the Hollow, Bone Hook, Pale Coin, Void Salt wired)
- Healing centralized through `applyHealing(amount)` — Blood Pact applies consistently
- Combat determinism: creature HP and intent use seeded RNG (`getCreatureHealthSeeded` / `getCreatureIntentSeeded`)
- Revy review bug fixes

---

## 🔄 Phase 2 — Retention Systems (Target: Weeks 5-8)

### 2.1 Ashen Crypts
First new active zone. BURN mechanic: enemies apply a damage-over-time status. Zone-specific creatures and narrative.

### 2.2 Daily Challenges
Seeded daily runs with a fixed modifier and zone. Shared leaderboard for the day's challenge. Replayable but only one daily score.

### 2.3 Bestiary Mastery
Track encounters per creature type. Unlock flavor text, stat hints, and counter tips after enough encounters. "Knowledge persists" from ROADMAP v1.

### 2.4 Essence Currency
Dungeon-specific currency earned through play. Spendable on cosmetics or run perks. Distinct from SOL staking.

### 2.5 Run Streaks
Track consecutive successful runs (or depth milestones). Streak bonuses and streak-specific leaderboard.

---

## Phase 3 — Polish + Expansion (Target: Weeks 9-12)

### 3.1 Frozen Gallery + Living Tomb
Two of the unlockable fragment zones get full authored room content and zone-specific mechanics (cold/ice for Frozen Gallery, organic horror/infection for Living Tomb).

### 3.2 Cosmetics Shop
Spend Essence on death card borders, run titles, and UI themes. No pay-to-win — cosmetics only.

### 3.3 Difficulty Scaling
Optional harder modes. Increased enemy scaling or reduced player resources with higher potential rewards.

### 3.4 Live Run Spectating
Watch an active run in progress. Spectators see room-by-room updates via InstantDB real-time.

### 3.5 Void Beyond
Void Beyond zone gets full authored content and its reality-warping mechanics. Requires 3 zone clears to unlock.

---

## Known Gaps / Backlog

- **Void Salt not wired in combat**: `voidSaltBonus` flag is set in `getItemEffects` but the +40% damage multiplier is not applied in `calculateDamage` — also needs `type: 'aquatic'` annotations on relevant BESTIARY creatures
- **activeTitle / activeBorder not rendered**: Stored on player record but not displayed on share cards, death card borders, or play screen
- **Sunken Crypt explore options**: Only 2 authored options per variation — tertiary always shows generic "Observe carefully" fallback
- **Zone-aware depth names not surfaced**: Play screen always shows Sunken Crypt depth names regardless of the active zone
- **Modifier badge missing from combat screen**: Badge appears on play screen only; combat screen doesn't show it
- **AgentWallet staking is custodial**: Agents can't sign escrow transactions; stakes go to a pool wallet. Browser wallet users get full trustless escrow. See `docs/STAKING_FLOWS.md`.
- **Pool funding requirement**: Victory bonuses paid from pool. Pool needs seeding or sufficient deaths to stay solvent (~67% death rate is the break-even point).

---

## Future Ideas (Backlog)

| Idea | Notes |
|------|-------|
| **$DIE Token** | Earn for notable deaths, spend on cosmetics/perks |
| **NFT Corpses** | Mint notable deaths as collectibles |
| **Guilds** | Team leaderboards, shared pools, guild challenges |
| **Run Replays** | Shareable run recordings |
| **PvP Zones** | Invade other players' runs |
| **AI Dungeon Master** | Claude generates unique encounters per run |
| **On-Chain Tip System** | Trustless tipping for corpse finds |
| **Formal Audit** | Sec3/OtterSec review of escrow program |

---

## On-Chain Programs

| Program | Address | Purpose |
|---------|---------|---------|
| **die_forward** (Escrow) | `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6` | Stake management |
| **run_record** (MagicBlock) | `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS` | On-chain run records |
