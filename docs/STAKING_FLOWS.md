# Staking Flows — Die Forward

## Overview

Die Forward supports three staking modes with different levels of on-chain integration.

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

## Flow 1: Browser Wallet (On-Chain Escrow)

**For:** Human players using Phantom, Solflare, etc.

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
Program ID: 3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN
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

**For:** Testing, onboarding, no-stake gameplay

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
