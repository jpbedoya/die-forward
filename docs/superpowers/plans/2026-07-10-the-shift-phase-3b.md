# The Shift — Phase 3b Implementation Plan (Coin Economy, Streak, Receipts, Posture)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Offering Ladder's middle rung and the trust boundary: Pale Coins as an earned currency (server-granted, anti-mint), Coin-Bound staking with the Binding Streak, run receipts capturing the reproducibility tuple, the offline-leaderboard firewall, and the staking posture switch. SOL/escrow/on-chain paths are UNTOUCHED.

**Architecture:** All money math is pure functions in `src/lib/coins.ts` (mirroring `payout.ts`/`computeVictoryReward` — the only testable pattern in the server harness). Coins live on the Player row (`paleCoins`); the coin pool is a singleton counter on the gameSettings row; grants/burns happen ONLY in the server session routes (death/victory) — the client displays, never computes. Receipts are new `runReceipts` rows written at session end. Posture is a `stakingPosture` field on the settings GET consumed by stake.tsx.

**Ground truth (from extraction — binding):** sessions are schemaless InstantDB rows; token = body-passed id (no bearer); mobile→server field mismatch means escrow settlement never runs (victories pay via legacy pool wallet) — do not "fix" that here, it's out of scope; the agent route writes zero player stats; offline guests currently write `highestRoom` client-side (the firewall gap); `cleanup` hardcodes `stake*1.5` and `maxRooms||7`.

**Spec:** §9.0 ladder + anti-mint (A4), Binding Streak (F6), §9.2 posture, §3.1 trust boundary (A1 — partial: receipts + firewall + server-stamped dayKey; full VRF commit-reveal remains future), Appendix E.1.

## Global Constraints

- All prior constraints carry over (suite from `mobile/` baseline 311 + `npx tsc --noEmit` BOTH roots per task; t() ×7 for UI strings; conventional commits).
- **Money paths get the heaviest treatment:** every server route change extracts its logic into pure functions in `src/lib/coins.ts` with tests; Opus implements AND reviews Tasks 2-5.
- **Pale Coins are earned-only, never purchasable** (spec A4 — permanent rule; nothing in this plan may create a purchase path).
- Coin bonus is funded strictly from the burned-stake pool: `coinPool` never goes negative; bonus paid = `min(computedBonus, pool)`.
- SOL staking, escrow.ts, magicblock.ts, anchor program: read-only. `[DEVNET]` badges stay.
- Client never computes grants: it renders `player.paleCoins` / `player.bindingStreak` and passes stake intent; server validates everything (coin stake ≤ balance, stakeMode whitelist).

---

### Task 1: Pure coin economy module

**Files:** Create `src/lib/coins.ts`; test `src/lib/__tests__/coins.test.ts` (model: payout.test.ts).

**Interfaces (produces — consumed by Tasks 2-4):**
```ts
export const COIN_STAKE_OPTIONS = [60, 120, 240] as const;
export interface CoinEarnInput { finalDepth: number; cleared: boolean; firstClearOfZone: boolean; stakeMode: 'sol' | 'coins' | 'free'; }
export function computeCoinEarn(i: CoinEarnInput): number;
// concave depth income: floor(4 * sqrt(min(finalDepth,13))); cleared adds +40; firstClearOfZone adds +60; never negative; free/sol/coins modes all earn (earning is universal — staking is separate)
export function computeCoinStakeSettlement(i: { coinStake: number; cleared: boolean; bonusPercent: number; poolAvailable: number }): { playerDelta: number; poolDelta: number };
// death: playerDelta 0 (stake already deducted at start), poolDelta +coinStake (burn feeds pool)
// victory: playerDelta = coinStake + bonus where bonus = min(floor(coinStake * bonusPercent/100), poolAvailable); poolDelta = -bonus
export function nextStreak(i: { current: number; stakeMode: string; cleared: boolean }): { streak: number; changed: boolean };
// coins+cleared → current+1; coins+died → 0; non-coin runs → unchanged
export function sealTier(streak: number): 0 | 1 | 2 | 3;  // 0:<3, 1:3-6, 2:7-14, 3:15+
```
- [ ] TDD: concavity (earn(13) < 2×earn(4)... assert exact values for depths 1/4/9/13), clear/first-clear bonuses, settlement pool-cap (bonus limited by pool; pool never negative), streak transitions incl. non-coin passthrough, seal tiers boundaries. Run from repo root (`npx jest src/lib/__tests__/coins.test.ts`). Commit `feat: pale coin economy math (earn, settlement, streak)`.

---

### Task 2: start route — stake modes, coin deduction, server-stamped context (OPUS)

**Files:** Modify `src/app/api/session/start/route.ts`; pure helpers into `src/lib/coins.ts` if any validation math emerges; test additions in coins.test.ts where pure.

**Binding behavior:**
- Body gains `stakeMode?: 'sol' | 'coins' | 'free'` (default inferred: stakeAmount>0 → 'sol', else 'free'), `coinStake?: number`, `chosenModifierId?: string`, `dailyShiftEnabled?: boolean`.
- `stakeMode === 'coins'`: `stakeAmount` MUST be 0; `coinStake` MUST be one of COIN_STAKE_OPTIONS; look up the Player (authId else walletAddress — the death route's pattern at its :213); reject 400 if `(player.paleCoins ?? 0) < coinStake`; deduct immediately: `tx.players[id].update({ paleCoins: current - coinStake })`; on any later failure in the handler after deduction, refund (wrap or order the writes so deduction is last before session creation).
- Session row gains: `stakeMode`, `coinStake: coinStake ?? 0`, `serverDayKey` (computed server-side: UTC YYYY-MM-DD — small local helper, same format as mobile utcDayKey), `chosenModifierId: chosenModifierId ?? null`, `dailyShiftEnabled: dailyShiftEnabled ?? true`.
- SOL and free flows byte-identical to today apart from the new stored fields.
- [ ] Verify: root tsc + full mobile suite (unchanged) + new pure tests. Commit `feat: coin staking + server-stamped run context at session start`.

---

### Task 3: death route — grant, burn, streak reset, receipt, seal stamp (OPUS)

**Files:** Modify `src/app/api/session/death/route.ts`; `mobile/lib/instant.ts` (Player interface gains `paleCoins?: number; bindingStreak?: number; bestBindingStreak?: number`; Death gains `sealTier?: number`).

**Binding behavior (all inside the existing player-lookup block ~:212-236):**
- Coin earn: `computeCoinEarn({ finalDepth: room, cleared: false, firstClearOfZone: false, stakeMode: session.stakeMode ?? 'sol' })` → add to the player update: `paleCoins: (player.paleCoins ?? 0) + earn`.
- Coin-Bound burn: if `session.stakeMode === 'coins'`, `computeCoinStakeSettlement({ coinStake, cleared: false, ... })` → increment the pool: read gameSettings row, `coinPool: (settings.coinPool ?? 0) + coinStake` (single settings row — the admin page's saveSettings pattern shows the id handling).
- Streak: `nextStreak({ current: player.bindingStreak ?? 0, stakeMode, cleared: false })` → write `bindingStreak` (reset to 0 on coin-death); stamp the death row: `sealTier: sealTier(previousStreak)` (the streak they DIED holding — that's the poignant number) added to the `tx.deaths[deathId].update` object.
- Receipt: new `tx.runReceipts[id()].update({ sessionId: session.id, sessionToken, authId, walletAddress, zoneId: session.zoneId, runSeed: session.seed, seedSource: session.seedSource, serverDayKey: session.serverDayKey ?? null, dailyShiftEnabled: session.dailyShiftEnabled ?? null, chosenModifierId: session.chosenModifierId ?? null, stakeMode, coinStake, outcome: 'dead', finalDepth: room, coinDelta: earn, streakAfter, createdAt: Date.now() })`.
- Extract the assembled receipt object into a pure `buildRunReceipt(...)` in coins.ts (testable) — both end routes use it.
- Guest/no-player rows: grants skipped exactly as stats are today (the lookup already guards).
- [ ] TDD the pure additions; verify both tsc + mobile suite. Commit `feat: death settles coins, streak, seal stamp, and run receipt`.

---

### Task 4: victory route — grant, stake return + pool-funded bonus, streak, receipt (OPUS)

**Files:** Modify `src/app/api/session/victory/route.ts` (+ `cleanup/route.ts` consistency).

**Binding behavior:**
- In the player-update block (~:238): earn = `computeCoinEarn({ finalDepth: clearedRoom, cleared: true, firstClearOfZone: !(player.clearedZones ?? []).includes(session.zoneId), stakeMode })`.
- Coin-Bound settlement: `computeCoinStakeSettlement({ coinStake, cleared: true, bonusPercent: settings.coinBonusPercent ?? 50, poolAvailable: settings.coinPool ?? 0 })` → player gets `coinStake + bonus` back (plus earn); pool decremented by bonus (never negative — the pure fn guarantees). `coinBonusPercent` = new typed setting (default 50) in mobile instant.ts GameSettings + defaults + merge.
- Streak: `nextStreak({..., cleared: true})` → increment on coins; also `bestBindingStreak: max(best, new)`.
- Receipt via `buildRunReceipt(..., outcome: 'cleared', coinDelta: earn + returned, streakAfter)`.
- The SOL payout paths (escrow/pool/free) untouched around these additions.
- **cleanup route consistency (folded in):** replace the hardcoded `stake * 1.5` with `computeVictoryReward(stake, settings.victoryBonusPercent ?? 50)` and `maxRooms || 7` → `|| 13`; abandoned coin-bound sessions: burn the coin stake to the pool + receipt with `outcome: 'abandoned'` (no streak change — generous).
- [ ] TDD pure parts; both tsc + suite. Commit `feat: victory settles coin stake with pool-funded bonus, streak, receipt`.

---

### Task 5: client — stake intent, balance state, offline firewall (OPUS)

**Files:** Modify `mobile/lib/api.ts` (startSession body), `mobile/lib/GameContext.tsx` (startGame signature + the firewall), `mobile/lib/instant.ts` (useCurrentPlayer already surfaces Player — confirm paleCoins/bindingStreak flow through).

**Binding behavior:**
- `startGame(amount, emptyHanded?, zoneId?, totalDeaths?, chosenModifierId?, coinStake?: number)` — when `coinStake` > 0: emptyHanded semantics (no SOL tx) but `stakeMode: 'coins'` + `coinStake` sent to startSession; SOL path sends `stakeMode: 'sol'`; free sends 'free'. Also send `chosenModifierId` + `dailyShiftEnabled` (from settings) in the startSession body — the server stamps them (Task 2).
- **Coin-Bound runs are never offline (trust boundary):** if startSession fails for a coinStake run, THROW (mirror the staked-run behavior at ~:827) — no offline fallback.
- **The firewall fix (red-team A1, live gap):** `updateHighestRoom` client write in `advance` (~:993) is skipped when `api.isOfflineSession(state.sessionToken)` — offline runs no longer write leaderboard-visible state. (Server routes keep writing highestRoom for online runs — no data loss there.)
- [ ] Tests: extend modifier-choice/traversal-adjacent pure tests only where logic extracted; the firewall is one guard — reviewer checklist covers it. Both tsc + suite. Commit `feat: coin stake intent from client; offline runs firewalled from leaderboard`.

---

### Task 6: posture switch — settings GET + Toll gating

**Files:** Modify `src/app/api/game/settings/route.ts` (GET returns `stakingPosture: 'hidden'|'ritual'|'open'` from the settings row, default 'ritual'), `src/app/admin/page.tsx` (posture selector — three-way control near the dailyShift toggle), `mobile/app/stake.tsx`, `mobile/app/zone-select.tsx` if it fetches the same GET (it does — reuse), catalogs ×7.

**Binding behavior (stake.tsx):**
- `hidden`: no SOL UI at all (no BIND WALLET / SEAL FATE / wallet references) — Coin-Bound + free only.
- `ritual`: SOL UI appears only when `player.totalDeaths >= 3` (progressive disclosure); below threshold, same as hidden. First time it appears, a one-line in-fiction intro above the button: `t('stake.ritual.intro')` = "You have died enough to be noticed. The depths will accept a deeper binding." (shown always in ritual mode above the SOL section — keep stateless, no once-only tracking this phase).
- `open`: current behavior.
- Coin-Bound section (Task 7 builds the UI) visible in ALL postures when `player.paleCoins >= 60`.
- Default posture while the GET fails/absent: 'ritual'.
- [ ] Both tsc + suite. Commit `feat: staking posture switch (hidden/ritual/open)`.

---

### Task 7: Toll Coin-Bound UI + run-end surfaces

**Files:** Modify `mobile/app/stake.tsx` (Coin-Bound section: balance display `🪙 {paleCoins}`, three stake cards 60/120/240 — disabled above balance, mirror STAKE_OPTIONS styling; a third action button "BIND IN COIN" calling `handleStake` with the coin path), `mobile/app/death.tsx` + `mobile/app/victory.tsx` (coin outcome lines: earned/burned/returned + streak change — read from the refreshed player row + session response if present; keep display-only), `mobile/app/feed.tsx` (seal badge: `sealTier >= 1` on a death row renders a small tier marker `t('feed.seal.<tier>')` = "⟐" glyphs by tier next to the stake chip — insertion point is the `stakeAmount > 0` conditional at ~:63), catalogs ×7.

- [ ] Both tsc + suite; manual-QA note for the Toll flow. Commit `feat: Coin-Bound at the Toll; coin and streak surfaces`.

---

### Task 8: agent route receipt parity + notes

**Files:** Modify `src/app/api/agent/action/route.ts` (`processVictory` + `submit_death`: write receipts via `buildRunReceipt` with the fields the agent session has — stakeMode from its `stakeMode` field, outcome, finalDepth; NO coin grants (agent sessions have no Player row writes today — grants would create currency without a player identity; document this explicitly as the parity decision)), plus a code comment marking the gap for a future agent-players decision.

- [ ] Root tsc; suite. Commit `feat: agent runs emit receipts (no coin grants — documented)`.

---

### Task 9: admin + docs pass

**Files:** `src/app/admin/page.tsx` (coinPool readout + coinBonusPercent slider near victoryBonusPercent), `CLAUDE.md` (economy sentence), spec (§9.0 done-notes: coins/streak/receipts/posture shipped, what remains — Ferryman gate still item-based [coin-currency migration of the gate deferred with rationale: the item gate shipped in 2b and works; migrating to currency touches zone data — queue with NPC phase], full VRF commit-reveal + Unbound receipt-gated aggregation = phase 4/launch gates), `docs/localization/RETRY_MANIFEST.md` (new keys).

- [ ] Verify claims; commit `feat: coin pool admin; docs — phase 3b reality`.

---

## Self-Review

- **Spec coverage:** A4 anti-mint (earned-only, concave, pool-funded bonus — T1-T4), F6 streak + seal tiers (T1/T3/T4/T7), §9.2 posture (T6), A1 partial (receipts with the full tuple T2-T4; offline leaderboard firewall T5; server-stamped dayKey T2; explicitly NOT full commit-reveal — documented in T9's spec notes), ladder UI (T7). Pale Coin gate migration to currency: deliberately deferred (T9 note).
- **Placeholder scan:** none; numeric values pinned (60/120/240, 4√depth, +40/+60, tiers 3/7/15, default 50%).
- **Type consistency:** COIN_STAKE_OPTIONS/computeCoinEarn/computeCoinStakeSettlement/nextStreak/sealTier/buildRunReceipt defined T1(+T3), consumed T2-T4/T7-T8; Player fields declared T3, read T5-T7; `coinBonusPercent`/`coinPool` settings T4/T9.
- **Risk notes:** T2-T5 are money/trust paths → Opus both sides. The deduct-then-fail refund ordering in T2 is the subtle spot — reviewer must trace it. T5's firewall is one guard but its absence is a live exploit — named risk.
