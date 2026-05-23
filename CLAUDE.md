# Project Instructions

> These instructions are loaded automatically in every Claude Code session.

---

## Codebase Overview

Die Forward is a **social roguelite on Solana** (Phase 1 complete, Feb-Mar 2026) where players stake SOL, descend procedurally generated dungeons, and leave persistent corpses for others to discover. Built as a monorepo with Next.js web app (API + landing), Expo mobile app (primary gameplay), and Anchor smart contracts (escrow + run records). Active development; features: zone system, run modifiers, death milestones, inventory management, on-chain VRF randomness, Audius soundtrack integration. Mature codebase with recent optimizations.

## Architecture

**Frontend:** Next.js 16 (`src/app/{page,api/*}`) serves API routes and landing page; Expo Router (`mobile/app/*`) hosts mobile gameplay. **Shared state:** Mobile GameContext (`lib/GameContext.tsx`, ~1000 LOC) manages global game state; web/mobile sync via InstantDB. **Content engine:** `lib/content.ts` (~32k) defines bestiary, items, dungeon generation; `lib/zone-loader.ts` handles 5-zone system with zone-aware creature/item generation. **Progression:** `lib/modifiers.ts` (run modifiers), `lib/milestones.ts` (death milestones + perks). **Database:** InstantDB clients (`mobile/lib/instant.ts` for the app; `src/lib/db.ts` admin client for web API routes) manage Death, Corpse, Player schemas. **Auth:** Solana wallet signature verification (`src/app/api/auth/wallet/route.ts`), token-based session restore. **On-chain:** Anchor programs (`anchor-program/programs/*`) for escrow + run records; MagicBlock ephemeral rollups via `src/lib/magicblock.ts` (VRF integration). **Config:** Turbopack, path alias `@/*`, CORS globally applied to `/api/*`.

## Conventions

**Files:** Kebab-case for utils/contexts (`game-context.tsx`, `zone-loader.ts`); screens plain (`play.tsx`); types co-located in `{domain}.ts` files. **Imports:** Absolute `@/*` (web), relative (mobile); grouped: React → externals → types → utils → hooks. **Types:** PascalCase interfaces; string literal unions for enums. **Constants:** SCREAMING_SNAKE_CASE. **Components:** Functional, hooks-first; large state via context providers (GameContext), local state via useState. **Error handling:** Try-catch blocks with console.error; API routes return NextResponse with CORS headers. **Code style:** Deterministic RNG using seeded-random.ts; async/await for API calls; event handlers use useCallback to prevent re-renders.

## Testing

No automated testing configured. Recommend: **Next.js Jest** for web routes (add jest.config.js with Next.js preset), **Metro + Jest** for mobile (Expo preset). Test file convention: co-locate as `*.test.ts(x)` or use `__tests__/` folders. Add scripts: `"test": "jest"`, `"test:watch": "jest --watch"`. Coverage baseline: 60% minimum for critical paths (auth, staking, death records).

## Build & Run

**Install:** `npm install`. **Dev:** Web: `npm run dev` (localhost:3000); Mobile: `cd mobile && npm run start`, then `w`/`a`/`i`. **Build:** `npm run build` (web), `npm run build:web` (mobile export), `npm run build:android`/`build:ios` (EAS). **Local Android APK:** `cd mobile && npm run build:android:local` — flags `--prod` (release/signed/R8), `--metro` (live-reload), `--publish` (GitHub prerelease at `dev-<version>`); output `mobile/dist/`. See `mobile/BUILD_NOTES.md` and `mobile/docs/signing-secrets.md`. **Lint:** `npm run lint`. **Env:** Copy `.env.example` to `.env.local` at the repo root (web: `NEXT_PUBLIC_INSTANT_APP_ID`, `INSTANT_ADMIN_KEY`, MAGICBLOCK credentials, Solana RPC) and `mobile/.env.local` (mobile: `EXPO_PUBLIC_INSTANT_APP_ID` required, `EXPO_PUBLIC_SOLANA_RPC` / `EXPO_PUBLIC_API_URL` optional — inlined into the JS bundle at build time). **Package manager:** npm.

## Critical Paths

**Auth (CRITICAL):** `/src/app/api/auth/wallet/route.ts` — Solana signature verification; `/mobile/lib/auth.ts` — wallet sign-in, token storage, session restore. **Staking (CRITICAL):** `/mobile/app/stake.tsx` — SOL input UI; `/mobile/lib/solana/escrow.ts` — Anchor escrow instructions, buildStakeInstruction(), GAME_POOL_PDA. **Death records (CRITICAL):** `/mobile/lib/instant.ts` — recordDeath, discoverCorpse, recordTip; `/src/lib/db.ts` — Death/Corpse/Player schemas (web API). **On-chain (CRITICAL):** `/src/lib/magicblock.ts` — ephemeral rollup execution, VRF randomness; `/anchor-program/programs/run_record/` — run record program. **Game logic hub:** `/mobile/lib/GameContext.tsx` — central state machine, ~1000 lines; `/mobile/lib/zone-loader.ts` — zone-aware dungeon generation. **Files requiring extra caution:** stake.tsx, auth.ts, instant.ts, escrow.ts, magicblock.ts, wallet/route.ts.

## Dependencies

**Web:** Next.js 16, React 19, @solana/web3.js 1.98.4, @instantdb/react 0.22.123, @coral-xyz/anchor 0.32.1, Tailwind 4, ESLint 9, TypeScript 5. **Mobile:** Expo SDK 54, React Native 0.81, React 19, same Solana/InstantDB versions, Tailwind 3 + NativeWind 4. **On-chain:** Anchor + Rust (constant_time_eq 0.3.1, security-critical). **Custom:** socialfi package (0.1.14, proprietary), seedrandom (deterministic RNG). **Pinned versions:** InstantDB (auth security), MagicBlock SDK 0.8.5 (ephemeral rollups). **No conflicts:** Solana/Anchor/React versions are aligned across platforms; stable and production-ready.
