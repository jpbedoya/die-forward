---
name: working-on-die-forward
description: Use when doing any non-trivial work in the Die Forward repo — implementing features, changing combat/game logic, writing player-facing text, planning phases, or reviewing diffs. Also use when tempted to guess a file location, item name, or line number instead of verifying it.
---

# Working on Die Forward

## Overview

Core principle: **verify against the live repo before acting, and produce evidence with every claim.** Plans and specs are written from extracted code facts (real signatures, real line numbers, real item ids), never from memory or docs alone. Every deliverable ends with proof: a test run, a file:line citation, or an explicit "not verified."

## The Working Sequence

For any feature-sized task, in order. Do not skip stages; do not merge them.

1. **Extract reality first.** Before planning or editing, read (or dispatch a search for) the exact code you'll touch: interface shapes, exported signatures, the item/creature key strings, existing test setup. Docs lie; `CONTENT_BIBLE.md` says "Rusted Blade", the code says `Rusty Blade`. The code is canon for live-tuned values; the bible is canon for voice and lore.
2. **Spec, then plan, then execute.** Design decisions live in `docs/superpowers/specs/`, implementation plans in `docs/superpowers/plans/`. A plan task is one TDD cycle: failing test (written out in the plan) → verify fail → minimal implementation → verify pass → commit.
3. **One task, one commit, one review.** After each task, review the diff against the task's requirements before starting the next. Never proceed with an open Critical or Important finding.
4. **Docs move with the code.** Every phase updates the docs it invalidates (CLAUDE.md, CONTENT_BIBLE.md, spec punch lists) in the same branch — not "later".
5. **Rejected options get recorded with reasoning** (e.g. spec Appendix B: why purchasable Pale Coins were rejected — Big Fish precedent). Future sessions must not relitigate blind.

## What to Verify Before Answering or Claiming

| Claim you're about to make | Required evidence first |
|---|---|
| "Done / fixed / passing" | You ran `cd mobile && npx jest` AND `npx tsc --noEmit` yourself, this session, and paste the counts |
| "Function X works like Y" | You read X in the current working tree (not from a summary) |
| "Item/creature Z exists" | You grepped the exact key in `lib/content.ts` — names drift (singular/plural, "The" prefix) |
| "This string/number is canon" | Checked the live constant (stamina pool = 4; loot weights 55/30/12/3 in `rollRandomItem`) |
| A file:line reference | Read from the current tree — lines drift between commits |

If you cannot verify, say "unverified" explicitly instead of hedging.

## Project Hard Rules

- **Combat math lives ONLY in `mobile/lib/combat-math.ts`** (pure, tested). `combat.tsx` wires engine outputs; it never computes formulas.
- **Pure rule/engine modules never import from `content.ts`** — content imports from them (circular-import ban).
- **All new player-facing strings go through `t()`** (`lib/i18n.ts` + `lib/locales/en.json`), named `{placeholder}` substitution, never word-order concatenation. Inline literals in JSX/GameContext are a defect.
- **Determinism:** every random draw uses the run's seeded rng. `Math.random()` in a gameplay path is a defect.
- **Bible voice** for all player-facing copy: second person, present tense, sparse fragments, sensory-first, understated dread, NO exclamation marks, no modern words. Example register: "Something moves beneath its skin. It will not die quietly."
- **React state:** never write state from a render-closure value with an absolute setter (`setHealth(game.health - x)` is the bug class that broke Death's Mantle and drain). Use functional updaters (`applyDamage`, `adjustStamina` pattern) whenever the current value could have changed this tick.
- **Extra caution files** (CLAUDE.md list): `stake.tsx`, `auth.ts`, `instant.ts`, `escrow.ts`, `magicblock.ts`, `wallet/route.ts`.

## Mistake Catalog (all occurred here; check your diff against each)

- Stale-closure state write masking a same-tick update (heal discarded → wrongful death).
- Effect wired into one code path only ("Heartstone on strike") when the mechanic's fiction implies all paths (dodge/brace/flee).
- Feature nullified downstream: a later absolute write (stamina regen) silently undoing an earlier delta (drain). Trace a new effect end-to-end to the final write.
- Bonus folded into a base BEFORE multipliers, silently scaling with tier/charge when it read as flat.
- Double-increment diffed against a pre-bumped previous value, permanently skipping threshold unlocks.
- Dead scaffolding committed (unwired mock file) and claimed as necessary in self-review.
- Doc claims contradicting the repo ("no testing configured" while 16 suites exist).

## Output Structure

- Lead with the outcome/verdict in the first sentence; evidence after.
- Findings and reviews: every claim carries file:line; severity = Critical (breaks player outcomes/money) / Important (can't trust until fixed) / Minor (queue it, don't drop it — keep a written backlog).
- Commits: conventional style (`feat:`/`fix:`/`docs:`/`chore:`), one task per commit.
- When you skip or defer something, write it down (report, ledger, or spec punch list) — silent scope-trim reads as "covered."

## Red Flags — STOP and verify

- You typed an item, creature, or key name from memory.
- You're about to say "should work" or "likely passes" instead of running the suite (it takes <1s).
- Your diff adds a quoted string a player will read, outside `en.json`.
- You're adding `Math.random()`, or subtracting from `game.<stat>` inside a callback.
- You're editing `combat.tsx` and writing arithmetic more complex than `+`/comparison on engine outputs.
- A doc you're citing disagrees with the code you just read — resolve which is canon before proceeding, and fix the loser.
