# The Shift — Phase 2b Implementation Plan (Side Chambers, Zone Graphs, Bait, Extraction)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the 2a graph core with side chambers + item gates, convert the remaining 4 zones to branching graphs, add the Bait combat verb, run the screen-string extraction pass, and revise the stale bible sections.

**Architecture:** Side chambers are same-depth annex nodes (`side: true`, optional `gate`) entered via a relaxed validator rule and traversed **client-only** — `advance` to a side node skips the server sync and `updateHighestRoom` (depth unchanged), so the server's linear increment stays valid: A(d)→S(d, no sync)→C(d+1) sends `fromRoom=d` exactly as A→C would. Item gates wire the long-dead effect text of Pale Coin ("offered for passage"), Ancient Scroll (deciphers), and Bone Dust ("reveals hidden paths") through the `getItemEffects`/inventory choke points. Zone graphs for fragment zones reuse fragment pools (no new prose); bespoke signature-node prose remains a future content drop, authored in pack format.

**Tech Stack:** unchanged (Expo/RN, TS5, Jest from `mobile/`, seeded rng, InstantDB).

**Spec:** `docs/superpowers/specs/2026-07-04-the-shift-design.md` §4.1 (side chambers, item gates), §6 (Bait, F3), §10 track 1 (extraction), Appendix C #10 (bible revision).

## Global Constraints

- Everything from the 2a plan's Global Constraints carries over verbatim (determinism; `t()` + all 7 catalogs for new strings, English placeholder values in non-en; conventional commits; full suite + `npx tsc --noEmit` per task; baseline 241 tests).
- **Depth semantics:** side-node moves NEVER touch the server, `highestRoom`, or on-chain values. Descent edges stay strictly depth+1.
- Graph parity: any zone-JSON graph must be byte-identical across every existing locale file of that zone (void-beyond has no `.vi.json` — en + 5 locales there; all others 7 files).
- Combat math/pure logic in lib modules; screens wire only.

---

### Task 1: Schema + validator: side nodes and gates

**Files:** Modify `mobile/lib/zone-loader.ts` (ZoneNode ~166, validateZoneGraph ~205-319). Test: extend `mobile/lib/__tests__/zone-graph.test.ts`.

**Interfaces (produces):**
```ts
export interface ZoneGate { item: string; consumes: boolean; }   // item = exact ITEM_DETAILS key
export interface ZoneNode {
  // ...existing fields...
  side?: boolean;          // same-depth annex; entered from a sibling-depth node
  gate?: ZoneGate;         // only valid on side nodes
}
```
Validator rule changes (each with its own error string):
- Rule 5 relaxed: an edge is valid iff `target.depth === node.depth + 1` OR (`target.side === true` AND `target.depth === node.depth`). A side node's OWN edges must all be depth+1 (side nodes cannot chain into other side nodes; error "side node chains").
- New rules: side nodes are never `exit`/`boss`/`start` (error each); `gate` only allowed when `side` is true; a side node must not be the only route to the exit (i.e., removing all side nodes must leave the graph valid — cheapest check: the reachability BFS runs twice, once ignoring side nodes, and rules 6/7 must pass on the descent-only subgraph).

- [ ] **Step 1: Failing tests** — extend zone-graph.test.ts with a fixture containing one side node:
```ts
const withSide = (): ZoneGraphLayout => ({
  start: 'a',
  nodes: [
    { id: 'a', type: 'explore', template: 'descent', depth: 1, next: ['b', 's'] },
    { id: 's', type: 'cache', template: 'alcove', depth: 1, next: ['b'], side: true, gate: { item: 'Pale Coin', consumes: true } },
    { id: 'b', type: 'combat', template: 'ambush', depth: 2, next: ['c'], boss: true },
    { id: 'c', type: 'exit', template: 'zone-exit', depth: 3, next: [] },
  ],
});
it('accepts a gated same-depth side node', () => expect(validateZoneGraph(withSide())).toEqual([]));
it('rejects a same-depth edge into a non-side node', () => { const g = withSide(); delete g.nodes[1].side; expect(validateZoneGraph(g).length).toBeGreaterThan(0); });
it('rejects side node chaining into another side node', /* s.next -> another side at depth 1 */);
it('rejects gate on a non-side node', /* gate on node a */);
it('rejects a graph whose only path to exit runs through a side node', /* a.next=['s'] only */);
```
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** full suite + tsc → **Step 5:** commit `feat: side-chamber nodes and item gates in zone graph schema`.

---

### Task 2: Traversal semantics for side nodes (HIGH RISK — GameContext)

**Files:** Modify `mobile/lib/GameContext.tsx` (advance), `mobile/lib/traversal.ts`. Test: extend `mobile/lib/__tests__/traversal.test.ts`.

**Binding behavior:**
- `advance(toNodeId)` when the target has `side: true`: move as normal (path append, currentNodeId, `currentRoom` set to target.depth — unchanged value) BUT skip `api.advanceRoom` AND skip `updateHighestRoom` entirely. Non-side moves unchanged. Trace comment in code: side detours are invisible to the server; the next descent edge sends the same pre-move depth the server already holds.
- Returning from a side node: its `next` edges are ordinary depth+1 descents — no special casing.
- New pure helpers in `traversal.ts` (consumed by Task 3):
```ts
export function gateStatus(node: DungeonNode, inventory: { name: string }[]): 'open' | 'locked' | 'ungated';
export function isSideNode(node: DungeonNode): boolean;   // DungeonNode gains side?/gate? passthrough in generateDungeonGraph (content.ts — copy the fields from ZoneNode)
```
- `generateDungeonGraph` (content.ts): copy `side` and `gate` from ZoneNode onto DungeonNode.

- [ ] **Step 1: Failing tests** — `gateStatus` open/locked/ungated cases; a generated graph containing a side node carries `side`/`gate` through; (GameContext behavior is not purely testable — the reviewer checklist covers it; document the skip-sync decision in the task report with the trace).
- [ ] **Step 2-4:** standard TDD + full suite + tsc. **Step 5:** commit `feat: side-node traversal skips server sync; gate status helper`.

**Reviewer checklist for this task (controller: paste into the review dispatch):** stale-closure patterns; advance's dep array; the skip-sync branch cannot desync server room (trace A(d)→S(d)→C(d+1) payloads); highestRoom untouched by side moves; nodeResolved clearing still happens on side moves.

---

### Task 3: Side-chamber UI + item-gate wiring in play.tsx

**Files:** Modify `mobile/app/play.tsx` (branchOptions ~108-117, handleAction advance parsing ~214), `mobile/lib/content.ts` (`ItemEffects` + `getItemEffects`), `mobile/lib/locales/*.json` (all 7). Test: `mobile/lib/__tests__/gate-ui.test.ts` for any pure helper extracted.

**Binding behavior:**
- Branch buttons for side-node edges render with the side/gate treatment: ungated side → hint + `t('hint.tag.side')` = `[ASIDE]`; gated+open → `[UNSEALED]`, choosing it consumes the gate item when `gate.consumes` (remove from inventory + narrative line `t('gate.opened', {item})` = "The {item} is accepted. The way opens."); gated+locked → button disabled with `t('gate.locked', {item})` = "Sealed. Something is owed." (do NOT name the required item when locked — the item's own effect text is the clue; bible: imply, don't explain).
- **Bone Dust wiring (finally):** `ItemEffects.revealPaths?: boolean` set when inventory has Bone Dust (`getItemEffects` case). At a multi-edge node with `revealPaths`, branch buttons show the CONCRETE type tag (`t('hint.tag.<type>')` replaced by `t('trail.type.<type>')` semantics — reuse existing keys) instead of the vague tag, and Bone Dust is consumed on first such reveal (remove + line `t('item.bonedust.used')` = "The dust settles. You see the paths as the dead saw them."). Update Bone Dust's `effect` text if needed to match reality.
- Consumption goes through the existing inventory-update path in GameContext (find how items are removed on use — mirror it; no new state mechanics).

- [ ] Steps: TDD any extracted pure helper (e.g. `resolveBranchDisplay(node, inventory, revealPaths)`), wire UI, add keys to all 7 catalogs, full suite + tsc, commit `feat: gated side chambers and Bone Dust path revelation`.

---

### Task 4: Sunken Crypt gains 2 side chambers (7-file parity)

**Files:** all 7 `mobile/lib/zones/sunken-crypt*.json`. Test: extend zone-graph.test.ts.

Add exactly 2 side nodes to the existing 21-node graph, existing templates only: (a) `s01-ferry` — cache/alcove at depth 4, `gate: { item: 'Pale Coin', consumes: true }`, entered from one depth-4 node, exits to depth-5 nodes; (b) `s02-inscription` — explore/chamber at depth 8, `gate: { item: 'Ancient Scroll', consumes: false }`. Both lanes must remain valid without them (validator's descent-only rule). Identical graph in all 7 files; test asserts 23 nodes, exactly 2 side, parity, validator passes.

- [ ] TDD → author → suite+tsc → commit `feat: sunken-crypt side chambers (ferry crossing, inscription door)`.

---

### Task 5: Ashen Crypts graph (fragment zone pattern-setter)

**Files:** `mobile/lib/zones/ashen-crypts*.json` (7 files). Test: extend zone-graph.test.ts.

Build ~18-20 node two-lane graph (depths 1-13: 12 structure slots → reshuffled into lanes + exit at 13) using the zone's existing structure templates (husk-field, priest-ritual, hesitator, ruins, weaver-den, sealed-alcove, congregation-press, ashfield, scorched-charge, fighter, pyre-chamber boss at depth 12) — fragment zones assemble prose by TYPE so template names are free to reuse across nodes. Cross-links at two depths; 1 side chamber (cache/sealed-alcove, `gate: { item: 'Pale Coin', consumes: true }`). Boss = pyre-chamber d12, exit zone-exit d13. Keep `dungeonLayout` untouched. Test: valid graph, ≥17 nodes, 1 side node, maxDepth 13, 7-file parity.

- [ ] TDD → author → suite+tsc → commit `feat: ashen-crypts branching graph with side chamber`.

---

### Task 6: Frozen Gallery + Living Tomb graphs

**Files:** `frozen-gallery*.json` (7 files), `living-tomb*.json` (7 files). Test: extend zone-graph.test.ts.

Same recipe as Task 5 per zone (~18 nodes, two lanes, cross-links, 1 side chamber each — frozen: corpse/preserved side node gated `{ item: 'Ancient Scroll', consumes: false }`; living-tomb: cache side node ungated (its zone identity is claustrophobic — a free breathing room reads right). Bosses: sovereign d12, living-tomb's boss combat d12. Tests: both valid, parity across each zone's 7 files.

- [ ] TDD → author → suite+tsc → commit `feat: frozen-gallery and living-tomb branching graphs`.

---

### Task 7: Void Beyond graph (6-file parity — no vi pack)

**Files:** `void-beyond*.json` (en + es/ja/ko/pt-BR/zh-TW = 6 files). Test: extend zone-graph.test.ts.

Same recipe (~18 nodes; templates edge, edge-wrong, probability-shade, clarity-loss, unfinished, void-architect, stable-pocket, echo-room, deep-void, echo-loop, echo-double, unwritten boss d12). 1 side chamber: explore/echo-room side node, ungated (the Void misleads — an ASIDE that costs time fits the zone). Test: parity across the 6 existing files; assert the loader's vi fallback still works (zone-locale test already covers).

- [ ] TDD → author → suite+tsc → commit `feat: void-beyond branching graph`.

---

### Task 8: Bait combat verb

**Files:** Modify `mobile/lib/creature-rules.ts`, `mobile/lib/instant.ts` (settings field), `mobile/app/combat.tsx`, `mobile/lib/locales/*.json` (7). Test: extend `mobile/lib/__tests__/creature-rules.test.ts`.

**Interfaces (produces):**
```ts
// creature-rules.ts — pure
export interface BaitResult {
  forcedIntent: 'AGGRESSIVE';        // enemy commits next turn, intent revealed
  counterBonus: number;              // added to player's crit chance next strike (this fight turn)
  consumedSignature: boolean;        // one-shot signatures (blink/pounce/reform trigger-arm) spent harmlessly
  state: CombatRuleState;
}
export function onBait(rule: SignatureRule | undefined, s: CombatRuleState): BaitResult;
```
Semantics (binding): Bait costs `settings.baitCost` (new field, default 1; add to interface ~671 + defaults ~708 + merge ~750 in instant.ts). Enemy's next intent is forced to AGGRESSIVE and shown to the player; player's next Strike this fight gets `+counterBonus` crit (0.15). Per-rule extras: `blink` → sets `blinkUsed: true` (evade spent); `pounce` → the pounce is provoked NOW as the enemy's committed attack (no free extra hit later this fight — set a `pounceSpent` flag in CombatRuleState, `itemUseTriggersAttack` returns false when spent); `reform` unaffected (Bait can't pre-spend death effects); undefined rule → still forces AGGRESSIVE + bonus (Bait is universally useful but spends a turn + stamina). Baiting does NOT count as striking for chant (`struckLastTurn` unchanged by bait itself).

Combat wiring: add `{ id: 'bait', text: 'Bait', emoji: '🎯', desc: 'Provoke its nature' }` to BASE_COMBAT_OPTIONS with `cost: settings.baitCost`; new `case 'bait':` in the handleAction switch — spend stamina, call `onBait`, set the forced intent + a `baitCounterRef` consumed by the next strike's crit calc, narrative `t('combat.bait')` = "You give it what it wants. It commits." (all 7 catalogs). The enemy still attacks this turn per the forced intent — bait is not a free turn (route damage through the normal enemy-hit path with the AGGRESSIVE intent effects).

- [ ] TDD onBait per-rule cases (incl. pounceSpent gating of itemUseTriggersAttack) → implement → wire → full suite + tsc → commit `feat: Bait verb — provoke the signature on your terms`.

---

### Task 9: Screen-string extraction pass

**Files:** Modify `mobile/app/{codex,stake,leaderboard,index,feed,bestiary,zone-select}.tsx` (+ any missed literals in the 4 already-t() screens ONLY if trivially adjacent), all 7 catalogs, `docs/localization/RETRY_MANIFEST.md`. Skip `music-test.tsx` (dev screen) — note in report.

Mechanical: every player-facing JSX literal + string prop (placeholders, titles, share text) → `t('<screen>.<slug>')` keys, namespaced per screen (`stake.title`, `codex.section.lore`, …). English values in all 7 catalogs. **Do NOT key:** debug text, dev screens, identifiers, the `[DEVNET]` badge (keep literal — it's a build marker). Interpolations use named placeholders (no concatenation). Manifest gains one line: full catalog translation debt now enumerable by diffing non-en catalogs against en.

Verification: full suite + tsc + a grep sweep in the report showing remaining literals per screen (target: display literals ~0 outside music-test; quote-prop false positives listed).

- [ ] Implement → suite+tsc → commit `feat: screen strings through i18n catalog (extraction pass)`.

---

### Task 10: Minor backlog sweep

**Files:** `mobile/app/feed.tsx` (zone-aware depth labels via `getZoneDepth(loadZone(death.zone), death.room)` with a safe fallback for legacy display-name zone values — wrap loadZone in try/catch or existence check, fall back to `getDepthForRoom`), `mobile/lib/zone-loader.ts` (validator duplicate-id cascade noise: after the dup error, skip shadowed nodes in later rules), `mobile/lib/content.ts` (`rollNodeContent` boss branch: `type === 'exit' ? undefined : template` guard). Test: extend zone-graph.test.ts (dup-id fixture asserts exactly the dup error, no cascade).

- [ ] TDD the validator change → implement all three → suite+tsc → commit `fix: feed zone-aware depths, validator noise, exit-sentinel guard`.

---

### Task 11: Bible revision + docs pass

**Files:** `docs/CONTENT_BIBLE.md` — replace lines ~44-58 (`## The Hackathon Zone: THRESHOLD OF THE UNNAMED`) with a `## The Five Zones` chapter: one subsection per zone (identity/element/palette/sounds pulled from each zone JSON's meta + depths names; 5-8 lines each, bible voice) plus a short "Zone Structure" note (branching two-lane graphs, side chambers gated by offerings, depth tiers). Replace the EOF `## Sample Room Sequence (Hackathon Zone)` with a current sunken-crypt graph walk example (one lane + a side chamber). `CLAUDE.md`: content-engine sentence mentions side chambers + Bait. Spec Appendix C: tick #10 (bible revision done), #2 fully done (Bone Dust + Pale Coin + Eye wired), §6 Bait done; §4.1 side chambers done. `RETRY_MANIFEST.md`: note new keys from Tasks 3/8/9 pending translation.

- [ ] Edit → verify claims against zone JSONs → commit `docs: bible five-zone chapter; phase 2b reality`.

---

## Self-Review

- **Spec coverage:** §4.1 side chambers + item gates (T1-T4), remaining zone graphs (T5-T7), §6 F3 Bait (T8), §10 extraction (T9), Appendix C #10 bible (T11), deferred 2a minors (T10). Not in 2b (explicit): bespoke signature-node prose (future content drop, pack format), NPC characters (phase 3 daily shift), Pale Coin currency (phase 3 — the gate uses the existing artifact item).
- **Placeholder scan:** Task 1's later fixture tests are named-but-sketched (patterns established two lines above); T5-T7 author data within stated constraints — outcomes enforced by tests. No TBDs.
- **Type consistency:** `ZoneGate`/`side` (T1) → `DungeonNode` passthrough (T2) → `gateStatus`/UI (T3) → zone data (T4-7); `onBait`/`BaitResult`/`pounceSpent` (T8) self-contained; `baitCost` follows the `strikeCost` settings pattern verified in extraction.
- **Risk notes for executors:** T2 is the GameContext task — same staleness checklist as 2a Task 4, plus the server-desync trace. T3 touches inventory consumption — verify removal uses the existing item-removal path, not a new absolute write.
