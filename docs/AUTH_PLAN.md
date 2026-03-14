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
| Session restore on restart | 🔴 Broken | InstantDB session lost on restart for wallet users |
| Update-safe migration | 🔴 Broken | Migration condition bug, pre-migration builds unaffected |
| Email / magic code auth | ⏳ Planned | InstantDB built-in, no extra backend needed |

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

## Known Issues & Fixes Needed

### 1. Migration condition bug (high priority)

**File**: `mobile/app/_layout.tsx`

```typescript
// BUG: never fires for users upgrading from pre-migration builds (no stored version key)
if (stored && stored !== CURRENT_VERSION) {

// FIX:
if (!stored || stored !== CURRENT_VERSION) {
```

### 2. `die-forward-guest-id` not protected

**File**: `mobile/app/_layout.tsx` — `PROTECTED_KEYS` array

Currently missing `'die-forward-guest-id'` — gets wiped on version migration, breaking guest silent re-auth. Add it.

### 3. InstantDB session not restored for wallet users on restart

**File**: `mobile/lib/auth.ts`, `mobile/lib/GameContext.tsx`

- Add `customToken?: string` to `AuthState`
- Store `token` in `AuthState` when calling `signInWithToken` (in `signInWithWallet`, `signInAsGuest`, `linkWalletToGuest`)
- In `restoreAuth` (GameContext), for wallet users: try `db.auth.signInWithToken(storedAuth.customToken)` before restoring React state
- If token reuse fails → fall back to `isAuthenticated: false` so wallet auto-reconnect triggers fresh `signInWithWallet`

Backend: extend token TTL in `/api/auth/wallet` and `/api/auth/guest` if InstantDB admin SDK supports it.

### 4. ErrorBoundary doesn't clear InstantDB session

**File**: `mobile/app/_layout.tsx`

`handleReset` calls `clearNonIdentityStorage()` but doesn't call `db.auth.signOut()`. On mobile, the app re-renders without clearing InstantDB's in-memory state. Add `db.auth.signOut()` to `handleReset`.

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
