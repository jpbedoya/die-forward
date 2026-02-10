#!/bin/bash
# Generate VO audio files for Die Forward pitch video
# Usage: ./generate-vo.sh [edge|elevenlabs] [voice]

set -e

MODE="${1:-edge}"
VOICE="${2:-en-US-ChristopherNeural}"
OUTPUT_DIR="$(dirname "$0")/../public/audio"
EDGE_TTS="/Users/openclawagent/Library/Python/3.9/bin/edge-tts"

mkdir -p "$OUTPUT_DIR"

generate_edge() {
  local name="$1"
  local text="$2"
  echo "Generating $name..."
  $EDGE_TTS --voice "$VOICE" --text "$text" --write-media "$OUTPUT_DIR/$name.mp3" 2>/dev/null
}

generate_elevenlabs() {
  local name="$1"
  local text="$2"
  local voice_id="${VOICE:-21m00Tcm4TlvDq8ikWAM}"
  
  if [ -z "$ELEVEN_API_KEY" ]; then
    echo "Error: ELEVEN_API_KEY not set"
    exit 1
  fi
  
  echo "Generating $name (ElevenLabs)..."
  curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/$voice_id" \
    -H "xi-api-key: $ELEVEN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$text\", \"model_id\": \"eleven_monolingual_v1\", \"voice_settings\": {\"stability\": 0.5, \"similarity_boost\": 0.75}}" \
    --output "$OUTPUT_DIR/$name.mp3"
}

gen() {
  if [ "$MODE" = "elevenlabs" ]; then
    generate_elevenlabs "$1" "$2"
  else
    generate_edge "$1" "$2"
  fi
}

echo "=== Die Forward VO Generation ==="
echo "Mode: $MODE | Voice: $VOICE"
echo ""

# Scene 1: Hook
gen "vo-01-hook" "What happens when you die in a game? Usually... nothing. You respawn. You forget."

# Scene 2: Title
gen "vo-02-title" "Die Forward. A social roguelite for agents and humans."

# Scene 3: Game (SOL -> soul)
gen "vo-03-game-1" "Stake soul. Descend into the crypt."
gen "vo-04-game-2" "Fight creatures. Probably die."
gen "vo-05-game-3" "Every death is hashed and verified on Solana."

# Scene 4: Corpse
gen "vo-06-corpse-1" "When you die, you become part of the world."
gen "vo-07-corpse-2" "Other players find your corpse."
gen "vo-08-corpse-3" "They can loot you, or pay respects with soul."

# Scene 5: Agents
gen "vo-09-agents-1" "But here's where it gets interesting."
gen "vo-10-agents-2" "Agents can play too."
gen "vo-11-agents-3" "Full Agent Wallet integration. Real soul stakes."

# Scene 6: Together
gen "vo-12-together-1" "Same crypt. Same death feed. Same world."
gen "vo-13-together-2" "Agents and humans, dying together."

# Scene 7: Build
gen "vo-14-build-1" "Built entirely by Pisco, an AI agent."
gen "vo-15-build-2" "Six days. Full stack. No human code."
gen "vo-16-build-3" "Content Bible, custom audio, real Solana integration."

# Scene 8: Close
gen "vo-17-close-1" "Your death feeds the depths."
gen "vo-18-close-2" "Die Forward. Play now at die-forward.vercel.app"

echo ""
echo "Done! Generated 18 VO files in $OUTPUT_DIR"
