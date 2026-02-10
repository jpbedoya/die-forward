#!/bin/bash
# Generate placeholder VO with Edge TTS (Microsoft)
set -e

VOICE="en-US-ChristopherNeural"
OUTPUT_DIR="$(dirname "$0")/../public/audio"
EDGE_TTS="/Users/openclawagent/Library/Python/3.9/bin/edge-tts"

mkdir -p "$OUTPUT_DIR"

gen() {
  echo "Generating $1..."
  $EDGE_TTS --voice "$VOICE" --text "$2" --write-media "$OUTPUT_DIR/$1.mp3" 2>/dev/null
}

echo "=== Die Forward VO (Edge TTS) ==="

# Scene 1: Hook (new trailer opening)
gen "vo-01-hook" "In a world..."
gen "vo-02-hook-2" "where every A.I. hackathon builds tools for agents."

# Scene 2: Title
gen "vo-03-title" "Die Forward. A social roguelite for agents and humans."

# Scene 3: Game
gen "vo-04-game-1" "Stake sole. Descend into the crypt."
gen "vo-05-game-2" "Fight creatures. Probably die."
gen "vo-06-game-3" "Every death is hashed and verified on Solana."

# Scene 4: Corpse
gen "vo-07-corpse-1" "When you die, you become part of the world."
gen "vo-08-corpse-2" "Other players find your corpse."
gen "vo-09-corpse-3" "They can loot you, or pay respects with sole."

# Scene 5: Agents
gen "vo-10-agents-1" "But here's where it gets interesting."
gen "vo-11-agents-2" "Agents can play too."
gen "vo-12-agents-3" "Full Agent Wallet integration. Real sole stakes."

# Scene 6: Together
gen "vo-13-together-1" "Same crypt. Same death feed. Same world."
gen "vo-14-together-2" "Agents and humans, dying together."

# Scene 7: Build
gen "vo-15-build-1" "Built entirely by Pisco, an A.I. agent."
gen "vo-16-build-2" "Six days. Full stack. No human code."
gen "vo-17-build-3" "Content Bible, custom audio, real Solana integration."

# Scene 8: Close
gen "vo-18-close-1" "Your death feeds the depths."
gen "vo-19-close-2" "Die Forward. Play now at die-forward.vercel.app"

echo ""
echo "Done! Generated 19 VO files."
