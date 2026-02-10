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
- [x] Leaderboard + live death feed
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
- [ ] Better onboarding for new players
- [ ] Tutorial hints (first 2 rooms)
- [ ] Loading skeletons
- [ ] Error recovery flows

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

## Phase 3: On-Chain Program
*Target: Weeks 7-10*

Trustless Solana integration.

### Anchor Program
- [ ] Escrow PDA for stakes
- [ ] Pool PDA per zone
- [ ] Trustless claim mechanics
- [ ] On-chain tip system
- [ ] Admin/emergency functions
- [ ] Upgrade authority management

### Security
- [ ] Formal audit (Sec3/OtterSec)
- [ ] Rate limiting
- [ ] Sybil resistance
- [ ] Bot detection

**Success**: No backend wallet needed. Fully trustless stake/claim/tip.

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

- ❌ Mobile-first (web-first, mobile-friendly)
- ❌ Real-time multiplayer (async is the point)
- ❌ Complex graphics/art (terminal aesthetic is intentional)
- ❌ Native apps (web only)
- ❌ Multiple tokens (SOL only for now)
- ❌ DAO governance (keep it simple)
- ❌ VCs/fundraising (bootstrap first)
