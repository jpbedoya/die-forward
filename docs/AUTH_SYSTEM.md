# Die Forward — Auth System

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Backend auth endpoints | ✅ Done | `/auth/wallet`, `/auth/guest`, `/auth/link-wallet` |
| Frontend wallet auth | ✅ Done | Wallet sign + nacl signature verification |
| Frontend guest auth | ✅ Done | UUID guestId, persistent via AsyncStorage |
| Player records | ✅ Done | `players` table, `authId` / `authType` |
| Nickname flow | ✅ Done | DB-wins for wallet, local-first for guest |
| InstantDB permissions | ✅ Done | Players self-only, deaths immutable |
| Account linking | ✅ Done | Guest → wallet merge, `link-wallet` backend route |
| Wallet signature verification | ✅ Done | Full nacl verification live, SKIP_VERIFICATION removed |
| Session restore on restart | ✅ Fixed | `restoreAuth` in `GameContext.tsx` now calls `signInWithToken(stored.customToken)` for wallet users when a migration cleared storage; on a normal restart it deliberately skips the call since InstantDB's own session persisted (see code comments at `GameContext.tsx` ~L393-406) |
| Update-safe migration | ✅ Fixed | `mobile/app/_layout.tsx` migration condition is now `if (!stored \|\| stored !== CURRENT_VERSION)`, firing for pre-migration builds with no stored version key; `die-forward-guest-id` is present in `PROTECTED_KEYS` |
| Email / magic code auth | ⏳ Planned | InstantDB built-in, no extra backend needed |
| Request auth (security phase) | ✅ Done | Verified InstantDB customToken required for coin-mode session/start, cross-account rejection, admin-route gating, deny-by-default perms, cron secret — see new section below |

---

## How InstantDB Auth Works

InstantDB uses custom auth tokens to link an external identity (wallet, guest ID, email) to an InstantDB user record:

1. **Backend** (admin SDK): `db.auth.createToken({ email: identifier })` → short-lived custom JWT
2. **Frontend** (client SDK): `db.auth.signInWithToken(token)` → InstantDB creates an internal session

InstantDB is designed to persist this session internally using IndexedDB. **React Native does not have native IndexedDB**, so InstantDB's session storage fails silently and the session is lost on every app restart.

### The consequence

The app maintains a parallel auth state in `die-forward-auth` (AsyncStorage) so the user appears logged in after restart. But `restoreAuth` in `GameContext.tsx` never calls `signInWithToken` again — so InstantDB has no session while React thinks the user is authenticated. Queries eventually fail → crash.

---

## Current Architecture

### Identity Model

```
WALLET USER                          GUEST USER
──────────────────────────────       ──────────────────────────────
authId  = wallet address             authId  = "guest-<uuid>"
authType = 'wallet'                  authType = 'guest'
email   = addr@wallet.dieforward.com email   = guestId@guest.dieforward.com
nickname ← DB is source of truth     nickname ← AsyncStorage only
InstantDB token ← signed challenge   InstantDB token ← /api/auth/guest (silent)
```

### AsyncStorage Keys

| Key | Protected | Purpose |
|-----|-----------|---------|
| `die-forward-auth` | ✅ | Full auth state (AuthState JSON) |
| `die-forward-nickname` | ✅ | Cached nickname |
| `die-forward-nickname-prompted` | ✅ | Has user been prompted? |
| `die-forward-guest-id` | ✅ | Guest UUID for silent re-auth |
| `audio-master-enabled` | ✅ | Audio setting |
| `audio-sfx-enabled` | ✅ | Audio setting |
| `audio-ambient-volume` | ✅ | Audio setting |
| `APP_BUILD_VERSION` | (set on launch) | Version migration gating |
| `die-forward-guest-progress` | — | Guest progress flag, safe to clear |

### Source of Truth

| State | Nickname | Auth |
|-------|----------|------|
| Wallet | **InstantDB DB wins** | Wallet address stable across sessions |
| Guest | **AsyncStorage only** | guestId stored locally |

---

## Auth Flows

### Wallet Sign-In (Full Flow)

```
1. User taps "BIND WALLET"
   → wallet.connect() → unified wallet hook fires
   → auto-auth useEffect triggers signInWithWallet(address, signMessage)

2. signInWithWallet()
   → generates challenge message + nonce
   → requests wallet signature (user approval required)
   → POST /api/auth/wallet { walletAddress, signature, message }
   → backend: verifies nacl signature, creates InstantDB custom token
   → db.auth.signInWithToken(token) — InstantDB session created
   → stores AuthState in die-forward-auth (including customToken)
   → returns AuthState

3. syncNickname useEffect fires
   → getOrCreatePlayerByAuth(authId, 'wallet')
   → DB nickname loaded
   → If new user (default name): NicknameModal shown
```

### Guest Sign-In (Silent)

```
1. User taps "EMPTY-HANDED" — OR — app restores guest session on startup

2. signInAsGuest()
   → reads existing guestId from die-forward-guest-id (if any)
   → POST /api/auth/guest { existingGuestId }
   → backend: creates new token for existing guest, or creates new guestId
   → db.auth.signInWithToken(token) — InstantDB session created
   → stores AuthState in die-forward-auth (including customToken)
   → returns AuthState

3. syncNickname fires — reads AsyncStorage (not DB) for guest
```

### Session Restore on App Restart

```
restoreAuth() — runs on mount

WALLET user:
  → read die-forward-auth → has customToken?
  → try db.auth.signInWithToken(customToken) [silent]
    → SUCCESS: restore React auth state ✅
    → FAIL (expired): set walletAddress but isAuthenticated=false
      → wallet auto-connects → auto-auth useEffect fires
      → signInWithWallet() runs (requires wallet signature, once)

GUEST user:
  → always calls signInAsGuest() silently
  → uses stored guestId → new token from backend → signInWithToken
  → fully transparent to user ✅
```

### Guest → Wallet Upgrade

```
Guest playing → taps "BIND WALLET" in The Toll
→ wallet.connect()
→ auto-auth useEffect: sees isAuthenticated && authType === 'guest'
→ calls linkWalletToGuest(address, signMessage)
  → signs challenge, POST /api/auth/link-wallet { guestAuthId, walletAddress, ... }
  → backend merges guest + wallet records
  → db.auth.signInWithToken(walletToken)
  → authType upgraded to 'wallet', die-forward-guest-id cleared
→ syncNickname re-fires → DB wins for wallet users
```

---

## Planned: Email / Magic Code Auth

**No backend changes needed.** Uses InstantDB's built-in magic code flow.

```typescript
// Send code
await db.auth.sendMagicCode({ email })

// Verify and sign in
await db.auth.signInWithMagicCode({ email, code })
// → user.refresh_token available → store it → same restore pattern
```

Auth type: `authType: 'email'` — add to union in `AuthState`.

Nickname: treated like wallet (DB source of truth, since email is stable identity).

No wallet, no backend route. InstantDB handles user creation automatically.

---

## Known Issues (Resolved)

The four issues formerly tracked here are all fixed in current code (re-verified July 2026):

### 1. Migration condition bug — FIXED

**File**: `mobile/app/_layout.tsx`

The stale condition (`if (stored && stored !== CURRENT_VERSION)`, which never fired for pre-migration builds with no stored version key) is now:

```typescript
if (!stored || stored !== CURRENT_VERSION) {
```

### 2. `die-forward-guest-id` protection — FIXED

**File**: `mobile/app/_layout.tsx` — `PROTECTED_KEYS` array now includes `'die-forward-guest-id'`, so it survives version migration and guest silent re-auth keeps working.

### 3. InstantDB session restore for wallet users on restart — FIXED

**File**: `mobile/lib/GameContext.tsx` (`restoreAuth`, ~L379-450)

`AuthState` carries `customToken`. On restart, `restoreAuth` only calls `db.auth.signInWithToken(stored.customToken)` for wallet users when a migration just cleared storage (`migrationClearedStorage`); on a normal restart it deliberately skips the call because InstantDB's own session already persisted, avoiding disrupting live queries. If token reuse fails, the code falls back so wallet auto-reconnect triggers a fresh `signInWithWallet`.

### 4. ErrorBoundary clearing InstantDB session — FIXED

**File**: `mobile/app/_layout.tsx` — `handleReset` calls `db.auth.signOut()` (warning-logged on failure) before `clearNonIdentityStorage()`.

---

## Request authentication (security phase)

Beyond the InstantDB sign-in flows above (which establish *who the client claims to be*), a dedicated security phase added server-side verification of *what the client is claims to be doing*, closing money-relevant IDOR gaps. Canonical implementation: `src/lib/auth-server.ts`.

### Bearer customToken verification

- Game/session API routes accept `Authorization: Bearer <customToken>` (the same InstantDB refresh token stored client-side as `AuthState.customToken`).
- `verifyAuthToken(req)` extracts the token (header, with a body-`token`-field fallback only when the header is fully absent), calls the InstantDB admin SDK's `db.auth.verifyToken`, and maps the verified email back to an `authId` via `deriveAuthIdFromEmail` (inverse of the `<authId>@wallet.dieforward.com` / `<authId>@guest.dieforward.com` construction in `mobile/lib/instant.ts`).
- Fails closed: any missing/invalid/expired token, or an email that doesn't match the known wallet/guest suffixes, yields `null` — never a partial or best-effort identity.

### Coin-mode `session/start` requires a verified token

- `resolveStartIdentity` (`src/lib/auth-server.ts`) is money-touching-aware: when `isCoinMode` is true (stake mode `coins` or `coinStake > 0`), a missing verified identity rejects with 403 (`"Authentication required for coin staking"`), and a body `authId` that disagrees with the verified identity also rejects 403 (explicit impersonation attempt).
- The resolved `authId` for a coin run is **always** the verified token's `authId` — body-supplied `authId`/`walletAddress` are never used to locate or debit a balance.
- SOL/free modes keep today's behavior (can't touch coin balances) but still prefer a verified identity when present; `src/app/api/session/start/route.ts` stamps the session with `authVerified: idResult.verified`, gating downstream currency/leaderboard writes.

### `authVerified` gates coin earn + player-row writes

- `session/death` and `session/victory` compute `authVerified = session.authVerified === true || stakeMode === 'coins'` (the `stakeMode === 'coins'` clause is a backward-compat allowance for in-flight coin sessions created before `authVerified` existed).
- Granted coin delta, streak updates, and player-row writes are all conditioned on `player && authVerified` — an unverified session cannot mutate a player's `paleCoins`/streak/stats even if it reaches the death/victory route.

### Cross-account session rejection

- `death`/`victory`/`advance` all call `verifyAuthToken` and then `sessionAuthMismatch(identity, session.authId)`: if the caller holds a *valid* token for a *different* account than the session's own stored `authId`, the request is rejected.
- Deliberately fail-open on absence (no token, or a legacy session with no stored `authId`) — the secret session token remains the baseline gate in those cases; only a confirmed, non-empty mismatch is treated as cross-account and rejected.

### Admin route gating

- `/api/admin/settings` (plus `/admin/bestiary`, `/admin/content`) call `verifyAuthToken` + `isAdminAuthId(identity.authId)`, rejecting unauthenticated or non-admin callers. The admin allowlist comes from `NEXT_PUBLIC_ADMIN_WALLETS` (server-read, comma-split) plus one hardcoded fallback wallet.
- `coinPool` is excluded from the admin route's writable settings whitelist — it's server/settlement-only, never admin-editable via this endpoint.

### `instant.perms.ts` deny-by-default for money/state namespaces

- `gameSettings`, `runReceipts`, `sessions`, `worldShifts`: client `view: "true"` (read-only) but `create`/`update`/`delete: "false"` — all writes are server-only (via the admin client, which bypasses perms).
- `reports`: `view: "false"`, `create: "auth.id != null"` (any authenticated client may file a report), `update`/`delete: "false"` — prevents report tampering and reporter enumeration.

### Cron secret guard

- `session/cleanup`, `/api/game/shift` (cron path), and `/api/game/dispatch` require `CRON_SECRET` via `Authorization: Bearer <secret>` or `x-cron-secret` when the env var is set. If `CRON_SECRET` is unset, the routes stay open (dev convenience) but log a one-time warning that the endpoint is unguarded.
- Cron routes accept both GET (Vercel Cron's native invocation) and POST.

### Known launch residuals (documented, not yet closed)

Per `CLAUDE.md` and the spec's residuals list — grief-only on devnet, not full money-safety holes, but must close before coins carry real value:

- A5 community-aggregation counting still keys sybil-resistance off `walletAddress` rather than a stronger identity signal.
- `players` perms lack an ownership check — any authenticated client can currently write another player's `paleCoins` directly via InstantDB client writes (separate from the session-route IDOR fixes above, which govern the API routes, not raw client DB writes).
- `CRON_SECRET` must be set in production before launch (currently open-and-warn if unset).
- Offline-local guests remain client-authoritative by design (no server round-trip to abuse), and the SOL payout address is still body-supplied, bound on-chain by the stake transaction itself.

---

## Key Files

| File | Purpose |
|------|---------|
| `mobile/lib/auth.ts` | Auth primitives: signInWithWallet, signInAsGuest, linkWalletToGuest |
| `mobile/lib/GameContext.tsx` | Auth state machine, restoreAuth, syncNickname |
| `mobile/lib/instant.ts` | db init, getOrCreatePlayerByAuth, updatePlayerNicknameByAuth |
| `mobile/app/_layout.tsx` | Version migration, PROTECTED_KEYS, ErrorBoundary |
| `src/app/api/auth/wallet/route.ts` | Wallet signature verification, token creation |
| `src/app/api/auth/guest/route.ts` | Guest token creation / re-auth |
| `src/app/api/auth/link-wallet/route.ts` | Guest → wallet merge |

---

## getOrCreatePlayerByAuth Safeguards

1. **Wallet fallback**: If authId lookup returns nothing, falls back to `walletAddress` lookup
2. **AuthId drift correction**: Non-wallet authId on a wallet user auto-corrected to wallet address
3. **Guest ID protection**: Guest ID can never overwrite a wallet user's `authId`
4. **Stale async protection**: `cancelled` flag in `syncNickname` prevents stale DB writes after logout

---

## Leaderboard Rules

Players appear in RANKS if:
- `highestRoom > 0` (has actually played)
- Nickname is not `"Wanderer"` (default guest fallback)
- Nickname doesn't match wallet-address format (`AB12...XY78`)

---

## Testing Checklist

- [x] Wallet sign-in with nacl signature verification
- [x] DB nickname loads on wallet connect
- [x] Empty-handed → unique guestId
- [x] Nickname prompt for new wallet users
- [x] Nickname prompt for new guests (no local name)
- [x] Nickname edits → DB (wallet) or AsyncStorage (guest)
- [x] Disconnect = full logout + state clear
- [x] Stale syncNickname cancelled on logout
- [x] Guest → wallet upgrade → DB name wins
- [x] Deaths use nickname (not wallet address)
- [x] Wallet auth: real InstantDB token via backend
- [x] Guest re-auth: existingGuestId → same identity
- [x] disconnect() clears InstantDB session + all local storage
- [x] InstantDB perms: players self-only, deaths immutable
- [ ] Session restore without wallet signature (token reuse)
- [ ] Update migration fires for pre-migration builds
- [ ] guest-id preserved across updates
- [ ] Email magic code auth
