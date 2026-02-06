# Tech Stack

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   API Routes    │────▶│     Solana      │
│   (Next.js)     │     │   (Next.js)     │     │    (Devnet)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         │               ┌──────▼──────┐
         └──────────────▶│  InstantDB  │
                         │ (Real-time) │
                         └─────────────┘
```

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

### Backend

| Tech | Purpose | Status |
|------|---------|--------|
| **Next.js API Routes** | Game session management | ✅ |
| **@instantdb/admin** | Server-side DB writes | ✅ |
| **@solana/web3.js** | Transaction handling | ✅ |
| **Claude API** | Content generation | 🚧 |

### Infrastructure

| Tech | Purpose | Status |
|------|---------|--------|
| **Vercel** | Hosting, deploys | ✅ |
| **InstantDB** | Real-time database | ✅ |
| **Solana Devnet** | Payments (testing) | ✅ |

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

## API Routes

### Session Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/start` | POST | Start game, create session token |
| `/api/session/death` | POST | Record death (validates token) |
| `/api/session/victory` | POST | Process victory payout |

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

```typescript
interface GameState {
  currentRoom: number;
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
