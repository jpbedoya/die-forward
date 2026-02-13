# Known Issues & Limitations

## Security

### Client-Side HP/Inventory (Hackathon Limitation)
**Status:** Known, deferred

Players can edit localStorage to:
- Set HP to arbitrary values (never die)
- Add items to inventory
- Modify stamina

**Impact:** Makes game trivially easy, but doesn't increase payout (fixed multiplier).

**Fix (post-hackathon):** Move combat/HP tracking server-side, or implement signed state transitions.

### What IS Protected
- ✅ Room progression (server-tracked)
- ✅ Victory requires completing all rooms (server-verified)
- ✅ Double-claim prevention (session status check)
- ✅ Stake amounts validated server-side
- ✅ Death hash verified on-chain (browser wallet flow)

---

## Staking Flows

### AgentWallet Stakes Are Custodial
**Status:** Known limitation, architectural

AI agents using AgentWallet cannot sign arbitrary Solana transactions. This means:
- ❌ Can't use on-chain escrow program
- ❌ Stakes go to game pool wallet (custodial)
- ❌ Payouts issued by server, not smart contract

**Impact:** Agent players must trust the game operator. Browser wallet users get full trustless escrow.

**Why:** AgentWallet API only supports simple transfers, not complex transaction signing.

**Future Fix:** If AgentWallet adds `signTransaction()` support, agents could use the same escrow flow as browser wallets.

**See:** `docs/STAKING_FLOWS.md` for full comparison of staking modes.

### Pool Funding Requirement
**Status:** Operational consideration

The on-chain escrow pays victory bonuses (50%) from the pool. If the pool is underfunded:
- Winners may not receive full bonus
- Pool needs seeding or deaths to accumulate funds

**Mitigation:** Pool receives all death stakes (95% after fee). As long as win rate stays below ~67%, pool remains solvent.

### On-Chain Escrow Status
**Status:** ✅ Working (verified Feb 13, 2026)

The Anchor escrow program is live on devnet and handling real transactions:
- Stakes deposited to PDAs
- 5% fee collected on stake
- Victory payouts from pool
- Death verification via Memo program

---

## Gameplay

### Enemy Balance
**Status:** Needs tuning

Some enemy + intent combinations may be too punishing or too easy. Combat balance is based on limited playtesting.

### Depth Progression
**Status:** Working as designed

Later depths (Flooded Halls, Bone Gardens) are significantly harder. This is intentional — clear rate should be ~10-15%.

---

## Technical

### InstantDB Real-Time
**Status:** Working, occasional lag

Corpse discovery and death feed use InstantDB's real-time queries. Occasionally there's 1-2s lag on updates.

### Mobile Wallet Adapter
**Status:** Partial support

Works with Phantom mobile browser. Deep-link flow may have issues with some wallet apps.

---

## Not Bugs (By Design)

| Behavior | Reason |
|----------|--------|
| Can't pause mid-run | Roguelite design — commitment matters |
| Corpses disappear after discovery | One-time content, encourages re-runs |
| No HP recovery between rooms | Roguelite resource management |
| Final message is permanent | Core mechanic — death = content |
| Stake is locked until run ends | Prevents gaming the system |
