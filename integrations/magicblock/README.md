# MagicBlock Integration

**Status:** ✅ Phase 3 Verified — Live on devnet  
**Approach:** Option B — ER as settlement authority, parallel to InstantDB  
**Toggle:** `enableMagicBlock` admin setting (on/off without code changes)

**Deployed Programs (devnet):**
| Program | Address |
|---------|---------|
| `die_forward` (escrow) | `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6` |
| `run_record` (ER) | `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS` |

- **Docs:** https://docs.magicblock.gg
- **SDK:** `@magicblock-labs/ephemeral-rollups-sdk`

---

## What is MagicBlock?

High-performance infrastructure for real-time Solana games:
- **Ephemeral Rollups (ER):** Zero-fee, sub-second transactions on a delegated Solana account
- **VRF:** Provably fair on-chain randomness
- **BOLT:** Entity Component System for on-chain games

---

## Design: ER as Settlement Authority

InstantDB drives the game experience (speed, real-time UX). The Ephemeral Rollup runs in parallel as the **source of truth for what actually happened**. Death/victory don't settle on L1 until the ER commits the run.

### Two Modes (controlled by admin toggle)

**`enableMagicBlock = false` (current behavior)**
```
Player stakes → Solana L1
Game runs     → InstantDB (UX)
Death/Victory → settle directly on L1
```

**`enableMagicBlock = true`**
```
Player stakes       → Solana L1
Delegate run        → Ephemeral Rollup
Game runs           → InstantDB (UX) + ER events (non-blocking)
Death/Victory       → ER commits run → Solana L1 settlement
```

The game never waits on ER confirmations mid-run — ER events are fire-and-forget during gameplay. The only blocking ER call is at **settlement** (death/victory), where the ER commit must succeed before L1 payout/slash.

---

## What Gets Recorded

Every significant game event becomes a zero-fee ER transaction:

| Event | ER Instruction | Data |
|-------|----------------|------|
| Run starts | `start_run` | wallet, stake amount, timestamp |
| Room advanced | `advance_room` | room number, VRF seed |
| Enemy encounter | `record_encounter` | enemy type, outcome (flee/win/lose) |
| Item picked up | `record_item` | item type, room |
| Player died | `record_death` | room, final message |
| Player cleared | `record_victory` | final room, reward |

The full ER transaction history = a cryptographic replay of the entire run.

---

## Architecture

### Run Account (on-chain)
```rust
// anchor-program/programs/run-record/src/lib.rs
#[account]
pub struct RunRecord {
    pub player: Pubkey,           // Player wallet
    pub authority: Pubkey,        // Server authority (signs record_event)
    pub session_id: [u8; 32],     // Links to InstantDB session
    pub started_at: i64,
    pub current_room: u8,
    pub status: RunStatus,        // Active | Dead | Cleared
    pub event_count: u16,
    pub stake_amount: u64,
    pub bump: u8,
}

pub enum RunStatus { Active, Dead, Cleared }

// PDA seeds: ["run", session_id_bytes]
// IDL: src/idl/run_record.json
```

### Instructions
| Instruction | Where called | Description |
|-------------|-------------|-------------|
| `initialize_run` | `POST /api/session/start` | Creates RunRecord PDA on L1 |
| `delegate_run` | `POST /api/session/start` | Delegates account to ER |
| `record_event` | (future) game events | Zero-fee ER event log |
| `commit_run` | `POST /api/session/death|victory` | Settles ER state back to L1 |

### Flow Diagram
```
[Client]                    [InstantDB]          [Ephemeral Rollup]        [Solana L1]

stake()            ──────────────────────────────────────────────────►  stake_account
start_run()        ──► update game state        ──► start_run tx          delegate account
advance_room()     ──► update room state        ──► advance_room tx (🔥)
encounter()        ──► update encounter         ──► record_encounter tx (🔥)
death()            ──► update death record      ──► record_death tx
                                                    commit_run()      ──►  settle + slash
```
🔥 = fire and forget (non-blocking)

---

## Settlement Gate

With `enableMagicBlock = true`, the death/victory API routes change:

```typescript
// POST /api/session/death
if (settings.enableMagicBlock && session.erRunId) {
  // Commit ER run before settling on L1
  const committed = await commitErRun(session.erRunId);
  if (!committed) {
    // ER commit failed — fall back to legacy settlement
    console.warn('[MagicBlock] ER commit failed, falling back');
  }
}
// Continue with existing settlement logic...
```

The fallback ensures the game never gets stuck even if MagicBlock is unavailable.

---

## VRF Integration

Replace client-side `Math.random()` with MagicBlock VRF for provably fair randomness:

| Current | With VRF |
|---------|----------|
| `Math.random()` for encounters | `vrf.request()` → on-chain seed |
| Client-side damage rolls | VRF-derived damage |
| Loot drop RNG | VRF-derived loot |

VRF seed is stored in the RunRecord. Anyone can verify that room 7 had that exact enemy with that exact damage roll.

---

## Admin Toggle

New setting in InstantDB `settings` record:

```typescript
// Added to admin settings schema
enableMagicBlock: boolean  // default: false
```

When `false`: existing behavior, zero MagicBlock calls.  
When `true`: ER delegation on run start, ER events during run, ER commit on settlement.

This lets us test in production with a subset of players (e.g., enable for specific wallet addresses) before full rollout.

---

## Implementation Plan

### Phase 1: Toggle + Scaffold ✅ Complete
- [x] Add `enableMagicBlock` to admin settings (InstantDB + admin UI)
- [x] Install `@magicblock-labs/ephemeral-rollups-sdk`
- [x] Create `src/lib/magicblock.ts` with stubbed functions
- [x] Wire toggle check into death/victory routes (no-op when disabled)

### Phase 2: Run Recording (devnet) ✅ Complete
- [x] Write `run_record` Anchor program (`initialize_run`, `delegate_run`, `record_event`, `commit_run`)
- [x] Upgrade both programs to `anchor-lang 0.32.1` (unified workspace)
- [x] Build + deploy both programs to devnet
  - `die_forward`: `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6`
  - `run_record`:  `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS`
- [x] Program keypairs backed up to `~/.openclaw/workspace/credentials/solana/`
- [x] Generate + commit IDLs to `src/idl/`
- [x] Replace stub IDL in `magicblock.ts` with real IDL + live program calls
- [x] Wire `startErRun` into `POST /api/session/start` (gated by toggle + wallet + stake > 0)
- [x] Store `erRunId` (RunRecord PDA) on InstantDB session record
- [x] Wire `commitErRun` into `POST /api/session/death` and `POST /api/session/victory`
- [x] Fix `u64` type: `BigInt` → `BN` (Anchor 0.32.1 maps u64 → BN)
- [x] Env vars: `NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID`, `MAGICBLOCK_ER_ENDPOINT`, `SOLANA_AUTHORITY_SECRET_KEY`

### Phase 2.5: Observability ✅ Complete
- [x] `/onchain-runs` page — live server-rendered view of every RunRecord on-chain
  - Fetches all accounts via `program.account.runRecord.all()`
  - Shows: status, player wallet, session ID, stake, room progress, event count, started at
  - PDA and player wallet linked to Solana Explorer (devnet)
  - Empty state with instructions when no runs recorded yet
  - URL: `die-forward.vercel.app/onchain-runs`

### Phase 3: Settlement Gate — ✅ Verified (2026-02-26)
- [x] Enable `enableMagicBlock` toggle in admin, run a staked session end-to-end
- [x] Verify RunRecord PDA appears on Solana Explorer after session start
- [x] Verify `erRunId` stored on InstantDB session record
- [x] Verify ER commit tx on death/victory
- [x] Verify `/onchain-runs` page shows completed run with correct data
- [ ] ER commit hash stored on death/session record in InstantDB (not yet implemented)

### Phase 4: VRF
- [ ] Replace `Math.random()` with VRF requests
- [ ] VRF seed stored in RunRecord
- [ ] Verifiable encounter/damage/loot replay

### Phase 5: Mainnet
- [ ] Full devnet audit + end-to-end test
- [ ] Switch to mainnet ER validators
- [ ] Enable `enableMagicBlock` in production

---

## Validator Endpoints

**Devnet:**
- US: `devnet-us.magicblock.app`
- EU: `devnet-eu.magicblock.app`
- Asia: `devnet-as.magicblock.app`
- TEE: `tee.magicblock.app` — `FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA`

**Mainnet:**
- US: `us.magicblock.app` — `MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd`
- EU: `eu.magicblock.app` — `MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e`
- Asia: `as.magicblock.app` — `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57`

---

## Key Decisions

- **InstantDB is never replaced** — it stays as the real-time game state layer. ER is purely additive.
- **Non-blocking during gameplay** — ER events are fire-and-forget mid-run. The only blocking call is the settlement commit.
- **Graceful fallback** — if MagicBlock is unavailable, settlement falls back to legacy flow. The game never gets stuck.
- **Toggle-first** — everything is gated by `enableMagicBlock`. Can ship Phase 1 today and enable phases progressively.

---

## Links

- Docs: https://docs.magicblock.gg
- Quickstart: https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart
- BOLT Framework: https://docs.magicblock.gg/pages/tools/bolt/introduction
- VRF: https://docs.magicblock.gg/pages/verifiable-randomness-functions-vrfs/how-to-guide/quickstart
- Examples: https://github.com/magicblock-labs/magicblock-engine-examples
