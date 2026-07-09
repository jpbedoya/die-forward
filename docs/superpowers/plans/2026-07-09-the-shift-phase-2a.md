# The Shift — Phase 2a Implementation Plan (DAG Core + Depth Projection)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the linear 13-room dungeon into a branching node graph with a canonical depth projection, ship the traversal UI (multi-edge choices with dual-signal hints + peek), the post-run path-trail, node-keyed corpses, and zone-loader locale selection — while fixing three pre-existing bugs found during extraction.

**Architecture:** Zone JSON gains a `graph` layout (nodes with authored `depth`, edges as `next[]`) alongside the legacy `structure`; `generateDungeon` returns a graph whose node content still rolls from existing template pools (zero new prose this phase). GameContext tracks `currentNodeId` + `path[]` and derives `currentRoom` as **the current node's depth** — so the server routes, on-chain `u8`, `highestRoom`, and corpse queries keep their integer semantics unchanged. The graph validator enforces every edge descends exactly one depth level, which is what keeps server validation untouched.

**Tech Stack:** Expo SDK 54 / RN 0.81, TS 5, Jest 29 (`cd mobile && npx jest`), seeded `SeededRng`, InstantDB.

**Spec:** `docs/superpowers/specs/2026-07-04-the-shift-design.md` §4 (map, hint contract, trail), §10 (loader locale selection), Appendix E.3 (depth projection constraint). Prose authoring, side chambers, item gates, Bait verb, string-extraction pass = **Phase 2b, not here.**

## Global Constraints

- All mobile work under `mobile/`; tests `cd mobile && npx jest <file>`; `npx tsc --noEmit` clean before each commit.
- Determinism: all rolls through the run's `SeededRng`; same `(zoneId, seed)` → identical graph + content.
- **Depth projection is canon:** `room`-typed integers everywhere (server, chain, `highestRoom`, Death/Corpse.room, ProgressBar) now mean **1-based node depth**. Every edge goes `depth → depth+1` (validator-enforced this phase).
- New player-facing strings via `t()` + `mobile/lib/locales/en.json` (bible voice, no exclamation marks); the 5 non-en catalogs get the same keys with a `TODO-translate` English value this phase (flagged for the loc pass) — never ship a missing key.
- Backward compatibility: zones without a `graph` field keep working via the legacy linear path until 2b converts them.
- No anchor-program changes; no new server route logic beyond constants/bug fixes.
- Conventional commits; one task per commit.

---

### Task 1: Graph types + validator in zone-loader

**Files:**
- Modify: `mobile/lib/zone-loader.ts` (types near `ZoneStructureRoom` at ~121; `ZoneData` at ~127)
- Test: `mobile/lib/__tests__/zone-graph.test.ts` (create)

**Interfaces:**
- Produces (consumed by Tasks 2-5):

```ts
export interface ZoneNode {
  id: string;                       // unique within zone, e.g. "n01-descent"
  type: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit';
  template: string;
  depth: number;                    // 1-based canonical depth
  next: string[];                   // node ids; empty ONLY on the exit node
  boss?: boolean;
}
export interface ZoneGraphLayout { start: string; nodes: ZoneNode[]; }
// ZoneData gains: graph?: ZoneGraphLayout;  (dungeonLayout stays for legacy zones)
export function validateZoneGraph(g: ZoneGraphLayout): string[]; // [] = valid; else human-readable errors
```

Validator rules (each returns a named error): unique ids; `start` exists at depth 1; exactly one `exit`-type node and it has `next: []`; every non-exit node has ≥1 edge; all edge targets exist; **every edge satisfies `target.depth === source.depth + 1`**; every node reachable from start; exit reachable from every node; exactly one `boss: true`.

- [ ] **Step 1: Failing tests**

```ts
// mobile/lib/__tests__/zone-graph.test.ts
import { validateZoneGraph, ZoneGraphLayout } from '../zone-loader';

const tiny = (over: Partial<ZoneGraphLayout> = {}): ZoneGraphLayout => ({
  start: 'a',
  nodes: [
    { id: 'a', type: 'explore', template: 'descent', depth: 1, next: ['b1', 'b2'] },
    { id: 'b1', type: 'combat', template: 'ambush', depth: 2, next: ['c'], boss: true },
    { id: 'b2', type: 'cache', template: 'alcove', depth: 2, next: ['c'] },
    { id: 'c', type: 'exit', template: 'zone-exit', depth: 3, next: [] },
  ],
  ...over,
});

describe('validateZoneGraph', () => {
  it('accepts a well-formed graph', () => expect(validateZoneGraph(tiny())).toEqual([]));
  it('rejects an edge that skips a depth', () => {
    const g = tiny(); g.nodes[0].next = ['c'];
    expect(validateZoneGraph(g).some(e => e.includes('depth'))).toBe(true);
  });
  it('rejects unreachable nodes', () => {
    const g = tiny(); g.nodes[0].next = ['b1'];
    expect(validateZoneGraph(g).some(e => e.includes('unreachable'))).toBe(true);
  });
  it('rejects a dead-end non-exit node', () => {
    const g = tiny(); g.nodes[1].next = [];
    expect(validateZoneGraph(g).length).toBeGreaterThan(0);
  });
  it('requires exactly one boss', () => {
    const g = tiny(); delete g.nodes[1].boss;
    expect(validateZoneGraph(g).some(e => e.includes('boss'))).toBe(true);
  });
});
```

- [ ] **Step 2:** `npx jest zone-graph` → FAIL (exports missing).
- [ ] **Step 3:** Implement types + `validateZoneGraph` (BFS from start for reachability; reverse-BFS from exit; simple pass per rule).
- [ ] **Step 4:** `npx jest zone-graph` → PASS; full suite green.
- [ ] **Step 5:** Commit `feat: zone graph schema + validator`.

---

### Task 2: Sunken Crypt graph (mechanical, existing templates only)

**Files:**
- Modify: `mobile/lib/zones/sunken-crypt.json` (add `graph` alongside `dungeonLayout`)
- Test: extend `mobile/lib/__tests__/zone-graph.test.ts`

**Interfaces:** consumes Task 1's schema. **No new prose** — every node's `template` must be one of the templates already present in this zone's `rooms` pools (descent, ambush, fresh, confrontation, flooded, guardian, alcove, territorial, chamber, heroic, pursuit, arena, zone-exit).

Design the graph as ~20 nodes / depth 1–13, two lanes through the middle band, e.g.:

```
d1  n01 explore/descent
d2  n02 combat/ambush            | n03 explore/flooded
d3  n04 corpse/fresh             | n05 combat/confrontation
d4  n06 combat/confrontation     | n07 cache/alcove
d5  n08 explore/flooded          | n09 combat/territorial
d6  n10 combat/guardian          (lanes converge)
d7  n11 cache/alcove             | n12 corpse/heroic
d8  n13 combat/territorial       | n14 explore/chamber
d9  n15 explore/chamber          | n16 combat/pursuit
d10 n17 corpse/heroic            | n18 combat/ambush
d11 n19 combat/pursuit           (converge)
d12 n20 combat/arena (boss)
d13 n21 exit/zone-exit
```

Edges: each node at depth d links to 1–2 nodes at depth d+1 (author them so both lanes stay reachable and cross-links exist at d4→d5 and d8→d9). Keep the legacy `dungeonLayout` untouched.

- [ ] **Step 1: Failing test** — add to zone-graph.test.ts:

```ts
import { loadZone } from '../zone-loader';
it('sunken-crypt ships a valid graph using only existing templates', () => {
  const zone = loadZone('sunken-crypt');
  expect(zone.graph).toBeDefined();
  expect(validateZoneGraph(zone.graph!)).toEqual([]);
  const known = new Set(Object.values(zone.rooms!).flat().map(t => t.template).concat('zone-exit'));
  for (const n of zone.graph!.nodes) expect(known.has(n.template)).toBe(true);
  expect(zone.graph!.nodes.length).toBeGreaterThanOrEqual(18);
  expect(Math.max(...zone.graph!.nodes.map(n => n.depth))).toBe(13);
});
```

(Adjust the `known` derivation to the actual `ZoneRooms` shape — templates are the `template` field of each `ZoneRoomTemplate`.)

- [ ] **Step 2:** FAIL (no graph). **Step 3:** author the JSON graph. **Step 4:** PASS + full suite. **Step 5:** Commit `feat: sunken-crypt branching graph (existing templates)`.

**NOTE for the localized packs:** the graph is structural (ids/templates/depths — no prose), but the 6 localized `sunken-crypt.<locale>.json` files must receive the IDENTICAL `graph` object so structure parity holds. Add it to all 6 in this task and extend the existing parity check in the test.

---

### Task 3: generateDungeon returns a graph

**Files:**
- Modify: `mobile/lib/content.ts` (`generateDungeon` at ~1061, `DungeonRoom` at ~159)
- Test: `mobile/lib/__tests__/dungeon.test.ts` (update — several assertions constrain the old flat shape)

**Interfaces:**
- Produces (consumed by Tasks 4-7):

```ts
export interface DungeonNode extends DungeonRoom { id: string; depth: number; next: string[]; }
export interface DungeonGraph { startId: string; nodes: Record<string, DungeonNode>; maxDepth: number; }
export function generateDungeonGraph(zoneId: string, rng: SeededRng): DungeonGraph;
```

Behavior: if `zone.graph` exists, roll content per node exactly as today (`getZoneRoom(zone, node.type, rng, node.template, i)`; combat nodes get `getZoneCreatureSeeded(zone, tierFor(node.depth, zone), rng, BESTIARY)`; boss node gets the zone boss). Tier comes from `getZoneDepth(zone, node.depth)`. If no `zone.graph`, synthesize a linear graph from `dungeonLayout.structure` + appended exit (ids `lin-1..lin-N`, depths 1..N, single chain) — legacy zones work unmodified. Content roll order must be deterministic: iterate `zone.graph.nodes` in array order.

Keep `generateDungeon` as a thin wrapper returning the graph's single-chain flattening ONLY if some caller still needs it after Task 4 — expectation: delete it; update `generateRandomDungeon` to the graph API or delete if unused (grep callers first; report).

- [ ] **Step 1: Failing tests** — rewrite `dungeon.test.ts`'s shape assertions:

```ts
it('is deterministic — same zone + seed → identical graph', () => {
  expect(generateDungeonGraph('sunken-crypt', createRunRng('s1')))
    .toEqual(generateDungeonGraph('sunken-crypt', createRunRng('s1')));
});
it('legacy zones synthesize a linear graph', () => {
  const g = generateDungeonGraph('ashen-crypts', createRunRng('s1'));
  const n = Object.values(g.nodes);
  expect(n.every(x => x.next.length <= 1)).toBe(true);
  expect(n.filter(x => x.type === 'exit')).toHaveLength(1);
});
it('graph zones: every combat node has an enemy; exactly one boss; maxDepth 13', () => {
  const g = generateDungeonGraph('sunken-crypt', createRunRng('s2'));
  const n = Object.values(g.nodes);
  for (const c of n.filter(x => x.type === 'combat')) expect(c.content.enemy).toBeTruthy();
  expect(n.filter(x => x.boss)).toHaveLength(1);
  expect(g.maxDepth).toBe(13);
});
```

Keep/port the existing determinism + every-zone-valid loops to the graph API.

- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** full suite (existing dungeon tests updated, no others regress) + tsc. **Step 5:** Commit `feat: dungeon generation produces node graphs (legacy zones linearized)`.

---

### Task 4: GameContext — node traversal + depth projection

**Files:**
- Modify: `mobile/lib/GameContext.tsx` (state ~73-81 + initialState ~204-212; `startGame` dungeon call ~843; `advance` ~876-917; context type ~115-116)
- Test: `mobile/lib/__tests__/traversal.test.ts` (create; pure helpers)

**Interfaces:**
- State becomes: `graph: DungeonGraph | null; currentNodeId: string | null; path: string[];` (KEEP `currentRoom: number` — now always `= depth of current node`, maintained on every move; keep `dungeon: []` removed — grep consumers first, Tasks 5-6 migrate them).
- `advance(toNodeId?: string): Promise<boolean>` — validates `toNodeId ∈ current.next` (default `next[0]`); appends to `path`; sets `currentNodeId`, `currentRoom = nextNode.depth`; server sync still sends the 1-based depth (`api.advanceRoom(token, currentDepth)` semantics unchanged because edges are depth+1); **bug fix:** `updateHighestRoom(authId, nextNode.depth)` — 1-based, unifying with the web routes' 1-based writes.
- Produces pure helper in `mobile/lib/traversal.ts` (new): `nextChoices(graph, nodeId): DungeonNode[]`, `declinedBranches(graph, path): { atDepth: number; nodeId: string }[]` (for the trail screen).

- [ ] **Step 1: Failing tests** (pure module):

```ts
// mobile/lib/__tests__/traversal.test.ts
import { nextChoices, declinedBranches } from '../traversal';
import { generateDungeonGraph } from '../content';
import { createRunRng } from '../seeded-random';

const g = generateDungeonGraph('sunken-crypt', createRunRng('t1'));
it('nextChoices returns the target nodes of the current node', () => {
  const c = nextChoices(g, g.startId);
  expect(c.length).toBeGreaterThanOrEqual(1);
  for (const n of c) expect(n.depth).toBe(g.nodes[g.startId].depth + 1);
});
it('declinedBranches lists siblings not taken', () => {
  const first = g.nodes[g.startId].next;
  if (first.length >= 2) {
    const path = [g.startId, first[0]];
    expect(declinedBranches(g, path).map(d => d.nodeId)).toContain(first[1]);
  }
});
```

- [ ] **Step 2:** FAIL. **Step 3:** implement `traversal.ts`; rewire GameContext (startGame: `generateDungeonGraph`, `currentNodeId = graph.startId`, `path = [startId]`, `currentRoom = 1`); advance per interface above. **Step 4:** full suite + tsc. **Step 5:** Commit `feat: node traversal in GameContext with canonical depth projection`.

---

### Task 5: play.tsx — branch choices with dual-signal hints + peek

**Files:**
- Modify: `mobile/app/play.tsx` (room derivation ~87-104; `getOptions` ~425-467; explore-tertiary peek ~249-284; ProgressBar ~499; `getDepthForRoom` import → zone-aware), `mobile/lib/locales/en.json` (+5 other catalogs with TODO-translate values)
- Test: `mobile/lib/__tests__/hints.test.ts` (pure hint builder)

**Interfaces:**
- New pure helper in `traversal.ts`: `edgeHint(node: DungeonNode, rng: SeededRng): { sense: string; tag: string }` — dual-signal per spec §4.2: `sense` = one line drawn from a per-type i18n pool (`hint.<type>.1..3`, bible voice, e.g. `"hint.combat.1": "Something waits in the dark ahead."`), `tag` = legible marker per type+risk: combat `[DANGER]`, boss `[DEATH]`, cache `[RESPITE]`, corpse `[THE FALLEN]`, explore `[PASSAGE]`, exit `[LIGHT]`.
- Room derivation: `const node = game.graph?.nodes[game.currentNodeId]`; `depth = getZoneDepth(loadZone(game.zoneId), node.depth)` — **bug fix: stop using hardcoded `getDepthForRoom`** (sunken-crypt values) for non-sunken zones.
- End-of-room advancement: when the current node has >1 next, the "continue" action renders one button per edge: `{sense} {tag}` text, action `advance:<nodeId>`; single-edge nodes keep today's single continue. Peek (`explore-tertiary`) upgrades: reveals the CONCRETE type name of one chosen edge (replace the `dungeon[currentRoom+1]` read with `nextChoices`).
- ProgressBar: `current={node.depth} total={game.graph.maxDepth}`.

- [ ] **Step 1: Failing test** (hint builder):

```ts
import { edgeHint } from '../traversal';
it('every node type yields a sense line and a tag', () => {
  const g = generateDungeonGraph('sunken-crypt', createRunRng('h1'));
  for (const n of Object.values(g.nodes)) {
    const h = edgeHint(n, createRunRng('h2'));
    expect(h.sense.length).toBeGreaterThan(0);
    expect(h.tag).toMatch(/^\[.+\]$/);
  }
});
it('hints are deterministic per node+seed', () => {
  const g = generateDungeonGraph('sunken-crypt', createRunRng('h1'));
  const n = g.nodes[g.startId];
  expect(edgeHint(n, createRunRng('x'))).toEqual(edgeHint(n, createRunRng('x')));
});
```

- [ ] **Step 2:** FAIL. **Step 3:** implement hint pools in en.json (bible voice; add same keys to ja/ko/zh-TW/vi/pt-BR/es catalogs with English TODO-translate values) + `edgeHint` + play.tsx wiring. **Step 4:** full suite + tsc; manual: `npm run start`, run sunken-crypt to a fork, verify two hint buttons render and peek names one side's type. **Step 5:** Commit `feat: branch choices with dual-signal hints; zone-aware depth display`.

---

### Task 6: combat.tsx consumers + boss check by node

**Files:**
- Modify: `mobile/app/combat.tsx` (~167-168 depth lookup; ~658-659 boss check; ~767 ProgressBar)

Changes: navigation param gains `nodeId`; boss/zone-clear check reads `game.graph.nodes[nodeId]?.boss` (replace `game.dungeon[roomNumber - 1]`); `getDepthForRoom` → zone-aware `getZoneDepth(loadZone(game.zoneId), depth)`; ProgressBar `total={game.graph?.maxDepth ?? 13}` (kills the hardcoded 13). play.tsx's combat `router.push` passes `nodeId` alongside `roomNum`.

- [ ] **Step 1:** implement (wiring only; no new logic). **Step 2:** full suite + tsc; manual boss-fight spot check. **Step 3:** Commit `feat: combat consumes node graph (boss by node id, real max depth)`.

---

### Task 7: Path-trail screen (v1-blocking spec item)

**Files:**
- Modify: `mobile/app/death.tsx`, `mobile/app/victory.tsx` (add a trail block), `mobile/lib/locales/en.json` (+ other catalogs)
- Test: extend `mobile/lib/__tests__/traversal.test.ts` for `trailRows`

**Interfaces:**
- New pure helper: `trailRows(graph, path): { depth: number; taken: { type: string }; declined: { type: string }[] }[]` in `traversal.ts`.
- Render on death + victory screens: one monospace row per depth in ASCII, taken node marked, declined branches dimmed, e.g. `d4  ▸ COMBAT   ▹ cache (declined)` with a header `t('trail.header')` = "THE PATH YOU WALKED". Style per existing crypt palette (amber taken / bone dimmed).

- [ ] **Step 1: Failing test:** `trailRows` returns one row per traversed depth, `declined` lists sibling types, deterministic ordering.
- [ ] **Step 2-3:** implement helper + both screens. **Step 4:** suite + tsc; manual: die mid-run, verify the trail shows the fork you didn't take. **Step 5:** Commit `feat: post-run path trail on death and victory screens`.

---

### Task 8: Node-keyed corpses + corpse query bug fix

**Files:**
- Modify: `mobile/lib/instant.ts` (`Death`/`Corpse` interfaces ~27-60; `recordDeath` ~168-214; `useCorpsesForRoom` ~542-560), `mobile/app/play.tsx:104` (call site), death recording call site in GameContext/death flow (grep `recordDeath(`)
- Test: `mobile/lib/__tests__/corpse-adjacency.test.ts` (pure filter helper)

**Interfaces:**
- `Death` and `Corpse` gain `nodeId?: string` (optional — legacy rows lack it); `room` continues to hold the 1-based **depth**.
- `recordDeath` accepts and writes `nodeId`; caller passes `currentNodeId` and `node.depth` as `room`.
- `useCorpsesForRoom(zoneId: string, depth: number, nodeId?: string)`: **bug fix — call it with `game.zoneId`, not `depth.name`** (today's call `useCorpsesForRoom(depth.name, roomNumber)` can never match rows written with zone ids). Adjacency: same `nodeId` first (exact-place corpses), else `room` within `depth ± 1` (unchanged integer semantics). Extract the filter into a pure exported `filterNearbyCorpses(corpses, depth, nodeId?)` for testing.

- [ ] **Step 1: Failing tests** for `filterNearbyCorpses`: exact-node corpse included first; depth±1 included; depth±2 excluded; legacy rows (no nodeId) still match by depth.
- [ ] **Step 2:** FAIL. **Step 3:** implement + fix the play.tsx call site + thread nodeId through recordDeath's caller. **Step 4:** suite + tsc. **Step 5:** Commit `fix: corpse discovery queries real zone id; corpses keyed to nodes`.

---

### Task 9: Server constants + highestRoom unification sweep

**Files:**
- Modify: `src/app/api/session/victory/route.ts` (~63-64 fallback 7 → 13; ~227 fallback 12 → session maxRooms), verify `start` (13) / `advance` (cap 20) / `death` (13) constants still hold for depth semantics — they do, document in comments
- Test: none runnable server-side in repo (no web tests yet) — verification is a careful read + the client integration path

Changes: unify `maxRooms` fallbacks to 13; add a one-line comment at each route's room validation: `// 'room' = canonical 1-based node depth (see spec §4.1); edges always descend one depth, so linear validation holds`. Client side of the unification landed in Task 4 (1-based `updateHighestRoom`); grep the repo for any remaining 0-based `highestRoom` writes (`updateHighestRoom(` call sites) and fix.

- [ ] **Step 1:** implement + grep sweep (list all call sites in the report). **Step 2:** mobile suite + tsc (client fix must not regress). **Step 3:** Commit `fix: unify maxRooms fallbacks and 1-based highestRoom depth semantics`.

---

### Task 10: zone-loader locale selection

**Files:**
- Modify: `mobile/lib/zone-loader.ts` (imports ~18-22, ZONE_MAP ~157-163), `mobile/lib/i18n.ts` (locale getter already exists via `setLocale` — export `getLocale()`)
- Test: `mobile/lib/__tests__/zone-locale.test.ts`

**Interfaces:**
- Static per-locale imports (Metro requires static) for all 5 zones × {ja, ko, zh-TW, vi, pt-BR, es} that exist on disk; a `ZONE_LOCALE_MAP: Record<locale, Record<zoneId, ZoneData>>`. `loadZone(zoneId)` resolves `ZONE_LOCALE_MAP[getLocale()]?.[zoneId] ?? ZONE_MAP[zoneId]` (per-zone English fallback — vi is missing void-beyond's locale file until the vi pass completes: **do not import missing files; omit map entries instead**).
- NOTE: this adds ~1.4MB of JSON to the bundle. Acceptable now; leave a `// TODO: asset-based lazy loading` comment and a line in the report for the phase-3 perf review.

- [ ] **Step 1: Failing test:**

```ts
import { loadZone } from '../zone-loader';
import { setLocale } from '../i18n';
it('loadZone returns localized pack when locale set, English otherwise', () => {
  setLocale('ja');
  const ja = loadZone('sunken-crypt');
  setLocale('en');
  const en = loadZone('sunken-crypt');
  expect(ja.lore).not.toEqual(en.lore);
  expect(ja.graph).toEqual(en.graph);           // structure identical (Task 2 parity)
  expect(ja.dungeonLayout).toEqual(en.dungeonLayout);
});
it('missing locale file falls back to English per zone', () => {
  setLocale('vi');
  expect(loadZone('void-beyond').lore).toEqual((setLocale('en'), loadZone('void-beyond').lore));
});
```

(Fix the second test's sequencing into two clean statements.)

- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** suite + tsc; confirm `generateDungeonGraph` determinism holds across locales (graph is structural). **Step 5:** Commit `feat: zone-loader locale selection with per-zone English fallback`.

---

### Task 11: Docs pass

**Files:**
- Modify: `CLAUDE.md` (architecture line: dungeon is a node graph with depth projection), `docs/CONTENT_BIBLE.md` (room-structure note: zones define branching graphs; template pools unchanged), `docs/superpowers/specs/2026-07-04-the-shift-design.md` (tick §4.1/§4.2 items delivered: graph schema, depth projection, hint contract v1, trail screen, node-keyed corpses, loader locale selection; note prose authoring/side chambers/Bait → 2b), `docs/localization/RETRY_MANIFEST.md` (note: hint/trail catalog keys added with TODO-translate values in 5 locales — add to the vi/loc pass list)

- [ ] **Step 1:** make the edits. **Step 2:** Commit `docs: phase 2a reality — graph core, projection, trail, locale loading`.

---

## Self-Review

- **Spec coverage:** §4.1 graph structure (T1-3), depth projection + highestRoom redefinition (T4, T9), §4.2 hint contract (T5) + trail v1-blocking (T7), node-id on Death/Corpse (T8), §10 loader locale selection (T10). Deliberately deferred to 2b: 12-signature/15-transit authoring, side chambers + item gates, Bait verb, ~277-literal extraction, bible revision — the plan header says so.
- **Placeholder scan:** Task 2's `known`-templates derivation and Task 10's second test are flagged in-place for the implementer to adapt — deliberate (exact `ZoneRooms` iteration shape varies); tests enforce the outcome either way. No TODO/TBD elsewhere.
- **Type consistency:** `DungeonNode/DungeonGraph` (T3) consumed by T4-T8 with matching names; `nextChoices/declinedBranches/edgeHint/trailRows/filterNearbyCorpses` all live in `traversal.ts` (T4/T5/T7/T8 consistent); `advance(toNodeId?)` matches play.tsx's `advance:<nodeId>` action wiring.
- **Risk note for executors:** Task 4 is the highest-risk task (GameContext rewiring); its reviewer should get the same staleness-bug checklist as phase 1's Task 10 (functional updates, no render-closure reads).
