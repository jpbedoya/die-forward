# Die Forward

**Every Death Matters.**

A social roguelite where your death becomes content for others. Fall so others can rise.

🎮 **Live Demo**: https://die-forward.vercel.app

## Concept

Die Forward is a text-based roguelite where players stake SOL to enter procedurally generated dungeons. When you die, your corpse — along with your inventory, final message, and stake — becomes discoverable content for future players. The world evolves based on collective player deaths.

*Lonely but not alone. Shared suffering, shared rewards.*

## Core Loop

```
Connect Wallet → Stake SOL → Enter dungeon → Navigate rooms → 
Make choices → Die or clear → Become content / claim rewards
```

## Features

- **Async Social**: No lobbies, no matchmaking — just evidence of others' struggles
- **Meaningful Death**: Your corpse, items, and last words persist for others to find
- **Memorial Pools**: Stakes from deaths accumulate; successful clears claim the rewards
- **Real Stakes**: Solana integration makes every run matter
- **Mobile Support**: Works on Android with Mobile Wallet Adapter (Seeker compatible)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 |
| Wallet | @solana/wallet-adapter + Mobile Wallet Adapter |
| Styling | Tailwind CSS (terminal aesthetic) |
| Database | InstantDB (real-time) |
| Backend | Next.js API Routes |
| Deploy | Vercel |

## Current Status

### ✅ Implemented

- **Full game flow**: Title → Stake → Play → Combat → Death/Victory
- **Wallet integration**: Phantom, Solflare, Mobile Wallet Adapter
- **Real SOL staking**: Transfer to pool on stake, payout on victory
- **Death persistence**: Deaths saved to InstantDB, appear in live feed
- **Session token security**: API validates game sessions before recording
- **Mobile support**: Full MWA integration with auth caching

### 🚧 In Progress

- Corpse discovery in gameplay (finding others' deaths)
- Leaderboard from real data
- Claude API for narrative generation
- Audio system

## Mobile Wallet Adapter Notes

Die Forward supports Solana Mobile Wallet Adapter for Android devices including the Solana Seeker phone.

**How it works:**
- Uses `@solana-mobile/wallet-adapter-mobile` for connection
- Uses `@solana-mobile/mobile-wallet-adapter-protocol-web3js` for transactions
- Auth tokens cached from wallet adapter to avoid repeated popups
- Handles base64-encoded addresses from MWA

**Testing on mobile:**
1. Open https://die-forward.vercel.app in Chrome on Android
2. Tap "Connect Wallet" → MWA will prompt your wallet app
3. Stake → uses cached auth, prompts for transaction approval

## Environment Variables

```bash
# InstantDB
NEXT_PUBLIC_INSTANT_APP_ID=your_app_id
INSTANT_ADMIN_KEY=your_admin_key

# Solana
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_POOL_WALLET=pool_wallet_address
POOL_WALLET_SECRET=[...keypair_bytes...]
```

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build
npm run build
```

## Documentation

- [Game Design](docs/GAME_DESIGN.md) — Mechanics, combat, death loop
- [Tech Stack](docs/TECH_STACK.md) — Architecture, DB schema, APIs
- [MVP Scope](docs/MVP_SCOPE.md) — Hackathon deliverables

## License

TBD

---

Built for the Colosseum Agent Hackathon (Feb 2026)
