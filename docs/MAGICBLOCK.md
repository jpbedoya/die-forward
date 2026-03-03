# MagicBlock Integration

Die Forward uses [MagicBlock Ephemeral Rollups](https://docs.magicblock.gg/) for fast, verifiable on-chain game runs.

## How We Use It

When a player stakes SOL and starts a run, we:
1. Create a `RunRecord` on Solana devnet
2. Delegate it to an Ephemeral Rollup for fast updates (~50ms vs ~400ms)
3. Track room progress on the ER as they play
4. Commit the final state back to L1 when they die or clear

This gives us the speed of an L2 with the finality of Solana mainnet.

## Run Eligibility

**Not all runs get recorded on-chain.** ER runs are only created when ALL conditions are met:

| Condition | Rationale |
|-----------|-----------|
| `stakeAmount > 0` | Empty-handed (free) runs have no stake to track |
| Real wallet connected | Guest wallets (`guest-*`) can't sign transactions |
| Not demo mode | Demo sessions are for testing only |

### What gets recorded where

| Run Type | InstantDB | On-Chain (ER) | Tapestry |
|----------|-----------|---------------|----------|
| **Staked (wallet)** | ✅ Deaths, corpses, player stats | ✅ Full ER lifecycle | ✅ Social posts |
| **Empty-handed (wallet)** | ✅ Deaths, corpses, player stats | ❌ Skipped | ✅ Social posts |
| **Guest (no wallet)** | ✅ Deaths, corpses, player stats | ❌ Skipped | ❌ Skipped |

The eligibility check lives in `/api/session/start`:

```typescript
const isGuestOrDemo = !walletAddress || walletAddress.startsWith('guest-') || walletAddress.startsWith('demo-');

if (mbEnabled && !isGuestOrDemo && stakeAmount > 0) {
  erRunId = await initializeAndDelegateRun({ ... });
}
```

## Deployed Programs

| Program | Address | Purpose |
|---------|---------|---------|
| `run_record` | `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS` | Tracks game runs (room, status, stake) |
| `die_forward` | `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6` | Escrow for staked SOL |

**Deploy authority:** `7rn4KRHNQwSJDa1uq1ENMzyDqW95QAr3bZUepkLh58ed`

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

## RunRecord Account

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
    pub vrf_seed: [u8; 32],    // Verifiable randomness seed
    pub vrf_ready: bool,       // True when VRF callback received
    pub bump: u8,              // PDA bump
}
```

**Size:** 158 bytes (8 discriminator + 32 + 32 + 32 + 8 + 1 + 1 + 2 + 8 + 32 + 1 + 1)

> Legacy runs (pre-VRF) are 125 bytes. The `/onchain-runs` page supports both sizes.

> **Note:** Runs created before March 2, 2026 are 125 bytes (no VRF). New runs are 158 bytes with VRF fields. See [VRF Integration](#vrf-integration) below.

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
| `enableVRF` | Use VRF oracle for verifiable randomness (requires ER) |

When disabled, runs are recorded only in InstantDB (no on-chain state).

## VRF Integration

MagicBlock provides a VRF (Verifiable Random Function) oracle that runs free on the Ephemeral Rollup. This gives us provably fair randomness for game seeds.

### Status: ✅ Deployed

The VRF integration is **fully deployed** on devnet:

| Component | Status | Notes |
|-----------|--------|-------|
| Anchor program (`run_record`) | ✅ Deployed | Has `vrf_seed`, `vrf_ready` fields + `request_vrf` instruction |
| IDL | ✅ Updated | Includes VRF types and instructions |
| Frontend toggle | ✅ Working | Admin panel has `enableVRF` nested under `enableMagicBlock` |
| API integration | ✅ Working | `/api/session/start` requests VRF seed when enabled |
| **On-chain deployment** | ✅ Live | Deployed March 2, 2026 |

> **Note:** Existing runs created before the VRF deploy are 125 bytes (no VRF fields). New runs will be 158 bytes with VRF support.

### How It Will Work

1. **Run starts** → Create RunRecord on L1, delegate to ER
2. **Request VRF** → Call `request_vrf` instruction on ER
3. **Oracle callback** → VRF oracle writes `vrf_seed` to RunRecord
4. **Use seed** → Game uses VRF seed for deterministic room generation
5. **Commit** → Final state (including VRF seed) committed to L1

### RunRecord with VRF (Future)

```rust
#[account]
pub struct RunRecord {
    // ... existing fields ...
    pub vrf_seed: [u8; 32],   // Verifiable randomness seed
    pub vrf_ready: bool,      // True when VRF callback received
    pub bump: u8,
}
```

**Size with VRF:** 158 bytes (125 + 32 vrf_seed + 1 vrf_ready)

### Code Locations

| File | Purpose |
|------|---------|
| `anchor-program/programs/run-record/src/lib.rs` | `request_vrf` instruction + callback |
| `src/lib/magicblock.ts` | `requestErVrf()`, `getErVrfSeed()` functions |
| `src/app/api/session/start/route.ts` | VRF seed retrieval on session start |
| `src/app/admin/page.tsx` | `enableVRF` toggle |

### Deployment Steps

To enable VRF:

1. Build updated program with VRF fields:
   ```bash
   cd anchor-program
   anchor build
   ```

2. Deploy to devnet:
   ```bash
   anchor deploy --provider.cluster devnet
   ```

3. Update `/onchain-runs` page to handle 158-byte accounts (or support both sizes)

4. Enable in admin panel: `enableMagicBlock` + `enableVRF`

### SDK Reference

Uses `ephemeral-vrf-sdk`:

```rust
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};

// Request randomness
let ix = create_request_randomness_ix(RequestRandomnessParams {
    payer: ctx.accounts.payer.key(),
    oracle: ctx.accounts.vrf_oracle.key(),
    callback_program: crate::ID,
    // ...
});
```

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

## Testing & Recovery Scripts

These scripts are kept in `scripts/` for repeatable ER debugging.

### 1) End-to-end MagicBlock flow test

```bash
npx tsx scripts/test-magicblock-lib.ts
```

What it does:
- starts an ER run (`startErRun`)
- records several room events (`recordErEvent`)
- commits via current `commitErRun` flow
- prints final L1 owner + decoded RunRecord fields

Use this first when validating deployment changes.

### 2) Deep ER state diagnostic

```bash
npx tsx scripts/diagnose-er-state.ts
```

What it does:
- creates a run directly with Anchor calls
- reads state from ER before commit
- commits and compares ER vs L1

Use this when you suspect merge/settlement issues.

### 3) Force-commit stuck delegated runs

```bash
# requires env vars loaded (including SOLANA_AUTHORITY_SECRET_KEY)
npx tsx scripts/fix-stuck-er-runs.ts
```

What it does:
- scans delegated RunRecord PDAs
- sends commit+undelegate instruction for each
- useful for recovering hanging runs

### 4) Verify one run on L1 + page visibility

```bash
npx tsx scripts/verify-onchain-run.ts --pda <RUN_PDA>
# optional explicit session id check
npx tsx scripts/verify-onchain-run.ts --pda <RUN_PDA> --session <SESSION_ID>
```

What it does:
- decodes RunRecord directly from L1
- checks if run appears on `https://dieforward.com/onchain-runs`
- helps separate on-chain truth vs page/indexing lag

### Notes

- Load envs before running scripts:
```bash
export $(grep -v '^#' .env.local | xargs)
```
- For local shell builds/deploys, ensure Solana tools are on PATH:
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```
