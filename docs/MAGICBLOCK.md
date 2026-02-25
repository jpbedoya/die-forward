# MagicBlock Integration

## Overview

Die Forward uses [MagicBlock Ephemeral Rollups](https://docs.magicblock.gg/) (ER) to record game runs on-chain with low latency. Every staked run creates an on-chain `RunRecord` that tracks the player's progress through the crypt.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Game Client   │────▶│   API Routes    │────▶│  Solana Devnet  │
│                 │     │                 │     │    (L1 Base)    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │   Ephemeral     │
                                                │   Rollup (ER)   │
                                                │   (Fast Writes) │
                                                └─────────────────┘
```

### Flow

1. **Run Start** → Initialize `RunRecord` PDA on L1, then delegate to ER
2. **During Run** → Update room/events on ER (fast, ~50ms)
3. **Run End** → Commit final state from ER back to L1

## On-Chain Program

**Program ID:** `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS`

### RunRecord Account

```rust
#[account]
pub struct RunRecord {
    pub player: Pubkey,        // Player's wallet
    pub authority: Pubkey,     // Backend authority (signs updates)
    pub session_id: [u8; 32],  // InstantDB session ID (padded)
    pub started_at: i64,       // Unix timestamp
    pub current_room: u8,      // 1-7
    pub status: RunStatus,     // Active(0), Dead(1), Cleared(2)
    pub event_count: u16,      // Number of game events
    pub stake_amount: u64,     // Lamports staked
    pub bump: u8,              // PDA bump
}
```

**Size:** 125 bytes (8 discriminator + 32 + 32 + 32 + 8 + 1 + 1 + 2 + 8 + 1)

### PDA Derivation

```typescript
const RUN_SEED = new TextEncoder().encode('run');
const [pda] = PublicKey.findProgramAddressSync(
  [RUN_SEED, sessionIdBytes],
  RUN_RECORD_PROGRAM_ID
);
```

## Implementation

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/magicblock.ts` | ER SDK integration, init/delegate/update/commit |
| `src/idl/run_record.json` | Anchor IDL for the program |
| `src/app/onchain-runs/page.tsx` | Public view of all on-chain runs |

### API Flow

**1. Initialize Run** (`/api/session/start`)
```typescript
// Called after stake is confirmed
const erRunId = await initializeAndDelegateRun({
  sessionId,
  playerWallet,
  stakeAmount,
});
// erRunId = RunRecord PDA address
```

**2. Update Room** (`/api/session/room`)
```typescript
// Called when player advances
await updateErRoom(erRunId, newRoom);
```

**3. Commit Run** (`/api/session/death` or `/api/session/victory`)
```typescript
// Called when run ends
await commitErRun(erRunId, outcome); // 'dead' | 'cleared'
```

### SDK Integration

Uses `@magicblock-labs/ephemeral-rollups-sdk`:

```typescript
import { MagicBlockEngine } from '@magicblock-labs/ephemeral-rollups-sdk';

// Delegate account to ER
await engine.delegateAccount(runRecordPda, authority);

// Execute on ER (fast writes)
await engine.execute(runRecordPda, instructionData);

// Commit back to L1
await engine.commitAccount(runRecordPda);
```

### Fallback Logic

The Anchor `commitRun` instruction sometimes fails with `InvalidWritableAccount` on ER-delegated accounts. We have a fallback:

```typescript
try {
  // Try Anchor instruction first
  await program.methods.commitRun(outcome).accounts({...}).rpc();
} catch (err) {
  if (err.message.includes('InvalidWritableAccount')) {
    // Fallback: use SDK direct commit
    await engine.commitAccount(runRecordPda);
  }
}
```

## Environment Variables

```bash
# Program IDs
NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID=9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS

# Authority keypair (backend only)
SOLANA_AUTHORITY_SECRET_KEY=[...bytes...]

# RPC
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

## Viewing On-Chain Data

### Onchain Runs Page

Visit `/onchain-runs` to see all recorded runs. The page fetches:

1. **Settled accounts** — Owned by `run_record` program (committed to L1)
2. **Delegated accounts** — Owned by Delegation program (still on ER)

### Solana Explorer

- [Program](https://explorer.solana.com/address/9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS?cluster=devnet)
- Individual PDAs: `https://explorer.solana.com/address/{PDA}?cluster=devnet`

## Admin Toggle

MagicBlock integration is controlled via the admin panel:

| Setting | Description |
|---------|-------------|
| `enableMagicBlock` | Master toggle for ER integration |

When disabled, runs are recorded only in InstantDB (no on-chain state).

## Troubleshooting

### Run not showing on /onchain-runs

1. Check Vercel logs for `[MagicBlock]` entries
2. Verify the PDA exists: `curl` the account via RPC
3. `getProgramAccounts` on devnet has caching — wait or hard refresh

### InvalidWritableAccount on commit

Expected behavior — the SDK fallback handles this. Check logs for:
```
[MagicBlock] Anchor commitRun failed, trying SDK direct: InvalidWritableAccount
[MagicBlock] ER run committed (SDK direct): <signature>
```

### Account size mismatch

If RunRecord struct changes, update the `dataSize` filter in `onchain-runs/page.tsx`:
```typescript
{ dataSize: 125 }, // Update if struct changes
```
