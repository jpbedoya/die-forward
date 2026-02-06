# MVP Scope

## Hackathon Constraints

- **Timeline**: ~1 week (Colosseum Agent Hackathon, deadline Feb 12, 2026)
- **Goal**: Playable demo that demonstrates core concept

## Implementation Status

### Core Game

- [x] **1 Zone**: "The Sunken Crypt" (7 rooms)
- [x] **Core loop**: Start → Navigate → Choose → Die/Clear
- [x] **3 encounter types**: Combat, Corpse (ghost), Cache (loot)
- [x] **Combat system**: Intent-reading, 5 actions (Strike, Dodge, Brace, Herbs, Flee)
- [x] **Death flow**: Final message → become corpse → saved to DB
- [ ] **Corpse discovery**: Find others' corpses in gameplay (DB ready, UI not wired)

### Solana

- [x] **Wallet connect**: Phantom, Solflare via adapter
- [x] **Mobile Wallet Adapter**: Full MWA support for Android/Seeker
- [x] **Auth caching**: Reauthorize without popup after first connect
- [x] **Stake on start**: Real SOL transfer to pool wallet
- [x] **Memorial pool**: Backend tracks stakes in pool
- [x] **Claim on clear**: Backend sends pool share (stake + 50% bonus)

### Social

- [x] **Live death feed**: Real-time deaths from InstantDB
- [x] **Pool stats**: Total staked, death count (real data)
- [ ] **Leaderboard**: Currently mock data (needs clears tracking)

### Database

- [x] **Sessions**: Game run tracking with tokens
- [x] **Deaths**: Recorded with final message, inventory
- [x] **Corpses**: Created on death for future discovery
- [x] **Security**: Session tokens validated on API

### Audio

- [ ] **Music states**: Not implemented
- [ ] **Ambient**: Not implemented
- [ ] **SFX**: Not implemented

### UI

- [x] **Terminal aesthetic**: CRT-style, ASCII art, monospace
- [x] **Game screens**: Title, Stake, Play, Combat, Death, Victory
- [x] **Wallet status**: Connected address, balance display
- [x] **Mobile responsive**: Works on mobile browsers
- [x] **Debug logging**: Visible transaction progress on stake screen

## What's Left

### Must Have (for demo)

1. ~~Mobile wallet signing~~ ✅ Fixed with MWA native protocol
2. Wire corpse discovery into `/play` screen
3. Test full flow on devnet with real SOL

### Nice to Have

- Claude API for dynamic narrative
- Audio system
- Real leaderboard from clears data
- Polish animations

## Demo Flow (for judges)

```
1. Connect wallet (MWA on mobile, Phantom on desktop)
2. See real death feed + pool stats
3. Stake 0.01 SOL (real transfer)
4. Play through rooms, find corpses
5. Enter combat, use abilities
6. Die → leave final message → appears in feed
7. Or clear → claim stake + bonus
8. Show transaction on Solana explorer
```

## File Structure

```
src/
├── app/
│   ├── page.tsx           # Title screen
│   ├── stake/page.tsx     # Stake selection
│   ├── play/page.tsx      # Main game
│   ├── combat/page.tsx    # Combat system
│   ├── death/page.tsx     # Death screen
│   ├── victory/page.tsx   # Victory screen
│   └── api/
│       └── session/
│           ├── start/     # Create game session
│           ├── death/     # Record death
│           └── victory/   # Process payout
├── components/
│   └── WalletProvider.tsx # Solana wallet setup
└── lib/
    ├── gameState.ts       # localStorage state
    ├── instant.ts         # InstantDB client
    ├── mobileWallet.ts    # MWA transaction handling
    └── mwaAuthCache.ts    # Auth token caching
```

## Known Issues

1. **First-time MWA**: First transaction still requires authorize (cached after)
2. **Leaderboard**: Currently mock data
3. **Corpse discovery**: Not wired to UI yet
4. **No audio**: Placeholder for post-hackathon

## Testing Checklist

- [x] Desktop wallet connect (Phantom)
- [x] Mobile wallet connect (MWA)
- [x] Balance displays correctly
- [x] Stake transaction prompts and executes
- [x] Game state persists between screens
- [x] Combat works (damage, healing, victory/death)
- [x] Death records to InstantDB
- [x] Death appears in live feed
- [ ] Victory payout executes
- [ ] Pool wallet has funds for payout
