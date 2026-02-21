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

---

## Recently Resolved (Feb 2026)

### Nickname Mismatch — Death Echoes vs. Toll (Feb 21)
**Status:** ✅ Fixed

Root cause: `recordDeathAction` in `GameContext.tsx` built `playerName` from the wallet address format (`Ab12...ef34`) instead of `state.nickname`.

Fix:
- `playerName = state.nickname || walletAddressFormat || 'Wanderer'`
- Added `state.nickname` to `recordDeathAction` dependency array.

### Nickname Prompt Shown Repeatedly (Empty-Handed) (Feb 21)
**Status:** ✅ Fixed

Root cause: On guest auth, `syncNickname` was passing the local nickname to `getOrCreatePlayerByAuth` which could overwrite a fresh guest DB record; combined with a logic bug, the prompt was shown even when a name was already set.

Fix:
- Separated wallet vs. guest sync paths explicitly.
- Guest path: only prompts if no local name AND never prompted before.

### Nickname Not Updating on Wallet Bind (Feb 21)
**Status:** ✅ Fixed

Root cause: `signInWithWallet()` (which triggers `syncNickname`) was only called inside `handleStake()`, not on wallet connect. DB nickname wasn't loaded until user tapped SEAL YOUR FATE.

Fix:
- Added `useEffect` in `GameContext` that auto-authenticates when `unifiedWallet.connected` becomes true. DB nickname loads immediately on wallet bind.

### Nickname Surviving Logout (Feb 21)
**Status:** ✅ Fixed

Root cause: `syncNickname` awaits a DB call. If logout fires during that await, the DB result wrote back over the freshly cleared state (stale async closure).

Fix:
- Added `cancelled` cleanup flag to `syncNickname` useEffect.
- `disconnect()` now also does a full reset: clears `AsyncStorage` keys for nickname, prompted flag, and guest progress — not just auth state.

### Death Echoes Used Wallet Address as Player Name (Feb 21)
**Status:** ✅ Fixed

Root cause: `recordDeathAction` always derived `playerName` from wallet address format, ignoring the player's chosen nickname entirely.

Fix: See "Nickname Mismatch" above.

### Android Stake Screen Crash (`.map` of undefined)
**Status:** ✅ Fixed

Root cause: MWA provider context value omitted `connectors`, so stake screen attempted `.map()` on undefined.

Fix:
- Added `connectors: []` and `connectTo` to native MWA context value.

### Native Wallet Connect No-Op
**Status:** ✅ Fixed

Root cause: `mwa-provider.tsx` used a private context instance, while `GameContext` read from `unified.tsx` context.

Fix:
- Exported shared `UnifiedWalletContext` from `unified.tsx`
- Native provider now writes to same context consumed by game state.

### Audio Not Starting on Title/Victory
**Status:** ✅ Fixed

Root cause: `playAmbient()` called before native audio module init completed.

Fix:
- Added `audioReady` gating in title and victory `useEffect` hooks.

### Free Mode Showing Claim Rewards
**Status:** ✅ Fixed

Root cause: free mode runs were persisting selected stake amount instead of zero.

Fix:
- In `startGame`, demo/free mode now stores `stakeAmount: 0`.

