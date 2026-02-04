# Roadmap

## Phase 0: Hackathon MVP ✅
*Target: Week 1*

The playable proof of concept.

- [x] Game design locked
- [x] Tech stack chosen
- [ ] Core game loop (1 zone, 5-7 rooms)
- [ ] Combat system
- [ ] Death → corpse → discovery flow
- [ ] Simple Solana transfers (stake/claim)
- [ ] InstantDB integration
- [ ] Leaderboard + live death feed
- [ ] Basic audio system
- [ ] Deployed on Vercel

**Success**: Players can stake, play, die, become corpses, and others can find them.

---

## Phase 1: Polish & Validate
*Target: Weeks 2-3*

Make it actually fun.

### Gameplay
- [ ] Balance pass (damage, health, stamina)
- [ ] More enemy variety (3-5 types)
- [ ] Trap encounters
- [ ] Mystery encounters (agent wildcards)
- [ ] Better loot variety
- [ ] Item balancing

### UX
- [ ] Onboarding flow
- [ ] Tutorial room
- [ ] Better mobile support
- [ ] Loading states
- [ ] Error handling
- [ ] Transaction feedback

### Audio
- [ ] Full SFX pass
- [ ] Music polish
- [ ] Volume controls

### Analytics
- [ ] Track run metrics
- [ ] Identify drop-off points
- [ ] A/B test encounter balance

**Success**: Players return for multiple runs. Average session > 10 minutes.

---

## Phase 2: On-Chain Program
*Target: Weeks 4-6*

Trustless Solana integration.

### Anchor Program
- [ ] Escrow PDA for stakes
- [ ] Pool PDA per zone
- [ ] Claim mechanics
- [ ] Tip system (direct to corpse wallet)
- [ ] Admin functions (emergency withdrawal)

### Integration
- [ ] Replace simple transfers
- [ ] Transaction verification
- [ ] On-chain run verification (optional)

### Security
- [ ] Audit prep
- [ ] Rate limiting
- [ ] Abuse prevention

**Success**: No backend wallet needed. Fully trustless stake/claim.

---

## Phase 3: World Expansion
*Target: Weeks 7-10*

More content, more reasons to play.

### Zones
- [ ] **Ruined Chapel** — undead, holy/unholy mechanics
- [ ] **Ashen Halls** — fire hazards, environmental damage
- [ ] **The Void** — sensory deprivation, harder enemies

### Progression
- [ ] Zone unlock requirements
- [ ] Knowledge system (enemy hints persist)
- [ ] Achievement badges
- [ ] Player profiles

### Social
- [ ] Player search
- [ ] Run history viewing
- [ ] "Follow" favorite corpses
- [ ] Social sharing (Twitter cards)

**Success**: Players have goals beyond single runs. Retention improves.

---

## Phase 4: Seasons & Economy
*Target: Weeks 11-14*

Sustainable game loop.

### Seasons
- [ ] Time-limited seasons (2-4 weeks)
- [ ] Season leaderboards
- [ ] Season-end pool distribution
- [ ] World "reset" narrative

### Economy
- [ ] Dynamic stake suggestions
- [ ] Pool distribution mechanics
- [ ] Anti-whale measures
- [ ] Optional token integration (if applicable)

### Events
- [ ] Limited-time zones
- [ ] Boss events
- [ ] Community challenges

**Success**: Recurring engagement loop. Players anticipate seasons.

---

## Phase 5: Advanced Social
*Target: Weeks 15+*

Community features.

### Guilds
- [ ] Create/join guilds
- [ ] Guild leaderboards
- [ ] Shared guild pools
- [ ] Guild-only zones

### Spectating
- [ ] Watch live runs
- [ ] Spectator chat
- [ ] Betting on runners (prediction markets?)

### Content
- [ ] Run replays
- [ ] Highlight clips
- [ ] Death compilations

**Success**: Die Forward is a community, not just a game.

---

## Future Ideas (Backlog)

*Not committed, just possibilities.*

- **NFT Corpses**: Mint notable deaths as collectibles
- **Custom Death Messages**: Pay extra for longer/formatted messages
- **Haunting**: Dead players can influence living runs briefly
- **PvP Zones**: Direct player combat areas
- **Crafting**: Combine items for upgrades
- **Companions**: AI helpers that die with you
- **Mobile App**: Native iOS/Android
- **VR Mode**: Full immersion horror

---

## Metrics to Track

| Metric | Target |
|--------|--------|
| Daily Active Players | Growing week over week |
| Average Session Length | > 10 minutes |
| Runs per Player per Day | > 2 |
| Return Rate (D1) | > 40% |
| Return Rate (D7) | > 20% |
| Stake Conversion | > 30% of connected wallets |
| Clear Rate | 10-20% (not too easy, not too hard) |

---

## Non-Goals (For Now)

Things we're explicitly **not** doing:

- Mobile-first (web-first, mobile-friendly)
- Real-time multiplayer (async is the point)
- Complex graphics/art (terminal aesthetic)
- Native apps (web only)
- Multiple tokens (SOL only)
- DAO governance (keep it simple)
