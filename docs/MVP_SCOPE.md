# MVP Scope

## Hackathon Constraints

- **Timeline**: ~1 week (Colosseum Agent Hackathon)
- **Team**: Solo/small
- **Goal**: Playable demo that demonstrates core concept

## What's IN (MVP)

### Core Game

- [ ] **1 Zone**: "The Sunken Crypt" (5-7 rooms)
- [ ] **Core loop**: Start → Navigate → Choose → Die/Clear
- [ ] **3 encounter types**: Combat, Ghost (corpse), Cache (loot)
- [ ] **Combat system**: Intent-reading, 4-5 actions
- [ ] **Death flow**: Final message → become corpse
- [ ] **Corpse discovery**: Find others, loot them, read messages

### Solana

- [ ] **Wallet connect**: Phantom, Solflare via adapter
- [ ] **Stake on start**: Simple transfer to treasury
- [ ] **Memorial pool**: Backend tracks per-zone totals
- [ ] **Claim on clear**: Backend sends pool share

### Social

- [ ] **Leaderboard**: Top players by clears, deaths, earned
- [ ] **Live death feed**: Real-time corpse appearances
- [ ] **Death counter**: "X adventurers died here today"

### Audio

- [ ] **3 music states**: Explore, tension, combat
- [ ] **Zone ambient**: Water drips/echoes for Crypt
- [ ] **Core SFX**: Hit, hurt, death, loot, ghost found
- [ ] **1 stinger**: Enemy appears

### UI

- [ ] **Terminal aesthetic**: Text-based, minimal graphics
- [ ] **Game screen**: Narrative + stats + choices
- [ ] **Wallet status**: Connected address, stake amount
- [ ] **Basic responsive**: Works on desktop + mobile

### Tech

- [ ] **Next.js app**: Single-page game flow
- [ ] **InstantDB**: Player, runs, corpses, pools
- [ ] **Vercel Edge**: Game API + Claude integration
- [ ] **Deployed**: Live on Vercel

## What's OUT (Post-Hackathon)

### Game Expansion

- Multiple zones with different themes
- More encounter types (traps, mysteries, NPCs)
- Boss encounters
- Branching paths / room choices
- Enemy variety (currently: 2-3 enemy types)

### Progression

- Meta unlocks (knowledge, zone access)
- Player profiles / history
- Achievement system
- Seasonal resets

### Solana V2

- On-chain Anchor program
- Trustless escrow/claims
- Ghost tipping system
- NFT corpse markers (optional)
- Token integration (if applicable)

### Social V2

- Global chat / emotes
- Guilds / teams
- Spectator mode
- Run replays
- Social sharing (Twitter cards, etc.)

### Audio V2

- Per-zone music tracks
- Dynamic layering system
- TTS for ghost messages
- More SFX variety

### Polish

- Animations / transitions
- Sound design pass
- Mobile optimization
- Accessibility features
- Localization

## MVP Success Criteria

### Must Work

1. Player can connect wallet
2. Player can stake and start a run
3. Player navigates rooms with choices
4. Combat is playable and tense
5. Player can die and leave a message
6. Future players find that corpse
7. Player can clear and claim rewards
8. Leaderboard shows top players
9. Live feed shows recent deaths

### Nice to Have

- Smooth audio transitions
- Polished UI animations
- Mobile fully working
- Multiple enemy types

### Demo Flow (for judges)

```
1. Connect wallet
2. Stake 0.01 SOL
3. Play through 3-4 rooms
4. Find a corpse, read message, loot
5. Die in combat
6. Leave final message
7. New session: start another run
8. Find your own corpse
9. Clear the zone
10. Claim from pool
11. Show leaderboard
```

## Time Estimates

| Component | Days |
|-----------|------|
| Project setup + DB schema | 0.5 |
| Game UI (screens, components) | 1.5 |
| Agent integration (prompts, API) | 1 |
| Combat system | 1 |
| Death/corpse flow | 0.5 |
| Solana integration | 1 |
| Audio system | 0.5 |
| Leaderboard + feed | 0.5 |
| Polish + testing | 1 |
| **Total** | **~7 days** |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Agent responses too slow | Cache common encounters, stream responses |
| InstantDB issues | Fallback to Supabase if needed |
| Solana tx failures | Clear error handling, retry logic |
| Combat not fun | Playtest early, iterate on prompts |
| Scope creep | Ruthlessly cut to MVP list above |
