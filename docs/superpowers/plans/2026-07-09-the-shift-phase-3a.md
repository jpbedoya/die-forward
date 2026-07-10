# The Shift — Phase 3a Implementation Plan (Daily Shift Core + Modifier Choice)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the client-side daily world shift: a UTC-day seed drives which map edges/side doors are live and which 2–3 modifiers are on offer; the player picks a modifier at the Toll; the home screen and zone select show that the depths have shifted. Fully offline-capable; zero server changes (staked-seed authority + coin economy = Phase 3b; community layer + Cartographer dispatches = Phase 4).

**Architecture:** New pure module `mobile/lib/world-shift.ts` computes `getDailyShift(zoneId, dayKey)` deterministically: modifier pool (2–3 of 6), side-node daily presence, and a descent-edge mask that is **validated before use** (apply mask → run `validateZoneGraph` on the masked graph → drop the mask if invalid; the shift may never break traversal). `generateDungeonGraph` gains an optional `dayKey`; `startGame` gains `chosenModifierId` with **draw-stability** (always consume `rollModifier`'s pick, then override) so the perk-item roll and all seeded streams stay byte-identical for un-chosen runs.

**Spec:** `docs/superpowers/specs/2026-07-04-the-shift-design.md` §3.1 (daily seeded layer — client core), §7 (modifier choice), §8 surfaces 1-2 only (panel + zone select; push/dispatch renderer = Phase 4). World shifts at 00:00 UTC (spec decision).

## Global Constraints

- All prior Global Constraints carry over (determinism; t() + all 7 catalogs, English placeholders in non-en; suite green from `mobile/` — baseline 290 — + `npx tsc --noEmit` per task; conventional commits; one task per commit).
- The daily shift NEVER invalidates a graph: masked graphs must pass `validateZoneGraph`; when in doubt the mask drops, never the run.
- Seed streams: per-run `seed` draws must be byte-identical to today's behavior when no modifier is chosen and `dailyShiftEnabled` is off. The daily layer uses its OWN rng (`createRunRng(dayKey + zoneId)`), never the run seed's instances.
- No server/API changes; no InstantDB schema changes except the typed `dailyShiftEnabled` settings field.

---

### Task 1: world-shift.ts — dayKey + daily shift computation

**Files:** Create `mobile/lib/world-shift.ts`. Test: `mobile/lib/__tests__/world-shift.test.ts`.

**Interfaces (produces):**
```ts
export function utcDayKey(date?: Date): string;              // 'YYYY-MM-DD' from UTC
export interface DailyShift {
  dayKey: string;
  zoneId: string;
  modifierPool: string[];          // 2-3 RunModifier ids from RUN_MODIFIERS
  closedEdges: Array<{ from: string; to: string }>;  // descent edges masked today ([] if none survived validation)
  sealedSideNodes: string[];       // side-node ids absent today ([] possible)
}
export function getDailyShift(zoneId: string, dayKey: string): DailyShift;
```
Behavior (all draws from `createRunRng(\`shift-${dayKey}-${zoneId}\`)`, fixed draw order):
- `modifierPool`: seeded shuffle of the 6 modifier ids, take first 2 or 3 (3 on ~60% of days — one seeded chance draw decides).
- `sealedSideNodes`: each side node in the zone's graph has a 25% seeded chance of being sealed today (max: never seal ALL side nodes of a zone).
- `closedEdges`: pick up to 1 candidate edge per zone per day (30% of days none): only edges whose source has ≥2 next targets and whose target is not side/boss/exit. Apply the tentative mask (remove edge + any nodes made unreachable? NO — just the edge) to a copy of the zone graph and run `validateZoneGraph` (with sealed side nodes also removed); if any error, return `closedEdges: []`.
- Zones without a `graph` (none today, defensive) → pool only, empty masks.
- Pure; no Date.now inside `getDailyShift` (dayKey passed in).

- [ ] **Step 1: Failing tests**
```ts
import { utcDayKey, getDailyShift } from '../world-shift';
it('utcDayKey formats UTC date', () => {
  expect(utcDayKey(new Date('2026-07-09T23:59:00Z'))).toBe('2026-07-09');
  expect(utcDayKey(new Date('2026-07-10T00:00:01Z'))).toBe('2026-07-10');
});
it('is deterministic per (zone, day) and differs across days', () => {
  const a = getDailyShift('sunken-crypt', '2026-07-09');
  expect(a).toEqual(getDailyShift('sunken-crypt', '2026-07-09'));
  const days = Array.from({length: 14}, (_, i) => getDailyShift('sunken-crypt', `2026-07-${String(i+1).padStart(2,'0')}`));
  expect(new Set(days.map(d => JSON.stringify(d.modifierPool))).size).toBeGreaterThan(1);
});
it('modifier pool is 2-3 valid ids', () => {
  const s = getDailyShift('ashen-crypts', '2026-07-09');
  expect(s.modifierPool.length).toBeGreaterThanOrEqual(2);
  expect(s.modifierPool.length).toBeLessThanOrEqual(3);
  // every id in RUN_MODIFIERS
});
it('masked graph always validates across 30 days x 5 zones', () => {
  // for each zone/day: apply closedEdges+sealedSideNodes to a copy, expect validateZoneGraph([]) — the invariant test
});
it('never seals all side nodes of a zone', () => { /* sunken has 2 — across 60 days, sealedSideNodes.length < sideCount */ });
```
- [ ] **Steps 2-5:** FAIL → implement → PASS + full suite + tsc → commit `feat: daily world shift computation (pool, door seals, edge mask)`.

---

### Task 2: generateDungeonGraph applies the daily mask

**Files:** Modify `mobile/lib/content.ts` (`generateDungeonGraph` ~1216). Test: extend `mobile/lib/__tests__/dungeon.test.ts`.

**Interface change:** `generateDungeonGraph(zoneId: string, rng: SeededRng, shift?: DailyShift): DungeonGraph` — when `shift` present (and zoneId matches): drop `sealedSideNodes` from the node set (and strip dangling edges to them), remove `closedEdges` from `next` arrays. Content rolls happen AFTER masking (rng consumption changes only when a shift is applied — document; unshifted calls remain byte-identical to today).

- [ ] **Step 1: Failing tests:** unshifted call byte-identical to a no-arg call (deep-equal); a shift with a sealed side node yields a graph without it and with no dangling edges; a closed edge is absent; masked output still traversable start→exit (walk it).
- [ ] **Steps 2-5:** TDD → full suite + tsc → commit `feat: dungeon generation applies daily shift mask`.

---

### Task 3: startGame — chosen modifier + dayKey threading (HIGH RISK — GameContext)

**Files:** Modify `mobile/lib/GameContext.tsx` (startGame L739 signature + L836-870 block; type L135), `mobile/lib/instant.ts` (typed `dailyShiftEnabled: boolean` in GameSettings + default true + merge). Test: `mobile/lib/__tests__/modifier-choice.test.ts` (pure parts).

**Binding behavior:**
- `startGame(amount, emptyHanded?, zoneId?, totalDeaths?, chosenModifierId?)`.
- **Draw stability:** ALWAYS `const rolled = rollModifier(modifierRng);` (consumes the pick), then `const modifier = chosenModifierId ? RUN_MODIFIERS.find(m => m.id === chosenModifierId) ?? rolled : rolled;` — the perk starting-item roll (modifierRng.random at ~857) sees an identical stream either way.
- Daily shift: `const dayKey = utcDayKey(); const shift = settings.dailyShiftEnabled ? getDailyShift(resolvedZoneId, dayKey) : undefined;` → pass `shift` to `generateDungeonGraph`. Store `dailyShift: shift ?? null` in state (new field; expose via context for UI).
- `dailyShiftEnabled` OFF ⇒ behavior byte-identical to current main (no shift arg, chosen modifier still honored).
- useCallback deps: add `settings.dailyShiftEnabled`.

- [ ] **Step 1: Failing test (pure):** a `resolveModifier(chosenId, rolled)` helper if extracted, else test via RUN_MODIFIERS lookup semantics + a test pinning that rollModifier consumes exactly one pick (call it, then assert next pick from a twin rng diverges as expected). Keep it honest even if thin — the reviewer checklist covers the context wiring.
- [ ] **Steps 2-5:** implement → full suite + tsc → commit `feat: chosen modifier + daily shift threading in startGame`.

**Reviewer checklist:** stale-closure patterns; dep arrays; draw-stability trace (modifierRng stream identical with/without choice); dailyShiftEnabled=false byte-identity; offline path unaffected.

---

### Task 4: The Toll — "The depths make an offer" (modifier chooser)

**Files:** Modify `mobile/app/stake.tsx` (chooser section between Summary ~L292 and Identity ~L294, mirroring the STAKE_OPTIONS pressable-grid pattern; both `handleStake`→`startGame` call sites pass the choice), all 7 catalogs. Test: none new beyond suite (UI wiring; pure logic already tested).

**Binding behavior:** Section header `t('stake.offer.title')` = "THE DEPTHS MAKE AN OFFER"; one card per modifier in today's pool (`getDailyShift(zoneId, utcDayKey()).modifierPool` — compute locally; respect `settings.dailyShiftEnabled`: if off, section hidden and no chosenModifierId passed) showing emoji + `t('modifier.<id>.name')` + `t('modifier.<id>.desc')` (add keys for all 6 modifiers ×7 catalogs — source strings from modifiers.ts verbatim); first card preselected; selection state mirrors `selectedStake`. Both action paths pass `chosenModifierId`. The play.tsx modifier pill keeps working unchanged (it reads currentModifier).

- [ ] Implement → full suite + tsc → manual note (chooser renders, selection persists into run — dev check if feasible, else flag) → commit `feat: modifier choice at the Toll`.

---

### Task 5: Shift surfaces — home panel + zone select lines

**Files:** Modify `mobile/app/index.tsx` (panel above the Echoes preview, after the flex-[2] spacer ~L431), `mobile/app/zone-select.tsx` (line after DifficultyDots ~L215 on unlocked cards), all 7 catalogs.

**Binding behavior:**
- Home panel: compact monospace block, header `t('shift.header')` = "THE DEPTHS HAVE SHIFTED", one line `t('shift.offers', {mods})` = "Today's offers: {mods}" (modifier emojis for the SELECTED zone concept doesn't exist on home — use sunken-crypt's pool? NO: show the zone-agnostic line `t('shift.line')` = "The passages are not as you left them." + the day's offers computed for the player's highest unlocked zone — implementer picks the cleanest source and documents). Hidden when `dailyShiftEnabled` off. Bible voice, no exclamation marks.
- Zone select: per unlocked card, one dim line: `t('shift.zone.sealed', {n})` when the zone has sealed side doors today, or `t('shift.zone.open')` = "All passages stand open." otherwise; plus the modifier-pool emojis. Keep it subtle (9-10px dim mono, matching tagline styling).

- [ ] Implement → full suite + tsc → commit `feat: shift surfaces on home and zone select`.

---

### Task 6: Admin toggle + docs pass

**Files:** Modify `src/app/admin/page.tsx` (a `dailyShiftEnabled` toggle following the enabledZones/saveSettings pattern), `CLAUDE.md` (one-sentence delta: daily seeded shift), `docs/superpowers/specs/2026-07-04-the-shift-design.md` (§3.1 partial-done note: client seeded layer shipped — modifier pool, door seals, edge mask; server-authority carve-out + Coin-Bound = 3b; dispatches = phase 4; §7 done note incl. the apex-interaction caveat deferred to phase 4), `docs/localization/RETRY_MANIFEST.md` (new keys pending translation).

- [ ] Implement + verify claims → commit `feat: daily shift admin toggle; docs — phase 3a reality`.

---

## Self-Review

- **Spec coverage:** §3.1 client core (T1-T3), §7 choice (T4 — apex interaction explicitly deferred to phase 4 with the community layer; noted in T6's spec tick), §8 surfaces 1-2 (T5). Deliberately out: dispatch renderer/push (phase 4), server authority + coins/streak/posture (3b).
- **Placeholder scan:** T1's later tests sketched-with-intent (patterns two lines above); T5's home-panel pool-source choice delegated with documentation requirement. No TBDs.
- **Type consistency:** `DailyShift` (T1) → `generateDungeonGraph(_, _, shift?)` (T2) → startGame threading + state `dailyShift` (T3) → UI reads (T4-5); `dailyShiftEnabled` typed in T3, surfaced T4/T5/T6.
- **Risk notes:** T3 is the GameContext task (draw-stability is the subtle part — the checklist names it). T2's masking-before-rolling changes rng consumption ONLY when a shift exists — the byte-identity tests pin the off/unshifted paths.
