# Security Phase — Request Authentication & IDOR Closure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. This is a SECURITY phase — money/identity paths get Opus on implementation AND review.

**Goal:** Close the launch-blocking IDOR (spec §3.1 🔴): stop deriving the acting Player from unverified body `authId`/`walletAddress`. Verify the InstantDB `customToken` the client already holds, derive identity server-side, and reject body-asserted identity for balance-mutating paths. Restore authenticated admin settings writes (broken by 3b's perms-deny). Add a cron secret to cleanup.

**Architecture (from extraction — binding):** Post-login the client holds `AuthState.customToken` (an InstantDB token minted by `db.auth.createToken({email})`; email = `<authId>@wallet.dieforward.com` or `<guestId>@guest.dieforward.com`). The admin SDK's `db.auth.verifyToken(token)` (uses `INSTANT_ADMIN_KEY`, already present) returns `{ email, id }` — the server derives `authId` by stripping the domain suffix (exact inverse of `mobile/lib/instant.ts:150-152`). Client sends the token as `Authorization: Bearer <customToken>`. **No new client crypto.** Offline-local guests (`guest-offline-*`) have no token — they remain client-authoritative and are already firewalled from leaderboard/coins (Phase 3b), so they may only do free/unbound runs.

**The IDOR chain:** only `/api/session/start` establishes identity from the body (coin debit + stat attribution); `advance`/`death`/`victory` inherit `session.authId` and are gated by the unguessable per-session `token` (UUID v4). So fixing `start` closes the money IDOR; the others need only a defense-in-depth cross-check.

**Spec:** §3.1 🔴 gate (A1). This phase does the "authenticate the request, derive Player from the authenticated principal, reject body-asserted mismatch" work named there.

## Global Constraints

- Prior constraints carry (both roots' suites green: mobile 322 / root 139 baselines; `npx tsc --noEmit` both roots per task; conventional commits; one task per commit).
- **No new client crypto; no new required env secret** (reuse `INSTANT_ADMIN_KEY` + the existing `NEXT_PUBLIC_ADMIN_WALLETS` allowlist; a cron secret is an OPTIONAL env with a documented default-deny-in-prod).
- **Graceful degradation:** a valid token → identity is the verified authId (overrides body). No token → the run may proceed ONLY as free/unbound (coin-mode start REQUIRES a valid token and 403s without it); such runs are untrusted and already firewalled.
- SOL/escrow/on-chain paths and the coin-economy math UNTOUCHED. This phase changes only WHO the server believes the caller is.
- Every server auth primitive is a pure/mockable function with tests (route handlers have zero test coverage today — build the testable core).

---

### Task 1: Auth core — verifyAuthToken + deriveAuthId (pure + mockable)

**Files:** Create `src/lib/auth-server.ts`; test `src/lib/__tests__/auth-server.test.ts`.

**Interfaces (produces — consumed by Tasks 2-5):**
```ts
// Pure — the exact inverse of the client's email→authId strip
export function deriveAuthIdFromEmail(email: string | null | undefined): string | null;
//   'ABC@wallet.dieforward.com' -> 'ABC'; 'g-1@guest.dieforward.com' -> 'g-1'; unknown domain / null -> null
export interface AuthedIdentity { authId: string; email: string; instantUserId: string; }
// Verifies the Bearer token via db.auth.verifyToken; returns null on absent/invalid.
// Takes the verify fn injected for testability: verifyAuthToken(req, verifyToken?) 
export async function verifyAuthToken(
  req: Request,
  deps?: { verifyToken: (token: string) => Promise<{ email?: string; id?: string } | null> }
): Promise<AuthedIdentity | null>;
export function isAdminAuthId(authId: string | null): boolean; // authId ∈ NEXT_PUBLIC_ADMIN_WALLETS (server-read) + hardcoded fallback
```
`verifyAuthToken` extracts `Authorization: Bearer <token>` (also accept `token` in body as fallback for routes that already parse a body — document), calls the injected/real `db.auth.verifyToken`, maps to AuthedIdentity via `deriveAuthIdFromEmail`. Real dep default: `(t) => adminDb.auth.verifyToken(t)`.

- [ ] TDD: deriveAuthIdFromEmail (wallet/guest/unknown/null/malformed), verifyAuthToken with a mock verifyToken (valid→identity, invalid→null, missing header→null, malformed bearer→null), isAdminAuthId (in-list, fallback wallet, not-in-list, null). Root jest + both tsc. Commit `feat: server auth core — verify InstantDB token, derive authId`.

---

### Task 2: Client sends the token (api.ts + auth state access)

**Files:** Modify `mobile/lib/api.ts` (add Authorization header to session/game/player POSTs), confirm how `customToken` is reachable (from AuthState — extraction: `mobile/lib/auth.ts` persists it; find the getter GameContext/api use, or thread it).

**Binding:** `startSession`, `advanceRoom`, `recordDeath`, `claimVictory`, `syncProfileToTapestry`, `likeDeath` include `Authorization: Bearer <customToken>` when a token is available (read from persisted auth state / the auth module). No token available (offline-local guest) → header omitted (server degrades per Task 3). Do NOT remove the existing body fields yet (server transitions to preferring the token but tolerates absence) — backward-safe.

- [ ] Add a small `authHeader()` helper in api.ts (or reuse an auth-state accessor). Tests: extend api-adjacent pure tests if a helper is extracted; else the mobile suite must stay green + tsc. Commit `feat: client sends InstantDB auth token on session/game requests`.

---

### Task 3: start route — verified identity, coin-mode requires token (OPUS — THE money IDOR fix)

**Files:** Modify `src/app/api/session/start/route.ts`.

**Binding:**
- Call `const identity = await verifyAuthToken(req)` early. 
- **Coin-mode (`stakeMode==='coins'` / `coinStake>0`): REQUIRE `identity` (403 `{error:'auth required for coin staking'}` if null); the player is looked up by `identity.authId` ONLY — body `authId`/`walletAddress` are ignored for identity. If body `authId` is present and ≠ `identity.authId`, 403 (explicit mismatch rejection per the spec).**
- SOL/free modes: if `identity` present, use `identity.authId` as the authoritative authId (override body); if absent, fall back to body authId (untrusted — these runs can't touch balances; the leaderboard firewall already blocks offline). `walletAddress` for the SOL payout address stays body-supplied (the on-chain stake tx already binds it; SOL payout correctness is escrow's concern, out of scope) — but stats attribution uses the verified authId when present.
- Session row stores the RESOLVED authId (verified when available). Everything downstream (death/victory) inherits it.
- Keep the atomic coin deduction (3b) exactly; only the identity SOURCE changes.

- [ ] Extract any decision worth testing (e.g. `resolveStartIdentity({identity, bodyAuthId, bodyWallet, stakeMode})` → `{authId, reject?: string}`) into auth-server.ts or coins.ts + TDD (coin+no-token→reject; coin+mismatch→reject; coin+match→verified; sol+token→verified overrides body; sol+no-token→body). Root jest + both tsc + mobile suite. Commit `fix: start derives identity from verified token; coin staking requires auth`.

**Reviewer checklist:** trace that no body-asserted authId reaches a balance read/write in coin-mode; the coin deduction still atomic; SOL/free byte-identical apart from authId source; a legit online coin run (token present, matching) still works end-to-end.

---

### Task 4: death/victory/advance defense-in-depth + agent/cleanup notes (OPUS)

**Files:** Modify `src/app/api/session/{death,victory,advance}/route.ts`; `src/app/api/session/cleanup/route.ts`; `src/app/api/agent/action/route.ts` (+ `agent/state`).

**Binding:**
- death/victory/advance already inherit `session.authId` (extraction confirmed — they do NOT read identity from the body except `playerName` display fallback). Add defense-in-depth: if a token is present AND `identity.authId !== session.authId`, 403 (a caller with a valid token for a different account can't drive someone else's session even if they somehow hold the token). If no token, the unguessable session token remains the gate (unchanged). Confirm no body identity field influences money/stats.
- **cleanup:** add an optional `CRON_SECRET` guard — if `process.env.CRON_SECRET` is set, require `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret` header); if unset, allow (dev) but log a warning. Documents the intended cron-only access without breaking the existing Vercel cron (which can send the header).
- **agent/action + agent/state:** these key off raw `sessionId` (a row id, weaker than the secret token) and are driven by an EXTERNAL harness this repo doesn't control. Do NOT change their contract (would break the harness). Add a code comment documenting the weaker gate + that agent runs grant no coins/stats (3b-8), so the exposure is grief-only on agent sessions; record it in the spec as residual/accepted with the harness-coupling rationale.

- [ ] Tests for any extracted cross-check helper; both tsc + suites. Commit `fix: session routes reject cross-account tokens; cleanup cron guard; agent auth noted`.

---

### Task 5: Authenticated admin settings route (un-break 3b perms) (OPUS-review)

**Files:** Create `src/app/api/admin/settings/route.ts` (POST); modify `src/app/admin/page.tsx` (route the 8 gameSettings writes through it with the admin's token); verify the existing `/api/admin/bestiary` + `/api/admin/content` POSTs gain the same guard.

**Binding:**
- New POST verifies `verifyAuthToken(req)` → `isAdminAuthId(identity.authId)` (403 otherwise), then performs the gameSettings write via the ADMIN db (bypasses the 3b perms-deny). Accepts `{ settings: Partial<GameSettings> }`; validates keys against a whitelist of known settings fields (reject unknown keys — prevents writing arbitrary fields like a forged coinPool via a typo'd path).
- admin/page.tsx `saveSettings`/`saveStakingPosture`/`toggleZone`/`saveAmbientTrack`: replace direct `db.transact([tx.gameSettings...])` with a POST to the new route including the admin's `customToken` as Bearer (the page has the connected-wallet session; get its token). The client-side wallet-allowlist UI gate stays as a UX nicety; the SERVER is now authoritative.
- Existing `/api/admin/bestiary` + `/api/admin/content` POST routes: add the same `verifyAuthToken`+`isAdminAuthId` guard at the top (they're currently unauthenticated).
- This RESTORES admin editing that 3b's perms-deny broke, now properly authenticated.

- [ ] Test the key-whitelist validation (pure) + isAdminAuthId gate logic; both tsc + suites. Commit `feat: authenticated admin settings route (restores editing behind real auth)`.

---

### Task 6: Docs — resolve the 🔴 gate

**Files:** `docs/superpowers/specs/2026-07-04-the-shift-design.md` (§3.1: flip the 🔴 LAUNCH-BLOCKING gate to ✅-with-scope — request auth via verified InstantDB token shipped; coin-mode requires auth; admin authenticated; residuals: offline-local guests client-authoritative by design, agent routes weaker-gated but grant nothing, SOL payout address still body-supplied but on-chain-bound, no server-side nonce replay store [±5min window on login]); Appendix E A1 done-note; CLAUDE.md (auth model sentence); `docs/localization/RETRY_MANIFEST.md` if any new user-facing strings (likely none — error messages can stay English server-side).

- [ ] Verify claims against code; commit `docs: request-auth hardening shipped; IDOR gate resolved with documented residuals`.

---

## Self-Review

- **Coverage:** the spec's A1 request-auth work — verify token (T1), client sends it (T2), start derives verified identity + coin-mode requires auth (T3, the money IDOR), cross-account rejection + cleanup/agent hardening (T4), authenticated admin restoring 3b-broken editing (T5). Residuals explicitly documented (T6): offline-local guests, agent-route gating, SOL payout address, login nonce replay window — each with rationale, none balance-mutating.
- **Placeholder scan:** none; the email domains and env names are exact from extraction.
- **Type consistency:** `deriveAuthIdFromEmail`/`verifyAuthToken`/`AuthedIdentity`/`isAdminAuthId` (T1) consumed T3-T5; `resolveStartIdentity` (T3) + admin key-whitelist (T5) local + tested.
- **Risk notes:** T3 is THE fix — its reviewer must confirm no body authId reaches a balance op in coin-mode and that a legit online coin run still works. T2's token-availability (offline guests have none) must not break free play. T5 must not lock out admins (verify the token→allowlist path with the real hardcoded fallback wallet).
