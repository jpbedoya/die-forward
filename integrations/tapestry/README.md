# Tapestry Integration

**Status:** ✅ Phase 1 & 2 Live  
**Namespace:** `dieforward`  
**Docs:** https://docs.usetapestry.dev

## What is Tapestry?

Solana's social graph protocol. Onchain profiles, follows, content, likes — shared across all apps in the ecosystem.

- **SDK:** `socialfi` (npm)
- **API:** https://api.usetapestry.dev/v1

## Implementation

### Client (`src/lib/tapestry.ts`)
Central module with three exports:
- `upsertProfile(walletAddress, nickname)` — find or create Tapestry profile
- `postDeath({ walletAddress, playerName, room, finalMessage, stakeAmount })` — post death event
- `postVictory({ walletAddress, playerName, reward })` — post victory event

All calls are **fire-and-forget** — Tapestry failures never affect gameplay.

### Where it's called
| Event | Route | Action |
|-------|-------|--------|
| Wallet connect | `POST /api/auth/wallet` | `upsertProfile` |
| Player death | `POST /api/session/death` | `postDeath` |
| Player victory | `POST /api/session/victory` | `postVictory` |

**Wallet users only** — guests have no wallet address for Tapestry.

### Example Posts
```
💀 juamps fell at depth 7 (staked 0.05 SOL) in Die Forward.
"The shadows consumed me."

https://play.dieforward.com
```
```
⚔️ juamps escaped the crypt and claimed 0.075 SOL! Die Forward.

https://play.dieforward.com
```

## Env Vars
```
TAPESTRY_API_KEY=...    # from https://app.usetapestry.dev
TAPESTRY_NAMESPACE=dieforward
```

## Roadmap

### Phase 3: Social Features (not yet implemented)
- [ ] Follow players from leaderboard
- [ ] Show followed players' recent runs
- [ ] Like memorable deaths
- [ ] Comments on death cards

## Links
- Quickstart: https://docs.usetapestry.dev
- API Reference: https://docs.usetapestry.dev/api
- NPM: https://www.npmjs.com/package/socialfi
