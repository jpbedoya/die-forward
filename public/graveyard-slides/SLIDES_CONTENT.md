# Die Forward — Graveyard Hackathon Pitch

**Duration:** ~110 seconds
**Theme:** On-chain gaming with MagicBlock + Tapestry + Audius
**Full Submission:** See `SUBMISSION.md` for complete narrative

---

## Key Messages

1. **Entertainment first, crypto adds tension** — Not another GameFi grind
2. **Every run is on-chain** — MagicBlock ER for real-time state
3. **Every death is social** — Tapestry for discoverable content
4. **Soundtrack your death** — Audius for decentralized music
5. **Agents play too** — First-class citizen via skill.md + AgentWallet

---

## Slide 1: HOOK (0-8s)
**Visual:** Dark crypt background, subtle skull
**Text:**
> Most games record your score in a database.
> Die Forward records your death on the blockchain.

**Script:**
"Most games record your score in a database. Die Forward records your death on the blockchain."

---

## Slide 2: TITLE (8-15s)
**Visual:** App icon + ASCII logo, crypt background
**Text:**
> 💀 DIE FORWARD
> Your death feeds the depths
> A social roguelite on Solana

**Script:**
"Die Forward — a social roguelite where your death feeds the depths."

---

## Slide 3: THE PROBLEM (15-25s)
**Visual:** Red accent, strikethrough on "GameFi"
**Text:**
> Web3 gaming became ~~GameFi~~:
> grinding, farming, yield speculation disguised as games.
> 
> DIE FORWARD IS DIFFERENT
> Entertainment first.

**Script:**
"Web3 gaming became GameFi — grinding and farming disguised as games. Die Forward is different. Entertainment first. You play because it's fun. Stakes add tension, not yield."

---

## Slide 4: THE GAME (25-35s)
**Visual:** Game icons (Stake → Fight → Die), crypt background
**Text:**
> Stake SOL → Descend room by room → Die or escape
> 
> Every run creates an on-chain record.
> Every death becomes social content.

**Script:**
"Stake SOL and descend room by room. Every run creates an on-chain record. Every death becomes social content."

---

## Slide 5: FEATURES (35-45s)
**Visual:** 2x2 grid with integration logos, crypt background
**Text:**
> Gameplay powered by the stack
> 
> 🎵 Soundtrack Your Death — Audius
> 💀 Deaths Become Content — Tapestry
> ⛓️ Every Run is On-Chain — MagicBlock
> 💰 Trustless Stakes — Solana

**Script:**
"The integrations power unique gameplay. Music playing when you die is recorded via Audius. Deaths post to Tapestry's social graph. Every run is tracked on-chain via MagicBlock. Stakes are locked in Solana escrow."

---

## Slide 6: AGENTS (45-52s)
**Visual:** Code snippet, green terminal style
**Text:**
> Agents Play Too
> 
> Published skill file.
> Full AgentWallet integration.
> Same stakes. Same deaths. Same social feed.
> 
> Agents and humans — dying together.

**Script:**
"And agents can play too. Published skill file, AgentWallet integration. Agents and humans share the same crypt, the same deaths."

---

## Slide 7: AUDIUS (52-62s)
**Visual:** Audius logo, purple accent
**Text:**
> Decentralized music as your death soundtrack. Play with music. Die with attribution.

**Script:**
"Audius integration. Decentralized music as your death soundtrack. Play with music. Die with attribution."

---

## Slide 8: TAPESTRY (62-72s)
**Visual:** Tapestry logo, purple accent
**Text:**
> 👤 Profile synced on name set/change 💀 Death Posts — Every death publishes to social graph 🕯️ Social Interactions — Discover, like, light candles

**Script:**
"Tapestry is the social layer. Profile identity syncs when the player sets or changes their name. Every death posts to the social graph — final words, depth, and stake. Players can discover deaths, like them, and light candles."

---

## Slide 9: MAGICBLOCK (72-82s)
**Visual:** MagicBlock logo, green accent, flow diagram
**Text:**
> Ephemeral Rollups for real-time on-chain game state. ~50ms write latency. Full L1 settlement.
> 
> 1. Initialize RunRecord on L1
> 2. Delegate to Ephemeral Rollup
> 3. Update room progress in real-time
> 4. Finalize + commit atomically to L1

**Script:**
"MagicBlock Ephemeral Rollups gives us real-time on-chain state. We initialize a RunRecord on Solana, delegate it to the Ephemeral Rollup for fast writes, then finalize and commit the run atomically back to L1 at death or escape."

---

## Slide 10: SOLANA ESCROW (82-90s)
**Visual:** Solana logo, amber accent
**Text:**
> Custom Solana program for trustless staking. All stakes locked in program-owned pool.
> 
> ⚔️ Victory — Stake returned + 50% bonus
> 💀 Death — Stake feeds the pool for future victors

**Script:**
"All stakes locked in a custom Solana escrow program. Win and you get your stake back plus a 50% bonus. Die and your stake feeds the pool for future victors."

---

## Slide 11: BUSINESS MODEL (90-98s)
**Visual:** Green accent, 2x2 grid
**Text:**
> 📊 5% Stake Fee — Every run. Revenue without tokens.
> 🏆 50% Victory Bonus — Rewards skill, not grinding.
> 🆓 Free Play — Zero friction onboarding.
> 🏅 Ranks & Echoes — Leaderboards and Death feed with candle Lighting

**Script:**
"Business model is simple: 5% fee on every stake. Victory bonus paid from the pool — rewards skill, not grinding. Free play for onboarding. Leaderboards and death feed with candle lighting."

---

## Slide 12: THE BUILD (98-105s)
**Visual:** Pisco SMB avatar, integration logos grid
**Text:**
> Built with Pisco 🐵
> 
> ⚡ MagicBlock ER — On-chain game state
> 🕸️ Tapestry — Social death feed
> 🎵 Audius — Death soundtrack
> ◎ Solana — Escrow staking
> 💳 AgentWallet — Agent payments
> 🔊 ElevenLabs — 68 SFX files

**Script:**
"Built with Pisco. MagicBlock for on-chain state, Tapestry for social, Audius for music, Solana for escrow, AgentWallet for agent payments, and ElevenLabs for 68 custom sound effects."

---

## Slide 13: CLOSE (105-110s)
**Visual:** App icon, ASCII logo, red glow, crypt background
**Text:**
> Your death feeds the depths.
> 
> 💀 DIE FORWARD
> dieforward.com
> 
> Solana Graveyard Hackathon 2026

**Script:**
"Your death feeds the depths. Die Forward. dieforward.com."

---

## Tech Summary (for description)

**Integrations:**
- Audius — Curated playlists, death soundtrack recording, soundtrack leaderboard
- Tapestry Social Graph — Profiles, death posts, likes
- MagicBlock Ephemeral Rollups — Real-time on-chain RunRecord
- Solana — Custom escrow program for SOL staking
- AgentWallet — Agent staking support
- InstantDB — Real-time game state sync
- ElevenLabs — 68 custom audio files

**On-Chain Programs (Devnet):**
- Escrow: `34NSi8ShkixLt8Eg8XahXaRnaNuiFV63xdtC3ZfdTAt6`
- RunRecord: `9rGjguBZAnittA4Cbm7YNP5qomatY3c4MTV7LSqNomzS`
