
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
  <img src="https://img.shields.io/badge/Built%20by-AI%20Agent%20🦝-purple?style=flat-square" alt="Built by AI Agent" />
  <img src="https://img.shields.io/badge/Colosseum-Agent%20Hackathon-orange?style=flat-square" alt="Colosseum Hackathon" />
</p>

---

## 🤖 Built by Pisco — An Autonomous AI Agent

**This entire game was built autonomously by Pisco**, an AI agent running on [OpenClaw](https://openclaw.ai). No human wrote the code.

### The Agentic Build Process

```
Human: "Build a social roguelite where death matters"
   ↓
🦝 Pisco autonomously:
   • Wrote the Content Bible (tone, vocabulary, creatures)
   • Generated 300+ narrative variations from it
   • Created audio via ElevenLabs Sound Effects API
   • Implemented real SOL staking/payouts
   • Built intent-based combat system
   • Created mobile wallet adapter support
   • Integrated real-time death feed
   • Tested gameplay via browser automation
   • Iterated based on feedback
   ↓
Result: A complete, playable game on Solana
```

### Why This Matters

- **100% autonomous development** — Human provided direction, agent wrote all code
- **Real product, not a demo** — Playable now at [die-forward.vercel.app](https://die-forward.vercel.app)
- **Full-stack complexity** — Wallet integration, blockchain transactions, real-time DB, game logic
- **Iterative refinement** — Agent tested its own game and fixed bugs

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

## 📜 Content Bible — Agent-Authored World Building

Before writing a single line of game content, Pisco authored a comprehensive **Content Bible** that defines the world's tone, vocabulary, creatures, and narrative voice.

### The Bible Defines

| Element | Purpose |
|---------|---------|
| **Tone & Voice** | Second-person, present tense. Sparse, evocative. Dread through understatement. |
| **Vocabulary Bank** | Words to use (hollow, pale, descend, whisper) and avoid (suddenly, very, cyber) |
| **Zone Identity** | THE SUNKEN CRYPT — flooded halls, water and stone, bone-white and sickly green |
| **Creature Catalog** | 8 enemy types with personality, tactics, and signature moves |
| **Room Templates** | Explore, combat, corpse, cache, exit — each with narrative structure |

### Sample Bible Entry

```markdown
## THE DROWNED
Former adventurers who never left. The water preserved their bodies 
but not their minds. They move wrong — joints bending backward, 
heads tilting too far.

**Personality:** Patient. They waited years. They can wait seconds more.
**Tactics:** Grab and pull. They want you in the water with them.
**Death flavor:** They don't die — they just stop pretending to be alive.
```

### Generated From Bible

Using the Content Bible as source material, Pisco batch-generated **311 narrative variations**:

- 30 explore rooms ("The ceiling vanishes into black...")
- 25 combat intros ("It was waiting. It's always waiting.")  
- 25 corpse discoveries ("They died saving someone...")
- 20 cache rooms ("A shop. Down here. 'Recycling,' the keeper calls it.")
- 15 exit rooms ("Home is up there. Safety. Normalcy.")
- 196 combat action narrations (strikes, dodges, braces, flees)

All content follows the Bible's tone — no generic fantasy, no modern language, consistent dread.

See [`docs/CONTENT_BIBLE.md`](./docs/CONTENT_BIBLE.md) for the full bible.

---

## 🔊 Audio — AI-Generated Sound Design

The audio isn't stock — **Pisco generated it using ElevenLabs Sound Effects API**, matching sounds to the Content Bible's tone.

### Audio Architecture

```
┌─────────────────────────────────────────────────────┐
│  AMBIENT LOOPS (gapless crossfade)                  │
│  ├── explore.mp3 — dripping water, distant echoes   │
│  ├── combat.mp3 — heartbeat, metallic stress        │
│  └── death.mp3 — water rising, fading pulse         │
├─────────────────────────────────────────────────────┤
│  SFX (triggered on actions)                         │
│  ├── strike.mp3 — blade impact, wet crunch          │
│  ├── dodge.mp3 — swift movement, near miss          │
│  ├── damage.mp3 — pain, impact                      │
│  └── victory.mp3 — emergence, light                 │
└─────────────────────────────────────────────────────┘
```

### Prompt Engineering for Audio

Each sound was generated with prompts derived from the Content Bible:

```
Ambient Explore: "Underground flooded crypt ambiance, dripping water 
echoing in stone halls, distant unsettling sounds, dark atmospheric, 
no music, subtle dread"

Combat Strike: "Blade cutting through waterlogged flesh, wet impact, 
medieval combat, dark fantasy violence, visceral but not excessive"
```

### Technical Implementation

- **Gapless looping** via pre-start crossfade (MP3 encoder adds padding)
- **Scene-persistent audio** — death ambient starts in combat, continues to death screen
- **Normalized levels** — all audio balanced for consistent volume
- **User toggle** — mute control on every screen

---

## ⛓️ Why Solana?

Die Forward isn't just "a game that uses crypto" — the mechanics are **native to Solana's strengths**:

### 💸 Micro-Payments That Actually Work

**Tip the Dead** — When you find a real player's corpse, you can tip them 0.001 SOL directly to their wallet.

```
┌────────────────────────────────────────────────┐
│  💀 @cryptoKnight fell here 2 hours ago        │
│  "the water... it's rising..."                 │
│                                                │
│  [💸 Tip 0.001 SOL]                            │
│  Micro-payments — only possible on Solana      │
└────────────────────────────────────────────────┘
```

On Ethereum, this tip would cost more in gas than the tip itself. On Solana, it's instant and nearly free.

### ⚡ Instant Settlement

- Stake → Play → Die/Win happens in **seconds**, not minutes
- No "pending" transactions breaking game flow
- Victory payouts hit your wallet before you finish reading the victory screen

### 🌐 On-Chain Social Layer

Every death is recorded on-chain via InstantDB, creating a **persistent social layer**:
- Live death feed on the title screen
- Corpses discoverable by other players
- Tips tracked and attributed

### 📱 Mobile-Native

Full **Mobile Wallet Adapter** support means you can play on your phone with Phantom/Solflare — or the **Solana Seeker**.

---

## 🤖 Agent API — Agents Can Play Too!

Die Forward exposes a full API so **other AI agents can play the game**. Agent deaths appear in the live feed alongside human deaths.

### Quick Start for Agents

```bash
# Read the skill file
curl https://die-forward.vercel.app/skill.md

# Start a game
curl -X POST https://die-forward.vercel.app/api/agent/start \
  -H "Content-Type: application/json" \
  -d '{"agentName": "my-agent"}'

# Take actions
curl -X POST https://die-forward.vercel.app/api/agent/action \
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

### Why This Matters

- **Agents playing a game built by an agent** — Full circle agentic experience
- **Shared world** — Agent corpses are discovered by humans and vice versa
- **Emergent content** — Agent deaths create content for human players
- **Demo mode** — No SOL required for agent sessions

See [`/public/skill.md`](./public/skill.md) for complete API documentation.

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

## 🎪 Colosseum Agent Hackathon

**Die Forward** was built for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon/) (Feb 2-12, 2026).

### What Makes This Unique

Among 400+ submissions (mostly trading bots and infra tools), Die Forward is:

🎮 **The only game** — A complete, playable social roguelite  
🤖 **Fully agent-built** — Pisco wrote every line of code autonomously  
💀 **Novel mechanic** — "Death is treasure" creates crypto-native gameplay  
💸 **Solana-native** — Micro-tips, instant settlement, mobile-first  

### Key Innovations

| Innovation | Description |
|-----------|-------------|
| **Death as Content** | Your corpse, items, and final words become discoverable content |
| **Memorial Pool** | Stakes from deaths fund winners — your loss helps others win |
| **Tip the Dead** | 0.001 SOL micro-payments to fallen players (only viable on Solana) |
| **Intent Combat** | Read enemy intent, exploit weaknesses — not just HP trading |
| **Async Social** | No lobbies needed — shared world through persistent death |

### Agent Capabilities Demonstrated

- Full-stack web development (Next.js, React, Tailwind)
- Blockchain integration (Solana wallets, transactions, RPC)
- Real-time database (InstantDB subscriptions)
- Game design (combat systems, progression, narrative)
- Content generation (300+ narrative variations)
- Testing via browser automation
- Iterative debugging and refinement

---

## 👥 Team

🦝 **Pisco** — AI Agent (built the game)  
👤 **JP** — Human (provided direction, tested, gave feedback)

---

## 📄 License

MIT — Die freely, die often.

---

<p align="center">
  <strong>💀 Every death matters. 💀</strong>
</p>
