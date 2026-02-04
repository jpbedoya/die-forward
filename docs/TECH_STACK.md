# Tech Stack

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  Agent Backend  │────▶│     Solana      │
│   (Next.js)     │     │  (Vercel Edge)  │     │   (Transfers)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         │               ┌──────▼──────┐
         └──────────────▶│  InstantDB  │
                         │ (Real-time) │
                         └─────────────┘
```

## Stack Components

### Frontend

| Tech | Purpose |
|------|---------|
| **Next.js 14+** | React framework, App Router |
| **Tailwind CSS** | Styling, terminal aesthetic |
| **@solana/wallet-adapter** | Phantom, Solflare, etc. |
| **Howler.js** | Audio playback |
| **InstantDB React** | Real-time data binding |

### Backend

| Tech | Purpose |
|------|---------|
| **Vercel Edge Functions** | Low-latency API routes |
| **Claude API** | Content generation, game master |
| **InstantDB** | Real-time database |

### Infrastructure

| Tech | Purpose |
|------|---------|
| **Vercel** | Hosting, deploys |
| **InstantDB** | Managed real-time DB |
| **Solana Mainnet/Devnet** | Payments |

## Database Schema (InstantDB)

### Players

```typescript
interface Player {
  id: string;              // InstantDB generated
  walletAddress: string;   // Solana pubkey
  createdAt: number;
  
  // Lifetime stats
  totalDeaths: number;
  totalClears: number;
  totalEarned: number;     // lamports
  totalStaked: number;     // lamports
  enemiesKilled: number;
  timesLooted: number;     // how many found your corpse
}
```

### Runs

```typescript
interface Run {
  id: string;
  playerId: string;
  zone: string;
  startedAt: number;
  endedAt: number | null;
  
  // State
  currentRoom: number;
  totalRooms: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  inventory: Item[];
  
  // Stake
  stakeAmount: number;     // lamports
  stakeTxHash: string;
  
  // Outcome
  status: 'active' | 'dead' | 'cleared';
  deathRoom: number | null;
  finalMessage: string | null;
}
```

### Corpses

```typescript
interface Corpse {
  id: string;
  runId: string;
  playerId: string;
  walletAddress: string;   // for tips
  
  zone: string;
  room: number;
  diedAt: number;
  
  finalMessage: string;
  inventory: Item[];
  
  // Interaction tracking
  timesLooted: number;
  tipsReceived: number;    // lamports
}
```

### MemorialPools

```typescript
interface MemorialPool {
  id: string;
  zone: string;
  
  totalStaked: number;     // lamports accumulated
  totalDeaths: number;
  lastClearedAt: number | null;
  lastClearedBy: string | null;  // playerId
}
```

### Leaderboard (computed/cached)

```typescript
interface LeaderboardEntry {
  playerId: string;
  walletAddress: string;
  
  // Various rankings
  deepestRoom: number;
  totalClears: number;
  totalDeaths: number;
  totalEarned: number;
  mostLooted: number;      // "helpful deaths"
}
```

## API Routes

### Game Flow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/run/start` | POST | Begin new run, process stake |
| `/api/run/action` | POST | Submit player choice |
| `/api/run/end` | POST | End run (death/clear) |

### Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/player/:wallet` | GET | Player stats |
| `/api/leaderboard` | GET | Top players |
| `/api/feed` | GET | Recent deaths (SSE) |
| `/api/zone/:id` | GET | Zone info + death count |

### Solana

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stake/prepare` | POST | Generate stake transaction |
| `/api/stake/confirm` | POST | Verify stake landed |
| `/api/claim/prepare` | POST | Generate claim transaction |
| `/api/tip/prepare` | POST | Generate tip transaction |

## Agent Integration

### Role

The agent (Claude) serves as:
- **Game Master**: Generates room descriptions, encounters
- **Narrator**: Describes combat, discoveries, deaths
- **World Weaver**: Incorporates player deaths into narrative

### Prompt Structure

```typescript
interface GamePrompt {
  systemPrompt: string;     // Game rules, tone, constraints
  worldState: {
    zone: string;
    recentDeaths: Corpse[];
    dangerLevel: number;
  };
  playerState: {
    health: number;
    stamina: number;
    inventory: Item[];
    roomNumber: number;
  };
  action: string;           // Player's choice
}
```

### Response Format

```typescript
interface GameResponse {
  narrative: string;        // What the player sees
  stateChanges: {
    health?: number;
    stamina?: number;
    addItems?: Item[];
    removeItems?: string[];
  };
  encounter?: {
    type: 'combat' | 'trap' | 'ghost' | 'cache' | 'mystery';
    enemy?: Enemy;
    corpse?: Corpse;
    loot?: Item[];
  };
  options: {
    id: string;
    text: string;
  }[];
  isDeath: boolean;
  isClear: boolean;
}
```

## Solana Integration (Phase 1: Simple Transfers)

### Flow

```
Player connects wallet
        ↓
Click "Start Run" → prompted to sign transfer
        ↓
SOL sent to backend treasury wallet
        ↓
Backend records stake, starts run
        ↓
On death: backend moves funds to memorial pool wallet
On clear: backend sends pool share to player
```

### Security Considerations

- Backend wallet keys in environment variables
- Rate limiting on all endpoints
- Verify wallet signatures on actions
- Transaction confirmation before state changes

### Future: On-Chain Program

Phase 2 will replace simple transfers with an Anchor program:
- Escrow PDA for stakes
- Pool PDA per zone
- Trustless claim mechanics
- Composable for future features

## Real-Time Features (InstantDB)

### Live Updates

- **Death Feed**: New corpses appear instantly
- **Leaderboard**: Rankings update in real-time
- **Zone Danger**: Death counts tick up live
- **Active Runs**: See how many currently playing

### Subscriptions

```typescript
// Subscribe to recent deaths
db.subscribeQuery({
  corpses: {
    $: { order: { diedAt: 'desc' }, limit: 10 }
  }
});

// Subscribe to zone state
db.subscribeQuery({
  memorialPools: {
    $: { where: { zone: currentZone } }
  }
});
```

## Development Setup

```bash
# Clone repo
git clone <repo-url>
cd die-forward

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add: ANTHROPIC_API_KEY, INSTANTDB_APP_ID, SOLANA_TREASURY_KEY

# Run dev server
npm run dev
```

## Deployment

```bash
# Deploy to Vercel
vercel --prod

# Environment variables needed:
# - ANTHROPIC_API_KEY
# - INSTANTDB_APP_ID  
# - SOLANA_TREASURY_KEY
# - SOLANA_RPC_URL
# - NEXT_PUBLIC_SOLANA_NETWORK (devnet/mainnet)
```
