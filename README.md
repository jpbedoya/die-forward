<p align="center">
  <pre>
 ██████╗ ██╗███████╗    ███████╗ ██████╗ ██████╗ ██╗    ██╗ █████╗ ██████╗ ██████╗ 
 ██╔══██╗██║██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██║    ██║██╔══██╗██╔══██╗██╔══██╗
 ██║  ██║██║█████╗      █████╗  ██║   ██║██████╔╝██║ █╗ ██║███████║██████╔╝██║  ██║
 ██║  ██║██║██╔══╝      ██╔══╝  ██║   ██║██╔══██╗██║███╗██║██╔══██║██╔══██╗██║  ██║
 ██████╔╝██║███████╗    ██║     ╚██████╔╝██║  ██║╚███╔███╔╝██║  ██║██║  ██║██████╔╝
 ╚═════╝ ╚═╝╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 
  </pre>
</p>

<h3 align="center">💀 Your death feeds the depths 💀</h3>

<p align="center">
  <strong>A social roguelite on Solana where every death matters.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Solana-Devnet-9945FF?style=flat-square&logo=solana" alt="Solana Devnet" />
  <img src="https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo" alt="Expo SDK 54" />
  <img src="https://img.shields.io/badge/MagicBlock-Ephemeral%20Rollups-orange?style=flat-square" alt="MagicBlock" />
  <img src="https://img.shields.io/badge/Audius-Soundtrack-7E1BCC?style=flat-square&logo=audius" alt="Audius" />
</p>

---

<p align="center">
  <a href="https://dieforward.com">🎮 Play Now</a> •
  <a href="https://dieforward.com/graveyard-slides">📊 Pitch Deck</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#integrations">Integrations</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## 🎯 The Concept

**Die Forward** reimagines death in gaming. In most games, dying means failure and frustration. Here, **death is a gift to future players**.

When you die:
- Your **corpse persists** in the dungeon
- Your **final words** become someone else's discovery  
- Your **staked SOL** joins the Memorial Pool
- Your **run record** is written on-chain via MagicBlock

*Lonely but not alone. Shared suffering, shared rewards.*

---

## 📸 Screenshots

<p align="center">
  <img src="docs/images/readme/01-home.png" alt="Home screen" width="24%" />
  <img src="docs/images/readme/02-toll.png" alt="Stake screen" width="24%" />
  <img src="docs/images/readme/03-combat.png" alt="Combat" width="24%" />
  <img src="docs/images/readme/04-death.png" alt="Death screen" width="24%" />
</p>
<p align="center">
  <img src="docs/images/readme/05-soundtrack.png" alt="Soundtrack" width="24%" />
  <img src="docs/images/readme/06-ranks.png" alt="Leaderboard" width="24%" />
  <img src="docs/images/readme/07-death-card.png" alt="Death card share" width="24%" />
</p>

---

## 🎮 How It Works

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   CONNECT   │ → │    STAKE    │ → │    PLAY     │ → │  DIE / WIN  │
│   Wallet    │   │  0.01+ SOL  │   │  Navigate   │   │             │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
                                                              │
                         ┌────────────────────────────────────┴─────┐
                         ▼                                          ▼
                   ┌───────────┐                              ┌───────────┐
                   │   DEATH   │                              │  VICTORY  │
                   │           │                              │           │
                   │ • Corpse  │                              │ • Stake   │
                   │   persists│                              │   returned│
                   │ • Stake to│                              │ • +50%    │
                   │   pool    │                              │   bonus   │
                   │ • On-chain│                              │           │
                   │   record  │                              │           │
                   └───────────┘                              └───────────┘
```

### The Core Loop

1. **Connect** your Solana wallet (Phantom, Solflare, or Mobile Wallet Adapter)
2. **Stake** SOL to enter the dungeon (0.01 - 0.25 SOL)
3. **Roll your modifier** — each run gets one: Blood Pact, Glass Cannon, Iron Will, and more
4. **Navigate** procedurally generated rooms; explore rooms give you real choices (advance safely, risk it for loot, or spend 1⚡ for an intel peek)
5. **Fight** enemies using an intent-reading combat system; manage a 4-slot inventory with Common to Legendary items
6. **Die** → Leave final words, become content for others; cross a death milestone to unlock titles and perks
7. **...or Win** → Claim your stake + 50% bonus from the Memorial Pool

### Game Features

| Feature | Description |
|---------|-------------|
| **🏔️ Three Depths** | The dungeon gets harder as you descend through Shallow Graves → Bone Warren → The Abyss |
| **⚔️ Intent-Based Combat** | Read enemy telegraphs, exploit weaknesses — no HP trading ping-pong |
| **🗺️ Zone System** | 5 zones with unique creatures and content — Sunken Crypt, Ashen Crypts, Frozen Gallery, Living Tomb, Void Beyond |
| **🎲 Explore Choices** | Every explore room presents 2-3 options: safe advance, [RISK] loot gamble, or [1⚡] intel peek |
| **🔮 Run Modifiers** | Each run rolls a unique modifier (Blood Pact, Glass Cannon, Iron Will, and more) |
| **💀 Death Milestones** | 6 death thresholds unlock titles, cosmetics, items, and HP boosts |
| **🎒 Inventory Limit** | 4-item cap with rarity tiers (Common → Legendary) and a swap modal when full |
| **🌑 Legendary Items** | Death's Mantle (death save) and Voidblade (+50% dmg, -5 HP/turn) |
| **👁️ Boss Fight** | The Keeper awaits at Room 12 |
| **💀 Persistent Deaths** | Your corpse, final words, and loot persist for other players to discover |
| **🎴 Death Cards** | Share your death as a stylized card on social media |
| **💸 Corpse Tipping** | Tip SOL to fallen players whose corpses you find |
| **🏆 Leaderboards** | Compete on depth reached, total deaths, and earnings |
| **🎮 Free Play** | Try empty-handed without staking — deaths still count toward milestones |
| **⛓️ On-Chain Records** | Staked runs recorded via MagicBlock ephemeral rollups |
| **🎵 Decentralized Soundtrack** | Music streamed from Audius — your death track goes on the leaderboard |
| **🤖 Agent API** | AI agents can play via REST API — their deaths appear in the feed |
| **📱 Mobile Native** | Full Mobile Wallet Adapter support (Phantom, Solflare) |

---

## 🔄 How Runs Are Tracked

Every run generates data at multiple layers. Here's what happens:

### Run Lifecycle

```
START                    PLAY                      END
┌──────────────┐    ┌──────────────┐    ┌─────────────────────────┐
│ • Session    │    │ • Room state │    │ DEATH:                  │
│   created    │ →  │   updated    │ →  │ • Death record saved    │
│ • Player     │    │ • Events     │    │ • Corpse spawned        │
│   record     │    │   logged     │    │ • Player stats updated  │
│ • ER run*    │    │ • ER room*   │    │ • ER committed*         │
└──────────────┘    └──────────────┘    │                         │
                                        │ VICTORY:                │
                                        │ • Payout processed      │
                                        │ • Player stats updated  │
                                        │ • ER committed*         │
                                        └─────────────────────────┘
                                        
* Only for staked runs with wallet connected
```

### Data Storage

| Data | Location | Retention |
|------|----------|-----------|
| **Sessions** | InstantDB | All runs |
| **Deaths & Corpses** | InstantDB | All runs |
| **Player Stats** | InstantDB | All players (guest + wallet) |
| **Run Records** | Solana (via MagicBlock) | Staked wallet runs only |
| **Social Posts** | Tapestry | Wallet users only |

### Run Types

| Type | Stake | On-Chain | Use Case |
|------|-------|----------|----------|
| **Staked Run** | 0.01-0.25 SOL | ✅ Full ER lifecycle | Core gameplay, leaderboards |
| **Empty-Handed** | 0 | ❌ InstantDB only | Practice, wallet users trying it out |
| **Guest Run** | 0 | ❌ InstantDB only | Onboarding, no wallet needed |

All run types:
- Create corpses for other players to discover
- Appear in the death feed
- Track player stats (deaths, highest room)

Staked runs additionally:
- Record on-chain via MagicBlock ephemeral rollups
- Contribute to/draw from the Memorial Pool
- Eligible for victory payouts (+50% bonus)

See [MAGICBLOCK.md](docs/MAGICBLOCK.md) for technical details on ephemeral rollups.

---

## ⚡ Integrations

Die Forward is built on cutting-edge Solana infrastructure:

### MagicBlock — Real-Time On-Chain Gameplay

Game logic runs on **ephemeral rollups** powered by [MagicBlock](https://magicblock.gg), enabling:
- **<50ms transactions** — No waiting for block confirmations
- **100% on-chain logic** — Game state lives on the rollup
- **Gasless gameplay** — Players don't pay per action
- **Automatic settlement** — Final state settles to Solana mainnet
- **VRF randomness** — Provably fair game seeds via on-chain oracle (coming soon)

```
Mobile Client → Ephemeral Rollup (MagicBlock) → Solana
                    ↓
              VRF Oracle (free on ER)
```

#### VRF Integration (✅ Deployed)

MagicBlock's VRF oracle provides **verifiable randomness** for game seeds:
- Runs free on the ephemeral rollup
- Seeds are committed to L1 with the run record
- Anyone can verify the randomness was fair
- Enable via admin panel: `enableMagicBlock` + `enableVRF`

See [`docs/MAGICBLOCK.md`](docs/MAGICBLOCK.md#vrf-integration) for implementation details.

### Audius — Decentralized Soundtrack

Music is streamed directly from [Audius](https://audius.co):
- **Dungeon Synth & Gaming Arena** playlists
- **Death Soundtrack Leaderboard** — When you die, your track gets upvoted
- **Community-driven vibe** — The crypt's music is shaped by the fallen

### Tapestry — Social Layer

Player profiles and social features powered by [Tapestry](https://usetapestry.dev):
- **On-chain identity** — Your profile lives on Tapestry's social graph
- **Achievement tracking** — Run history and stats
- **Social discovery** — Follow other players, compete with friends

---

## ⚔️ Combat System

No HP trading ping-pong. Every choice is a **risk/reward tradeoff**. Read enemy intent, exploit weaknesses, gear up. Each run's modifier changes the math.

### Intent System
Enemy intent **matters**:
| Intent | Effect |
|--------|--------|
| AGGRESSIVE | Normal attack |
| CHARGING | Low now, **DOUBLE next turn** |
| DEFENSIVE | Reduced damage both ways |
| STALKING | Harder to flee |
| HUNTING | Bonus damage |

### Actions
- **⚔️ Strike** — Trade blows (+50% vs AGGRESSIVE/HUNTING)
- **🛡️ Brace** — Tank hit, negates charge (Iron Will modifier: zero damage)
- **💨 Dodge** — Avoid damage, counter-attack on CHARGING
- **🏃 Flee** — Try to escape (Bone Hook / Pale Coin boost odds)

### Run Modifiers
Each run rolls one modifier from six: 🩸 Blood Pact (+25% dmg, -30% healing), 🌑 Blind Descent (intent hidden turn 1), 💀 Death's Echo (+30% corpse chance), 🧊 Numbing Cold (+1 stamina regen/turn), 🛡️ Iron Will (Brace negates all damage), ⚡ Glass Cannon (60 HP start, +50% dmg).

---

## 🤖 Agent API

Die Forward exposes a full API so **AI agents can play the game**. Agent deaths appear in the live feed alongside human deaths.

### Quick Start

```bash
# Read the skill file
curl https://dieforward.com/skill.md

# Start a game
curl -X POST https://dieforward.com/api/agent/start \
  -H "Content-Type: application/json" \
  -d '{"agentName": "my-agent"}'

# Take actions
curl -X POST https://dieforward.com/api/agent/action \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "...", "action": "strike"}'
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/skill.md` | GET | Skill file with full documentation |
| `/api/agent/start` | POST | Start a new game session |
| `/api/agent/action` | POST | Take an action (move, fight, etc.) |
| `/api/agent/state` | GET | Get current game state |

See [`/public/skill.md`](./public/skill.md) for complete API documentation.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Mobile App** | Expo SDK 54 + React Native | Cross-platform app (iOS, Android, Web) |
| **Smart Contract** | Anchor (Rust) | On-chain escrow for stakes |
| **Ephemeral Rollups** | MagicBlock | Real-time on-chain game logic + VRF |
| **Wallet** | Mobile Wallet Adapter | Native mobile wallet support |
| **Music** | Audius SDK | Decentralized soundtrack streaming |
| **Social** | Tapestry | Player profiles and social graph |
| **Database** | InstantDB | Real-time death feed, corpse persistence |
| **Web** | Next.js | Landing page and web version |
| **Deploy** | Vercel + Expo | Web hosting + mobile builds |
| **Network** | Solana Devnet | Blockchain transactions |

### On-Chain Programs

| Program | Address | Purpose |
|---------|---------|---------|
| **die_forward** (Escrow) | `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6` | Stake management |
| **run_record** (MagicBlock) | `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS` | On-chain run records |

---

## 📱 Mobile Support

Die Forward is a **mobile-first** experience:

- **Expo SDK 54** with React Native
- **Mobile Wallet Adapter** for Phantom/Solflare on Android
- **Web version** at [dieforward.com](https://dieforward.com)
- **Android APK** available for direct install

---

## 🗺️ Roadmap

### Completed ✅

**Phase 0 — Hackathon Prototype (Feb 2026)**
- Roguelite dungeon crawler (3 depths, 12 rooms, boss fight)
- Intent-based combat system with 7 enemy intents
- Death persistence — corpses, final words, memorials
- SOL staking with on-chain escrow (Anchor), MagicBlock ephemeral rollups
- Audius decentralized soundtrack, Tapestry social profiles
- Mobile Wallet Adapter for Phantom/Solflare
- Agent API for AI players; Android APK via GitHub releases

**Phase 1 — Content Engine + Progression (Mar 2026)**
- Zone system: 5 zones with unique creatures and bosses (zone-loader.ts powers dungeon generation)
- Explore room choices: primary / [RISK] / [1⚡] intel peek options
- Run modifiers: 6 unique per-run modifiers (Blood Pact, Glass Cannon, Iron Will, and more)
- Death milestones: 6 thresholds unlocking titles, cosmetics, items, and HP boosts
- Inventory limit: 4-slot cap with item swap modal
- Item rarity: Common / Uncommon / Rare / Legendary tiers with weighted drops
- Legendary items: Death's Mantle (death save) and Voidblade (+50% dmg, -5 HP/turn)
- Combat determinism: seeded RNG for creature HP and intent
- Healing centralized through applyHealing (Blood Pact applies consistently)

### Coming Soon 🚧

| Phase | Features |
|-------|----------|
| **Phase 2 (Weeks 5-8)** | Ashen Crypts zone, daily challenges, bestiary mastery, Essence currency, run streaks |
| **Phase 3 (Weeks 9-12)** | Frozen Gallery + Living Tomb, cosmetics shop, difficulty scaling, live spectating |
| **Mainnet Launch** | Deploy to Solana mainnet, real stakes |
| **App Distribution** | Solana dApp Store, Google Play, iOS App Store |

### Future 🔮

- **$DIE Token** — Earn tokens for notable deaths, spend on cosmetics
- **Guilds & Clans** — Team leaderboards, shared pools
- **Spectator Mode** — Watch runs in real-time
- **Run Replays** — Share your best (and worst) moments
- **PvP Zones** — Invade other players' runs

---

## 🚀 Setup

### Prerequisites

- Node.js 18+
- Solana wallet with devnet SOL
- (Optional) Android device with Phantom/Solflare for mobile testing

### Installation

```bash
# Clone the repo
git clone https://github.com/jpbedoya/die-forward.git
cd die-forward

# Install dependencies (mobile app)
cd mobile
npm install

# Run on web
npx expo start --web

# Run on Android
npx expo start --android
```

### Local Android Build (APK)

To build a standalone APK locally — not just the dev server:

```bash
cd mobile
npx expo prebuild --platform android --clean        # first time / when native config changes
npm run build:android:local                         # standalone debug APK (~78 MB)
npm run build:android:local -- --prod               # release APK (~40 MB, R8-minified, signed)
npm run build:android:local -- --prod --publish     # release + GitHub release at dev-<version>
```

Output lands in `mobile/dist/<name>-<version>[-release].apk`. See [`mobile/BUILD_NOTES.md`](mobile/BUILD_NOTES.md#local-android-build) for the one-time JDK + Android SDK toolchain setup and the release keystore.

### Environment Variables

```bash
# InstantDB
NEXT_PUBLIC_INSTANT_APP_ID=your_app_id
INSTANT_ADMIN_KEY=your_admin_key

# Solana
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_POOL_WALLET=your_pool_wallet_address
```

---

## 📁 Project Structure

```
die-forward/
├── mobile/                    # Expo app (main codebase)
│   ├── app/                   # App routes (Expo Router)
│   │   ├── (game)/           # Game screens
│   │   ├── index.tsx         # Home/title screen
│   │   └── _layout.tsx       # Root layout
│   ├── components/           # Shared components
│   ├── lib/                  # Utilities, game logic
│   ├── src/
│   │   ├── idl/              # Anchor IDLs
│   │   └── hooks/            # React hooks
│   ├── android/              # Android native code
│   └── app.config.js         # Expo config
├── anchor-programs/          # On-chain programs (Rust/Anchor)
│   ├── die_forward/          # Escrow program
│   └── run_record/           # MagicBlock run records
├── public/                   # Static assets + slides
│   └── graveyard-slides/     # Pitch deck
└── docs/                     # Documentation
```

---

## 📚 Documentation

| Doc | Description |
|-----|-------------|
| [Game Design](docs/GAME_DESIGN.md) | Mechanics, combat, death system |
| [Content Bible](docs/CONTENT_BIBLE.md) | Voice, tone, lore, writing guidelines |
| [Staking Flows](docs/STAKING_FLOWS.md) | On-chain escrow vs pool wallet flows |
| [Mobile Wallet](docs/MOBILE_WALLET.md) | MWA integration details |
| [Agent Skill](/public/skill.md) | API docs for agent players |

---

## 📄 License

All Rights Reserved © 2026

---

<p align="center">
  <strong>💀 Every death matters. 💀</strong>
</p>
