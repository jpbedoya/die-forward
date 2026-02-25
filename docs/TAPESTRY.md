# Tapestry Integration

## Overview

Die Forward uses [Tapestry](https://docs.usetapestry.dev/) to build a social graph around gameplay. Deaths and victories are posted as social content that players can view, like, and share.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Game Client   │────▶│   API Routes    │────▶│    Tapestry     │
│                 │     │                 │     │   Social Graph  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   InstantDB     │
                        │ (contentId ref) │
                        └─────────────────┘
```

### Flow

1. **Auth** → Create/find Tapestry profile (walletAddress = profileId)
2. **Death** → Post death event as content
3. **Victory** → Post victory event as content
4. **Like** → Create like relationship between profiles and content

## Profile Management

### Profile Creation (Auth Time)

Profiles are created when a wallet user authenticates:

```typescript
// /api/auth/wallet calls this
await upsertProfile(walletAddress, nickname);
```

**Profile Shape:**
```typescript
{
  id: walletAddress,           // Stable unique key (= profileId everywhere)
  walletAddress: walletAddress,
  username: nickname || 'DTrR...unbY',  // Display name
  bio: 'Descending into the crypt.',
  blockchain: 'SOLANA',
  execution: 'FAST_UNCONFIRMED',
}
```

### Username Updates

When a player changes their nickname in-game:

```typescript
// /api/player/sync-profile
await updateProfileUsername(walletAddress, newNickname);
```

## Content Posts

### Death Post

Posted via `/api/session/death` when a wallet user dies:

```typescript
await postDeath({
  walletAddress,
  playerName: 'Alice',
  room: 4,
  finalMessage: 'I should have turned back...',
  stakeAmount: 0.01,
});
```

**Generated Content:**
```
💀 Alice fell at depth 4 (staked 0.01 SOL) in Die Forward.
"I should have turned back..."

https://play.dieforward.com
```

**ContentId Format:** `dieforward-death-{wallet8}-{timestamp}`

### Victory Post

Posted via `/api/session/victory` when a player escapes:

```typescript
await postVictory({
  walletAddress,
  playerName: 'Bob',
  reward: 0.015,
});
```

**Generated Content:**
```
⚔️ Bob escaped the crypt and claimed 0.015 SOL! Die Forward.

https://play.dieforward.com
```

**ContentId Format:** `dieforward-victory-{wallet8}-{timestamp}`

### Likes

Players can like deaths via `/api/tapestry/like`:

```typescript
await likeDeath({
  walletAddress: likerWallet,
  contentId: death.tapestryContentId,
});
```

## Implementation

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/tapestry.ts` | All Tapestry API calls |
| `src/app/api/auth/wallet/route.ts` | Profile creation at auth |
| `src/app/api/session/death/route.ts` | Death post |
| `src/app/api/session/victory/route.ts` | Victory post |
| `src/app/api/tapestry/like/route.ts` | Like handling |
| `src/app/api/player/sync-profile/route.ts` | Username sync |

### SDK

Uses `socialfi` package (Tapestry's official SDK):

```typescript
import { SocialFi } from 'socialfi';

const client = new SocialFi();

// Create profile
await client.profiles.findOrCreateCreate({ apiKey }, profileData);

// Update profile
await client.profiles.profilesUpdate({ id, apiKey }, { username });

// Create content
await client.contents.findOrCreateCreate({ apiKey }, contentData);

// Like content
await client.likes.likesCreate({ apiKey, nodeId: contentId }, { startId: profileId });
```

## Data Flow

### Auth Flow
```
Wallet Connect → /api/auth/wallet → upsertProfile(wallet, nickname)
                                          ↓
                                   Tapestry Profile Created
                                   (id = walletAddress)
```

### Death Flow
```
Player Dies → /api/session/death → postDeath(...)
                                        ↓
                                 Tapestry Content Created
                                        ↓
                                 contentId stored in InstantDB
                                 (for future likes)
```

### Like Flow
```
Player Likes → /api/tapestry/like → likeDeath(...)
                                         ↓
                                  Tapestry Like Relationship
                                  (liker profile → content)
```

## Environment Variables

```bash
# Tapestry API
TAPESTRY_API_KEY=xxx
TAPESTRY_NAMESPACE=dieforward
```

## Non-Fatal Design

**All Tapestry calls are non-fatal.** Failures never block gameplay:

```typescript
try {
  await postDeath(...);
} catch (err) {
  console.warn('[Tapestry] postDeath failed (non-fatal):', err);
  // Game continues normally
}
```

This ensures:
- Auth succeeds even if Tapestry is down
- Deaths record even if social post fails
- Likes fail silently

## Guest Users

Guest users (no wallet) skip all Tapestry integration:

```typescript
const isGuestWallet = !walletAddress || walletAddress.startsWith('guest-');
if (!isGuestWallet) {
  await postDeath(...);
}
```

## Consistency Rules

1. **Profile ID = Wallet Address** — Used everywhere for lookups
2. **Profile created at auth** — Not during death/victory (removed redundant calls)
3. **Username synced separately** — Via `/api/player/sync-profile` when nickname changes

## Troubleshooting

### Profile not updating username

`findOrCreateCreate` doesn't update existing profiles. Use `profilesUpdate`:

```typescript
await client.profiles.profilesUpdate({ id: walletAddress, apiKey }, { username });
```

### Deaths not posting

Check logs for `[Tapestry]` entries:
```
[Tapestry] postDeath ok: dieforward-death-DTrR568R-1772040603660
```

If missing, check:
1. `TAPESTRY_API_KEY` is set
2. Player is not a guest
3. No errors in logs (non-fatal, so game continues)

### Content not showing in Tapestry

Verify the namespace is active in Tapestry dashboard. Content is posted to the `dieforward` namespace.
