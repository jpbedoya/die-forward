# MagicBlock Integration

Die Forward uses [MagicBlock Ephemeral Rollups](https://docs.magicblock.gg/) for fast, verifiable on-chain game runs. Every staked run creates a `RunRecord` that tracks the player's progress through the crypt.

**Status:** ✅ ER live on devnet · ✅ VRF integrated (with safe fallback)  
**Toggles:** `enableMagicBlock` (master) + `enableVRF` (only active when ER is enabled)

## Deployed Programs

| Program | Address | Purpose |
|---------|---------|---------|
| `run_record` | `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS` | Tracks game runs (room, status, stake) |
| `die_forward` | `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6` | Escrow for staked SOL |

**Deploy authority:** `7rn4KRHNQwSJDa1uq1ENMzyDqW95QAr3bZUepkLh58ed`

---

## How It Works

InstantDB drives the game experience (speed, real-time UX). The Ephemeral Rollup runs in parallel as the **source of truth for what actually happened**. Death/victory don't settle on L1 until the ER commits the run.

### Modes (controlled by admin toggles)

- `enableMagicBlock` is the master switch.
- `enableVRF` is nested and only applies when `enableMagicBlock = true`.

**`enableMagicBlock = false`**
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

### Diagram

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

## RunRecord Account

```rust
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
```

**PDA seeds:** `["run", session_id_bytes]`  
**IDL:** `src/idl/run_record.json`

### Instructions

| Instruction | Where called | Description |
|-------------|-------------|-------------|
| `initialize_run` | `POST /api/session/start` | Creates RunRecord PDA on L1 |
| `delegate_run` | `POST /api/session/start` | Delegates account to ER |
| `record_event` | (future) game events | Zero-fee ER event log |
| `commit_run` | `POST /api/session/death\|victory` | Settles ER state back to L1 |

---

## What Gets Recorded

Every significant game event becomes a zero-fee ER transaction:

| Event | ER Instruction | Data |
|-------|----------------|------|
| Run starts | `start_run` | wallet, stake amount, timestamp |
| Room advanced | `advance_room` | room number, VRF seed |
| Enemy encounter | `record_encounter` | enemy type, outcome |
| Item picked up | `record_item` | item type, room |
| Player died | `record_death` | room, final message |
| Player cleared | `record_victory` | final room, reward |

The full ER transaction history = a cryptographic replay of the entire run.

---

## Settlement Gate

With `enableMagicBlock = true`, death/victory routes commit the ER run before settling:

```typescript
// POST /api/session/death
if (settings.enableMagicBlock && session.erRunId) {
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

## Observability

**`/onchain-runs` page** — live view of every RunRecord on-chain:
- Status, player wallet, session ID, stake, room progress
- Links to Solana Explorer (devnet)
- URL: `die-forward.vercel.app/onchain-runs`

---

## Environment Variables

```bash
NEXT_PUBLIC_RUN_RECORD_PROGRAM_ID=9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS
MAGICBLOCK_ER_ENDPOINT=devnet-us.magicblock.app
SOLANA_AUTHORITY_SECRET_KEY=[...bytes...]
```

---

## Roadmap

### Done
- ✅ `enableMagicBlock` admin toggle
- ✅ `run_record` program deployed to devnet
- ✅ ER delegation on run start, commit on settlement
- ✅ `/onchain-runs` observability page
- ✅ Fallback to legacy flow if ER unavailable

### Next
- [x] VRF request/callback instructions in `run_record` program (`request_vrf_seed`, `callback_vrf_seed`)
- [x] Admin toggle for VRF (`enableVRF`, gated by `enableMagicBlock`)
- [x] Deployed upgraded `run_record` program + upgraded IDL on devnet
- [x] Session/API/client VRF seed path with fallback to legacy seed when callback is slow
- [ ] Optional: async post-start VRF seed sync to InstantDB when callback lands after timeout window
- [ ] Mainnet deployment

---

## Validator Endpoints

**Devnet:**
- US: `devnet-us.magicblock.app`
- EU: `devnet-eu.magicblock.app`
- Asia: `devnet-as.magicblock.app`

**Mainnet:**
- US: `us.magicblock.app`
- EU: `eu.magicblock.app`
- Asia: `as.magicblock.app`

---

## Key Decisions

- **InstantDB is never replaced** — it stays as the real-time game state layer. ER is purely additive.
- **Non-blocking during gameplay** — ER events are fire-and-forget mid-run. The only blocking call is the settlement commit.
- **Graceful fallback** — if MagicBlock is unavailable, settlement falls back to legacy flow. The game never gets stuck.
- **Toggle-first** — everything is gated by `enableMagicBlock`. Can enable/disable without code changes.

---

## Links

- [MagicBlock Docs](https://docs.magicblock.gg)
- [ER Quickstart](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart)
- [VRF Guide](https://docs.magicblock.gg/pages/verifiable-randomness-functions-vrfs/how-to-guide/quickstart)
