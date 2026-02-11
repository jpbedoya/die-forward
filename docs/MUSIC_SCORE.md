# Die Forward — Pitch Video Music Score

## Overall Vibe
**Dark Orchestral** — Hans Zimmer meets dungeon crawler. Low strings, tension builds, occasional swells. Not heroic — more *haunted majesty*.

---

## Scene-by-Scene Breakdown

| Scene | Timing | VO Content | Music Feel |
|-------|--------|------------|------------|
| **Hook** | 0-8s | "In a world..." | Classic movie trailer drone → builds to reveal |
| **Title** | 8-13s | Die Forward reveal | Swell + hit on title, then settles |
| **Game** | 13-23s | Stake, fight, die | Tension building, low strings pulse |
| **Corpse** | 23-33s | "You become part of the world" | Mournful cello, somber beauty |
| **Agents** | 33-46s | Skill file, AgentWallet | Interest/curiosity build, lighter touch |
| **Together** | 46-54s | "Same crypt, dying together" | Emotional swell, strings + brass |
| **Build** | 54-62s | "Built by Pisco" | Confident, steady pulse as features appear |
| **Close** | 62-78s | "Your death feeds the depths" | Dark crescendo → resolve on URL |

---

## Instruments

### Core
- **Low strings** (cello, double bass) — tension, dread
- **French horn** — dark majesty
- **Timpani** — hits for emphasis

### Atmosphere
- **Choir (subtle)** — ethereal, processed voices
- **Waterphone/bowed metal** — creep factor (per Content Bible)
- **Piano (sparse)** — melancholic touches

---

## Key Music Hits

| Time | Event | Music Action |
|------|-------|--------------|
| 0.3s | "In a world..." | Trailer horn or low drone start |
| 8-9s | Title reveal | Swell + impact hit |
| 23s | "When you die..." | Mood shift to somber |
| 33s | Agents intro | Lightens slightly, curiosity |
| 46s | "Same crypt, same death" | Emotional peak, full swell |
| 62s | "Your death feeds the depths" | Dark crescendo begins |
| ~70s | URL reveal | Resolve, call to action |

---

## Reference Tracks

| Track | Artist | Why |
|-------|--------|-----|
| "Time" | Hans Zimmer (Inception) | Building emotional intensity |
| "Lux Aeterna" | Clint Mansell (Requiem) | Relentless build |
| Dark Souls OST | FromSoftware | Somber, ancient, weighty |
| Hollow Knight OST | Christopher Larkin | Melancholic but beautiful |
| "Ghosts of Razgriz" | Ace Combat | Epic orchestral trailer energy |

---

## Sourcing Options

| Option | Pros | Cons |
|--------|------|------|
| **AI Generated** (Suno, Udio) | Quick, custom, free/cheap | Quality varies |
| **Stock Music** (Epidemic, Artlist) | Pro quality, legal | Finding exact fit |
| **Commission** | Custom, perfect fit | Expensive, time |

---

## Content Bible Audio Direction (Reference)

From `CONTENT_BIBLE.md`:
- **Style:** Dark ambient / drone
- **Instruments:** Low strings, bowed metal, waterphone, processed voices
- **No melody** — Texture and atmosphere only
- **Key:** Minor, atonal/microtonal
- **Tempo:** None. Timeless.

*Note: Pitch video can be more dynamic than in-game audio — needs to hook and excite, not just create dread.*

---

## ElevenLabs Music API

**Prompt used for v24:**
```
A dark orchestral score for a dungeon crawler video game trailer with heavy emphasis on strings: cellos and double basses provide a low tension pulse throughout, violins add urgency in crescendos. French horn for dark majesty. Timpani for key hits. Subtle choir pads for atmosphere. Structure: slow build with hushed low strings drone, then tension rising with string ostinato, building to a dark crescendo with full string section driving to climax, brass swells, resolves on final chord. Somber, ancient, weighty, minor key throughout. Instrumental only, no vocals. Inspired by epic cinematic scores with a dark fantasy atmosphere.
```

**API call:**
```bash
curl -X POST "https://api.elevenlabs.io/v1/music/compose" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "<prompt above>",
    "music_length_ms": 78000
  }' --output music.mp3
```

**Notes:**
- Requires paid ElevenLabs plan (Starter $5/mo or higher)
- Cannot reference copyrighted material (artists, game titles) — API will suggest alternatives
- Generation takes ~30-60 seconds for 78s track

---

## Status

- [x] Generate test track (ElevenLabs)
- [x] Mix with VO (15% volume)
- [x] Render v24
- [ ] Final review
- [ ] Submit to Colosseum
