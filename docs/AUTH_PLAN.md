# Die Forward — Unified Auth Plan

## Overview

Replace ad-hoc wallet address tracking with proper InstantDB authentication. Single identity system for all users — wallet or empty-handed.

---

## Current State (Problems)

| Issue | Current | Impact |
|-------|---------|--------|
| Wallet users | `walletAddress` as ID | No real auth, anyone can claim any address |
| Empty handed | All share `demo-wallet` | No unique identity, can't track progress |
| Nicknames | Stored in localStorage + players table | Disconnected from auth |
| Permissions | None | Can't protect user data |

---

## Target State

```
┌─────────────────────────────────────────────────────────────┐
│                    InstantDB Auth                           │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│   WALLET USER                    EMPTY HANDED USER          │
│   ────────────                   ─────────────────          │
│   1. Connect wallet              1. Tap "Empty Handed"      │
│   2. Sign message                2. InstantDB guest session │
│   3. Backend verifies            3. Auto auth.id assigned   │
│   4. createToken(walletAddr)     4. Nickname prompt         │
│   5. signInWithToken             5. Player record created   │
│   6. Nickname prompt (first)                                │
│   7. Player record created                                  │
│                                                             │
│   auth.id = wallet address       auth.id = instant-gen UUID │
│                                                             │
│   UPGRADE PATH (future)                                     │
│   ─────────────────────                                     │
│   Empty handed → Connect wallet → Link accounts             │
│   Empty handed → Enter email → Claim account                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Backend Auth Endpoints

**New API routes:**

```
POST /api/auth/wallet
  - Input: { walletAddress, signature, message }
  - Verify signature (proves wallet ownership)
  - Call db.auth.createToken({ id: walletAddress })
  - Return { token }

POST /api/auth/guest  
  - No input required
  - Generate unique guest ID (or let InstantDB do it)
  - Call db.auth.createToken({ id: guestId })
  - Return { token, guestId }
```

**Signature verification (Solana):**
```ts
import nacl from 'tweetnacl';
import bs58 from 'bs58';

function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): boolean {
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = bs58.decode(signature);
  const publicKeyBytes = bs58.decode(walletAddress);
  return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
}
```

**Message format:**
```
Sign in to Die Forward
Nonce: {timestamp}-{random}
```

### Phase 2: Frontend Auth Flow

**Wallet connection:**
```ts
async function signInWithWallet() {
  // 1. Connect wallet (existing flow)
  const address = await wallet.connect();
  
  // 2. Create sign-in message with nonce
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const message = `Sign in to Die Forward\nNonce: ${nonce}`;
  
  // 3. Request signature from wallet
  const signature = await wallet.signMessage(new TextEncoder().encode(message));
  
  // 4. Send to backend for verification
  const { token } = await fetch('/api/auth/wallet', {
    method: 'POST',
    body: JSON.stringify({ 
      walletAddress: address, 
      signature: bs58.encode(signature),
      message 
    }),
  }).then(r => r.json());
  
  // 5. Sign in to InstantDB
  await db.auth.signInWithToken(token);
  
  // 6. Check if first time → show nickname modal
}
```

**Empty handed:**
```ts
async function signInAsGuest() {
  // 1. Request guest token from backend
  const { token, guestId } = await fetch('/api/auth/guest', {
    method: 'POST',
  }).then(r => r.json());
  
  // 2. Sign in to InstantDB
  await db.auth.signInWithToken(token);
  
  // 3. Store guestId locally (for display/reference)
  await AsyncStorage.setItem('guest-id', guestId);
  
  // 4. Show nickname modal (always for new guests)
}
```

### Phase 3: Player Records

**Schema update:**
```ts
// players table
{
  id: string,              // InstantDB entity ID
  authId: string,          // auth.id (wallet address OR guest UUID)
  authType: 'wallet' | 'guest' | 'email',
  walletAddress?: string,  // Only for wallet users
  email?: string,          // Only if claimed via email
  nickname: string,
  // ... stats
}
```

**On first auth (either type):**
```ts
async function ensurePlayerRecord(authId: string, authType: string, walletAddress?: string) {
  const existing = await db.query({
    players: { $: { where: { authId } } }
  });
  
  if (existing.players.length === 0) {
    // Create new player
    await db.transact(
      tx.players[id()].update({
        authId,
        authType,
        walletAddress,
        nickname: 'Wanderer', // Default until set
        totalDeaths: 0,
        // ... other defaults
      })
    );
    return { isNew: true };
  }
  return { isNew: false, player: existing.players[0] };
}
```

### Phase 4: Nickname Flow

**Trigger nickname modal:**
- Wallet user: first sign-in OR nickname is default
- Empty handed: always on first session

**Nickname modal:**
```
┌─────────────────────────────────────┐
│                                     │
│     What should we call you?        │
│                                     │
│     ┌─────────────────────────┐     │
│     │  [nickname input]       │     │
│     └─────────────────────────┘     │
│                                     │
│     [ Skip ]        [ Confirm ]     │
│                                     │
│     (Skip = "Wanderer")             │
│                                     │
└─────────────────────────────────────┘
```

**Save nickname:**
```ts
async function saveNickname(nickname: string) {
  const user = db.useAuth().user;
  await db.transact(
    tx.players[playerId].update({ nickname })
  );
  await AsyncStorage.setItem('nickname-set', 'true');
}
```

### Phase 5: Permissions (instant.perms.ts)

```json
{
  "players": {
    "allow": {
      "view": "true",
      "create": "auth.id != null",
      "update": "auth.id in data.ref('authId')",
      "delete": "false"
    }
  },
  "deaths": {
    "allow": {
      "view": "true",
      "create": "auth.id != null",
      "update": "false",
      "delete": "false"
    }
  }
}
```

---

## Migration

**Existing players (wallet):**
1. On next sign-in, go through new wallet auth flow
2. Match by walletAddress, update authId = walletAddress

**Existing deaths/data:**
- Keep as-is, still queryable
- New deaths linked to auth.id

---

### Phase 6: Account Linking (Empty Handed → Wallet)

Allow empty handed users to upgrade their account by connecting a wallet, preserving all their progress.

**UI Trigger:**
- Profile/settings area: "Connect Wallet to Save Progress"
- Or prompt after N deaths / reaching certain depth

**Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│  EMPTY HANDED USER CONNECTS WALLET                          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  1. User taps "Connect Wallet" (already playing as guest)   │
│  2. Wallet connects → get address                           │
│  3. Sign message (same as normal wallet auth)               │
│  4. Backend verifies signature                              │
│  5. Check: does this wallet already have an account?        │
│     ├─ YES → Merge accounts (see below)                     │
│     └─ NO  → Link wallet to current guest account           │
│  6. Update player record:                                   │
│     - walletAddress = new address                           │
│     - authType = 'wallet'                                   │
│     - authId = wallet address (migrate from guest UUID)     │
│  7. Re-auth with wallet token                               │
│  8. All history preserved under new auth                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Backend endpoint:**
```
POST /api/auth/link-wallet
  - Input: { guestAuthId, walletAddress, signature, message }
  - Verify signature
  - Check for existing wallet account
  - If exists: merge flow (combine stats, keep higher values)
  - If not: update guest player record with wallet
  - Return { token, merged: boolean }
```

**Merge logic (if wallet already has account):**
```ts
async function mergeAccounts(guestPlayer: Player, walletPlayer: Player) {
  // Combine stats - keep best/highest values
  const merged = {
    totalDeaths: guestPlayer.totalDeaths + walletPlayer.totalDeaths,
    totalClears: guestPlayer.totalClears + walletPlayer.totalClears,
    totalEarned: guestPlayer.totalEarned + walletPlayer.totalEarned,
    totalLost: guestPlayer.totalLost + walletPlayer.totalLost,
    highestRoom: Math.max(guestPlayer.highestRoom, walletPlayer.highestRoom),
    nickname: walletPlayer.nickname || guestPlayer.nickname, // Prefer wallet's
  };
  
  // Update wallet player with merged stats
  await db.transact(tx.players[walletPlayer.id].update(merged));
  
  // Update all guest's deaths to point to wallet account
  // (or keep as historical record with original authId)
  
  // Delete guest player record
  await db.transact(tx.players[guestPlayer.id].delete());
  
  return walletPlayer.id;
}
```

**UX considerations:**
- Show confirmation: "Link wallet [addr] to your account?"
- If merging: "Found existing progress on this wallet. Combine accounts?"
- Success: "Account upgraded! Your progress is now saved to your wallet."

---

## Future: Email Claiming

**Empty handed → Email (not in initial release):**
```ts
async function claimWithEmail(email: string) {
  // Send magic code
  // On verify: update player record with email
  // Keep same authId
}
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/app/api/auth/wallet/route.ts` | NEW — wallet signature verification |
| `src/app/api/auth/guest/route.ts` | NEW — guest token generation |
| `src/app/api/auth/link-wallet/route.ts` | NEW — link wallet to guest account |
| `src/lib/instant.ts` | Add auth helpers, update player schema |
| `mobile/lib/GameContext.tsx` | Integrate InstantDB auth |
| `mobile/lib/auth.ts` | NEW — auth flow helpers |
| `mobile/app/stake.tsx` | Update to use new auth |
| `mobile/app/profile.tsx` | NEW or update — account linking UI |
| `mobile/components/NicknameModal.tsx` | Ensure works for all users |
| `instant.perms.ts` | NEW — permission rules |

---

## Testing Checklist

- [ ] Wallet user can sign in (signature verified)
- [ ] Empty handed user gets unique ID
- [ ] Nickname prompt shows for new users (both types)
- [ ] Nickname saves to InstantDB
- [ ] Player record created on first auth
- [ ] Deaths linked to auth.id
- [ ] Leaderboard shows both user types
- [ ] Permissions prevent unauthorized updates
- [ ] Existing wallet users can still sign in
- [ ] Empty handed can link wallet (no existing wallet account)
- [ ] Empty handed can link wallet (merge with existing wallet account)
- [ ] Stats properly combined on merge
- [ ] Guest account deleted after successful link

---

## Questions to Resolve

1. **Nonce storage:** Where to store/validate nonces? (Redis? InstantDB? Stateless with timestamp?)
2. **Session duration:** How long before re-auth needed?
3. **Guest persistence:** Keep guest ID in AsyncStorage indefinitely? Clear on uninstall?
4. **Web vs Mobile:** Same flow for both? (Yes, same backend)
