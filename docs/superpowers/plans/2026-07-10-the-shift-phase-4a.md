# The Shift — Phase 4a: Community Aggregation + World-Shift Merge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-authoritative nightly community-aggregation layer that marks each zone's daily apex creature, mass-death "curse" nodes, and single deadliest ("Architect") node from **server-receipted deaths only**, and merges it additively into the existing offline seeded daily shift on the client.

**Architecture:** A pure aggregator (`src/lib/world-shift-agg.ts`, unit-tested like `coins.ts`) computes per-zone/day signals from `runReceipts` (the only server-only-writable, account-identified death source). A cron-guarded route (`src/app/api/game/shift`) runs it nightly and writes a `worldShifts` namespace row per zone/day (POST), and serves today's row to clients (GET). The mobile `world-shift.ts` gains a network `fetchCommunityShift` + a pure `mergeShift` producing a `WorldShift` that degrades to the seeded `DailyShift` alone when the fetch fails or is offline. Consumption is additive: an apex creature gets a +15% HP/damage buff and a marker; cursed/architect nodes get markers.

**Tech Stack:** Next.js 16 API routes + `@instantdb/admin` (web), Expo/React Native + jest (mobile), existing seeded-RNG daily shift. No new dependencies.

## Global Constraints

- **A5 aggregation integrity (spec §3.2):** aggregate over **server-receipted deaths only** (`runReceipts`, never raw `deaths` — deaths are client-forgeable via `perms.create: "auth.id != null"`); count **distinct plausible accounts** (by `authId`), never raw rows; apply **per-account caps** so one account cannot manufacture a node/creature tally; use **thresholds/distinct-counts, not sums**; trailing **24h** window.
- **No UGC in 4a (scope boundary):** `worldShifts` rows carry only ids and counts (creature id, node ids, integer tallies). **No player names, nicknames, or final words** — Echo Husk phrases and Architect-wall names are DEFERRED to Phase 4b behind the A2 moderation gate.
- **Additive + degrade-gracefully:** a failed/offline community fetch MUST fall back to the seeded `DailyShift` with zero gameplay disruption. The community layer never blocks run setup.
- **Shift boundary:** world shifts at **00:00 UTC** globally, keyed on `(utcDayKey, zoneId)` — identical bucketing to the existing seeded layer (`utcDayKey` in `mobile/lib/world-shift.ts`).
- **Determinism preserved:** the seeded layer stays pure/offline; community data is separate and optional. No `Math.random()` in gameplay paths (existing project rule).
- **Bible voice** for any new player-facing string (second person, present tense, no exclamation marks, no modern words), routed through `t()` + `mobile/lib/locales/en.json`.
- **Tunables live on `gameSettings`** (like `victoryBonusPercent`): `curseNodeThreshold` (default 10), `apexMinKills` (default 3). Read with `?? default` so a missing settings row never breaks aggregation.
- **Creature identifier space (CRITICAL — verify before wiring any match):** the apex creature is tracked by the creature **display name** — the same value carried by the death route's `killedBy` body field, `content.enemy`, `CreatureInfo.name`, and the `BESTIARY` keys (`ALL_CREATURE_NAMES = Object.keys(BESTIARY)`). `apexCreatureId` (despite the field name) therefore holds this display-name string (e.g. `"Bog Lurker"`, not `"bog-lurker"`). ALL downstream matching — the apex buff (Task 6) and the apex bounty (Task 7) — MUST compare against `creature.name` / `content.enemy`, never a slugified id. The implementer verifies this chain end-to-end against the code (`death/route.ts` `killedBy`, `content.ts` `rollNodeContent` writing `content.enemy`, `combat.tsx` `getCreatureInfo(enemyName)`) before wiring, and uses real display-name values in tests.
- **Extra-caution files** (do not casually refactor): `GameContext.tsx`, `instant.ts`, `db.ts`. This plan touches `GameContext.tsx` (run setup) minimally and additively.

---

## File Structure

- **Create `src/lib/world-shift-agg.ts`** — pure aggregation core: types + `aggregateZoneDay` (A5 integrity) + `buildWorldShiftWrites` (idempotent upsert planning). No I/O. Web-side (uses `@/` nothing; pure TS).
- **Create `src/lib/__tests__/world-shift-agg.test.ts`** — full unit coverage of the aggregator + upsert builder.
- **Create `src/app/api/game/shift/route.ts`** — POST (cron-guarded nightly aggregation, reads `runReceipts`, writes `worldShifts`) + GET (read today's row for a zone).
- **Modify `src/lib/coins.ts`** — extend `RunReceipt` + `buildRunReceipt` with optional `killedBy` / `nodeId` (the fields aggregation needs, sourced only from the trusted receipt).
- **Modify `src/app/api/session/death/route.ts`** — pass `killedBy` + `nodeId` into `buildRunReceipt`.
- **Modify `instant.perms.ts`** — add deny-by-default `worldShifts` perms (view-only; server-writes via admin bypass).
- **Modify `vercel.json`** — register the aggregation cron.
- **Modify `mobile/lib/world-shift.ts`** — add `CommunityShift` + `WorldShift` types, `fetchCommunityShift` (network), `mergeShift` (pure).
- **Modify `mobile/lib/__tests__/world-shift.test.ts`** — cover `mergeShift` degrade-gracefully behavior.
- **Modify `mobile/lib/GameContext.tsx`** — fetch + merge community layer during run setup (additive, non-blocking); store on state; pass to `generateDungeonGraph`.
- **Modify `mobile/lib/content.ts`** — `generateDungeonGraph` accepts the community layer; apply apex +15% buff + mark apex/cursed/architect nodes on node content.
- **Modify `mobile/app/play.tsx`** — surface apex/curse/architect markers on the node/enemy card.
- **Modify `mobile/lib/locales/en.json`** — marker strings.
- **Docs:** `docs/superpowers/specs/2026-07-04-the-shift-design.md` (§3.2/§3.3 done-notes), `CLAUDE.md`.

**In scope for 4a (per user decision, July 2026):** the **apex bounty** — on killing the apex creature, a bonus seeded loot roll + extra bestiary-mastery credit (Task 7). Uses the existing `rollRandomItem` (loot) and `recordCreatureUpdate` (mastery, `defeatIncrement` widened) at the `combat.tsx:696` kill hook.

**Deferred within the 4-series (write down, do not silently trim):**
- **Architect corpse-wall UGC** (real fallen names/final words) — Phase 4b, behind A2 moderation. 4a marks the architect node with a non-UGC marker only.
- **Account-age trust-weighting** — 4a uses trailing-window + per-account cap + min-distinct-accounts; full account-age/stake trust-weighting is A2/4b.

---

### Task 1: Enrich run receipts with `killedBy` + `nodeId`

Receipts are the only server-only-writable, account-identified death source (deaths are client-forgeable). Aggregation needs the creature that killed (apex) and the node (curse/architect); add them to the receipt so the aggregator reads one trusted source.

**Files:**
- Modify: `src/lib/coins.ts` (the `RunReceipt` interface ~line 349, `buildRunReceipt` ~line 382)
- Modify: `src/app/api/session/death/route.ts:313-333` (the `buildRunReceipt({...})` call)
- Test: `src/lib/__tests__/coins.test.ts` (add cases)

**Interfaces:**
- Produces: `RunReceipt` gains `killedBy: string | null` and `nodeId: string | null`; `buildRunReceipt(input)` accepts optional `killedBy?`/`nodeId?` (default null). Task 2's aggregator consumes `receipt.killedBy`, `receipt.nodeId`, `receipt.authId`, `receipt.zoneId`, `receipt.outcome`, `receipt.finalDepth`, `receipt.createdAt`.

- [ ] **Step 1: Write the failing test**

In `src/lib/__tests__/coins.test.ts`, add:

```ts
describe('buildRunReceipt killedBy/nodeId', () => {
  const base = {
    sessionId: 's1', sessionToken: 't1', authId: 'wallet-abc', walletAddress: 'wallet-abc',
    zoneId: 'sunken-crypt', runSeed: 'seed', seedSource: 'legacy', serverDayKey: '2026-07-10',
    dailyShiftEnabled: true, chosenModifierId: null, stakeMode: 'free' as const, coinStake: 0,
    outcome: 'dead' as const, finalDepth: 7, coinDelta: 0, streakAfter: 0, createdAt: 1,
  };
  it('records killedBy and nodeId when provided', () => {
    const r = buildRunReceipt({ ...base, killedBy: 'bog-lurker', nodeId: 'n-4' });
    expect(r.killedBy).toBe('bog-lurker');
    expect(r.nodeId).toBe('n-4');
  });
  it('defaults killedBy and nodeId to null when omitted', () => {
    const r = buildRunReceipt(base);
    expect(r.killedBy).toBeNull();
    expect(r.nodeId).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and verify it fails**

Run: `cd /Volumes/FP80/code/dieforward && npx jest coins -t "killedBy"`
Expected: FAIL (property does not exist / typescript error on the input).

- [ ] **Step 3: Implement**

In `src/lib/coins.ts`, add to the `RunReceipt` interface (after `finalDepth: number;`):
```ts
  killedBy: string | null;
  nodeId: string | null;
```
Add to `buildRunReceipt`'s input type the optional fields `killedBy?: string | null;` and `nodeId?: string | null;`, and in the returned object add:
```ts
    killedBy: input.killedBy ?? null,
    nodeId: input.nodeId ?? null,
```

In `src/app/api/session/death/route.ts`, inside the `buildRunReceipt({...})` call (death path), add these two args alongside the existing ones:
```ts
          killedBy: killedBy || null,
          nodeId: validNodeId ?? null,
```
(`killedBy` and `validNodeId` are already in scope — see death route lines ~29 and ~188.)

Leave the victory route's `buildRunReceipt` call unchanged (a cleared run has no killer/death node; both default to null).

- [ ] **Step 4: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward && npx jest coins && npx tsc --noEmit`
Expected: all coins tests PASS, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coins.ts src/app/api/session/death/route.ts src/lib/__tests__/coins.test.ts
git commit -m "feat(4a): add killedBy/nodeId to run receipts for community aggregation"
```

---

### Task 2: Pure community aggregator (`world-shift-agg.ts`) — A5 integrity core

**Files:**
- Create: `src/lib/world-shift-agg.ts`
- Test: `src/lib/__tests__/world-shift-agg.test.ts`

**Interfaces:**
- Consumes: an array of receipt-shaped objects (subset of `RunReceipt` from Task 1): `{ authId, walletAddress, zoneId, outcome, nodeId, killedBy, createdAt }`.
- Produces:
  ```ts
  export interface ReceiptForAgg {
    authId: string | null;
    walletAddress: string | null;
    zoneId: string | null;
    outcome: string;          // only 'dead' contributes
    nodeId: string | null;
    killedBy: string | null;
    createdAt: number;
  }
  export interface AggOptions {
    nowMs: number;            // window anchor (caller passes Date.now())
    windowMs?: number;        // default 24h
    perAccountCap?: number;   // default 3
    curseNodeThreshold?: number;   // default 10 (distinct accounts)
    apexMinKills?: number;         // default 3 (distinct accounts)
  }
  export interface ZoneDayAggregate {
    apexCreatureId: string | null;
    apexKills: number;              // distinct-account, capped
    curseNodes: string[];           // nodeIds >= curseNodeThreshold (sorted)
    architectNodeId: string | null; // deadliest of the cursed nodes (tie -> lowest nodeId)
    architectDeaths: number;
    totalReceiptedDeaths: number;   // distinct-account-capped total in window
  }
  export function aggregateZoneDay(zoneId: string, receipts: ReceiptForAgg[], opts: AggOptions): ZoneDayAggregate;
  ```
- Also produces the idempotent upsert planner (used by Task 4):
  ```ts
  export interface WorldShiftRow { id: string; dayKey: string; zoneId: string; [k: string]: unknown; }
  export interface WorldShiftWritePlan { rowId: string; isNew: boolean; fields: Record<string, unknown>; }
  export function buildWorldShiftWrites(
    dayKey: string,
    aggregatesByZone: Record<string, ZoneDayAggregate>,
    existingRows: WorldShiftRow[],
    newId: () => string,
    createdAt: number,
  ): WorldShiftWritePlan[];
  ```

**A5 rules the aggregator enforces (all unit-tested below):**
1. Only `outcome === 'dead'` receipts contribute.
2. Only receipts with `zoneId === zoneId` and `createdAt >= nowMs - windowMs` contribute.
3. **Account key** = `authId ?? walletAddress ?? '<null>'`; receipts with neither identifier use the shared `'<null>'` bucket (so anonymous rows can never inflate distinct-account counts beyond one).
4. **Per-account cap:** for any tally (a node's death count, a creature's kill count), a single account contributes at most `perAccountCap`.
5. **Distinct-account counting:** counts are distinct accounts (post-cap), never raw rows.
6. **Curse nodes:** nodeIds whose distinct-capped account count `>= curseNodeThreshold`.
7. **Architect:** among curse nodes, the one with the max count; ties broken by lowest `nodeId` (deterministic). Null if no curse nodes.
8. **Apex:** the `killedBy` creature with the max distinct-capped account count, only if `>= apexMinKills`; ties → lowest creature id. Null otherwise.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/world-shift-agg.test.ts`:

```ts
import {
  aggregateZoneDay,
  buildWorldShiftWrites,
  type ReceiptForAgg,
  type ZoneDayAggregate,
} from '@/lib/world-shift-agg';

const NOW = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function death(over: Partial<ReceiptForAgg> = {}): ReceiptForAgg {
  return {
    authId: 'acct-1', walletAddress: 'acct-1', zoneId: 'sunken-crypt',
    outcome: 'dead', nodeId: 'n-1', killedBy: 'bog-lurker', createdAt: NOW - 1000,
    ...over,
  };
}

describe('aggregateZoneDay — A5 integrity', () => {
  const opts = { nowMs: NOW };

  it('ignores non-dead outcomes', () => {
    const r = aggregateZoneDay('sunken-crypt', [death({ outcome: 'cleared' })], opts);
    expect(r.totalReceiptedDeaths).toBe(0);
    expect(r.apexCreatureId).toBeNull();
  });

  it('ignores receipts outside the 24h window', () => {
    const r = aggregateZoneDay('sunken-crypt', [death({ createdAt: NOW - 2 * DAY })], opts);
    expect(r.totalReceiptedDeaths).toBe(0);
  });

  it('ignores other zones', () => {
    const r = aggregateZoneDay('sunken-crypt', [death({ zoneId: 'ashen-crypts' })], opts);
    expect(r.totalReceiptedDeaths).toBe(0);
  });

  it('counts distinct accounts, not raw rows, and caps per account', () => {
    // one account dies 10 times on n-1; per-account cap 3 => counts as 3
    const rows = Array.from({ length: 10 }, () => death({ authId: 'a', walletAddress: 'a' }));
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, perAccountCap: 3, curseNodeThreshold: 10 });
    expect(r.curseNodes).toEqual([]); // capped to 3 distinct-account weight, below 10
  });

  it('marks a curse node when distinct accounts reach the threshold', () => {
    const rows = Array.from({ length: 10 }, (_, i) => death({ authId: `a${i}`, walletAddress: `a${i}` }));
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, curseNodeThreshold: 10 });
    expect(r.curseNodes).toContain('n-1');
  });

  it('picks the architect as the deadliest curse node (tie -> lowest id)', () => {
    const many = (node: string, n: number) =>
      Array.from({ length: n }, (_, i) => death({ nodeId: node, authId: `x${node}${i}`, walletAddress: `x${node}${i}` }));
    const rows = [...many('n-9', 12), ...many('n-2', 12)]; // tie at 12
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, curseNodeThreshold: 10 });
    expect(r.curseNodes.sort()).toEqual(['n-2', 'n-9']);
    expect(r.architectNodeId).toBe('n-2'); // tie broken by lowest id
    expect(r.architectDeaths).toBe(12);
  });

  it('marks an apex creature above apexMinKills, ties -> lowest id', () => {
    const kills = (creature: string, n: number) =>
      Array.from({ length: n }, (_, i) => death({ killedBy: creature, authId: `k${creature}${i}`, walletAddress: `k${creature}${i}` }));
    const rows = [...kills('wraith', 3), ...kills('ghoul', 3)]; // tie
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, apexMinKills: 3 });
    expect(r.apexCreatureId).toBe('ghoul'); // 'ghoul' < 'wraith'
    expect(r.apexKills).toBe(3);
  });

  it('returns null apex below apexMinKills', () => {
    const r = aggregateZoneDay('sunken-crypt', [death(), death({ authId: 'b', walletAddress: 'b' })], { nowMs: NOW, apexMinKills: 3 });
    expect(r.apexCreatureId).toBeNull();
  });

  it('anonymous (null-id) receipts share one bucket and cannot inflate counts', () => {
    const rows = Array.from({ length: 20 }, () => death({ authId: null, walletAddress: null }));
    const r = aggregateZoneDay('sunken-crypt', rows, { nowMs: NOW, perAccountCap: 3, curseNodeThreshold: 10 });
    expect(r.curseNodes).toEqual([]); // all collapse to one capped bucket
  });
});

describe('buildWorldShiftWrites — idempotent upsert', () => {
  const agg: ZoneDayAggregate = {
    apexCreatureId: 'bog-lurker', apexKills: 4, curseNodes: ['n-1'],
    architectNodeId: 'n-1', architectDeaths: 11, totalReceiptedDeaths: 15,
  };
  let counter = 0;
  const newId = () => `id-${counter++}`;

  it('creates a new row when none exists for (dayKey, zoneId)', () => {
    const plans = buildWorldShiftWrites('2026-07-10', { 'sunken-crypt': agg }, [], newId, 123);
    expect(plans).toHaveLength(1);
    expect(plans[0].isNew).toBe(true);
    expect(plans[0].fields.zoneId).toBe('sunken-crypt');
    expect(plans[0].fields.apexCreatureId).toBe('bog-lurker');
    expect(plans[0].fields.dayKey).toBe('2026-07-10');
  });

  it('reuses the existing row id for the same (dayKey, zoneId) — idempotent re-run', () => {
    const existing = [{ id: 'row-x', dayKey: '2026-07-10', zoneId: 'sunken-crypt' }];
    const plans = buildWorldShiftWrites('2026-07-10', { 'sunken-crypt': agg }, existing, () => 'should-not-be-used', 123);
    expect(plans[0].rowId).toBe('row-x');
    expect(plans[0].isNew).toBe(false);
  });
});
```

- [ ] **Step 2: Run and verify fail**

Run: `cd /Volumes/FP80/code/dieforward && npx jest world-shift-agg`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/world-shift-agg.ts`**

```ts
/**
 * Pure community-aggregation core for the daily world shift (Phase 4a).
 *
 * A5 integrity: input is server-receipted deaths ONLY (runReceipts, which are
 * server-only-writable — deaths rows are client-forgeable and must never feed
 * this). Counts are DISTINCT ACCOUNTS, per-account-capped, over a trailing
 * window — never raw row sums. No UGC (names/final words) is read or emitted.
 */

export interface ReceiptForAgg {
  authId: string | null;
  walletAddress: string | null;
  zoneId: string | null;
  outcome: string;
  nodeId: string | null;
  killedBy: string | null;
  createdAt: number;
}

export interface AggOptions {
  nowMs: number;
  windowMs?: number;
  perAccountCap?: number;
  curseNodeThreshold?: number;
  apexMinKills?: number;
}

export interface ZoneDayAggregate {
  apexCreatureId: string | null;
  apexKills: number;
  curseNodes: string[];
  architectNodeId: string | null;
  architectDeaths: number;
  totalReceiptedDeaths: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NULL_ACCOUNT = '<null>';

function accountKey(r: ReceiptForAgg): string {
  return r.authId ?? r.walletAddress ?? NULL_ACCOUNT;
}

/**
 * Distinct-account count with a per-account cap, over a keyed tally.
 * keyFn returns the bucket (nodeId or creatureId) or null to skip.
 * Returns Map<bucket, distinct-capped-count>.
 */
function cappedDistinctCounts(
  receipts: ReceiptForAgg[],
  keyFn: (r: ReceiptForAgg) => string | null,
  perAccountCap: number,
): Map<string, number> {
  // bucket -> account -> raw count (then min(cap) summed as distinct-capped weight)
  const perBucket = new Map<string, Map<string, number>>();
  for (const r of receipts) {
    const bucket = keyFn(r);
    if (bucket === null) continue;
    let accounts = perBucket.get(bucket);
    if (!accounts) { accounts = new Map(); perBucket.set(bucket, accounts); }
    const acct = accountKey(r);
    accounts.set(acct, (accounts.get(acct) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const [bucket, accounts] of perBucket) {
    let total = 0;
    for (const raw of accounts.values()) total += Math.min(raw, perAccountCap);
    out.set(bucket, total);
  }
  return out;
}

export function aggregateZoneDay(
  zoneId: string,
  receipts: ReceiptForAgg[],
  opts: AggOptions,
): ZoneDayAggregate {
  const windowMs = opts.windowMs ?? DAY_MS;
  const perAccountCap = opts.perAccountCap ?? 3;
  const curseNodeThreshold = opts.curseNodeThreshold ?? 10;
  const apexMinKills = opts.apexMinKills ?? 3;
  const minCreatedAt = opts.nowMs - windowMs;

  const eligible = receipts.filter(
    (r) => r.outcome === 'dead' && r.zoneId === zoneId && r.createdAt >= minCreatedAt,
  );

  // Node death tallies (distinct-account, capped).
  const nodeCounts = cappedDistinctCounts(eligible, (r) => r.nodeId, perAccountCap);
  const curseNodes = [...nodeCounts.entries()]
    .filter(([, n]) => n >= curseNodeThreshold)
    .map(([node]) => node)
    .sort();

  let architectNodeId: string | null = null;
  let architectDeaths = 0;
  for (const node of curseNodes) {
    const n = nodeCounts.get(node) ?? 0;
    if (n > architectDeaths || (n === architectDeaths && (architectNodeId === null || node < architectNodeId))) {
      architectNodeId = node;
      architectDeaths = n;
    }
  }

  // Apex creature (distinct-account, capped).
  const creatureCounts = cappedDistinctCounts(eligible, (r) => r.killedBy, perAccountCap);
  let apexCreatureId: string | null = null;
  let apexKills = 0;
  for (const [creature, n] of creatureCounts) {
    if (n > apexKills || (n === apexKills && apexCreatureId !== null && creature < apexCreatureId)) {
      apexCreatureId = creature;
      apexKills = n;
    }
  }
  if (apexKills < apexMinKills) { apexCreatureId = null; apexKills = 0; }

  // Total distinct-capped deaths in window (across all nodes' accounts).
  const totalCounts = cappedDistinctCounts(eligible, () => 'ALL', perAccountCap);
  const totalReceiptedDeaths = totalCounts.get('ALL') ?? 0;

  return { apexCreatureId, apexKills, curseNodes, architectNodeId, architectDeaths, totalReceiptedDeaths };
}

export interface WorldShiftRow { id: string; dayKey: string; zoneId: string; [k: string]: unknown; }
export interface WorldShiftWritePlan { rowId: string; isNew: boolean; fields: Record<string, unknown>; }

/**
 * Plan idempotent upserts: one row per (dayKey, zoneId). Re-running the cron for
 * the same day reuses the existing row id (overwrite), never duplicates.
 */
export function buildWorldShiftWrites(
  dayKey: string,
  aggregatesByZone: Record<string, ZoneDayAggregate>,
  existingRows: WorldShiftRow[],
  newId: () => string,
  createdAt: number,
): WorldShiftWritePlan[] {
  const byKey = new Map<string, WorldShiftRow>();
  for (const row of existingRows) byKey.set(`${row.dayKey}::${row.zoneId}`, row);

  const plans: WorldShiftWritePlan[] = [];
  for (const [zoneId, agg] of Object.entries(aggregatesByZone)) {
    const existing = byKey.get(`${dayKey}::${zoneId}`);
    const rowId = existing ? existing.id : newId();
    plans.push({
      rowId,
      isNew: !existing,
      fields: {
        dayKey,
        zoneId,
        apexCreatureId: agg.apexCreatureId,
        apexKills: agg.apexKills,
        curseNodes: agg.curseNodes,
        architectNodeId: agg.architectNodeId,
        architectDeaths: agg.architectDeaths,
        totalReceiptedDeaths: agg.totalReceiptedDeaths,
        createdAt,
      },
    });
  }
  return plans;
}
```

- [ ] **Step 4: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward && npx jest world-shift-agg && npx tsc --noEmit`
Expected: all PASS, tsc exit 0.

Note: the apex tie-break assertion (`'ghoul' < 'wraith'`) exercises the `creature < apexCreatureId` branch — verify the branch keeps the lexicographically-lower id on an exact tie.

- [ ] **Step 5: Commit**

```bash
git add src/lib/world-shift-agg.ts src/lib/__tests__/world-shift-agg.test.ts
git commit -m "feat(4a): pure community aggregator with A5 distinct-account integrity"
```

---

### Task 3: `worldShifts` perms (deny-by-default)

**Files:**
- Modify: `instant.perms.ts` (add a `worldShifts` block alongside the other money/state namespaces ~line 63-92)

**Interfaces:**
- Produces: the `worldShifts` namespace is client-readable (view), server-only-writable (create/update/delete denied → admin client bypasses for the cron).

- [ ] **Step 1: Implement** (perms rules aren't unit-tested in this repo; this is a config change verified by the aggregation route working and by inspection)

In `instant.perms.ts`, add after the `sessions` block:

```ts
  // worldShifts: nightly community-aggregation output (apex/curse/architect ids
  // and counts — NO UGC). Clients READ today's row; only the server cron writes
  // (admin client bypasses perms). Deny all client writes.
  worldShifts: {
    allow: {
      view: "true",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
```

- [ ] **Step 2: Verify tsc/type of the perms file is unaffected**

Run: `cd /Volumes/FP80/code/dieforward && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add instant.perms.ts
git commit -m "feat(4a): deny-by-default worldShifts perms (view-only, server-written)"
```

---

### Task 4: Aggregation cron route (POST) + cron registration

**Files:**
- Create: `src/app/api/game/shift/route.ts` (POST only in this task; GET added in Task 5)
- Modify: `vercel.json` (add cron entry)

**Interfaces:**
- Consumes: `aggregateZoneDay`, `buildWorldShiftWrites`, `ReceiptForAgg` (Task 2); the `checkCronAuth` pattern (from `session/cleanup/route.ts:26-45`); `db`, `tx`, `id` from `@instantdb/admin` / `@/lib/db`.
- Produces: nightly per-zone `worldShifts` rows for the current `utcDayKey`.

**Server day key:** reuse the exact `serverDayKey` helper style from `session/start/route.ts:19-24` (UTC `YYYY-MM-DD`).

- [ ] **Step 1: Implement `src/app/api/game/shift/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { tx, id } from '@instantdb/admin';
import { db } from '@/lib/db';
import {
  aggregateZoneDay,
  buildWorldShiftWrites,
  type ReceiptForAgg,
  type ZoneDayAggregate,
  type WorldShiftRow,
} from '@/lib/world-shift-agg';

const ZONE_IDS = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];
const WINDOW_MS = 24 * 60 * 60 * 1000;

function utcDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let unguardedWarned = false;
function checkCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (!unguardedWarned) {
      console.warn('[Shift] CRON_SECRET is not set — the aggregation endpoint is UNGUARDED.');
      unguardedWarned = true;
    }
    return null;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const denied = checkCronAuth(request);
  if (denied) return denied;

  try {
    const now = new Date();
    const nowMs = now.getTime();
    const dayKey = utcDayKey(now);

    // A5: aggregate over server-receipted DEATHS ONLY. runReceipts are
    // server-only-writable (deny-by-default perms); deaths rows are forgeable.
    // No createdAt-range where-operator exists in this codebase, so read the
    // recent receipts and window-filter in JS (mirrors cleanup route's pattern).
    const result = await db.query({ runReceipts: { $: { where: { outcome: 'dead' } } } });
    const rows = (result?.runReceipts ?? []) as Record<string, unknown>[];
    const receipts: ReceiptForAgg[] = rows
      .filter((r) => typeof r.createdAt === 'number' && (r.createdAt as number) >= nowMs - WINDOW_MS)
      .map((r) => ({
        authId: (r.authId as string) ?? null,
        walletAddress: (r.walletAddress as string) ?? null,
        zoneId: (r.zoneId as string) ?? null,
        outcome: (r.outcome as string) ?? '',
        nodeId: (r.nodeId as string) ?? null,
        killedBy: (r.killedBy as string) ?? null,
        createdAt: r.createdAt as number,
      }));

    // Tunables from gameSettings (like victoryBonusPercent).
    const settingsResult = await db.query({ gameSettings: {} }).catch(() => null);
    const settings = (settingsResult?.gameSettings?.[0] as Record<string, unknown>) || {};
    const curseNodeThreshold = (settings.curseNodeThreshold as number) ?? 10;
    const apexMinKills = (settings.apexMinKills as number) ?? 3;

    const aggregatesByZone: Record<string, ZoneDayAggregate> = {};
    for (const zoneId of ZONE_IDS) {
      aggregatesByZone[zoneId] = aggregateZoneDay(zoneId, receipts, {
        nowMs, windowMs: WINDOW_MS, curseNodeThreshold, apexMinKills,
      });
    }

    const existingResult = await db.query({ worldShifts: { $: { where: { dayKey } } } }).catch(() => null);
    const existingRows = ((existingResult?.worldShifts ?? []) as unknown[]).map((r) => r as WorldShiftRow);

    const plans = buildWorldShiftWrites(dayKey, aggregatesByZone, existingRows, () => id(), nowMs);
    const writes = plans.map((p) => tx.worldShifts[p.rowId].update(p.fields));
    if (writes.length > 0) await db.transact(writes);

    return NextResponse.json({ success: true, dayKey, zones: plans.length, receiptedDeaths: receipts.length });
  } catch (error) {
    console.error('Failed to aggregate world shift:', error);
    return NextResponse.json({ error: 'Failed to aggregate world shift' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Register the cron in `vercel.json`**

Add to the `crons` array (after the cleanup entry; runs 00:30 UTC so the just-closed UTC day is fully captured):

```json
    { "path": "/api/game/shift", "schedule": "30 0 * * *" }
```

- [ ] **Step 3: Verify build/type**

Run: `cd /Volumes/FP80/code/dieforward && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Manual trace (record in the task report)**

Confirm in the report: (a) input is `runReceipts` with `outcome:'dead'` (never `deaths`); (b) JS window-filter keeps only trailing-24h receipts; (c) idempotent re-run reuses row ids via `buildWorldShiftWrites`; (d) cron guard mirrors cleanup's `checkCronAuth`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/game/shift/route.ts vercel.json
git commit -m "feat(4a): nightly community-aggregation cron writes worldShifts"
```

---

### Task 5: Read endpoint (GET) + client fetch/merge

**Files:**
- Modify: `src/app/api/game/shift/route.ts` (add GET)
- Modify: `mobile/lib/world-shift.ts` (types + `fetchCommunityShift` + `mergeShift`)
- Test: `mobile/lib/__tests__/world-shift.test.ts` (merge degrade-gracefully)

**Interfaces:**
- Produces (web): `GET /api/game/shift?zoneId=<id>&dayKey=<YYYY-MM-DD>` → `{ shift: WorldShiftRecord | null }`.
- Produces (mobile):
  ```ts
  export interface CommunityShift {
    dayKey: string; zoneId: string;
    apexCreatureId: string | null; apexKills: number;
    curseNodes: string[];
    architectNodeId: string | null; architectDeaths: number;
  }
  export type WorldShift = DailyShift & { community: CommunityShift | null };
  export function mergeShift(daily: DailyShift, community: CommunityShift | null): WorldShift;
  export function fetchCommunityShift(zoneId: string, dayKey: string, apiBase?: string): Promise<CommunityShift | null>;
  ```
  `mergeShift` returns `{ ...daily, community }` — additive, never mutates daily. `fetchCommunityShift` returns null on any network/parse error or non-matching zone/day (degrade-gracefully). Task 6 consumes `WorldShift.community`.

- [ ] **Step 1: Write the failing mobile test**

Append to `mobile/lib/__tests__/world-shift.test.ts`:

```ts
import { mergeShift, type CommunityShift, type WorldShift } from '../world-shift';

describe('mergeShift', () => {
  const daily = { dayKey: '2026-07-10', zoneId: 'sunken-crypt', modifierPool: [], closedEdges: [], sealedSideNodes: [] };
  it('degrades to the seeded layer when community is null', () => {
    const w: WorldShift = mergeShift(daily, null);
    expect(w.community).toBeNull();
    expect(w.zoneId).toBe('sunken-crypt');
    expect(w.closedEdges).toEqual([]);
  });
  it('attaches the community layer additively without mutating daily', () => {
    const community: CommunityShift = {
      dayKey: '2026-07-10', zoneId: 'sunken-crypt', apexCreatureId: 'bog-lurker',
      apexKills: 5, curseNodes: ['n-3'], architectNodeId: 'n-3', architectDeaths: 12,
    };
    const w = mergeShift(daily, community);
    expect(w.community?.apexCreatureId).toBe('bog-lurker');
    expect(daily).not.toHaveProperty('community'); // daily untouched
  });
});
```

- [ ] **Step 2: Run and verify fail**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest world-shift -t "mergeShift"`
Expected: FAIL — `mergeShift` not exported.

- [ ] **Step 3: Implement mobile `world-shift.ts` additions**

Add near the top exports of `mobile/lib/world-shift.ts`:

```ts
export interface CommunityShift {
  dayKey: string;
  zoneId: string;
  apexCreatureId: string | null;
  apexKills: number;
  curseNodes: string[];
  architectNodeId: string | null;
  architectDeaths: number;
}

export type WorldShift = DailyShift & { community: CommunityShift | null };

/** Additive merge — never mutates `daily`; degrades to seeded layer when community is null. */
export function mergeShift(daily: DailyShift, community: CommunityShift | null): WorldShift {
  return { ...daily, community };
}

/**
 * Fetch today's community layer for a zone. Returns null on ANY failure
 * (offline, non-200, parse error, zone/day mismatch) so callers degrade to the
 * seeded layer with no disruption. Never throws.
 */
export async function fetchCommunityShift(
  zoneId: string,
  dayKey: string,
  apiBase: string = process.env.EXPO_PUBLIC_API_URL || '',
): Promise<CommunityShift | null> {
  try {
    const url = `${apiBase}/api/game/shift?zoneId=${encodeURIComponent(zoneId)}&dayKey=${encodeURIComponent(dayKey)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const s = json?.shift;
    if (!s || s.zoneId !== zoneId || s.dayKey !== dayKey) return null;
    return {
      dayKey: s.dayKey,
      zoneId: s.zoneId,
      apexCreatureId: s.apexCreatureId ?? null,
      apexKills: s.apexKills ?? 0,
      curseNodes: Array.isArray(s.curseNodes) ? s.curseNodes : [],
      architectNodeId: s.architectNodeId ?? null,
      architectDeaths: s.architectDeaths ?? 0,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Implement the GET handler** in `src/app/api/game/shift/route.ts` (add below POST):

```ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zoneId');
    const dayKey = searchParams.get('dayKey');
    if (!zoneId || !dayKey) {
      return NextResponse.json({ error: 'zoneId and dayKey are required' }, { status: 400 });
    }
    const result = await db
      .query({ worldShifts: { $: { where: { dayKey, zoneId }, limit: 1 } } })
      .catch(() => null);
    const shift = (result?.worldShifts?.[0] as Record<string, unknown>) ?? null;
    return NextResponse.json({ shift });
  } catch (error) {
    console.error('Failed to read world shift:', error);
    return NextResponse.json({ shift: null });
  }
}
```

(CORS: the repo applies CORS globally to `/api/*` per CLAUDE.md — no per-route headers needed.)

- [ ] **Step 5: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest world-shift` then `cd /Volumes/FP80/code/dieforward && npx tsc --noEmit && cd mobile && npx tsc --noEmit`
Expected: all PASS, both tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/game/shift/route.ts mobile/lib/world-shift.ts mobile/lib/__tests__/world-shift.test.ts
git commit -m "feat(4a): world-shift read endpoint + client fetch/merge (degrades gracefully)"
```

---

### Task 6: Thread community layer into run setup + apply apex buff / node marks

**Files:**
- Modify: `mobile/lib/content.ts` (`generateDungeonGraph` signature ~line 1238; `maskGraphNodes` region ~1223-1251; creature instantiation `rollNodeContent` ~1145-1188)
- Modify: `mobile/lib/GameContext.tsx` (run setup ~line 872-885; state field ~112,193)
- Test: `mobile/lib/__tests__/content-community.test.ts` (new — apex buff + node marks are pure given a graph + community)

**Interfaces:**
- Consumes: `WorldShift`, `CommunityShift` (Task 5); `getDailyShift` (existing).
- Produces: `generateDungeonGraph(zoneId, rng, shift?, community?)` marks node content with `isApex`/`isCursed`/`isArchitect` booleans and multiplies the apex node's enemy HP/damage by 1.15.

**Design note (buff scope):** the apex buff is applied where the enemy stats are instantiated for a node (`rollNodeContent`). Multiply the chosen enemy's `hp` and `damage` (or the fields the content object carries) by **1.15**, rounded, ONLY on the node whose `content.enemy` id equals `community.apexCreatureId`. Marking is by node id for curse/architect, by creature id for apex.

- [ ] **Step 1: Write the failing test**

Create `mobile/lib/__tests__/content-community.test.ts`. Extract a pure helper `applyCommunityMarks(nodes, community)` so it is testable without full graph generation:

```ts
import { applyCommunityMarks, type MarkableNode } from '../content';
import type { CommunityShift } from '../world-shift';

// NOTE: apexCreatureId is a creature DISPLAY NAME (see Global Constraints —
// same space as content.enemy / killedBy / BESTIARY keys), NOT a slug.
const community: CommunityShift = {
  dayKey: '2026-07-10', zoneId: 'sunken-crypt',
  apexCreatureId: 'Bog Lurker', apexKills: 5,
  curseNodes: ['n-3'], architectNodeId: 'n-3', architectDeaths: 12,
};

function node(id: string, enemyName?: string): MarkableNode {
  return { id, content: enemyName ? { enemy: enemyName, enemyHp: 100, enemyDamage: 10 } : {} } as MarkableNode;
}

describe('applyCommunityMarks', () => {
  it('marks the cursed and architect node', () => {
    const out = applyCommunityMarks([node('n-3', 'Ghoul'), node('n-1')], community);
    const n3 = out.find((n) => n.id === 'n-3')!;
    expect(n3.content.isCursed).toBe(true);
    expect(n3.content.isArchitect).toBe(true);
  });
  it('marks the apex creature node and buffs its stats by 15%', () => {
    const out = applyCommunityMarks([node('n-5', 'Bog Lurker')], community);
    const n5 = out.find((n) => n.id === 'n-5')!;
    expect(n5.content.isApex).toBe(true);
    expect(n5.content.enemyHp).toBe(115);
    expect(n5.content.enemyDamage).toBe(12); // round(11.5)
  });
  it('is a no-op when community is null', () => {
    const nodes = [node('n-3', 'ghoul')];
    const out = applyCommunityMarks(nodes, null);
    expect(out[0].content.isCursed).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run and verify fail**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest content-community`
Expected: FAIL — `applyCommunityMarks` not exported.

- [ ] **Step 3: Implement in `mobile/lib/content.ts`**

Add the exported helper + types (place near `maskGraphNodes`):

```ts
export interface MarkableNode {
  id: string;
  content: {
    enemy?: string;
    enemyHp?: number;
    enemyDamage?: number;
    isApex?: boolean;
    isCursed?: boolean;
    isArchitect?: boolean;
    [k: string]: unknown;
  };
}

const APEX_BUFF = 1.15;

/**
 * Additive community marks. Pure: returns new node objects with isApex/isCursed/
 * isArchitect flags and (for the apex creature's node) a 15% HP/damage buff.
 * No-op when community is null.
 */
export function applyCommunityMarks<T extends MarkableNode>(
  nodes: T[],
  community: import('./world-shift').CommunityShift | null,
): T[] {
  if (!community) return nodes;
  const cursed = new Set(community.curseNodes);
  return nodes.map((n) => {
    const content = { ...n.content };
    if (cursed.has(n.id)) content.isCursed = true;
    if (community.architectNodeId === n.id) content.isArchitect = true;
    if (community.apexCreatureId && content.enemy === community.apexCreatureId) {
      content.isApex = true;
      if (typeof content.enemyHp === 'number') content.enemyHp = Math.round(content.enemyHp * APEX_BUFF);
      if (typeof content.enemyDamage === 'number') content.enemyDamage = Math.round(content.enemyDamage * APEX_BUFF);
    }
    return { ...n, content };
  });
}
```

Then thread it into `generateDungeonGraph`: add a 4th optional param `community?: import('./world-shift').CommunityShift | null` and, after nodes are generated with content (after `rollNodeContent` has populated `content.enemy`), pass the node list through `applyCommunityMarks(nodes, community ?? null)` before returning the graph. (Match the exact field names the content object uses for enemy hp/damage — verify against `rollNodeContent`; if the fields differ from `enemyHp`/`enemyDamage`, use the real names in BOTH the helper and this call, and update the test to match.)

- [ ] **Step 4: Thread through `GameContext.tsx` run setup (additive, non-blocking)**

At the run-setup site (`GameContext.tsx:872`), after computing `shift`, fetch + merge the community layer without blocking gameplay. Add:

```ts
import { getDailyShift, utcDayKey, fetchCommunityShift, mergeShift, type WorldShift, type CommunityShift } from './world-shift';
```

Where the run is set up:

```ts
const shift = settings.dailyShiftEnabled ? getDailyShift(resolvedZoneId, dayKey) : undefined;
// Community layer is additive and best-effort — never block run setup on it.
let community: CommunityShift | null = null;
if (settings.dailyShiftEnabled) {
  community = await fetchCommunityShift(resolvedZoneId, dayKey).catch(() => null);
}
const graph = generateDungeonGraph(resolvedZoneId, rng, shift, community);
```

Store `community` on state (add `communityShift: CommunityShift | null` beside the existing `dailyShift` field at ~112,193) so the bounty (Task 7) and the marker UI (Task 8) can read it. If run setup is not already `async` at this point, wrap the community fetch so it does not make the whole setup blocking — prefer fetching community BEFORE graph generation only if setup is already async; otherwise fetch it and set state, then regenerate marks. **Confirm the setup function's async-ness before choosing;** if synchronous, set `community` to null for graph-gen and instead fetch-then-`applyCommunityMarks` in an effect — record which path you took in the report.

- [ ] **Step 5: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest content-community && npx jest && npx tsc --noEmit`
Expected: content-community PASS, full mobile suite green, tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/content.ts mobile/lib/GameContext.tsx mobile/lib/__tests__/content-community.test.ts
git commit -m "feat(4a): apply community apex buff + curse/architect node marks in run setup"
```

---

### Task 7: Apex bounty — bonus loot roll + extra mastery credit on killing the apex

**Files:**
- Modify: `mobile/lib/world-shift.ts` (add pure `isApexCreature` helper)
- Modify: `mobile/lib/instant.ts` (widen `recordCreatureUpdate`'s `defeatIncrement` type ~line 262)
- Modify: `mobile/app/combat.tsx` (kill block ~696-724: bonus loot + apex mastery increment)
- Test: `mobile/lib/__tests__/world-shift.test.ts` (`isApexCreature`)

**Interfaces:**
- Consumes: `CommunityShift` (Task 5), `game.communityShift` state (Task 6), `rollRandomItem` (`content.ts:1001`, signature `rollRandomItem(rng: () => number, minRarity?, excludeItems?: string[], zoneId?): string`), `game.addToInventory({id,name,emoji})` (`GameContext.tsx:1110`), `getItemDetails(name)` (for emoji), `recordCreatureUpdate(player, creature.name, 'defeat', ALL_CREATURE_NAMES, increment)` (`instant.ts:257`), `game.rng.random`.
- Produces: `isApexCreature(creatureName: string, community: CommunityShift | null): boolean` — pure, exact display-name match against `community.apexCreatureId`.

**Apex +15% buff (MOVED HERE from Task 6):** Task 6 established that enemy HP/damage are NOT on node content — they materialize in combat from `BESTIARY` via `getCreatureInfo(enemyName)`. So the +15% apex buff must be applied HERE, at combat, where the enemy's stats are initialized (find the point in `combat.tsx` where `enemyHealth`/enemy damage are first set from `creature`/`getCreatureInfo` at mount). When `isApexCreature(creature.name, game.communityShift)`, multiply the initialized enemy HP and per-hit damage by **1.15** (round). This is a combat-setup concern (mount), SEPARATE from the kill-time bounty below. Verify the exact enemy-stat initialization site and field names against the real `combat.tsx` before wiring; report them. Determinism: the buff is a fixed 1.15 multiplier, not an RNG draw.

**Bounty rule:** on confirming a kill (`combat.tsx:696` `if (newEnemyHealth <= 0)`), if `isApexCreature(creature.name, game.communityShift)`:
1. **Bonus loot roll:** `rollRandomItem(() => game.rng!.random(), 'uncommon', <existing inventory names as excludes>, game.zoneId)` → add via `game.addToInventory({ id: <unique>, name, emoji: getItemDetails(name)?.emoji ?? '❓' })`, guarded by the dup-name convention (`!game.inventory.some(i => i.name === name)`), respecting `INVENTORY_MAX`→`pendingItem` (addToInventory already handles it). Bounty loot floors at `'uncommon'` (a real reward, not a common).
2. **Extra mastery credit:** call `recordCreatureUpdate(player, creature.name, 'defeat', ALL_CREATURE_NAMES, APEX_MASTERY_CREDIT)` INSTEAD OF the existing `honorBonus ? 2 : 1` increment when it's an apex kill — apex credit takes precedence. `APEX_MASTERY_CREDIT = 3`.

**Widen the type:** `recordCreatureUpdate`'s `defeatIncrement: 1 | 2 = 1` → `defeatIncrement: number = 1` (the pure `recordDefeat` already accepts `increment: number`).

- [ ] **Step 1: Write the failing test** — append to `mobile/lib/__tests__/world-shift.test.ts`:

```ts
import { isApexCreature } from '../world-shift';

describe('isApexCreature', () => {
  const community = {
    dayKey: '2026-07-10', zoneId: 'sunken-crypt', apexCreatureId: 'Bog Lurker',
    apexKills: 5, curseNodes: [], architectNodeId: null, architectDeaths: 0,
  };
  it('true only for the exact apex display name', () => {
    expect(isApexCreature('Bog Lurker', community)).toBe(true);
    expect(isApexCreature('Ghoul', community)).toBe(false);
  });
  it('false when community is null or apex unset', () => {
    expect(isApexCreature('Bog Lurker', null)).toBe(false);
    expect(isApexCreature('Bog Lurker', { ...community, apexCreatureId: null })).toBe(false);
  });
});
```

- [ ] **Step 2: Run and verify fail**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest world-shift -t "isApexCreature"`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement**

In `mobile/lib/world-shift.ts`:
```ts
/** Exact display-name match — apexCreatureId holds a creature DISPLAY NAME. */
export function isApexCreature(creatureName: string, community: CommunityShift | null): boolean {
  return !!community && community.apexCreatureId !== null && community.apexCreatureId === creatureName;
}
```

In `mobile/lib/instant.ts`, change `defeatIncrement: 1 | 2 = 1` to `defeatIncrement: number = 1` (signature only; body unchanged — `recordDefeat` already takes `increment: number`).

In `mobile/app/combat.tsx`, inside the `if (newEnemyHealth <= 0)` block, at the existing mastery-write site (~720-724): compute `const apexKill = !!creature && isApexCreature(creature.name, game.communityShift);` then:
- Replace the mastery increment: `const masteryIncrement = apexKill ? 3 : (honorBonus ? 2 : 1);` and pass `masteryIncrement` to `recordCreatureUpdate`.
- Add the bonus loot roll when `apexKill`:
```ts
if (apexKill && game.rng) {
  const excludes = game.inventory.map((i) => i.name);
  const bounty = rollRandomItem(() => game.rng!.random(), 'uncommon', excludes, game.zoneId);
  if (bounty && !game.inventory.some((i) => i.name === bounty)) {
    game.addToInventory({ id: `bounty-${Date.now()}`, name: bounty, emoji: getItemDetails(bounty)?.emoji ?? '❓' });
  }
}
```
Add imports to `combat.tsx` as needed: `isApexCreature` from `../lib/world-shift` (match the file's existing import style/paths), `rollRandomItem` and `getItemDetails` from `../lib/content` (verify these are exported and the path prefix combat.tsx uses). Confirm `game.communityShift`, `game.rng`, `game.inventory`, `game.zoneId`, `game.addToInventory` are all on the context object combat.tsx already reads (it uses `game`/GameContext — verify the exact accessor).

**Determinism note:** the bounty loot roll consumes from `game.rng` (the run's seeded stream) — NOT `Math.random()`. If `game.rng` is unavailable, skip the bounty (do not fall back to `Math.random` for a reward).

- [ ] **Step 4: Run tests and verify pass**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx jest world-shift && npx tsc --noEmit`
Expected: `isApexCreature` tests PASS, tsc exit 0.

- [ ] **Step 5: Manual trace (record in report)**

Confirm: (a) apex identity compared as `creature.name === community.apexCreatureId` (display-name space, verified against `killedBy`/`content.enemy`); (b) loot roll uses `game.rng`, dup-guarded, respects inventory cap; (c) apex mastery increment (3) supersedes honor/base; (d) non-apex kills are byte-unchanged.

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/world-shift.ts mobile/lib/instant.ts mobile/app/combat.tsx mobile/lib/__tests__/world-shift.test.ts
git commit -m "feat(4a): apex bounty — seeded bonus loot + extra mastery on apex kill"
```

---

### Task 8: Surface markers in play.tsx + i18n + docs

**Files:**
- Modify: `mobile/app/play.tsx` (enemy/node card ~704-733; narration ~200-208)
- Modify: `mobile/lib/locales/en.json` (marker strings) — and mirror the SAME keys into the other 6 locale files so the 7 catalogs stay identical (project rule): `mobile/lib/locales/{es,ko,vi,...}.json` (add the keys with English text as fallback per the per-zone English-fallback convention if translation is unavailable).
- Modify: `docs/superpowers/specs/2026-07-04-the-shift-design.md` (§3.2/§3.3 done-notes), `CLAUDE.md`.

**Interfaces:**
- Consumes: `content.isApex/isCursed/isArchitect` (Task 6). Reads `game`'s current node content on the play screen.

- [ ] **Step 1: Add i18n keys to `mobile/lib/locales/en.json`**

```json
"community.apex": "It has grown fat on wanderers.",
"community.cursed": "Many ended here.",
"community.architect": "The walls are thick with the fallen."
```

(Bible voice — second person/understated, no exclamation, no modern words. Verify against the design-system tone rules.)

- [ ] **Step 2: Surface the markers on the node/enemy card in `play.tsx`**

In the combat/enemy card block (~704-733), when `room.content?.isApex`, render a small marker line using `t('community.apex')`; likewise a node-level line for `room.content?.isCursed` (`t('community.cursed')`) and `room.content?.isArchitect` (`t('community.architect')`) in the narration/among the node header. Use existing text components/styles on that screen (match the surrounding markup; do not introduce a new component). Keep it a passive marker — no new interaction.

- [ ] **Step 3: Verify the app typechecks and the marker renders behind real content flags**

Run: `cd /Volumes/FP80/code/dieforward/mobile && npx tsc --noEmit && npx jest`
Expected: tsc exit 0; suite green. (Rendering is verified by inspection — no RN render test harness in this repo.)

- [ ] **Step 4: Update docs**

In `docs/superpowers/specs/2026-07-04-the-shift-design.md` §3.2, add a `**(done, phase 4a July 2026)**` note: server-receipted aggregation cron (`/api/game/shift`), `worldShifts` namespace (deny-by-default perms), A5 integrity (distinct-account, per-account cap, trailing-24h, receipts-only), apex +15% buff + curse/architect **non-UGC** marks merged additively client-side (`fetchCommunityShift`/`mergeShift`, degrades to seeded layer offline). Note the DEFERRED items explicitly: apex bounty (loot/mastery), Architect-wall UGC + Echo Husk phrases (4b behind A2), account-age trust-weighting. Update the §8 line and the E.1/E.3 checkboxes that 4a touches.

In `CLAUDE.md`, extend the Architecture paragraph's world-shift sentence to mention the community layer (`worldShifts` namespace + `/api/game/shift` cron, receipts-only aggregation, additive/degrade-gracefully).

- [ ] **Step 5: Commit**

```bash
git add mobile/app/play.tsx mobile/lib/locales docs/superpowers/specs/2026-07-04-the-shift-design.md CLAUDE.md
git commit -m "feat(4a): surface apex/curse/architect markers + docs (phase 4a done)"
```

---

## Self-Review

**Spec coverage (§3.2 / §3.3 / A5):**
- Nightly aggregation cron + `worldShifts` namespace → Tasks 3, 4. ✅
- A5 (server-receipted only, distinct accounts, medians/thresholds not sums, per-account caps) → Task 2 (aggregator), Task 1 (receipt enrichment enabling receipts-only). ✅ (Note: "medians" in the spec is satisfied by distinct-account **thresholds** rather than sums; no per-run continuous quantity needs a median in 4a — recorded as an intentional reading, not a gap.)
- Apex threat (buff + bounty + marker) → Task 6 (buff), Task 7 (bounty: seeded bonus loot + extra mastery credit), Task 8 (marker). ✅ Bounty now IN SCOPE per user decision.
- Mass-death curse statues (visible warning) → Tasks 6/8 marker. Ambient effect (+1 corpse spawn) folded into the marker for 4a; deeper ambient deferred — noted.
- Architect visitation → 4a marks the node (non-UGC); corpse-wall names/final words DEFERRED to 4b behind A2. ✅ with noted deferral.
- Echo Husk material → DEFERRED to 4b (UGC). ✅ (scope boundary respected — no UGC in `worldShifts`).
- Client fetch/merge, additive, degrade-gracefully → Task 5 (`fetchCommunityShift` returns null on any failure; `mergeShift` additive). ✅

**Placeholder scan:** No TBD/TODO; every code step carries complete code. The one explicit verify-against-reality instruction (Task 6 enemy hp/damage field names) is a named, bounded check with a fallback instruction, not a placeholder.

**Type consistency:** `ReceiptForAgg`/`ZoneDayAggregate`/`buildWorldShiftWrites` names match across Tasks 2/4. `CommunityShift`/`WorldShift`/`mergeShift`/`fetchCommunityShift` match across Tasks 5/6. `RunReceipt.killedBy/nodeId` (Task 1) feed `ReceiptForAgg.killedBy/nodeId` (Task 2) and are populated by the route mapping in Task 4. `worldShifts` field names written in Task 4 (`buildWorldShiftWrites.fields`) match those read in Task 5 GET and mapped in `fetchCommunityShift`.

**Known cross-task verify (surface to the reviewer):** Task 6 depends on the real enemy-stat field names in `rollNodeContent` — the implementer must confirm `enemyHp`/`enemyDamage` (or substitute the real names in helper + test + call together). This is the one ⚠️ item the controller must confirm before marking Task 6 complete.
