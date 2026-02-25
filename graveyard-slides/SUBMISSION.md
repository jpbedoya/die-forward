# Die Forward — Graveyard Hackathon Submission

**Category:** Gaming / Social
**Demo:** https://play.dieforward.com
**Skill File:** https://dieforward.com/skill.md
**Pitch Slides:** See `graveyard-slides/` folder

---

## Description

🔊 **Turn on sound!** 68 custom sound effects make this game.

**One agent built everything you see.**

Die Forward is a social roguelite where death feeds the depths. Stake SOL, descend through 7 rooms, probably die. Your death becomes permanent on-chain record and social content for other players to discover.

Entertainment first. Crypto adds tension, not yield.

**What Pisco created autonomously:**
- Next.js frontend + Expo React Native mobile app
- Custom Anchor escrow for trustless staking
- MagicBlock Ephemeral Rollups for real-time on-chain game state
- Tapestry social graph for death posts and player profiles
- InstantDB for real-time sync
- 300+ narrative variations from a Content Bible
- 68 sound effects via ElevenLabs Sound Effects API
- Agent API so other agents can play too

Built for agents AND humans. Same API, same odds, same permadeath.

---

## Problem

Web3 gaming became GameFi: grinding, farming, yield speculation disguised as games. It attracts crypto traders, not gamers.

The result? Games that feel like work, communities that vanish when token prices drop, zero mainstream appeal.

**Die Forward is different.** Entertainment first. You play because the dungeon is compelling, not because you're farming rewards.

The crypto layer (SOL stakes, on-chain death proofs, social death feed) adds real tension and permanence. Not yield. When you die, it matters — it's recorded on-chain and becomes discoverable content.

Free Play ensures anyone can try it without a wallet.

---

## Target Audience

**Primary:** Gamers who like roguelikes (Hades, Slay the Spire, Balatro) and happen to have crypto. Not crypto traders looking for yield.

They want entertainment, not spreadsheets. The stake adds tension to every run, not farming potential.

**Secondary:** AI agents exploring games via skill.md API. Die Forward treats agents as first-class players, not just automation targets.

---

## Technical Approach

### Frontend
- **Web:** Next.js + React with terminal/CRT aesthetic via Tailwind CSS
- **Mobile:** Expo React Native with Mobile Wallet Adapter

### Wallet Integration
- @solana/wallet-adapter for desktop (Phantom, Solflare)
- Mobile Wallet Adapter for Seeker/mobile wallets
- AgentWallet for AI agent staking

### On-Chain Programs (Devnet)

**1. Escrow Program** — `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6`
- Stakes locked in program-owned pool
- Trustless release on death/victory
- Victory: stake + 50% bonus from pool
- Death: stake feeds the pool

**2. RunRecord Program** — `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS`
- On-chain game state via MagicBlock Ephemeral Rollups
- Tracks player, session, room progress, stake, outcome
- Real-time updates on ER (~50ms latency)
- Final state committed to L1 on death/victory

### Database
- InstantDB for real-time death feed, corpse persistence, session state

### Social Layer
- Tapestry profiles created at wallet connect
- Deaths posted as social content with final message
- Players can discover and like deaths

### Agent API
- REST endpoints at /api/agent/* with skill.md documentation
- AgentWallet native integration for real SOL stakes
- 300+ narrative variations generated from Content Bible

---

## Solana Integration

Real on-chain game economy. Not a wrapper, not a demo.

### MagicBlock Ephemeral Rollups ⚡
Every staked run creates an on-chain `RunRecord`:
1. Initialize on L1 with player, session, stake
2. Delegate to Ephemeral Rollup for fast writes
3. Update room progress in real-time (~50ms)
4. Commit final state (dead/cleared) back to L1

This gives us the speed of a centralized game with the permanence of on-chain state.

### Tapestry Social Graph 🕸️
Deaths become social content:
- Profile created at wallet connect (walletAddress = profileId)
- `postDeath()` publishes: "💀 Alice fell at depth 4 (staked 0.01 SOL) — 'I should have turned back...'"
- Players can like and discover deaths
- Victory posts for players who escape

### Anchor Escrow ⚓
Trustless staking with sustainable economics:
- Stakes locked in program-owned pool
- 5% fee to treasury (sustainable revenue)
- 50% victory bonus paid from accumulated pool
- No token speculation, just skill-based rewards

### On-Chain Programs

| Program | Address | Purpose |
|---------|---------|---------|
| Escrow | `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6` | Trustless SOL staking |
| RunRecord | `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS` | On-chain game state |

---

## Business Model

**5% stake fee** on every run (win or lose). Sustainable revenue that doesn't depend on token speculation.

**Victory bonus (50%)** paid from accumulated pool, rewarding skill over grinding.

**Free Play** for onboarding with zero friction. Staked mode for players who want real stakes.

**Already live:**
- Ranks leaderboard (Top Wanderers by highest room, clears, deaths)
- Echoes death feed with candle lighting (social likes)
- Death Soundtrack rankings (tracks playing when players fell)

**Future monetization:**
- Cosmetic death cards
- Seasonal tournaments
- Sponsored dungeons from Solana protocols
- Premium zones/content

---

## Competitive Landscape

Most "Web3 games" are DeFi with a game skin. Designed around token economics, not fun.

**Die Forward inverts this:** it's a game first. The blockchain adds:
- **Permanence** — your death is real, recorded on-chain, discoverable
- **Tension** — real stakes make every decision matter
- **Social proof** — deaths become content via Tapestry

Not yield mechanics. No grinding. No farming.

Closest comparison: text-based roguelikes meet crypto, but without the grind. No other Solana game combines:
- Ephemeral Rollups for real-time on-chain state
- Social graph for death content
- Trustless escrow staking
- Agent-first API design

Play in 2 minutes, stake if you want tension, your death feeds future players.

---

## Future Vision

**Post-hackathon:** Mainnet launch with real SOL stakes.

**V2:**
- New zones (Flooded Cathedral, Ashen Crypts)
- More enemies and deeper combat
- Tapestry death feed UI in-game

**V3:**
- Tournaments with prize pools
- Guilds and social features
- Spectator mode for notable runs
- Cross-game death achievements

**Long-term:** Die Forward proves Web3 games can be fun first. The MagicBlock + Tapestry pattern becomes a template for other developers. Entertainment over yield.

We're building full-time if traction warrants.

---

## Integrations Summary

| Integration | Purpose | Status |
|-------------|---------|--------|
| **MagicBlock ER** | Real-time on-chain RunRecord | ✅ Live |
| **Tapestry** | Social death feed + profiles | ✅ Live |
| **Anchor** | Escrow staking program | ✅ Live |
| **AgentWallet** | Agent payment integration | ✅ Live |
| **InstantDB** | Real-time game state sync | ✅ Live |
| **ElevenLabs** | 68 custom audio files | ✅ Live |
| **Mobile Wallet Adapter** | Seeker/mobile support | ✅ Live |

---

## Links

- **Play:** https://play.dieforward.com
- **Skill File:** https://dieforward.com/skill.md
- **GitHub:** https://github.com/jpbedoya/die-forward
- **On-Chain Runs:** https://play.dieforward.com/onchain-runs
