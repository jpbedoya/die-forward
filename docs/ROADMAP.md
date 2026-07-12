# Die Forward — Roadmap

*Updated: 2026-07-11*

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

## ✅ Phase 2 — Branching Dungeons + Pale Coins (Shipped July 2026)

### 2a — Branching Zone Graphs ✅
All 5 zones (Sunken Crypt, Ashen Crypts, Frozen Gallery, Living Tomb, Void Beyond) now ship full branching DAG graphs (`generateDungeonGraph`, 20-23 nodes each) with client-only, item-gated side chambers (Bone Dust reveals branch types); `zone-loader.ts` validates and loads them locale-aware.

### 2b — Pale Coins ✅
Earned-only in-game currency (`lib/coins.ts` / `mobile/lib/coins.ts`) supersedes the earlier Essence proposal — never purchasable, concave depth income (`computeCoinEarn`) plus clear/first-clear bonuses.

---

## ✅ Phase 3 — The Shift: Daily World + Offering Ladder (Shipped July 2026)

### 3a — Daily Seeded World Shift ✅
`world-shift.ts` deterministically drives the daily modifier-choice pool and masks map edges/side doors per zone, keyed on UTC day; toggled via the `dailyShiftEnabled` admin setting.

### 3b — Coin-Bound Staking + Binding Streak ✅
Three-rung Offering Ladder (Unbound free play / Coin-Bound Pale Coin staking at the Toll / Blood-Bound SOL escrow) shipped alongside a public Binding Streak with seal tiers; death burns the Coin-Bound stake into the pool-funded `coinPool`, escape returns stake + bonus; `stakingPosture` setting controls whether Blood-Bound (SOL) staking is shown at all.

---

## ✅ Security — Auth Hardening (Shipped July 2026)
Session/game requests now carry a verified InstantDB customToken (`Authorization: Bearer <customToken>`, checked server-side via `verifyAuthToken`); the acting identity is derived server-side from that token rather than trusted from the request body (coin-mode `session/start` requires a verified token; death/victory/advance reject a token whose authId mismatches the session). Admin writes (`/api/admin/settings`, admin/bestiary, admin/content) are authenticated and admin-gated, and `instant.perms.ts` is deny-by-default for `gameSettings`/`runReceipts`/`sessions`/`worldShifts`.

---

## ✅ Phase 4a — Community Layer (Shipped July 2026)
A nightly server-receipted aggregation cron (`/api/game/shift`) writes the deny-by-default `worldShifts` namespace: an apex creature (HP/damage buff + bounty), mass-death curse nodes, and a single deadliest Architect node per zone/day — computed from distinct-account, per-account-capped, trailing-24h receipts only (never forgeable client-reported deaths).

---

## ✅ Phase 4c — Dispatch + Push Notifications (Shipped July 2026)
A shared `renderDispatch` pipeline (`mobile/lib/dispatch.ts`) surfaces the day's world state on the home panel and zone-select with F7 scarcity (rotating warning/lament/invitation registers, ≤1 dispatch shown per day). An hourly fan-out cron (`/api/game/dispatch`) sends the day's dispatch as a push notification at each user's local morning via `expo-server-sdk`, gated on diegetic opt-in.

---

## ✅ Phase 4b — UGC Moderation (Shipped July 2026)
A server-authoritative moderation core (`src/lib/moderation.ts`) filters rebroadcast player text — sourced only from the trusted `runReceipts.finalMessage` field — before it surfaces as an Echo Husk *Repeating* recital or an Architect wall inscription; trust-weighted by account age/staked history/wallet-auth, fail-closed on unknown authors, with report-count suppression and client-side mirror filtering on every surface that displays another player's message.

---

## 🔄 Launch Hardening (Remaining)

The Shift (Phases 2a/2b, 3a/3b, Security, 4a, 4c, 4b) is fully shipped on `main`. What's left before mainnet/production launch:

- **Push credentials**: production push cert/keys still needed before the 4c fan-out cron sends live notifications in prod.
- **iOS local build**: only an Android local build script exists (`build:android:local`); no local iOS build script yet, and `eas-cli` is not installed.
- **`CRON_SECRET`**: must be set in prod — `session/cleanup` and the crons (`/api/game/shift`, `/api/game/dispatch`) currently open-and-warn if it's unset.
- **Pre-mainnet security residuals** (grief-only on devnet today, must close before coins carry real value):
  - **A5 `walletAddress`-sybil keying** — coin-mode identity keying needs a stronger anti-sybil binding than raw wallet address.
  - **`players`-perms ownership check** — `instant.perms.ts` for the `players` namespace doesn't yet verify write ownership, so any authenticated client can write another player's `paleCoins`.

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
| **Difficulty Scaling** | Optional harder modes — increased enemy scaling or reduced player resources with higher potential rewards |
| **Live Run Spectating** | Watch an active run in progress; spectators see room-by-room updates via InstantDB real-time |
| **Cosmetics Shop** | Additional death card borders / run titles / UI themes beyond the milestone- and streak-tier unlocks already shipped |

---

## On-Chain Programs

| Program | Address | Purpose |
|---------|---------|---------|
| **die_forward** (Escrow) | `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6` | Stake management |
| **run_record** (MagicBlock) | `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS` | On-chain run records |
