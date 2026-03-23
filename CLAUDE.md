# Project Instructions

> These instructions are loaded automatically in every Claude Code session.
> **Top half:** team-specific context (fill in the bracketed sections).
> **Bottom half:** fixed RPI workflow rules (do not modify).

---

## Codebase Overview

Die Forward is a **social roguelite on Solana** (Phase 1 complete, Feb-Mar 2026) where players stake SOL, descend procedurally generated dungeons, and leave persistent corpses for others to discover. Built as a monorepo with Next.js web app (API + landing), Expo mobile app (primary gameplay), and Anchor smart contracts (escrow + run records). Active development; features: zone system, run modifiers, death milestones, inventory management, on-chain VRF randomness, Audius soundtrack integration. Mature codebase with recent optimizations.

## Architecture

**Frontend:** Next.js 16 (`src/app/{page,api/*}`) serves API routes and landing page; Expo Router (`mobile/app/*`) hosts mobile gameplay. **Shared state:** Mobile GameContext (`lib/GameContext.tsx`, ~1000 LOC) manages global game state; web/mobile sync via InstantDB. **Content engine:** `lib/content.ts` (~32k) defines bestiary, items, dungeon generation; `lib/zone-loader.ts` handles 5-zone system with zone-aware creature/item generation. **Progression:** `lib/modifiers.ts` (run modifiers), `lib/milestones.ts` (death milestones + perks). **Database:** InstantDB clients (`mobile/lib/instant.ts`, `src/lib/instant.ts`) manage Death, Corpse, Player schemas. **Auth:** Solana wallet signature verification (`src/app/api/auth/wallet/route.ts`), token-based session restore. **On-chain:** Anchor programs (`anchor-program/programs/*`) for escrow + run records; MagicBlock ephemeral rollups via `src/lib/api/magicblock.ts` (VRF integration). **Config:** Turbopack, path alias `@/*`, CORS globally applied to `/api/*`.

## Conventions

**Files:** Kebab-case for utils/contexts (`game-context.tsx`, `zone-loader.ts`); screens plain (`play.tsx`); types co-located in `{domain}.ts` files. **Imports:** Absolute `@/*` (web), relative (mobile); grouped: React → externals → types → utils → hooks. **Types:** PascalCase interfaces; string literal unions for enums. **Constants:** SCREAMING_SNAKE_CASE. **Components:** Functional, hooks-first; large state via context providers (GameContext), local state via useState. **Error handling:** Try-catch blocks with console.error; API routes return NextResponse with CORS headers. **Code style:** Deterministic RNG using seeded-random.ts; async/await for API calls; event handlers use useCallback to prevent re-renders.

## Testing

No automated testing configured. Recommend: **Next.js Jest** for web routes (add jest.config.js with Next.js preset), **Metro + Jest** for mobile (Expo preset). Test file convention: co-locate as `*.test.ts(x)` or use `__tests__/` folders. Add scripts: `"test": "jest"`, `"test:watch": "jest --watch"`. Coverage baseline: 60% minimum for critical paths (auth, staking, death records).

## Build & Run

**Install:** `npm install`. **Dev:** Web: `npm run dev` (localhost:3000); Mobile: `cd mobile && npm run start`, then `w`/`a`/`i`. **Build:** `npm run build` (web), `npm run build:web` (mobile export), `npm run build:android`/`build:ios` (EAS). **Lint:** `npm run lint`. **Env:** Copy `.env.example` to `.env.local`, populate: NEXT_PUBLIC_INSTANT_APP_ID, INSTANT_ADMIN_KEY, MAGICBLOCK credentials, Solana RPC. **Package manager:** npm.

## Critical Paths

**Auth (CRITICAL):** `/src/app/api/auth/wallet/route.ts` — Solana signature verification; `/mobile/lib/auth.ts` — wallet sign-in, token storage, session restore. **Staking (CRITICAL):** `/mobile/app/stake.tsx` — SOL input UI; `/mobile/lib/solana/escrow.ts` — Anchor escrow instructions, buildStakeInstruction(), GAME_POOL_PDA. **Death records (CRITICAL):** `/mobile/lib/instant.ts` — recordDeath, discoverCorpse, recordTip; `/src/lib/instant.ts` — Death/Corpse/Player schemas. **On-chain (CRITICAL):** `/src/lib/api/magicblock.ts` — ephemeral rollup execution, VRF randomness; `/anchor-program/programs/run_record/` — run record program. **Game logic hub:** `/mobile/lib/GameContext.tsx` — central state machine, ~1000 lines; `/mobile/lib/zone-loader.ts` — zone-aware dungeon generation. **Files requiring extra caution:** stake.tsx, auth.ts, instant.ts, escrow.ts, magicblock.ts, wallet/route.ts.

## Dependencies

**Web:** Next.js 16, React 19, @solana/web3.js 1.98.4, @instantdb/react 0.22.123, @coral-xyz/anchor 0.32.1, Tailwind 4, ESLint 9, TypeScript 5. **Mobile:** Expo SDK 54, React Native 0.81, React 19, same Solana/InstantDB versions, Tailwind 3 + NativeWind 4. **On-chain:** Anchor + Rust (constant_time_eq 0.3.1, security-critical). **Custom:** socialfi package (0.1.14, proprietary), seedrandom (deterministic RNG). **Pinned versions:** InstantDB (auth security), MagicBlock SDK 0.8.5 (ephemeral rollups). **No conflicts:** Solana/Anchor/React versions are aligned across platforms; stable and production-ready.

---

# RPI Workflow Rules

**These rules are fixed. Do not modify them.**

## Pre-Edit Gate

**Before calling Edit or Write on any source file, classify the task:**

```
TRIVIAL
  Criteria: Single file, under ~20 changed lines,
            no new abstractions, no changed interfaces
  Workflow: Implement directly — no RPI needed

NON-TRIVIAL
  Criteria: 2+ files, OR new/changed abstractions,
            OR modified interfaces/contracts,
            OR changed control flow across modules
  Workflow: Full RPI required — all three phases,
            no skipping
```

If uncertain, it is non-trivial. Do not call Edit or Write on source files until either (a) the task is trivial, or (b) `research.md` exists and `plan.md` has been approved.

**Bug fix mode:** When given a bug report, error log, or failing test — diagnose it autonomously. Do not ask the user to identify the root cause. The autonomy is about initiative and diagnosis, not about skipping process. A bug fix that meets the non-trivial criteria above still requires full RPI. Arrive at the plan on your own, then present it for approval as usual.

## Phase 1: Research

Before writing any code, investigate the codebase to gather ground truth.

1. **Explore** — Spawn a **single** Explore sub-agent to locate all relevant files, read and analyze them, and identify codebase patterns — all in one pass. Only split into multiple agents when the task spans multiple unrelated domains.
2. **Write research.md** — Aggregate findings into `research.md` (do not exceed 1000 lines). Use the structure in `templates/research.md`. Focus on file paths, key findings, risks, and open questions — skip exhaustive line-by-line analysis.
3. **Verify context budget** — After writing research.md, check context utilization. If above 30%, compact before proceeding.

### Research output requirements
- Specific file paths and line numbers, not vague references
- Existing patterns and conventions observed (not assumed)
- Dependencies and integration points that will be affected
- Known constraints or gotchas discovered during research
- Summary of current behavior in the relevant area

## Phase 2: Plan

Generate a detailed plan from research.md — do NOT plan from memory or re-research.

1. Read `research.md` into context.
2. Produce `plan.md` using the structure in `templates/plan.md`.
3. Every change must specify: exact file paths, line number ranges, what changes and why.
4. Include testing strategy, rollback strategy, and dependencies (what must be done before this change, what depends on it).
5. Present the plan to the human for review. **Do not implement until the plan is approved.**
6. If the plan is rejected or revised, update `plan.md` before proceeding.

## Phase 3: Implement

**Prerequisite check:** Confirm that `tasks/research.md` and `tasks/plan.md` exist and the plan has been approved. If either is missing, stop — you have skipped a phase.

Execute the approved plan. Do not improvise.

1. Follow the plan step by step. Deviations require a plan update first.
2. Keep changes minimal — only modify what the plan specifies.
3. Run tests after each logical unit of change, not just at the end.
4. If something unexpected is encountered, **stop** and return to Research for that sub-problem.
5. Commit frequently with messages that reference plan steps.
6. Track progress in `tasks/todo.md` — write checkable items from the plan, mark them as you go, and add a brief result summary for each completed step. Use the structure in `templates/todo.md`.
7. **Clean up artifacts** — After all todo.md steps are complete and verified, remove `tasks/research.md`, `tasks/plan.md`, and `tasks/todo.md`.

## Multi-Batch Plans

When a plan contains multiple independent batches (e.g., a code review with 6 fix batches), do NOT implement them all in one pass. Each batch is a separate unit of work in its own prompt.

1. During Phase 2, identify and list independent batches in the plan.
2. Execute one batch per prompt. The pre-edit gate applies per-batch — trivial batches can skip RPI, non-trivial batches get full RPI.
3. Compact between batches to keep context low.

---

# Compaction Rules

Context is a scarce resource. Compact proactively, not reactively. LLM reasoning quality degrades significantly above ~40% context utilization (the "Dumb Zone") — the 30-35% trigger below keeps a safety margin.

```
Context utilization reaches 30-35%
  → Compact immediately — summarize conversation,
    drop raw file contents

Research phase completes
  → Compact before starting the Plan phase

Switching between sub-problems
  → Compact before pivoting to the new sub-problem

New conversation starts
  → Never carry forward a previous session's full context
```

When compacting:
- Preserve: task description, file paths, key decisions, current phase, and artifact locations
- Drop: raw file contents already written to artifacts, verbose tool output, superseded analysis

---

# Sub-Agent Behaviors

**Recursion guard:** Sub-agents MUST NOT spawn further sub-agents or follow RPI. They are leaf tasks: read, search, and report.

### codebase-explorer (default for Research phase)
> Given this task: [TASK], do the following in a single pass:
> 1. Identify all relevant files, directories, and modules.
> 2. Read each relevant file and summarize: current behavior, key functions/classes, dependencies, and gotchas. Be specific with line numbers.
> 3. Identify naming conventions, testing patterns, error handling patterns, and architectural decisions in the relevant code.
> Return a structured report covering all three areas. Do NOT spawn sub-agents.

---

# General Rules

- Read code before modifying it. Do not propose changes to files you haven't read.
- Prefer editing existing files over creating new ones.
- Do not add features, refactoring, or "improvements" beyond what the plan specifies.
- Run the linter and test suite before considering any step complete.
- If a task seems too large, break it into sub-tasks that each follow RPI independently.

---

# Quality Standards

- **Verify before completing** — prove it works: run tests, check logs, diff against the target branch. "I think it works" is not verification.
- **Find root causes** — no band-aids or temporary fixes. Trace symptoms to their source and fix the actual problem. Apply senior-engineer judgment.
- **Surgical changes** — every changed line needs a reason traceable to the plan. If you can't explain why a line changed, revert it.
- **Demand elegance for non-trivial changes** — before implementing, pause and ask "is there a simpler way?" Skip this for mechanical or single-line fixes.
- **Self-assess** — before marking any step complete, ask: "Would a staff engineer approve this?" If the answer is no, revise before proceeding.

---

# Session-Start Validation

At the start of each session, run these lightweight checks (no sub-agents, under 30 seconds total):

1. **Leftover artifacts** — Check if `tasks/research.md`, `tasks/plan.md`, or `tasks/todo.md` exist from a previous session. If found, notify the developer and ask whether to clean up or resume.
2. **Unconfigured CLAUDE.md** — Scan the top half of CLAUDE.md for `[TEAM FILLS IN` markers or `<!-- TODO` comments. If found, mention that `/playbook-setup` can fill them in.
3. **Playbook version** — If `.playbook-version` exists, read it. If the installed date is older than 30 days, mention that `/playbook-update` can check for updates.
