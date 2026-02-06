
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

<h3 align="center">💀 Death is Treasure 💀</h3>

<p align="center">
  A social roguelite where your death becomes content for others.<br/>
  <strong>Fall so others can rise.</strong>
</p>

<p align="center">
  <a href="https://die-forward.vercel.app">🎮 Play Now</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#setup">Setup</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Solana-Devnet-9945FF?style=flat-square&logo=solana" alt="Solana Devnet" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Built%20for-Colosseum%20Hackathon-orange?style=flat-square" alt="Colosseum Hackathon" />
</p>

---

## 🎯 The Concept

**Die Forward** reimagines death in gaming. In most games, dying means failure and frustration. Here, **death is a gift to future players**.

When you die:
- Your **corpse persists** in the dungeon
- Your **final words** become someone else's discovery  
- Your **staked SOL** joins the Memorial Pool
- Your **inventory** becomes loot for others

*Lonely but not alone. Shared suffering, shared rewards.*

---

## 🎮 How It Works

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CONNECT   │ → │    STAKE    │ → │    PLAY     │ → │  DIE / WIN  │
│   Wallet    │    │  0.01+ SOL  │    │  Navigate   │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
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
                   │ • Leave   │                              │           │
                   │   message │                              │           │
                   └───────────┘                              └───────────┘
```

### The Core Loop

1. **Connect** your Solana wallet (Phantom, Solflare, or Mobile Wallet Adapter)
2. **Stake** SOL to enter the dungeon (0.01 - 0.25 SOL)
3. **Navigate** procedurally generated rooms with narrative choices
4. **Fight** enemies using an intent-reading combat system
5. **Die** → Leave final words, become content for others
6. **...or Win** → Claim your stake + 50% bonus from the Memorial Pool

### Finding the Fallen

Other players' corpses appear in your dungeon:

```
┌────────────────────────────────────────────────────┐
│  You find the remains of @cryptoKnight...          │
│  They died 2 hours ago.                            │
│                                                    │
│  Final words: "the water... it's rising..."        │
│                                                    │
│  └─ 🗡️ Rusty Blade                                 │
├────────────────────────────────────────────────────┤
│  [1] Search the corpse                             │
│  [2] Pay respects and move on                      │
└────────────────────────────────────────────────────┘
```

---

## ⚔️ Combat System

No HP trading ping-pong. Every choice is a **risk/reward tradeoff**. Read enemy intent, exploit weaknesses, gear up.

### Enemy Tiers
Enemies hit harder as you go deeper:
- **Tier 1**: Base damage (The Drowned, Pale Crawler)
- **Tier 2**: 1.5x damage (Hollow Clergy, Carrion Knight)  
- **Tier 3**: 2x damage (The Unnamed, Mother of Tides)

### Intent System
Enemy intent **matters**:
| Intent | Effect |
|--------|--------|
| AGGRESSIVE | Normal attack |
| CHARGING | Low now, **DOUBLE next turn** (Dodge/Brace negates!) |
| DEFENSIVE | Reduced damage both ways |
| STALKING | Harder to flee |
| HUNTING | Bonus damage |

### Item Bonuses
Gear provides passive combat bonuses:
- 🔦 Torch: +25% damage
- 🗡️ Dagger: +35% damage
- 🛡️ Shield: -25% damage taken
- 🧥 Cloak: +15% flee, +10% defense

```
┌────────────────────────────────────────────────┐
│  🧟 THE DROWNED        ❤️ ██████░░░░  TIER 1   │
│                                                │
│  It lunges forward, claws extended...          │
│  Intent: CHARGING ⚠️                           │
│                                                │
│  ⚠️ Will deal DOUBLE damage next turn!         │
├────────────────────────────────────────────────┤
│  ⚔️ +25% DMG                                   │
├────────────────────────────────────────────────┤
│  [1] ⚔️ Strike — trade blows                   │
│  [2] 🛡️ Brace — tank hit (negates charge!)     │
│  [3] 💨 Dodge — avoid damage (negates charge!) │
│  [4] 🌿 Herbs — heal now, take the hit         │
│  [5] 🏃 Flee — try to escape                   │
└────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 + React 19 | App framework |
| **Wallet** | @solana/wallet-adapter | Desktop wallets (Phantom, Solflare) |
| **Mobile** | Mobile Wallet Adapter | Android + Solana Seeker support |
| **Styling** | Tailwind CSS | Terminal/CRT aesthetic |
| **Database** | InstantDB | Real-time death feed, corpse persistence |
| **Backend** | Next.js API Routes | Session management, SOL transfers |
| **Deploy** | Vercel | Hosting |
| **Network** | Solana Devnet | Blockchain transactions |

---

## 📱 Mobile Support

Die Forward fully supports **Solana Mobile Wallet Adapter** for Android devices, including the **Solana Seeker** phone.

- Uses `@solana-mobile/wallet-adapter-mobile` for wallet connections
- Native MWA protocol for transaction signing
- Auth token caching to minimize popup fatigue
- Handles base64-encoded addresses from MWA

---

## 🖼️ Screenshots

<p align="center">
  <em>Screenshots coming soon — game in active development!</em>
</p>

<!-- Placeholder for actual screenshots
![Title Screen](./screenshots/title.png)
![Stake Screen](./screenshots/stake.png)
![Combat](./screenshots/combat.png)
![Death](./screenshots/death.png)
-->

---

## 🚀 Setup

### Prerequisites

- Node.js 18+
- Solana wallet with devnet SOL
- (Optional) Android device with Phantom/Solflare for MWA testing

### Installation

```bash
# Clone the repo
git clone https://github.com/your-repo/die-forward.git
cd die-forward

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

### Environment Variables

```bash
# InstantDB
NEXT_PUBLIC_INSTANT_APP_ID=your_app_id
INSTANT_ADMIN_KEY=your_admin_key

# Solana
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_POOL_WALLET=your_pool_wallet_address
POOL_WALLET_SECRET=[...keypair_bytes...]

# Demo Mode (skips real SOL transfers for testing)
NEXT_PUBLIC_DEMO_MODE=true
```

### Getting Devnet SOL

```bash
# Using Solana CLI
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet

# Or use the faucet
# https://faucet.solana.com/
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx           # Title screen + death feed
│   ├── stake/page.tsx     # Stake selection
│   ├── play/page.tsx      # Main game navigation
│   ├── combat/page.tsx    # Intent-based combat
│   ├── death/page.tsx     # Death screen + epitaph
│   ├── victory/page.tsx   # Victory + payout
│   └── api/session/       # Backend APIs
├── components/
│   └── WalletProvider.tsx # Solana wallet setup
├── lib/
│   ├── gameState.ts       # Client-side state
│   ├── instant.ts         # InstantDB client
│   ├── content.ts         # Narrative content
│   ├── mobileWallet.ts    # MWA transaction handling
│   └── mwaAuthCache.ts    # Auth caching
├── content/               # JSON narrative templates
└── docs/                  # Design documentation
```

---

## 📚 Documentation

- [Game Design](docs/GAME_DESIGN.md) — Mechanics, combat, death system
- [Tech Stack](docs/TECH_STACK.md) — Architecture decisions
- [MVP Scope](docs/MVP_SCOPE.md) — Hackathon deliverables

---

## 🎪 Hackathon Info

**Die Forward** was built for the [Colosseum Agent Hackathon](https://www.colosseum.org/) (Feb 2026).

### Key Innovations

1. **Death as Content** — Your failure enriches others' experience
2. **Memorial Pool Economics** — Stakes from deaths fund winners' bonuses
3. **Async Social** — No lobbies, just evidence of shared struggle
4. **Mobile-First Crypto** — Full MWA support for Solana Seeker

---

## 👥 Team

Built with ☠️ by JP

---

## 📄 License

MIT — Die freely, die often.

---

<p align="center">
  <strong>💀 Every death matters. 💀</strong>
</p>
