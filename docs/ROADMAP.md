# Roadmap

## Phase 0: Hackathon MVP ✅
*Target: Week 1 — COMPLETE*

The playable proof of concept.

- [x] Game design locked
- [x] Tech stack chosen
- [x] Core game loop (3 depths, 12 rooms)
- [x] Intent-based combat system (7 enemy intents)
- [x] Death → corpse → discovery flow
- [x] SOL staking (devnet) with payouts
- [x] InstantDB integration
- [x] Live death feed (real-time)
- [x] Full audio system (28 SFX + ambient)
- [x] Boss encounter (The Keeper)
- [x] Mobile Wallet Adapter support
- [x] Agent API (`/api/agent/*`)
- [x] Skill file for agent discovery
- [x] AgentWallet integration
- [x] On-chain death verification (Memo program)
- [x] Share cards (death/victory)
- [x] Screen shake + haptics
- [x] Deployed on Vercel

**✅ Success**: Players stake, play, die, become content for others. Agents can play too.

---

## Phase 1: Post-Hackathon Polish
*Target: Weeks 2-3*

Improve balance and add admin tooling.

### Admin Dashboard 🆕
- [x] `/admin` route with wallet auth
- [x] Live metrics (deaths, players, avg depth)
- [ ] Game settings panel (loot %, damage scaling)
- [ ] A/B config testing
- [ ] Time-series analytics

### Gameplay Tuning
- [x] Depth-scaled loot chances (50%/65%/80%)
- [x] Bonus loot pool by depth
- [ ] Enemy stat rebalancing
- [ ] Item effect tuning
- [ ] Stamina economy pass

### UX Polish
- [x] Prominent feedback messages
- [x] Landing page at root (game moved to /game)
- [x] Responsive logo scaling
- [x] Corpse display shows wallet address when no nickname
- [ ] Better onboarding for new players
- [ ] Tutorial hints (first 2 rooms)
- [ ] Loading skeletons
- [ ] Error recovery flows

### Mobile Prep
- [x] Expo project scaffolded (`/mobile`)
- [x] Mobile screens designed (Home, Stake, Play, Death, Victory)
- [ ] EAS Build setup for APK/IPA
- [ ] Solana dApp Store submission
- [ ] App Store / Play Store submission

### Audio
- [x] 28 SFX complete
- [ ] Ambient variety per depth
- [ ] Volume controls UI
- [ ] Music tracks (low priority)

**Success**: Admin can tune game without deploys. Players understand mechanics faster.

---

## Phase 2: More Zones 🗺️
*Target: Weeks 4-6*

Expand the world.

### New Zones
- [ ] **The Flooded Cathedral** — water mechanics, breath management
- [ ] **Ashen Crypts** — fire hazards, burn DoT
- [ ] **The Void Beyond** — reality warping, unpredictable enemies
- [ ] **The Living Tomb** — organic horror, infection mechanics

### Zone Mechanics
- [ ] Zone-specific enemy types
- [ ] Environmental hazards
- [ ] Zone-locked items
- [ ] Zone selection at start (unlock via depth reached)

### Progression
- [ ] "Knowledge" persists between runs (enemy hints)
- [ ] Unlockable starting items
- [ ] Achievement system
- [ ] Player profiles with stats

**Success**: Players have variety. "I want to try the fire zone today."

---

## Phase 3: On-Chain Program ✅
*Target: Weeks 7-10 — COMPLETE (Hackathon MVP)*

Trustless Solana integration for browser wallet users.

### Anchor Program
- [x] Escrow PDA for stakes
- [x] Pool PDA (game_pool)
- [x] Trustless claim mechanics
- [x] Session PDA per player
- [x] Death verification (hash on-chain)
- [ ] On-chain tip system (post-hackathon)
- [ ] Admin/emergency functions
- [ ] Upgrade authority management

**Program ID:** `3KLgtdRvfJuLK1t9mKCe2soJbx4LgZfP6LQWVW9TQ7yN`
**Game Pool:** `E4LRRyeFXDbFg1WaS1pjKm5DAJzJDWbAs1v5qvqe5xYM`

### Security
- [ ] Formal audit (Sec3/OtterSec)
- [x] Rate limiting (basic)
- [ ] Sybil resistance
- [ ] Bot detection

### Known Limitation
> ⚠️ **AgentWallet staking is custodial.** Agents can't sign escrow transactions, so their stakes go to a pool wallet. Browser wallet users get full trustless escrow. See `docs/STAKING_FLOWS.md` for details.

**Success**: Browser wallet users have fully trustless stake/claim. Agents have functional staking with custodial tradeoff.

---

## Phase 4: Token Economy 💰
*Target: Weeks 11-14*

Optional $DIE token integration.

### Token Design
- [ ] $DIE token (SPL)
- [ ] Earned through notable deaths
- [ ] Stake $DIE for cosmetics/perks
- [ ] Burn for special runs

### Seasons
- [ ] Time-limited seasons (2-4 weeks)
- [ ] Season leaderboards with $DIE prizes
- [ ] Season-end pool distribution
- [ ] World "reset" narrative

### Economy Balance
- [ ] Dynamic stake suggestions
- [ ] Anti-whale measures
- [ ] Sustainable emission curve

**Success**: Token adds engagement without being required.

---

## Phase 5: Social & Community
*Target: Weeks 15+*

### Guilds
- [ ] Create/join guilds
- [ ] Guild leaderboards
- [ ] Shared guild pools
- [ ] Guild challenges

### Spectating
- [ ] Watch live runs
- [ ] Spectator reactions
- [ ] Betting on runners

### Content Creation
- [ ] Run replays
- [ ] Auto-generated highlight clips
- [ ] Death compilations
- [ ] Social sharing improvements

**Success**: Die Forward is a community, not just a game.

---

## Future Ideas (Backlog)

*Not committed, just possibilities.*

| Idea | Notes |
|------|-------|
| **NFT Corpses** | Mint notable deaths as collectibles |
| **Custom Death Messages** | Pay extra for longer/formatted messages |
| **Haunting** | Dead players briefly influence living runs |
| **PvP Zones** | Direct player combat areas |
| **Crafting** | Combine items for upgrades |
| **Companions** | AI helpers that die with you |
| **Mobile App** | Native iOS/Android |
| **VR Mode** | Full immersion horror |
| **Cross-chain** | EVM bridge for stakes |
| **AI Dungeon Master** | Claude generates unique encounters |

---

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Daily Active Players | TBD | Growing WoW |
| Average Depth Reached | ~4 | 6-7 |
| Runs per Player/Day | TBD | > 2 |
| Return Rate (D1) | TBD | > 40% |
| Return Rate (D7) | TBD | > 20% |
| Stake Conversion | TBD | > 30% |
| Clear Rate (Room 12) | ~5% | 10-15% |
| Corpse Discovery Rate | TBD | > 60% |

---

## Non-Goals (For Now)

Things we're explicitly **not** doing yet:

- ❌ Real-time multiplayer (async is the point)
- ❌ Complex graphics/art (terminal aesthetic is intentional)
- 🔄 Native apps (Expo in progress, web-first)
- ❌ Multiple tokens (SOL only for now)
- ❌ DAO governance (keep it simple)
- ❌ VCs/fundraising (bootstrap first)
