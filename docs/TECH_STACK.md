# Tech Stack

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   API Routes    │────▶│     Solana      │
│ (Next.js / Expo)│     │   (Next.js)     │     │    (Devnet)     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │              ┌────────▼────────┐
         │              │  Auth layer     │
         │              │  verifyAuthToken │
         │              │ (auth-server.ts) │
         │              └────────┬────────┘
         │                       │
         │               ┌───────▼──────┐
         └──────────────▶│  InstantDB   │
                         │ (Real-time)   │
                         └───────┬───────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Vercel Cron (server-only)│
                    │ /api/game/shift          │
                    │ /api/game/dispatch       │
                    │ → expo-server-sdk push   │
                    └──────────────────────────┘
```

Session/game requests carry a verified InstantDB customToken (`Authorization: Bearer <customToken>`); server routes derive the acting identity from that token via `verifyAuthToken` (`src/lib/auth-server.ts`) rather than trusting body-supplied `authId`/`walletAddress` for money ops. Admin writes (`/api/admin/settings`, `/admin/bestiary`, `/admin/content`) are additionally gated by `isAdminAuthId`. InstantDB permissions (`instant.perms.ts`) are deny-by-default (view-only) for `gameSettings`/`runReceipts`/`sessions`/`worldShifts`; `reports` is create-only.

## Stack Components

### Frontend

| Tech | Purpose | Status |
|------|---------|--------|
| **Next.js 16** | React framework, App Router | ✅ |
| **Tailwind CSS** | Terminal aesthetic styling | ✅ |
| **@solana/wallet-adapter-react** | Wallet connection UI | ✅ |
| **@solana-mobile/wallet-adapter-mobile** | Mobile Wallet Adapter | ✅ |
| **@instantdb/react** | Real-time data binding | ✅ |
| **Howler.js** | Audio playback | 🚧 |
| **expo-notifications** | Mobile push notifications (dispatch opt-in) | ✅ |
| **expo-device** | Device info for push registration | ✅ |
| **expo-localization** | Locale/timezone detection for dispatch delivery | ✅ |

### Backend

| Tech | Purpose | Status |
|------|---------|--------|
| **Next.js API Routes** | Game session management | ✅ |
| **@instantdb/admin** | Server-side DB writes | ✅ |
| **@solana/web3.js** | Transaction handling | ✅ |
| **expo-server-sdk** | Server-side push fan-out (`/api/game/dispatch`) | ✅ |
| **Claude API** | Content generation | 🚧 |

### Infrastructure

| Tech | Purpose | Status |
|------|---------|--------|
| **Vercel** | Hosting, deploys | ✅ |
| **InstantDB** | Real-time database | ✅ |
| **Solana Devnet** | Payments (testing) | ✅ |
| **MagicBlock ER** | On-chain run recording | ✅ |
| **Tapestry** | Social graph (deaths/victories) | ✅ |

See also:
- [MAGICBLOCK.md](./MAGICBLOCK.md) — Ephemeral Rollups integration
- [TAPESTRY.md](./TAPESTRY.md) — Social graph integration

## Database Schema (InstantDB)

### Sessions (Game Runs)

```typescript
interface Session {
  id: string;
  token: string;              // Unique session token
  walletAddress: string;
  stakeAmount: number;
  txSignature: string | null; // Stake transaction
  zone: string;
  startedAt: number;
  endedAt: number | null;
  status: 'active' | 'dead' | 'completed';
  finalRoom: number | null;
  reward: number | null;
  payoutStatus: string | null;
  payoutTx: string | null;
}
```

### Deaths

```typescript
interface Death {
  id: string;
  walletAddress: string;
  playerName: string;
  zone: string;
  room: number;
  stakeAmount: number;
  finalMessage: string;
  inventory: string;          // JSON serialized
  createdAt: number;
}
```

### Corpses

```typescript
interface Corpse {
  id: string;
  deathId: string;
  zone: string;
  room: number;
  playerName: string;
  finalMessage: string;
  loot: string;
  lootEmoji: string;
  discovered: boolean;
  discoveredBy: string | null;
  createdAt: number;
}
```

### Players (additions — The Shift)

The Offering Ladder (Unbound / Coin-Bound / Blood-Bound) and community/notification layer added fields to `Player` (see `mobile/lib/instant.ts`):

```typescript
interface Player {
  // ...existing identity/wallet fields
  paleCoins?: number;          // earned-only currency, never purchasable
  bindingStreak?: number;      // consecutive Coin-Bound clears (public seal tier)
  bestBindingStreak?: number;
  clearedZones?: string[];
  creatureMastery?: Record<string, number>;
  activeTitle?: string;
  activeBorder?: string;
  unlockedTitles?: string[];
  unlockedBorders?: string[];
  pushToken?: string;          // Expo push token, present only after opt-in
  timezone?: string;           // IANA tz, for local-morning dispatch delivery
  notifLocale?: string;
  notifOptIn?: boolean;
  notifPrompted?: boolean;
  lastDispatchDayKey?: string;
}
```

### Run Receipts

Immutable, server-written record of every run's coin settlement, written on every death/victory:

```typescript
interface RunReceipt {
  id: string;
  runSeed: string;
  dayKey: string;
  dailyShiftEnabled: boolean;
  chosenModifierId: string | null;
  killedBy?: string;
  nodeId?: string;
  finalMessage?: string;
  outcome: 'death' | 'victory';
  coinDelta?: number;
  streakAfter?: number;
  // ...additional fields, see src/lib/coins.ts
}
```

### World Shifts

Nightly community-aggregation output (server-only writer), keyed by UTC day + zone — apex creature (buff + bounty), mass-death curse nodes, single deadliest Architect node, plus moderated `echoPhrases`/`architectEntries`:

```typescript
interface WorldShift {
  id: string;
  dayKey: string;
  zone: string;
  apexCreatureId?: string;
  curseNodeIds?: string[];
  architectNodeId?: string;
  echoPhrases?: string[];
  architectEntries?: string[];
  // ...see src/lib/world-shift-agg.ts
}
```

### Reports (UGC moderation)

Abuse reports against another player's `finalMessage`/UGC text; create-only from clients, server-authoritative target lookup in `/api/moderation/report`:

```typescript
interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reporterAuthId: string;
  createdAt: number;
  // ...see src/lib/moderation.ts
}
```

Full permission rules for all namespaces live in `instant.perms.ts` (deny-by-default for `gameSettings`/`runReceipts`/`sessions`/`worldShifts`; `reports` is create-only).

## API Routes

### Session Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/start` | POST | Start game, create session token (Coin-Bound requires a verified auth token) |
| `/api/session/death` | POST | Record death (validates token; rejects authId ≠ session's) |
| `/api/session/victory` | POST | Process victory payout |
| `/api/session/advance` | POST | Advance to next node/depth |
| `/api/session/cleanup` | GET/POST | Cron: expire stale sessions (requires `CRON_SECRET`) |
| `/api/session/backfill-status` | GET | Backfill/status check |

### The Shift — Game & Community Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/game/settings` | GET | Read current `gameSettings` |
| `/api/game/shift` | GET (read) / GET-no-param or POST (cron) | Nightly community aggregation → writes `worldShifts` (apex/curse/architect); GET with params reads today's shift |
| `/api/game/dispatch` | GET/POST | Hourly fan-out cron; sends the day's dispatch at each user's local morning via `expo-server-sdk`, gated by `selectFanoutRecipients` (`src/lib/dispatch-fanout.ts`) |

### Moderation & Admin

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/moderation/report` | POST | Authenticated; report UGC (server-authoritative target lookup, never trusts client text) |
| `/api/admin/settings` | POST | Authenticated + admin-gated; writes `gameSettings` (`coinPool` excluded from the writable whitelist) |
| `/api/admin/bestiary` | POST | Authenticated + admin-gated |
| `/api/admin/content` | POST | Authenticated + admin-gated |

Session/game/moderation/admin routes that touch money or player identity require `Authorization: Bearer <customToken>`, verified server-side via `verifyAuthToken` (`src/lib/auth-server.ts`, fail-closed). Cron routes (`session/cleanup`, `game/shift`, `game/dispatch`) additionally require `CRON_SECRET` (Bearer or `x-cron-secret`; open-and-warn if unset) and accept both GET (Vercel Cron) and POST.

### Request/Response Examples

**Start Session:**
```typescript
// POST /api/session/start
Request: {
  walletAddress: string;
  stakeAmount: number;      // 0.01, 0.05, 0.1, or 0.25
  txSignature: string;      // Stake transaction signature
}

Response: {
  success: boolean;
  sessionToken: string;
  zone: string;
}
```

**Record Death:**
```typescript
// POST /api/session/death
Request: {
  sessionToken: string;
  room: number;
  finalMessage: string;
  inventory: Item[];
  playerName: string;
}

Response: {
  success: boolean;
  deathId: string;
  corpseId: string;
}
```

**Victory Payout:**
```typescript
// POST /api/session/victory
Request: {
  sessionToken: string;
}

Response: {
  success: boolean;
  reward: number;
  payoutStatus: 'paid' | 'pending';
  txSignature?: string;
}
```

## Solana Integration

### Wallet Adapters

```typescript
// Desktop
- PhantomWalletAdapter
- SolflareWalletAdapter

// Mobile (Android)
- SolanaMobileWalletAdapter
```

### Pool Wallet

- **Address**: Stored in `NEXT_PUBLIC_POOL_WALLET`
- **Secret**: Stored in `POOL_WALLET_SECRET` (backend only)
- **Purpose**: Receives stakes, pays out victories

### Transaction Flow

```
STAKE:
Player → signs transfer → SOL goes to pool wallet
       → backend creates session token

DEATH:
Stakes stay in pool (accumulate)

VICTORY:
Backend → signs transfer → SOL from pool to player
       → stake + 50% bonus
```

## Mobile Wallet Adapter (MWA)

### Challenge

MWA uses session-based connections (not persistent like browser extensions). Each `transact()` creates a new session requiring authorization.

### Solution

1. **Auth Token Caching**: Read from wallet adapter's localStorage cache
   - Key: `SolanaMobileWalletAdapterDefaultAuthorizationCache`
   - Contains: `auth_token`, `accounts`, etc.

2. **Reauthorize Flow**:
   ```typescript
   const cached = getCachedAuth();
   if (cached) {
     await wallet.reauthorize({ auth_token: cached.authToken });
   } else {
     await wallet.authorize({ cluster: 'devnet', identity: APP_IDENTITY });
   }
   ```

3. **Address Encoding**: MWA returns base64-encoded addresses
   ```typescript
   // Decode base64 to bytes, then to PublicKey
   const bytes = Uint8Array.from(atob(addressRaw), c => c.charCodeAt(0));
   const pubkey = new PublicKey(bytes);
   ```

### Files

- `src/lib/mobileWallet.ts` — MWA transaction handling
- `src/lib/mwaAuthCache.ts` — Auth token caching
- `src/components/WalletProvider.tsx` — Adapter configuration

## Game State Management

### Client-Side (localStorage)

`currentRoom` is a canonical **1-based depth projection** through the branching dungeon DAG (`generateDungeonGraph`/`ZoneNode`), consistent across `GameContext`, server routes, and the on-chain `u8` (not a client-side 0-indexed room counter).

```typescript
interface GameState {
  currentRoom: number;        // 1-based depth, see note above
  health: number;
  stamina: number;
  inventory: Item[];
  stakeAmount: number;
  sessionToken: string | null;
  walletAddress: string | null;
}
```

**Key**: `die-forward-game`

### Functions

- `getGameState()` — Read current state
- `saveGameState(partial)` — Merge and save
- `resetGameState(stake)` — Start fresh run
- `clearGameState()` — Remove all state

## Environment Variables

### Required for Vercel

```bash
# InstantDB
NEXT_PUBLIC_INSTANT_APP_ID=xxx
INSTANT_ADMIN_KEY=xxx

# Solana
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_POOL_WALLET=xxx
POOL_WALLET_SECRET=[...bytes...]
```

## Development

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Note: If npm cache issues, use:
npm install --cache /tmp/npm-cache-fresh
```

## Deployment

Automatic via Vercel on push to `main`.

GitHub: https://github.com/jpbedoya/die-forward
Live: https://die-forward.vercel.app
