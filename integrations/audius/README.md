# Audius Integration

**Status:** ✅ Complete  
**Test Page:** `/music-test`  
**Admin:** `/admin` → Music tab

## Overview

Decentralized music streaming via Audius API. Players can choose background music while keeping game SFX separate.

## What's Implemented

### Player System
- **`useAudiusPlayer`** hook — full-featured audio player
  - Crossfade between tracks (500ms fade in/out)
  - Volume control with persistence
  - Play/pause/skip/previous
  - Auto-advance to next track
  - Shuffle on playlist load
  - Works on web (HTMLAudio) and native (expo-audio)

### Context & State
- **`AudiusContext`** — app-wide music state
  - Music source preference: `game` | `audius` | `none`
  - Active playlist ID (persisted via AsyncStorage)
  - Master mute integration (respects [SND]/[MUTE] toggle)
  - Coordinates with game ambient audio

### UI Components
- **`MiniPlayer`** — inline footer player for game screens
  - Shows current track + artist
  - Play/pause and skip controls
  - Only renders when Audius is active
- **`AudioSettingsSection`** — settings panel
  - Music source picker (GAME/AUDIUS/NONE)
  - Horizontal scrolling playlist selector
  - Loading states during playlist fetch

### Admin Panel (`/admin` → Music tab)
- Add playlists by Audius URL or ID
- Preview tracks with inline player
- Reorder playlists (drag up/down)
- Toggle enable/disable per playlist
- Edit emoji and vibe descriptions
- Seed default playlists button
- Now Playing bar with full controls

### Data Layer
- Playlists stored in InstantDB (`playlists` collection)
- Mobile reads via `usePlaylists()` hook
- Falls back to hardcoded defaults if DB empty

## Curated Playlists

| Emoji | Name | Audius ID | Tracks | Vibe |
|-------|------|-----------|--------|------|
| 🏰 | Dungeon Synth | `emQa2` | 21 | Dark, atmospheric |
| 🎮 | Gaming Arena | `DN6Pp` | 33 | High energy |
| 🌙 | Lo-Fi Nights | `nqZmb` | 198 | Chill |
| 🌑 | Dark Ambient | `3AA6Z` | 9 | Moody, intense |
| 🕹️ | Gaming Mix | `5ON2AWX` | 331 | Variety |
| 🚗 | Lofi Road Trip | `ebd1O` | 112 | Chill vibes |

## API Reference

**Base URL:** `https://api.audius.co/v1`

```bash
# Search playlists
curl "https://api.audius.co/v1/playlists/search?query=gaming"

# Get playlist metadata
curl "https://api.audius.co/v1/playlists/{id}"

# Get playlist tracks
curl "https://api.audius.co/v1/playlists/{id}/tracks"

# Stream a track
curl "https://api.audius.co/v1/tracks/{id}/stream"
```

No API key required for reads/streaming.

## File Structure

```
mobile/
├── lib/
│   ├── useAudiusPlayer.ts    # Core player hook
│   ├── AudiusContext.tsx     # App-wide context provider
│   └── instant.ts            # usePlaylists() hook
├── components/
│   ├── MiniPlayer.tsx        # Inline footer player
│   ├── AudioSettingsSection.tsx  # Settings panel
│   └── AudioSettingsModal.tsx    # Modal wrapper
└── app/
    └── music-test.tsx        # Test page

src/app/admin/
└── page.tsx                  # Admin panel (Music tab)
```

## Future Enhancements

### Death Card Attribution
- [ ] Track "now playing" at moment of death
- [ ] Include in death card: "🎵 Died to [Track] by [Artist]"
- [ ] Link to track on Audius

### Social Features
- [ ] Most played tracks leaderboard
- [ ] "Death Soundtrack" — songs playing at most deaths
- [ ] Cross-post to Tapestry with track attribution

### Partnership Opportunities
- Promoted playlists from Audius
- Play data as discovery proof for artists
- Attribution on shares = organic promo

## Links

- [Audius Docs](https://docs.audius.co)
- [Audius SDK](https://www.npmjs.com/package/@audius/sdk)
