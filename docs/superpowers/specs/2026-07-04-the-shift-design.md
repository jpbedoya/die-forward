# The Shift — Design Spec

*Die Forward core-loop depth + living-world update. Drafted 2026-07-04. Status: awaiting approval.*

Companion research: [`docs/GAME_EVAL_AND_BLOCKBUSTER_BRAINSTORM.md`](../../GAME_EVAL_AND_BLOCKBUSTER_BRAINSTORM.md) (full market research + game evaluation). Lore source of truth: [`docs/CONTENT_BIBLE.md`](../../CONTENT_BIBLE.md).

---

## 1. Problem & Goals

The current game has a distinctive fiction but a shallow loop: combat is solved after ~10 runs, dungeons are fixed 12-room corridors seen 100% per run, items are additive stat sticks with no synergies, the run modifier is assigned rather than chosen, and nothing changes between sessions or reaches the player outside the app.

**Goals**
1. Make runs meaningfully different from each other (route choice, build identity, distinct enemies).
2. Make *today* different from *yesterday* (a world that shifts on a daily cadence and digests real player activity).
3. Create a return loop that reaches players out-of-app (notifications) **without depending on notification permission** — every message has an identical in-app surface.
4. Stay true to the content bible: every mechanic here is something the lore already promises (the Cartographer's moving rooms, The Architect building with corpses, the underworld as a digesting process).

**Non-goals (this project)**
- Cash-out shrines / SOL escrow or pool-economics changes (stake *presentation* and the earned Pale Coin currency are in scope — see §9; the on-chain escrow program is untouched).
- Ghosts, rescue runs, corpse-recovery mechanics.
- Daily Descent competitive mode (the daily *shift* lays its foundation; the shared-seed challenge is a follow-up).
- New zones or creature art.

---

## 2. System Overview

Five systems, one theme — **the underworld rebuilds itself, and the game tells you about it**:

```
            ┌─────────────────────────────────────────┐
            │  THE SHIFT (world state)                │
            │  daily seeded layer  +  community layer │
            └───────┬─────────────────────┬───────────┘
                    │ determines          │ narrated by
                    ▼                     ▼
   ┌────────────────────────┐   ┌──────────────────────────┐
   │ BRANCHING MAP          │   │ CARTOGRAPHER'S DISPATCH  │
   │ open/closed paths,     │   │ home panel + zone select │
   │ NPC rooms, side doors  │   │ + ≤1 push/day (opt-in)   │
   └────────────────────────┘   └──────────────────────────┘
                    │
      ┌─────────────┼──────────────────┐
      ▼             ▼                  ▼
 ITEM SYNERGIES  ENEMY RULES     MODIFIER CHOICE
 (tag combos)    (signature      (pick 1 of today's
                  behaviors)      2–3 offered)
```

The tight loop: shift happens → dispatch reaches you (push if allowed, home screen always) → today's map, modifier pool, and bounty are concretely different → you route through the map toward what changed → your deaths feed tomorrow's shift.

---

## 3. The Shift (world state)

### 3.1 Daily seeded layer (offline for Unbound; server-committed for staked)

Derived **deterministically** from `hash(dateUTC + zoneId)`. The world shifts at 00:00 UTC globally (dispatch *delivery* is local-morning, §8 — it describes the already-live shift). Controls:

- **Map edges:** which connections between map nodes are open/closed today (see §4).
- **Rare NPC room:** which one of the bible NPCs appears in the zone today and at which node (Ferryman, Cartographer, Collector, Mourner, Whisper Keeper, Echo of a Victor — one per zone per day, some days none).
- **Modifier pool:** which 2–3 of the 6 run modifiers are on offer today (see §7).
- **Side-door state:** which item-gated side chambers are open, sealed, or shift-only today.

**Trust boundary (red-team A1 — load-bearing):** *staked runs are never offline.* Blood-Bound and Coin-Bound runs receive a **server/VRF-committed `runSeed` and server-stamped date** at stake time (MagicBlock VRF exists for this); client-asserted dates and client-chosen seeds are rejected for anything with economic outcomes. Unbound runs stay fully offline/client-side — but are **firewalled**: no leaderboard writes, no currency grants, and no community-aggregation input without a server run receipt. The daily layer is public and pre-solvable by design (acceptable for Unbound); staked runs additionally mix a server-side per-run secret so the *run instance* is not pre-solvable. Assume the content is datamined day one (all synergies/rules/gates are public): difficulty and economy are tuned to **solved** play, and no single element tag may be a universal counter.

### 3.2 Community layer (online, additive)

A nightly aggregation job (web API cron over InstantDB death data, per zone, trailing 24h) produces a small `worldShifts` record. Purely additive — offline/failed fetch degrades gracefully to the seeded layer alone.

- **Apex threat:** the creature with the most kills yesterday is marked. It gets a stat buff (+15% HP/damage) and a **bounty** (bonus loot roll + bestiary mastery credit for killing it). Narrated: *"The Bog Lurker grows fat on wanderers."*
- **Mass-death rooms:** map nodes where ≥10 players died yesterday (tunable, admin-configurable like `victoryBonusPercent`) gain a **curse statue** (bible: Dark-Souls-style death marker) — a visible warning plus a small ambient effect (e.g., +1 corpse spawn chance in adjacent nodes).
- **Architect visitation:** the single deadliest node (past threshold) shows corpses **built into the walls** — environmental storytelling in room narration, naming real fallen players' nicknames/final words where available. The Architect's Nail artifact becomes relevant here.
- **Echo Husk material:** Echo Husks (see §6) draw their repeated phrases from real recent final words in the zone.

**Aggregation integrity (A5):** the nightly job ingests **server-receipted deaths only**, counts distinct plausible accounts (not raw rows), uses medians over sums, and applies per-account caps + age minimums — the community layer must be bot-steerable by nobody. Tips count only with a verified on-chain transfer.

**UGC moderation gate (A2 — ships before any rebroadcast feature):** any player-authored text surfaced to *other* players (Echo Husk phrases, Architect-wall names/final words, corpse final words in shared surfaces) passes profanity/URL filtering, carries a report button, and is trust-weighted (account age / staked history). No filter, no rebroadcast — this is a store-review-level requirement, not polish.

### 3.3 Data & code touchpoints

- New: `lib/world-shift.ts` (mobile) — seeded-layer computation + community-layer fetch/merge + a typed `WorldShift` object consumed by zone-loader, stake screen, and the dispatch renderer.
- New: `src/app/api/game/shift/route.ts` (web) — nightly aggregation + read endpoint; `worldShifts` namespace in InstantDB.
- Touched: `lib/zone-loader.ts` (map generation consumes shift), `lib/GameContext.tsx` (run setup), `app/index.tsx` (dispatch panel), `app/zone-select.tsx` (per-zone shift detail), `app/stake.tsx` (modifier choice).

---

## 4. Branching Descent Map

### 4.1 Structure

Each zone's fixed 12-room script becomes a **DAG of ~30–35 nodes** — but the authoring budget is **~12 signature nodes per zone** (NPC rooms, set-pieces, gated side chambers) plus **~15 shared, tagged "transit" beats** recombined and vocabulary-reskinned per zone (water/ash/bone). Authored density goes where it's noticed — branch points and destinations — not uniformly across 35 nodes (fun-skeptic F4: 35 bespoke nodes × 5 zones × 6 locales is the phase that silently becomes six months).

- **3 depth tiers** (unchanged danger scaling), each tier a band of the map. **Every node carries an authored `depth` field** — tier comes from the node, never from traversal position.
- **Canonical depth projection (feasibility constraint, load-bearing):** `room` is a monotonic integer welded from the UI through server validation to the on-chain `u8` (`final_room`), and `highestRoom` drives zone unlocks + the leaderboard. The DAG must *project* to that integer: `highestRoom` is redefined as **max node-depth reached**, and `ProgressBar`/`maxRooms`/on-chain writes all consume the projection. The anchor program is not modified. Death/Corpse records gain a **node id** field; corpse adjacency re-keys on node/depth-tier instead of `room ± 1`.
- **2–3 main-path nodes per depth step**; the player always moves downward, choosing among connected next nodes. A run traverses **~13–16 nodes** — under half the map. Session length stays 5–10 minutes.
- **Side chambers:** dead-end detour nodes off the main path (alcove, offering site, survivor's stash, sealed door). Cost: a room's worth of time plus a risk roll or resource (HP/stamina/item). Reward: loot, lore, NPC access. Some are **item-gated** (Drowned Scripture deciphers the inscription door; Pale Coin buys the Ferryman's crossing; Eye of the Hollow reveals hidden ones) — finally giving the flavor-only artifacts real jobs.
- **Daily edges:** the seeded shift opens/closes a subset of connections and side doors each day. The same zone yields visibly different route options across days; two runs on the same day can still diverge by choice.

### 4.2 Presentation

- Path choice happens at the end of each room in the existing choice-button UI — no live map screen required for v1.
- **Hint contract (F2 — binding):** every branch hint is **dual-signal** — one sensory clue in bible voice *plus* one legible risk/reward tag the player can read cold: *"Right — distant water. (A cache, but the air is wrong.)"* Flavor alone previews nothing and makes the choice a coin flip; a hint must let the player trade a known reward against a known risk. The stamina **peek** then has a real job: it upgrades a hint into a certainty.
- **Comparison surface (F1 — v1-BLOCKING, promoted):** a post-run **path trail** on the death/victory screen — nodes visited plus branches declined. This is the minimum surface that makes yesterday≠today *felt* ("that door was open yesterday"); without it the daily shift is real in data and invisible in play. Cheap: the traversal data already exists. A live ASCII map remains a later nice-to-have.

### 4.3 Benchmarks — what comparable games do (research)

The design target — short traversal through a much larger authored space — is the genre-proven pattern:

| Game | Run traversal | Total space | Session | Lesson |
|---|---|---|---|---|
| **Slay the Spire** | ~16 floors/act | ~50 nodes/act map (7 columns) | 45–90 min (3 acts) | You see ~1/3 of the map; the unseen 2/3 is where the feeling of agency lives. Closest structural model. |
| **Hades** | ~45 chambers/run | Door choice: 2–3 doors/room, each previewing reward type | 30–40 min | No backtracking, always forward — exploration *illusion* via previewed door choice. Most mobile-translatable pattern. |
| **Shiren / Pixel Dungeon** | 25–30+ floors | Each floor a freely explorable grid | 30–60+ min | True wandering; wrong fit for a text/choice game and for 5–10 min sessions. |
| **Buriedbornes** (JP, closest text-roguelike analog) | 10–30 floors, each a short choice-sequence | Variety from dungeon/build permutations, not floor count | Snappy | Text roguelikes win on permutation depth, not corridor length. |
| **Archero / Survivor.io** | 10–15 min capped runs | Deep meta outside the run | ~10–15 min | The mobile revenue leaders protect short sessions ending on a clean "again?" moment. |
| **Die Forward today** | 13 rooms | 13 rooms (100% seen) | 5–10 min | The corridor, not the length, is the problem. |

**Decision:** keep 13–16 traversed; grow space to 30–35 nodes/zone; add optional side chambers; save true long-form depth (endless descent, Buriedbornes-style) for a future Void Beyond mode.

---

## 5. Item Synergies

- Every item gets 1–2 **element tags** from the bible vocabulary: `WATER, BONE, VOID, ASH, FLAME, ECHO, PILGRIM`.
- Carrying two items sharing a tag unlocks a **named synergy** — a real mechanical effect rendered in-fiction (discovered on pickup: *"The charm hums against the hook. An Ossuary Pact is struck."*). Target **10–12 synergies** at launch. Illustrative examples (final pairs to be mapped against the actual `ITEM_DETAILS` list during implementation planning):
  - Bone Hook + Bone Charm → *Ossuary Pact*: BONE creatures' intents revealed one extra turn ahead.
  - Ember Charm + Ash Veil → burns you inflict spread +1 stack; burn cap unchanged.
  - Voidblade + Soulstone → lifesteal converts Voidblade's self-damage to healing on kill turns.
  - Drowned Scripture + Pale Coin → *Ferryman's Favor*: one free crossing/door per run.
- **Creature tags** added in parallel (`aquatic`, `bone`, `spectral`, …) — fixes Void Salt's dormant aquatic bonus and powers tag-vs-tag effects.
- **Stub items get real effects** per their bible descriptions: Bone Dust (reveal hidden side doors this tier), Heartstone (one-time warning turn before lethal damage), Pale Coin (passage currency), Eye of the Hollow (reveals hidden corpses/caches on the map).
- Code: tags + synergy definitions in `lib/content.ts` alongside `ITEM_DETAILS`; effect hooks through the existing `getItemEffects` pipeline so combat math changes stay centralized in `combat-math.ts`.

## 6. Distinct Enemy Rules

Implement the bible's already-written behavior lists as **one signature mechanic per creature** (~15 rules across tiers; every Tier 2+ creature gets one, Tier 1 at least half):

| Creature | Signature rule (from bible behavior) |
|---|---|
| Bloated Ones | *Rupturing*: explodes on death — dodge the final blow or take damage |
| Tideborn | *Reforming*: revives once at half HP unless the killing blow used a VOID or ASH item |
| Bone Weavers | *Multiplying*: +1 attacker if the fight passes turn 4 |
| Flickering Shades | *Blinking*: auto-evades the player's first Strike |
| Echo Husks | *Repeating*: recites real final words from recent deaths in this zone (community layer); *Listening*: attacking on consecutive turns draws its focus |
| The Hunched | *Sniffing/Pouncing*: using an item in combat triggers an immediate pounce |
| The Congregation | *Absorbing*: heals itself when it lands a hit |
| Pale Oracles | *Prophesying*: reveals your next 2 intents but curses one item slot for the fight |
| Carrion Knights | *Saluting*: never ERRATIC; fights "honorably" — and grants bonus mastery for winning without fleeing |
| Forgotten Guardians | *Dormant*: first turn free, but *Relentless*: immune to flee once awakened |
| Undertow Wyrms | *Dragging*: failed dodge pulls you — next flee attempt blocked |
| Hollow Clergy | *Chanting*: power builds each turn it isn't struck |
| The Weeping | *Embracing*: its hits drain stamina instead of only HP |
| Throat Singers | *Harmonizing*: calls a Tier-1 add if the fight passes turn 5 |
| The Unnamed (boss) | *Watching*: your peek/reveal effects fail in its room |

Design intent: reading the *creature*, not just the intent icon, becomes the skill. Rules interact with synergies (VOID/ASH counters, reveal effects) to make builds matter.

**Player-side verb — Bait (F3, phase 2):** the rules ship (phase 1) but most resolve to "Strike, but time it" with the current 4-button vocabulary. Phase 2 adds one action: **Bait** (1⚡) — provoke the enemy's signature behavior early, on the player's terms (draw the pounce before healing, trigger the charge into a prepared dodge, force the reform while holding VOID). One button; makes ~6 of the rules bloom from memorized gotchas into set-up counters. Balance guard: no reveal-stack (Oracle + Ossuary Pact + modifier) may fully automate intent-reading (A6).

## 7. Modifier Choice & Session Escalator

- The daily shift selects **2–3 modifiers** as today's pool. At the stake screen the player **picks one** (empty-handed runs included). Presented in-fiction: *"The depths make an offer."*
- **Anti-solve (F5, load-bearing):** modifiers **interact with today's apex threat and map state**, so the best pick changes daily instead of being ranked once by the community (a static 6-pool is solved in 48 hours). Grow the pool toward ~10 over phases 2–3 (a modifier is cheap content). For staked runs, the pool is revealed only **after** stake commit (A6) so seed-knowledge can't cherry-pick counter days.
- **Within-session escalator (F8):** the daily shift alone rewards an 8-minute login, not a session. Two levers make run 2 *today* hotter than run 1: the **apex bounty is a within-day chase** (reaching it needs depth + the right build — a failed attempt begs an immediate retry), and an optional **session ante** — each consecutive same-session run nudges modifier intensity and coin multiplier up.

## 8. Dispatches & Notifications

**One content pipeline, three surfaces.** A `renderDispatch(shift)` function turns the day's shift into 1–3 short lines in the Cartographer's voice (bible tone rules; ≤ ~140 chars each):

> *"Room seven connects to room three now. The water has receded in the Sunken Crypt. Something grows fat at depth 9."*

Surfaces, identical content:
1. **Home screen panel** — "THE DEPTHS HAVE SHIFTED" block above the death feed. Always present. Tapping routes to zone select with shift details.
2. **Zone select** — per-zone shift lines (today's NPC, apex threat, opened doors).
3. **Push notification** — at most **one per day**, the same dispatch text, via `expo-notifications` + a server-side send at each user's local morning (requires `Player.pushToken` + `Player.timezone` schema fields and an hourly fan-out cron — greenfield; see §13). Plus one rare personal push: *"The Architect has built your corpse into the walls of the Ashen Crypts."* (only when true, and only after A2 moderation).

**Scarcity rule (F7):** 1/day is a **cap, not a floor**. The banner dispatch fires only on personally consequential days (your bounty, your corpse, a door you tried now open); most days get a one-line ambient or silence. A dispatch that fires daily becomes wallpaper in two weeks — the fatigue failure Lifeline's own history warns about. The Cartographer gets 2–3 rotating registers (warning / lament / invitation) so the voice has weather.

**Permission is diegetic and optional:** after the player's first death, the Cartographer appears once: *"The passages move. I can send word when they do — if you wish."* Decline = never asked again in-fiction (settings toggle remains). **Nothing is gated on permission**; deniers read the identical dispatch on the home screen. Expected: many/most players deny — the loop must be fully alive in-app, and it is, because the panel (not the push) is the primary surface.

## 9. The Offering Ladder — Stakes for Everyone, Crypto for Some

Market research (spec Appendix A; brainstorm doc Part 4) splits our markets three ways: JP/KR/TW (spend, gacha-normalized but crypto-neutral), US/EU (identity + discovery, crypto-skeptical, hardest regulatory surface), VN/PH/BR (crypto-native, P2E burn scars). Two conclusions: neither hard-hiding the chain nor leading with it serves all three — and more fundamentally, **the stake emotion must not be exclusive to crypto players**. The risk/loss/escape tension is the game's heartbeat; today only wallet-holders ever feel it. So the design decouples the *ritual* from the *chain* with a three-rung offering ladder.

### 9.0 The ladder

| Rung | Offering | Who | On death | On escape |
|---|---|---|---|---|
| **Unbound** | Nothing | Everyone, always (onboarding + casual default) | — | Progression only |
| **Coin-Bound** | **Pale Coins** (earned in-game currency; bible: "currency of the dead") | Everyone, once they've earned coins | Coins feed the depths (sink) | Coins back + bonus % |
| **Blood-Bound** | SOL (existing escrow) | Opt-in veterans, per §9.1 posture rules | 95% to pool, 5% fee (unchanged) | Stake + bonus % (unchanged) |

**Pale Coins economy (new, minimal v1):**
- **Earned only, never sold.** Sources: depth reached per run, apex-threat bounties (§3.2), side-chamber discoveries (§4.1), first-clears, milestone grants. This rule is load-bearing: an earnable-only stake currency is a game mechanic; a purchasable one is gambling-adjacent and would poison store review and regulatory posture. Pale Coins are **never purchasable with real money — permanent rule.**
- **Sinks:** coin-bound stakes lost on death; NPC trades (the Ferryman's crossings, the Collector's item trades — both bible-canon "economy of the dead" characters, both already in the map design §4.1).
- Same Toll screen, same ritual framing, same bonus structure — a coin-bound death and a blood-bound death read identically in the feed except for the seal color. The coin rung *is* the tutorial for the blood rung.
- The Pale Coin artifact in `ITEM_DETAILS` folds into this: found coins become currency pickups; its "passage" effect becomes literal (Ferryman payment).
- Balance guard: coin income tuned so a stake is meaningfully scarce (roughly: an average run earns ~1/3 of a respectable stake) — losing must sting or the ritual teaches nothing.
- **Anti-mint rules (A4):** depth income is **concave and clear-weighted** (most value on escape, little on bail-outs) and server-gated for online accounts, with per-day caps; first-clears and milestone grants go through a **server unlock ledger**. The Coin-Bound bonus is **funded strictly from the burned-stake pool** — population-net-negative, never minted. Offline Unbound runs earn no shareable currency (trust boundary, §3.1).
- **The Binding Streak (F6 — what makes coin loss sting):** consecutive Coin-Bound escapes build a visible **seal tier** on the player's feed badge and corpse; a Coin-Bound death resets it to zero. Coins alone re-earn in ~3 runs — refungible, no tension; the streak is non-refungible, social, and public. This is the emotion that actually rehearses Blood-Bound: losing the thing you were showing off.
- **Payout canon (A3, resolves an ambiguity):** escape pays **stake × 1.5 total** (the original offering back plus a 50% bonus) on both staked rungs — breakeven clear rate ≈ 63% against the pool. Publish the number; add a **pool circuit-breaker** (bonus % and stake caps auto-tighten if the trailing clear rate exceeds a configured threshold in `gameSettings`).

The fiction holds across all rungs: *"The underworld accepts lesser offerings. It prefers souls."*

### 9.1 Crypto presentation (progressive disclosure)

- **Runs 1–N (N ≈ 3 deaths, tunable): pure game.** No wallet pill on the home screen, no BIND WALLET path at the Toll — the stake screen shows only the descent (what is now "empty-handed" simply becomes *the game*). No crypto vocabulary anywhere in the core flow.
- **Coin-Bound unlocks itself.** The moment a player has earned enough Pale Coins (typically within the first few runs), the Toll offers the coin offering — no gate, no ceremony beyond the fiction. By the time crypto is ever mentioned, every player already understands staking *as a game mechanic*.
- **The Ritual unlock (diegetic, Blood-Bound).** After the milestone, the fiction introduces what the lore already canonizes — *the Staking Ritual*: "By offering something of value, you become visible to the underworld... The stake makes you real down there. It also makes you edible." Presented once, in-world (e.g., the Ferryman or an altar room), as an invitation to **Blood-Bound descents**. Decline and it recedes to a quiet option on the Toll screen.
- **Prestige, not pressure:** Blood-Bound runs get a distinct seal color, feed badges, and leaderboard markers — the honest signal of real stakes without yield language. Coin-Bound runs get their own lesser seal; Unbound remains a full game (Shift, milestones, feed, leaderboard all included).
- **Vocabulary rule:** in-fiction it is always *offering / binding / the Ritual* — "SOL" and wallet mechanics appear only inside the actual transaction sheet, never in narrative or notifications. No earnings/yield language anywhere, ever (Axie lesson).

### 9.2 Market posture switch

A remote-config value (extends the existing `/api/game/settings` admin pattern): `stakingPosture: hidden | ritual | open`.

| Posture | Behavior | Intended markets |
|---|---|---|
| `hidden` | Blood-Bound absent entirely (UI + routes). Coin-Bound unaffected — the ladder's first two rungs are universal. | iOS App Store builds if review requires; regulated markets |
| `ritual` | Progressive disclosure as in §9.1. **Global default.** | US/EU, JP/KR/TW |
| `open` | Wallet visible from home; Ritual offered at first Toll visit. | VN/PH/BR crypto-native launches |

Distribution note: the existing surface split already supports this — native store builds can ship `hidden`/`ritual` for compliance while the web app (`play.dieforward.com`) and sideloaded APK carry `ritual`/`open`. Store-policy and gambling-regulatory review before any mainnet posture change remains a launch gate (outside this spec).

### 9.3 Token integration & Solana hardware channels (direction; build follows this project)

Decision (July 2026): Pale Coins remain **earned-only — permanently**. Selling the stakeable currency for money-equivalents would make Coin-Bound gambling-adjacent everywhere (consideration + chance + prize), poison store review, and destroy the one rung that works even in `hidden` posture. Token utility comes in two other places instead:

- **Tokens at the altar:** Blood-Bound staking accepts **SKR** (Solana Seeker) and **PLAY** (Play Solana PSG1) alongside SOL. Implementation path: v1 keeps the escrow program SOL-native and swaps SKR/PLAY→SOL at the altar (Jupiter route, shown transparently in the transaction sheet); a later program revision can hold SPL-token escrows natively if volume justifies it. No change to pool economics.
- **The Collector's Shop:** cosmetic-only commerce — tomb monuments, seal colors, epitaph scripts, death-card frames — payable in SOL/SKR/PLAY on crypto surfaces (web, sideloaded APK, **Solana Seeker dApp Store, Play Solana PSG1**) and via standard IAP in store builds where posture allows. Cosmetics never touch balance or the stake loop.
- **Why these two channels matter beyond revenue:** Seeker's dApp Store and the PSG1 launch catalog are the crypto-native *distribution* channels where a flagship Solana game gets featured — the real prize of SKR/PLAY integration. Pursue both platform relationships as part of the Tier-C market plan (brainstorm doc Part 4).

Scope note: this section sets direction and constraints; altar multi-token and the Shop are **follow-up projects** after The Shift ships (they depend on nothing in this spec beyond the ladder).

### 9.4 Why not full hide-the-chain?

Off The Grid's "game-first, hide-the-chain" is the proven web3 pattern — but its chain layer was cosmetic item trading. Ours is the emotional core of the fiction (the stake *is* the binding; death *feeds* the depths). Fully hiding it forfeits the one mechanic no mainstream competitor can copy, and crypto-native markets (Tier C) choose this game *because* of it. Progressive disclosure keeps the Off The Grid virtue (the game stands alone; most players may never bind) while letting the stake remain the fiction's spine for those who opt in. It is player choice — made after the game has proven it's worth playing.

## 10. Localization & i18n

**Status after phase 1 (honest):** the *mechanism* exists (`lib/i18n.ts` + `en.json`, all new strings keyed — enforced going forward), but the pre-existing surface is untouched: **~277 inline literals across the 14 screens** plus **~3,619 lines of narrative prose in `lib/zones/*.json`** content packs, whose fragment-concatenation architecture fights a flat key/value catalog.

**Two-track strategy (decided):**
1. **Screen strings → catalog extraction pass.** A dedicated phase-2 task migrates the ~277 screen literals into `en.json` keys. Mechanical; converges because the surface is enumerable and new literals are banned.
2. **Content packs → per-locale pack files.** Zone prose localizes as whole translated packs (`sunken-crypt.ja.json` …), with `zone-loader` selecting by locale and falling back to English per-pack. This preserves the fragment-assembly architecture, gives translators full narrative context, and keeps locale drops content-only. Key-referencing packs (re-architecting the content engine) was considered and rejected as invasive. **Consequence:** all phase-2 DAG node prose is authored in the pack format from day one, so it inherits localization for free.

- **All NEW player-facing strings centralized** — keyed through `t()` (screens) or authored in packs (narrative); inline literals are a review-blocking defect.
- **Dispatch/narrative rendering must be template-safe for localization:** variable substitution (creature names, depths, player nicknames) via named placeholders, no English-word-order concatenation.
- Bible tone rules apply per-locale (translators get the Content Bible's voice section as part of the loc kit).
- Priority order per market tiers: `ja`, `ko`, `zh-TW` (revenue) → `vi` (crypto-native reach) → `pt-BR`, `es`.

## 11. Error Handling & Degradation

- **Offline / fetch failure:** seeded layer always computes locally; community layer merges in when available, silently absent otherwise. No spinners, no errors — the world simply shifts on schedule.
- **Cold start / low population:** community thresholds (apex bounty, curse statues, Architect visits) require minimum event counts; below threshold those elements don't appear — the seeded layer guarantees the world never reads as dead.
- **Determinism:** map generation and daily state remain fully reproducible from `(runSeed, dateSeed)` — preserves replay/verification properties and keeps future Daily Descent trivial.
- **Notification failures:** pushes are fire-and-forget; the in-app panel is the source of truth.

## 12. Testing

- Unit-test the pure cores (first tests in the repo — set up Jest per project convention): shift derivation (same date+zone → same shift; different dates → different edges within authored bounds), map generation (every daily variant has a valid path start→exit; traversal length within 13–16; side chambers reachable when open), synergy resolution, and each enemy signature rule in `combat-math`/combat reducer.
- Simulation harness: script N seeded runs across M dates asserting no dead-end maps and observing difficulty distribution.
- Manual: dispatch rendering against bible tone; notification opt-in flow; offline run parity.

## 13. Phasing (build order)

1. **Foundations:** item/creature tags + synergies + stub-item effects; enemy signature rules. (Pure content/combat — no structural risk, immediately felt.)
2. **Map:** node/edge zone schema with authored `depth` per node + the canonical depth projection (highestRoom/maxRooms/on-chain `final_room` all consume it); DAG authoring per the 12-signature + 15-transit budget (Sunken Crypt first, then Ashen); traversal UI with the dual-signal hint contract; **post-run path-trail screen (v1-blocking)**; side chambers, item gates; **Bait verb**; node-id fields on Death/Corpse; screen-string extraction pass (§10 track 1); bible revision.
3. **Shift:** seeded layer (UTC boundary) + modifier choice with apex interaction + home/zone-select surfaces; Coin-Bound + Binding Streak + posture switch; **server-authority carve-out for staked runs (VRF-committed seed + date, run receipts)** — prerequisite for any real-money posture.
4. **Community layer + dispatches:** server-receipted aggregation job (distinct-account medians, caps), apex/curse/Architect, **UGC moderation gate before any rebroadcast**, `renderDispatch` with scarcity rule, notifications last (push-token + timezone schema, hourly fan-out cron, EAS rebuild).

Cross-cutting from phase 1: the i18n string layer (§10) — every new string lands keyed, and existing touched strings migrate as we go. Pale Coins land in phase 2 (earn sources are map content: side chambers, bounties, depth rewards; the Ferryman/Collector sinks are map NPCs), with Coin-Bound staking at the Toll in phase 3 alongside the posture switch (remote-config + UI gating, no on-chain change).

Each phase ships independently playable value; notifications are deliberately last because everything upstream must be true before the game starts talking about it.

---

## Appendix A — Market research summary (July 2026)

Full detail in [`docs/GAME_EVAL_AND_BLOCKBUSTER_BRAINSTORM.md`](../../GAME_EVAL_AND_BLOCKBUSTER_BRAINSTORM.md). Findings that shaped this spec:

- **East Asia is the genre's revenue center.** Archero 2: $32.8M in first 30 days, South Korea #1 market (~23% of spend). Survivor.io: Taiwan+China+Korea >75% of revenue. Vampire Survivors iOS installs: Japan 18%, Korea 9%. The survivors genre itself originated from Korea's Magic Survival.
- **JP/KR retention norms:** 95% of top-grossing Korean games use daily login hooks; daily-cadence content is table stakes. The daily shift is our in-fiction answer to that norm (a reason to check in that isn't a login bonus).
- **Japan's Mystery Dungeon lineage is alive** (Shiren 6: fastest-selling entry ever, 200k in 2 weeks, 2024) — deep affinity for permadeath dungeon crawls with asynchronous social layers (Shiren's rescue system).
- **Slay the Spire's retention structure** — daily challenges + Ascension ladder + seeing only ~1/3 of each act map — validates: finite short runs, big authored space, daily variation.
- **Lifeline** (#1 Top Paid App, 2015) proved push-notification-as-narrative on mobile; its F2P conversion failure warns against breaking fiction with system-y messages — hence the Cartographer's voice and the 1/day cap.
- **A Dark Room / 80 Days**: text games win on pacing, agency, and slow-reveal mystery ("player-driven, slick, and quick"), not content volume.
- **Web3 postmortems** (93% of GameFi dead; Axie 2.7M→5.5k DAU; Off The Grid's game-first success): the fun loop must stand alone; nothing in this spec depends on staking or chain state.
- **Async death-as-content lineage** (NetHack bones: ghost guards corpse, depth-scaled persistence, cursed loot; Dark Souls: bloodstains/messages/vagrants/curse statues): community-layer elements (curse statues, Architect walls, Echo Husk final words) are this lineage applied with our lore.

## Appendix B — Monetization architecture (recorded here; built after The Shift)

The Shift itself ships no monetization — its job is to make the game worth spending on. The model it sets up, by segment:

| Channel | Segment | Mechanism | Status |
|---|---|---|---|
| **Blood-Bound rake** | Crypto-native | Existing 5% stake fee + structural pool edge (~10–15% clear rate paying 150%); multi-token altar (SOL/SKR/PLAY, §9.3) widens the funnel | Escrow live on devnet; mainnet gated on legal review + embedded wallet/fiat onramp |
| **Descent Pass** | Mid-core majority | Seasonal free + paid track over deaths/depths/dailies/bounties. Paid track sells **coin-yield boosters** — money buys earning *rate*, never the stakeable asset. This is the sanctioned "money→coins" path; direct Pale Coin sales (IAP or crypto) were considered and **rejected** — purchasable+wagerable currency is gambling-adjacent even without cash-out (Big Fish Casino: 9th Cir. ruling, $155M settlement), would contaminate store review of the whole app alongside real-SOL staking, and would collapse the coin scarcity that makes Coin-Bound teach anything | Follow-up after The Shift; rides its daily cadence |
| **Collector's Shop** | Status spenders (JP/KR core) | Cosmetic-only: tomb monuments, seal colors, epitaph scripts, death-card frames, candle types. Uniquely strong here because graves are public content — cosmetics are seen by everyone who finds your corpse. IAP in store builds; SOL/SKR/PLAY on crypto surfaces (§9.3) | Follow-up after The Shift |
| **Opt-in ads** | Free tier, low-ARPU markets (VN/BR) | Non-interruptive, opt-in only (shrine reroll, bonus coin roll) — Soul Knight/Vampire Survivors model | Optional lever, evaluate post-launch |

Free players who never pay still feed the flywheel: their deaths populate the corpse feed and the community shift layer — free scale → living world → retention → pass/cosmetic conversion → rake on top.

## Appendix C — Code↔Bible reconciliation punch list

Inconsistencies found in the July 2026 review, with dispositions. Items marked **[this project]** are in scope; **[bible rev]** means the Content Bible gets updated; **[follow-up]** is deferred with intent.

| # | Inconsistency | Disposition |
|---|---|---|
| 1 | Void Salt aquatic bonus never fires (no creature tags) | **[this project]** §5 creature tags — **done (phase 1, July 2026):** tags live on all 21 global BESTIARY entries; Void Salt bonus fires |
| 2 | Heartstone / Bone Dust / Pale Coin / Eye of the Hollow are flavor-only stubs | **[this project]** §5 real effects; Pale Coin → currency (§9) — **partial (phase 1, July 2026):** Heartstone effect live (one-hit +10% defense warning across all four damage paths); Bone Dust, Pale Coin, and Eye of the Hollow map-related effects deferred to phase 2 |
| 3 | Bible NPCs absent from game | **[this project]** §3.1/§4.1 NPC rooms |
| 4 | Creatures mechanically identical despite authored behaviors | **[this project]** §6 signature rules — **done (phase 1, July 2026):** 10 signature rules live (rupture/reform/multiply/blink/pounce/absorb/honor/dormant/drain/chant) with telegraph lines; Echo Husks deferred to phase 4 (community layer), Throat Singer deferred to phase 2 (zone-local) |
| 5 | "Rooms move" lore vs fixed corridors | **[this project]** §3–4 |
| 6 | **Bug:** default stamina initializes 3, `settings.staminaPool` is 4 | **[this project]** fix in phase 1; canon = 4 unless playtest says otherwise — **done (phase 1, July 2026)** |
| 7 | Loot tiers: bible 60/30/8/2 vs code 55/30/12/3 | **[bible rev]** code values are live-tuned; bible adopts them — **done (phase 1, July 2026):** bible table updated to 55/30/12/3 |
| 8 | The Architect encounter unimplemented; Architect's Nail effect meaningless | **[this project — partial]** §3.2 visitations + corpses-in-walls; the living Architect encounter (rare, any room after the third, escape-only) is a **[follow-up]** flagship feature and the Nail's effect activates with it |
| 9 | Bible lists Herbs as a first-class combat action; code treats items as situational | **[this project]** healing-item use becomes an explicit combat action (bible-canon); The Hunched's pounce rule (§6) makes it a real decision — **done (phase 1, July 2026)** |
| 10 | Bible still describes the 9-room "Threshold of the Unnamed" hackathon zone, predating the 5-zone system | **[bible rev]** revision pass alongside phase 2 map authoring: zone chapters, DAG structure, NPC placement rules — bible must remain source of truth |
| 11 | Weapon type identities (reach/fast/heavy/lifesteal) are flat stat sticks | **[this project — partial]** synergies restore some identity; full weapon-type combat differences are **[follow-up]** — **partial (phase 1, July 2026):** 8 synergies live |
| 12 | Cache rooms are free +30 HP vs "nothing is truly safe here" | **[this project]** cache nodes get a small seeded twist (rare mimic/tainted-supplies variant) so the bible's promise holds — **not in phase 1 (July 2026):** cache twist deferred, still open |

## Appendix D — Run-structure benchmarks

See table in §4.3. Headline: successful run-based games show players **30–50% of the authored space per run** and protect a clean session length; Die Forward moves from 100%-seen corridors to ~45% of a 30–35 node DAG with a 13–16 node traversal, keeping 5–10 minute sessions.

## Appendix E — Red-team findings & proposed amendments (July 2026, pre-phase-2)

Three adversarial reviews ran after phase 1: exploit/economy red-team, technical feasibility audit vs the live codebase, and a fun-skeptic design pass. Full reports in session records; consolidated here. **Status: ADOPTED (owner sign-off July 2026) — all items below are folded into the spec body (§3, §4, §6, §7, §8, §9, §10, §13); this appendix remains as the findings record.**

### E.1 Security/economy (from red-team; root cause: client-authoritative writes)

Confirmed in code: deaths/corpses/tips/mastery are direct client InstantDB writes with client-supplied fields. The spec inherited that trust model into staking and the community layer. Amendments:

- ⬜ **A1 — Server-authority carve-out (supersedes parts of §3.1):** *staked runs are never offline.* Blood-Bound and Coin-Bound runs get a server/VRF-committed `runSeed` and server-stamped date at stake time (MagicBlock VRF exists for exactly this). Unbound stays client-side/offline — but is firewalled from leaderboards, currency grants, and community aggregation unless carrying a server run receipt.
- ⬜ **A2 — UGC moderation before re-broadcast (blocks §3.2 Echo Husks/Architect walls):** any player-authored text (final words, nicknames) surfaced to *other* players passes profanity/URL filtering + report button + trust-weighting (account age/stake). Store-pull-level risk without it.
- ⬜ **A3 — Pin the payout math:** the spec says "150%" and "+50%" inconsistently. Canon to declare: escape pays **stake × 1.5 total** (net +50%) — breakeven clear rate ≈ 63% (verify against live `victoryBonusPercent` semantics). Publish the breakeven; add a **pool circuit-breaker** (dynamic bonus or stake caps when trailing clear rate exceeds threshold).
- ⬜ **A4 — Pale Coin anti-mint:** depth income becomes concave and clear-weighted (most on escape, little on bail), server-gated for online accounts, per-day caps; Coin-Bound bonus funded strictly from burned-stake pool (population-net-negative), never minted. First-clears/milestones go through a server unlock ledger.
- ⬜ **A5 — Community-layer robustness:** aggregate over server-receipted deaths only; distinct-account counts and medians, not raw sums; per-account caps. Verified tips only (on-chain transfer before DB write).
- ⬜ **A6 — Assume a solved game:** content ships client-side, so all synergies/rules/gates are public day 1. Tune difficulty/economy to solved play; no single element (e.g. ASH) may be a universal counter; modifier pool revealed only after stake commit for staked runs.

### E.2 Fun/legibility (from design-skeptic; theme: systems real in data, invisible in play)

- ⬜ **F1 — Comparison surface is v1-blocking (amends §4.2):** post-death "path taken + branches declined" trail screen. Without it the daily shift is unobservable and §3's premise fails.
- ⬜ **F2 — Choice/hint contract (amends §4.2):** every branch hint = one sensory clue + one legible risk/reward tag; peek upgrades hint→certainty. Flavor-only hints are coin flips.
- ⬜ **F3 — One new player verb (amends §6 scope):** a Bait/Feint action so enemy signature rules have answers beyond "Strike, but time it." Smallest addition that makes ~6 rules bloom.
- ⬜ **F4 — Authoring budget (amends §4.1):** ~12 signature nodes per zone + ~15 shared tagged transit beats recombined per zone — not 35 bespoke nodes × 5 zones × 6 locales.
- ⬜ **F5 — Modifier pool anti-solve (amends §7):** modifiers interact with today's apex/map so the best pick changes daily; grow pool toward ~10.
- ⬜ **F6 — Binding streak (amends §9.0):** consecutive Coin-Bound escapes build a visible seal tier; a coin-bound death resets it. Makes soft-currency loss non-refungible (coins alone re-earn in ~3 runs = no sting).
- ⬜ **F7 — Dispatch scarcity (amends §8):** 1/day is a cap, not a floor. Banner dispatches only on personally consequential days; most days ambient or silent; 2-3 rotating registers.
- ⬜ **F8 — Within-session escalator:** apex bounty as a within-day chase + optional per-session ante so runs 2-3 today are hotter, not staler.

### E.3 Feasibility corrections (from codebase audit)

- **`room` is a monotonic integer welded UI→server→on-chain `u8` (`final_room`),** and `highestRoom` drives zone unlocks + leaderboard. Phase 2 rule: DAG nodes carry an authored `depth`; `highestRoom` is redefined as max-depth-reached; the graph projects to canonical integer depth for all existing consumers (anchor program untouched). Corpse adjacency (`room ±1`) re-keys on node ID / depth tier — schema field needed on Death/Corpse.
- **i18n reality check (amends §10):** phase 1 keyed new strings only; the true surface is ~277 inline screen literals + 3,619 lines of zone-pack prose whose fragment-assembly fights the flat catalog. **Decision needed before authoring any phase-2 prose:** per-locale zone JSONs vs key-referencing packs. An explicit extraction pass is required; "migrate as we go" will not converge.
- **Notifications are greenfield + timezone contradiction:** no expo-notifications, no push token/timezone on Player, native EAS rebuild required, and "local morning" delivery needs an hourly fan-out cron. Also: §3.1's UTC shift boundary vs §8's local-morning dispatch is unreconciled — decide the boundary (recommend: world shifts at 00:00 UTC globally; dispatch delivered at local morning describing the already-live shift).
- **Cheaper than specced:** seeded-RNG substrate, death schema for aggregation, Vercel cron pattern (`/api/session/cleanup` exists), and `gameSettings` tunables are all in place — shift computation + community aggregation cores are medium, not large.
