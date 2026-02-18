# Audius Integration

**Status:** 🟡 Prototype  
**Test Page:** `/music-test`

## What is Audius?

Decentralized music streaming platform built on the Open Audio Protocol. Think open Spotify API.

## Use Cases for Die Forward

### 1. Background Music Player
Let players choose their own music while keeping game SFX:
- Curated gaming playlists (Dungeon Synth, Lo-Fi, etc.)
- Search any Audius playlist
- Shuffle, skip, volume controls
- Persists across game screens

### 2. Death Cards
> "Died at depth 7 listening to 'Dark Whispers' by SynthLord"

Include currently playing track in death/victory share cards.

### 3. Community Playlists
- "Best playlists for Die Forward" community curation
- Share your favorite dungeon-crawling playlist

## API Reference

**Base URL:** `https://api.audius.co/v1`

```bash
# Search playlists
curl "https://api.audius.co/v1/playlists/search?query=gaming"

# Get playlist tracks
curl "https://api.audius.co/v1/playlists/{id}/tracks"

# Stream a track
curl "https://api.audius.co/v1/tracks/{id}/stream"
```

No API key required for reads/streaming.

## Curated Playlists

| Name | ID | Tracks | Vibe |
|------|-----|--------|------|
| Dungeon Synth | `emQa2` | 21 | Dark, atmospheric |
| Gaming Arena | `DN6Pp` | 33 | High energy |
| Lo-Fi Nights | `nqZmb` | 198 | Chill |
| Gaming Mix | `5ON2AWX` | 331 | Variety |

## Files

- `/app/music-test.tsx` — Test page with full player UI
- `/integrations/audius/` — This folder (docs only for now)

## Next Steps

- [ ] Extract `useAudiusPlayer` hook
- [ ] Add mini player component
- [ ] Integrate into settings screen
- [ ] Add "Now Playing" to share cards

## Integration Plan

### Core Features
- [ ] Ambient music from Audius API
- [ ] Player playlist selection before descent
- [ ] Track attribution in-game ("Now Playing")
- [ ] Log which track playing at death/victory

### Leaderboards & Discovery
- [ ] Most played tracks/playlists (Audius could sponsor prizes)
- [ ] "Death Soundtrack" — songs playing at most deaths
- [ ] Artist notifications at X plays

### Share Cards
- [ ] Audius logo + "🎵 Died to [Track] by [Artist]"
- [ ] Link to track on Audius
- [ ] Attribution = organic promo for artists

### Tapestry Integration
- [ ] Music taste → social profile
- [ ] Cross-post death cards with track attribution
- [ ] "Players who like this playlist also died to..."

### Partnership Opportunities
- Promoted playlists from Audius
- Sponsorship for leaderboard giveaways
- Play data = discovery proof for artists
- Attribution on shares = organic promo

## Links

- Docs: https://docs.audius.co
- SDK: `@audius/sdk`
- Skill: `~/.openclaw/workspace/skills/audius/SKILL.md`
