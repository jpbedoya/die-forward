# Revy Review — Phase 1 Final State

**Commit:** `981f908` on `main`
**Date:** 2026-03-13
**Reviewer:** Revy

---

## File-by-File Review

---

**mobile/lib/zone-loader.ts** — ⚠️ Minor issues

- `getZoneCreature()` (non-seeded variant) uses `Math.random()` directly. It's only called... nowhere in the current codebase (all dungeon gen goes through `getZoneCreatureSeeded`), making it dead code. But if anyone calls it, it breaks determinism.
- `rng_chance()` at the bottom: same issue, wraps `Math.random()`, only exists to serve `getZoneCreature()`.
- L~195: `getZoneOptionsSeeded()` is exported but never imported anywhere. Dead code.

---

**mobile/lib/content.ts** — ⚠️ Minor issues

- `getCreatureHealth()` still uses `Math.random()`. It's called from `combat.tsx` init. This means creature HP is **not deterministic** even though the run has a seeded RNG. Anyone replaying the seed gets a different creature HP.
- `getIntentEffects('ERRATIC')` uses `Math.random()` for `erraticMod`. Same problem — not seeded.
- `pick()` helper uses `Math.random()`. Used by `getExploreRoom`, `getCombatRoom`, `getCorpseRoom`, `getCacheRoom`, `getExitRoom`, `getCreatureForRoom`, `getCreatureIntent`, `getEnemyIntent`. Most of these are legacy and only called from non-seeded paths, but `getCreatureIntent` is called from combat.tsx on every turn. **Every enemy intent roll is non-deterministic.**
- `getItemEffects()`: `Eye of the Hollow` has no combat effect defined (no case in the switch). The item exists in ITEM_DETAILS with effect text "Reveals hidden corpses and caches" but does nothing mechanically.
- `Soulstone` also has no case in `getItemEffects()`. Its described effect is "+10% to all stats" but no combat bonus is applied.
- `Bone Hook` — no case in `getItemEffects()`. Described as "Creates distance in combat" but no mechanical effect.
- `Void Salt` — no case in `getItemEffects()`. "+40% damage vs aquatic enemies" not implemented.
- `Pale Coin` — no case. "Can be offered for passage" not implemented.

---

**mobile/lib/GameContext.tsx** — ⚠️ Minor issues

- L~50: `randomDefaultName()` uses `Math.random()`. Not seeded, but this is for nicknames so it's fine.
- **`rng` is recreated from seed via `useMemo`** every time `state.seed` changes. But `createRunRng` creates a new stateful RNG. The problem: `rng` is created fresh on every component that calls `useGame()`, AND it's created fresh if GameProvider re-renders with the same seed. However the real issue is that `startGame` creates its own `modifierRng` and `mainRng` from the same seed, consuming values, while the `rng` exposed via context is a **third** independent instance from the same seed. This means the first few `rng.random()` calls in play.tsx/combat.tsx will produce the same sequence as the modifier roll + dungeon generation. The sequences overlap. In practice this means explore-secondary loot rolls, damage rolls, etc. replay the same initial values the modifier/dungeon used. **Not a correctness bug per se** (each screen's sequence is internally consistent) but it's a subtle footgun if anyone assumes the exposed `rng` picks up where dungeon gen left off.
- `applyVoidbladeEffect()`: sets `dmg = 5` inside `setState` but returns `dmg` outside. Due to React batching, `setState` callback runs synchronously in React Native's current implementation, so this works. But it's relying on an implementation detail — if React ever defers the callback, `dmg` returns 0.
- `checkDeathSave()`: Same pattern — mutates `result` inside `setState` callback and returns it outside. Same fragility.
- `advance()`: stamina regen is `+1` hardcoded. But `getModifiedStaminaRegen` exists and is used in combat.tsx. The play screen `advance` doesn't apply the modifier's stamina regen bonus. **If you have Numbing Cold (+1 regen), advancing between rooms gives +1 instead of +2.**

---

**mobile/app/play.tsx** — ⚠️ Minor issues

- `explore-secondary` item IDs use `Date.now().toString()`. Previously flagged, but noting it's still there. Fine for display but not ideal for determinism.
- `loot` action: item IDs also use `Date.now().toString()`.
- `heal` action: hardcoded `+30 HP` with `Math.min(100, ...)`. The `100` max is hardcoded. If Glass Cannon modifier sets starting HP to 60, the max should still be 60 (or 100?). The design doesn't specify max HP behavior, but capping at 100 when you started at 60 means you can heal above your starting HP. Might be intentional. Worth a design decision.
- `heal` action: doesn't apply `getModifiedHealMultiplier()`. Blood Pact's -30% healing doesn't apply to cache room healing. Only the Herbs item in combat uses it.
- Herbs usage in play.tsx item modal (`onUse`): heals `Math.min(100, game.health + heal)`. Same hardcoded 100 cap issue. Also: this Herbs usage DOES apply the modifier... wait no, it doesn't. It does `game.rng.range(25, 40)` without multiplying by `getModifiedHealMultiplier()`. Only combat.tsx's Herbs usage applies the modifier. **Blood Pact healing penalty is inconsistent — works in combat but not in play screen.**

---

**mobile/app/combat.tsx** — ⚠️ Minor issues

- `getCreatureHealth()` called in useEffect init — uses `Math.random()`, not seeded. See content.ts note above.
- `getCreatureIntent()` called every turn — uses `Math.random()`, not seeded. Breaks determinism.
- Voidblade death check after turn resolve (L~330): reads `newPlayerHealth` from closure, but `game.health` may have already been updated by `game.setHealth(newPlayerHealth)` earlier. Then `game.applyVoidbladeEffect()` calls `setState` to subtract 5. The check `if (newPlayerHealth - voidDmg <= 0)` uses the closure value, which is correct. But `checkDeathSave` inside reads `prev.health` — which should be the post-Voidblade value set by `applyVoidbladeEffect`. This chain works because setState callbacks execute in order. Fragile but correct today.
- `ProgressBar current={roomNumber} total={13}` — hardcoded 13 total. Should be `game.dungeon?.length || 13` to match actual dungeon size.
- Strike intent counter bonus: gives bonus damage when enemy is AGGRESSIVE or HUNTING. But the design spec doesn't mention this mechanic. Not a bug, but undocumented behavior.
- Stamina regen after turn: `game.getModifiedStaminaRegen(settings.staminaRegen)` — correct here, unlike `advance()` in GameContext.

---

**mobile/app/death.tsx** — ✅ Solid

- Milestone check logic is correct: computes `prevDeaths + 1` to simulate the death about to be recorded.
- `recordDeathIfNeeded` auto-fires after 30s as safety net. Good.
- Share card flow is clean.
- One nit: `deathRecorded` is set to `true` even on error (line ~168). This prevents retry but also means a network blip silently loses the death record. Acceptable tradeoff for preventing infinite retries.

---

**mobile/app/stake.tsx** — ✅ Solid (first 100 lines)

- Zone meta is cleanly defined. `startGame` receives `totalDeaths` from player record. Correct.

---

**mobile/lib/milestones.ts** — ✅ Solid

- Clean, correct, well-typed. `getNewMilestone` finds the first threshold crossed — handles the edge case of skipping milestones correctly (returns lowest crossed).

---

**mobile/lib/modifiers.ts** — ✅ Solid

- All modifier properties are optional with sensible defaults consumed via `??` in GameContext. Clean design.

---

**mobile/lib/seeded-random.ts** — ✅ Solid

- `seedrandom` is a well-tested library. Interface is clean. `range` is inclusive on both ends (documented in the interface).

---

## 🔴 Critical (block merge)

None. No data-loss bugs or crash-inducing issues found. The codebase is shippable.

---

## 🟡 Minor (fix before next release)

1. **Combat determinism broken**: `getCreatureHealth()` and `getCreatureIntent()` use `Math.random()`. Every combat encounter has non-deterministic creature HP and intent sequences. Pass the seeded RNG through to combat init and intent rolls if replay verification matters.

2. **Healing modifier inconsistency**: Blood Pact's healing penalty only applies to Herbs used in combat. Cache room healing (+30 HP) and Herbs used from play screen inventory ignore it. Apply `getModifiedHealMultiplier()` in all healing paths.

3. **Stamina regen modifier not applied on room advance**: `GameContext.advance()` gives flat `+1` stamina. Numbing Cold's `+1 regen bonus` only works in combat turns, not between rooms.

4. **Three independent RNG instances from same seed**: Modifier roll, dungeon gen, and the exposed `game.rng` all start from position 0 of the same seed sequence. The exposed RNG's first N values overlap with modifier/dungeon generation values. Consider advancing the exposed RNG past the consumed positions, or deriving it from a sub-seed.

---

## ⬜ Missing from Design

1. **Zone unlock conditions** — Spec says "Reach room 8+ in any run" unlocks Ashen Crypts. No unlock gate is implemented in the zone selector. All zones appear available.

2. **Inventory limit enforcement on starting item** — If milestone perk gives a starting item, and then a second starting mechanism is added later, there's no check. Currently only one source exists so it's fine.

3. **Item mechanical effects for 5 items** — Soulstone (+10% all stats), Eye of the Hollow, Bone Hook, Void Salt, Pale Coin have no `getItemEffects` cases. They're inventory dead weight.

4. **Difficulty scaling** — Spec mentions enemy HP +1% per 10 deaths, tier 2 appearing earlier. Not implemented (Phase 3 task, so expected).

5. **Essence currency** — Phase 2, not expected yet.

---

## Recommendations

1. **Pass seeded RNG into combat**: Create `getCreatureHealthSeeded(name, rng)` and `getCreatureIntentSeeded(name, rng)`. Thread the `game.rng` into combat.tsx init and turn resolution. This is the highest-impact determinism fix.

2. **Centralize healing**: Create `applyHealing(baseAmount: number): number` in GameContext that applies modifier penalty and HP cap. Call it from cache rooms, Herbs in play screen, and Herbs in combat. Single source of truth.

3. **Fix advance() stamina regen**: Change `game.stamina + 1` to `game.stamina + game.getModifiedStaminaRegen(1)` in the `advance` callback.

4. **Add getItemEffects cases for Soulstone and Bone Hook**: Soulstone: `damageBonus += 0.10; defenseBonus += 0.10; fleeBonus += 0.10`. Bone Hook: `fleeBonus += 0.15`.

5. **Derive exposed RNG from sub-seed**: In `startGame`, after modifier and dungeon gen, create the player-facing RNG with `createRunRng(seed + '-gameplay')` so its sequence is independent of generation-time consumption.
