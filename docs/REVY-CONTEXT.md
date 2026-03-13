# Revy Context — Die Forward

Inject this after Revy's system prompt when reviewing Die Forward code.

## Project
Die Forward is a text-based social roguelite mobile game where death is contribution. Built for Solana.

**Repo:** `/Users/pisco-claw/.openclaw/workspace/code/die-forward/`
**Mobile app:** `mobile/` (Expo / React Native / TypeScript)
**Web app:** `src/` (Next.js)
**Design spec:** `docs/GAME_ENHANCEMENT_PLAN.md`

## Stack
- **Mobile:** Expo SDK 54, React 19, NativeWind, React Navigation
- **State:** GameContext (`mobile/lib/GameContext.tsx`) — React context, seeded RNG, all game logic
- **Data:** InstantDB — real-time sync, player records, death feed, corpses
- **On-chain:** Solana devnet — run escrow (`die_forward` program), run records (`run_record` program)
- **Content:** Zone JSON engine (`mobile/lib/zone-loader.ts`) — 5 zones, full-room and fragment assembly

## Key Files
```
mobile/lib/
  GameContext.tsx   — game state, seeded RNG, all action handlers
  content.ts        — BESTIARY, ITEM_DETAILS, generateDungeon(), rollRandomItem()
  zone-loader.ts    — loadZone(), getZoneRoom(), getZoneCreature(), fragment assembly
  instant.ts        — InstantDB schema, Player interface, hooks
  milestones.ts     — death milestone thresholds and perks
  modifiers.ts      — run modifier definitions (6 modifiers)
  seeded-random.ts  — SeededRng class (seedrandom-based)
mobile/app/
  play.tsx          — dungeon navigation, explore/loot/flee actions, inventory modal
  combat.tsx        — intent-based combat system
  death.tsx         — death screen, epitaph input, share card
  stake.tsx         — run setup, zone selection, SOL staking
mobile/lib/zones/   — 5 zone JSON files (static imports)
```

## Critical Conventions

**Seeded RNG is sacred.** Every random event during a run must use `game.rng` (the SeededRng instance), not `Math.random()`. Same seed = same run. This is required for: daily challenges, verifiable fairness, reproducible bug reports.

**State timing in React Native.** `setState` is batched. If you read state immediately after setting it (e.g., `game.setHealth(0)` then `game.checkDeathSave()`), the second call sees the old state. This has bitten us before. Always verify read-after-write sequences.

**Zone IDs:** `sunken-crypt`, `ashen-crypts`, `frozen-gallery`, `living-tomb`, `void-beyond`

**Zone patterns:**
- `sunken-crypt`: full-room (rooms have `template` + `variations[]`)
- All others: fragment-based (rooms assembled from `openings`, `middles`, `closings` pools)

**Modifier helpers** (all via `useGame()`): `getModifiedDamageBonus()`, `getModifiedHealMultiplier()`, `getModifiedStaminaRegen(base)`, `getModifiedBraceCost(base)`, `modifierBraceNegatesAll()`, `getModifiedCorpseChance(base)`, `modifierHidesFirstIntent()`

**Milestone perks** (via `getMilestonePerks(totalDeaths)`): `startingItem` (250 deaths), `bonusHp` (500 deaths), `soulstoneUnlocked` (50 deaths)

## Known Patterns to Watch
- `COMBAT_OPTIONS` is rebuilt at render time (intentional — reads fresh modifier state)
- `calculateDamage` is a closure over intent state — modifier bonus threads in cleanly
- `advanceTimerRef` prevents double-advance race in explore handlers
- Fragment room IDs use `roomIndex`, not `Date.now()`
- `rollRandomItem` accepts `excludeItems[]` to gate milestone-locked items

## What "Done" Means
TypeScript clean (`cd mobile && npx tsc --noEmit`), no new `any` casts, no `Math.random()` in game logic, all modifier helpers applied wherever their setting is relevant.
