# Die Forward — Auth Plan

## Implementation Status (Feb 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Backend auth endpoints | ⚠️ Partial | Simplified — no signature verification yet |
| Phase 2: Frontend auth flow | ✅ Implemented | Wallet + guest flows working |
| Phase 3: Player records | ✅ Implemented | `players` table with `authId`, `authType` |
| Phase 4: Nickname flow | ✅ Implemented | NicknameModal + DB sync |
| Phase 5: InstantDB permissions | ❌ Not yet | Public read/write for now |
| Phase 6: Account linking | ✅ Implemented | LinkWalletModal |

---

## Current Auth Architecture

### Identity Model

```
WALLET USER                          GUEST USER
──────────────────────────────       ──────────────────────────────
authId  = wallet address             authId  = UUID (stored locally)
authType = 'wallet'                  authType = 'guest'
walletAddress = address              walletAddress = undefined
nickname ← DB is source of truth     nickname ← AsyncStorage is source of truth
```

### Source of Truth Rules (critical)

| State | Nickname source | Local cache |
|-------|----------------|-------------|
| Wallet auth | **InstantDB DB always wins** | Write-through cache only |
| Guest auth | AsyncStorage | IS the source |

**Why DB wins for wallet users:** The wallet address is stable across devices and sessions. The DB is the canonical store. Local cache is just for fast reads — it is always populated FROM the DB, never pushed TO the DB on sync.

### Disconnect = Full Logout

Calling `game.disconnect()` clears:
- All auth state (`isAuthenticated`, `authId`, `authType`)
- Local nickname cache (`AsyncStorage`)
- Prompted flag
- Guest progress flag
- Resets to `initialState`

---

## Auth Flows

### Wallet Flow

```
1. User taps "BIND WALLET"
   → wallet.connect() → walletAddress set
   → useEffect auto-authenticates (sets isAuthenticated: true, authId = walletAddress)
   → syncNickname useEffect fires
   → getOrCreatePlayerByAuth(authId, 'wallet')
   → DB nickname loaded, overwrites local cache
   → If default name (new user): show NicknameModal

2. User sets nickname via 🪦 NAME ✎ tap
   → Opens NicknameModal (pre-filled)
   → On confirm: write to DB first, then update local cache + state

3. User taps [logout]
   → Full reset: auth state + local storage cleared
```

### Guest Flow

```
1. User taps "EMPTY-HANDED"
   → signInAsGuest() → new UUID authId
   → syncNickname reads AsyncStorage first
   → If no local name: show NicknameModal
   → Guest player record created in DB

2. User sets nickname
   → Saved to AsyncStorage only (not DB-authoritative for guests)

3. No explicit logout needed (ephemeral session)
```

### Wallet Bind After Guest Session

```
Guest playing → taps "BIND WALLET" in The Toll
→ wallet.connect() runs
→ auto-auth fires → authType switches to 'wallet'
→ syncNickname fetches DB for this wallet address
→ DB record wins — local guest name is NOT carried over
→ If new wallet (no DB record): nickname prompt shown
→ If existing wallet: their DB name restored
```

**Design decision:** DB always wins when wallet auth is present. Guest names are ephemeral.

---

## Key Files

| File | Purpose |
|------|---------|
| `mobile/lib/GameContext.tsx` | Auth state machine, syncNickname, disconnect |
| `mobile/lib/auth.ts` | signInWithWallet, signInAsGuest, linkWalletToGuest helpers |
| `mobile/lib/instant.ts` | getOrCreatePlayerByAuth, updatePlayerNicknameByAuth |
| `mobile/app/stake.tsx` | Wallet connect UI, identity row (🪦), NicknameModal trigger |
| `mobile/components/NicknameModal.tsx` | Name entry modal (first-time + editing, initialValue prop) |
| `mobile/components/LinkWalletModal.tsx` | Guest → wallet linking UI |

---

## Simplified Auth (Current Implementation)

The planned signature verification (Phase 1) is not yet live. Current auth is:

```
Wallet: authId = walletAddress (no signature verification)
Guest:  authId = UUID stored in AsyncStorage via signInAsGuest()
```

This is sufficient for the current stage — ownership is implied by wallet address, not cryptographically proven. Full signature verification is a post-hackathon hardening task.

---

## syncNickname — Stale Async Protection

`syncNickname` runs in a `useEffect` and awaits DB calls. A `cancelled` flag prevents stale responses from writing state after logout:

```typescript
useEffect(() => {
  let cancelled = false;
  const syncNickname = async () => {
    const result = await getOrCreatePlayerByAuth(...);
    if (cancelled) return; // ignore if logged out while awaiting
    updateState({ nickname: result.player.nickname });
  };
  syncNickname();
  return () => { cancelled = true; };
}, [state.isAuthenticated, state.authId, ...]);
```

---

## Future Work

### Phase 5: InstantDB Permissions
```json
{
  "players": {
    "allow": {
      "view": "true",
      "create": "auth.id != null",
      "update": "auth.id in data.ref('authId')",
      "delete": "false"
    }
  }
}
```

### Phase 1: Signature Verification
Implement real wallet signature verification on the backend so wallet ownership is cryptographically proven, not just asserted.

### Email Claiming
Allow guest users to claim their account with an email address (magic link flow) to persist across device reinstalls.

---

## Testing Checklist

- [x] Wallet user sign-in (simplified, no signature)
- [x] DB nickname loads on wallet connect (auto-auth useEffect)
- [x] Empty-handed user gets unique guest ID
- [x] Nickname prompt for new wallet users (default name check)
- [x] Nickname prompt for new guests (no local name)
- [x] Nickname edits write to DB (wallet) or local (guest)
- [x] Disconnect = full logout, clears all state
- [x] Stale syncNickname cancelled on logout
- [x] Guest session → wallet bind → DB name wins
- [x] Deaths use nickname (not wallet address)
- [ ] InstantDB permissions
- [ ] Signature verification
- [ ] Email claiming
