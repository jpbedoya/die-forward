# Staking Flows — Die Forward

## Overview

Die Forward's economy is a three-rung **Offering Ladder** ("The Shift", phase 3b): Unbound (no stake), Coin-Bound (Pale Coins, earned-only in-game currency), and Blood-Bound (SOL, on-chain escrow). Within Blood-Bound, players stake through one of the flows below depending on their wallet type.

```
┌─────────────────────────────────────────────────────────────────┐
│                        STAKING FLOWS                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Browser Wallet │  AgentWallet    │  Free Play                  │
│  (Phantom/etc)  │  (AI Agents)    │  (Demo Mode)                │
├─────────────────┼─────────────────┼─────────────────────────────┤
│  On-chain       │  Pool transfer  │  No stake                   │
│  Escrow PDA     │  via API        │                             │
│                 │                 │                             │
│  ✅ Trustless   │  ⚠️ Custodial  │  N/A                        │
│  ✅ Verifiable  │  ✅ Agent-ready │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## The Offering Ladder (three rungs)

The Toll offers players a choice of what to put at stake before a run:

| Rung | Stake | Notes |
|------|-------|-------|
| **Unbound** | Nothing | Free play, offline-capable, firewalled from leaderboard/currency. No escrow, no coins, no on-chain interaction. |
| **Coin-Bound** | Pale Coins | Earned-only in-game currency (never purchasable). Off-chain, settled server-side. See below. |
| **Blood-Bound** | SOL | The on-chain escrow flows documented in this file (Flow 1/2 below). Shown only when the `stakingPosture` admin setting allows it (see below). |

### Pale Coins (Coin-Bound)

Pale Coins (`src/lib/coins.ts` / `mobile/lib/coins.ts`) are an **earned-only, never-purchasable** currency — there is no path to buy them.

- **Earning:** every run (any stake mode) earns coins via `computeCoinEarn`: a concave depth-income curve, `floor(4 * sqrt(min(finalDepth, 13)))`, plus a flat +40 on a cleared run and a further flat +60 on a first clear of a zone.
- **Staking at the Toll:** players choose a coin stake from a fixed ladder, `COIN_STAKE_OPTIONS = [60, 120, 240]`, gated by their current `paleCoins` balance.
- **Death:** the stake was already deducted at run start; it burns into a pool-funded `coinPool` (`poolDelta = +coinStake`).
- **Escape/Victory:** the stake is returned to the player plus a bonus drawn from the `coinPool`, sized by the admin-tunable `coinBonusPercent` (default 50%) and capped by what the pool actually holds (`bonus = min(floor(coinStake * bonusPercent / 100), poolAvailable)`) — the mechanic is population-net-negative and coins are never minted out of thin air.
- **Binding Streak:** consecutive Coin-Bound clears build a public streak (`bindingStreak`/`nextStreak`); a Coin-Bound **death** resets it to 0. The streak maps to a public **seal tier** (`sealTier`): tier 0 below 3, tier 1 at 3-6, tier 2 at 7-14, tier 3 at 15+.
- **Run receipts:** every run (any mode) writes an immutable `runReceipts` row capturing `(runSeed, dayKey, dailyShiftEnabled, chosenModifierId, outcome, coinDelta, streakAfter, ...)`.
- **Auth requirement:** Coin-Bound runs require a verified InstantDB token — `session/start` in coins mode is rejected without one, and the acting player is looked up solely by the token-verified `authId` (a body-supplied `authId`/`walletAddress` can never touch a coin balance op). See `src/lib/auth-server.ts` (`verifyAuthToken`).

### `stakingPosture` (admin setting)

An admin-tunable `gameSettings.stakingPosture` value (`hidden` / `ritual` / `open`) controls whether Blood-Bound (SOL) staking is shown to players at all. Unbound and Coin-Bound are unaffected by this setting.

---

## Flow 1: Browser Wallet (On-Chain Escrow)

**For:** Human players using Phantom, Solflare, etc., choosing the **Blood-Bound** rung of the Offering Ladder.

### How It Works

1. **Stake** → Player signs transaction that:
   - Sends 5% fee to treasury
   - Sends 95% to Game Pool PDA (escrow)
   - Creates Session PDA with stake amount

2. **Play** → Normal gameplay, room progress tracked server-side

3. **Death** → `record_death` instruction:
   - Marks Session as `Dead`
   - Records death hash on-chain
   - Escrow SOL stays in pool (funds future victories)

4. **Victory** → `claim_victory` instruction:
   - Returns original stake to player
   - Adds 50% bonus from pool
   - Marks Session as `Victorious`

### On-Chain Program

```
Program ID: 34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6
Game Pool:  E4LRRyeFXDbFg1WaS1pjKm5DAJzJDWbAs1v5qvqe5xYM
Network:    Devnet
```

### Accounts

| Account | Type | Description |
|---------|------|-------------|
| `GamePool` | PDA | Holds all escrowed stakes, pays victory bonuses |
| `Session` | PDA | Per-player session with stake amount and status |
| `Treasury` | Wallet | Receives 5% fee from each stake |

### Security Properties

- ✅ **Trustless:** No backend wallet needed for payouts
- ✅ **Verifiable:** All stakes/deaths/victories on-chain
- ✅ **Non-custodial:** Player signs all transactions
- ✅ **Death verification:** Hash of death data stored on-chain

---

## Flow 2: AgentWallet (Custodial Pool)

**For:** AI agents using AgentWallet API

### How It Works

1. **Stake** → Agent calls AgentWallet transfer API:
   ```json
   POST /api/agent/start
   {
     "agentName": "pisco",
     "stake": {
       "mode": "agentwallet",
       "username": "pisco",
       "apiToken": "mf_...",
       "amount": 0.05
     }
   }
   ```
   - SOL transfers directly to game pool wallet
   - No escrow PDA (direct custody)

2. **Play** → Agent uses `/api/agent/action` for all moves

3. **Death** → Stake stays in pool (already transferred)

4. **Victory** → Server pays out from pool wallet:
   - Returns original stake + 50% bonus
   - Via AgentWallet API or direct transfer

### Why Not Escrow?

AgentWallet agents can't sign arbitrary Solana transactions. They use a custodial API for transfers. This means:

- ❌ Can't sign the `stake` instruction for escrow PDA
- ❌ Can't sign `claim_victory` to receive payout
- ✅ CAN do simple SOL transfers via API

### Limitation

> ⚠️ **Agent stakes are custodial.** The game server holds stakes in a pool wallet. This requires trusting the game operator.

Future improvement: AgentWallet could add support for signing arbitrary transactions, enabling full escrow integration.

---

## Flow 3: Free Play (Demo Mode)

**For:** Testing, onboarding, no-stake gameplay — the **Unbound** rung of the Offering Ladder.

### How It Works

1. **Start** → No stake required:
   ```json
   POST /api/agent/start
   { "agentName": "test", "stake": { "mode": "free" } }
   ```

2. **Play** → Full gameplay, all mechanics work

3. **Death/Victory** → No payout (nothing at stake)

### Use Cases

- First-time players learning mechanics
- Agents testing their strategies
- Development/debugging

---

## Comparison Matrix

| Feature | Browser Wallet | AgentWallet | Free Play |
|---------|---------------|-------------|-----------|
| Stake Required | ✅ Yes | ✅ Yes | ❌ No |
| On-Chain Escrow | ✅ Yes | ❌ No | N/A |
| Trustless Payout | ✅ Yes | ❌ No | N/A |
| Death Verified On-Chain | ✅ Yes | ❌ No | ❌ No |
| Agent Compatible | ❌ No | ✅ Yes | ✅ Yes |
| Real Stakes | ✅ Yes | ✅ Yes | ❌ No |

---

## Technical Details

### Fee Structure

| Component | Amount | Recipient |
|-----------|--------|-----------|
| Platform Fee | 5% | Treasury wallet |
| Victory Bonus | 50% | From pool to winner |
| Death Contribution | 95% | Stays in pool |

### Stake Amounts

Valid stakes: `0.01`, `0.05`, `0.1`, `0.25` SOL

### Session ID

Each session has a unique 32-byte identifier:
- Browser: Generated client-side, used as PDA seed
- Agent: Generated server-side, stored in DB

---

## Future: Unified Escrow

When AgentWallet supports transaction signing, agents could use the same escrow flow as browser wallets:

```
1. AgentWallet adds `signTransaction(tx)` endpoint
2. Game builds stake tx with escrow instruction
3. Agent signs via AgentWallet API
4. Transaction submitted to Solana
5. All flows use same trustless escrow
```

This would eliminate the custodial limitation for agents.
