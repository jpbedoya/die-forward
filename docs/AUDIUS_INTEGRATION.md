# Audius Integration — Die Forward

## Status

**Phase 1 + core Phase 2 complete** on mobile.

Implemented:
- Curated Audius playlists
- Persistent player with play/pause/next/prev
- 500ms auto crossfade
- Track attribution throughout game + share cards
- Death now-playing recording
- Leaderboard soundtrack surface

---

## Current Scope

### Music Source Modes

Players can choose audio source in settings:
- `none` (no Audius stream)
- `audius` (stream curated playlists)

Master toggle `[SND]/[MUTE]` controls final output state without erasing source preference.

### Core Components

- `lib/useAudiusPlayer.ts`
  - fetches Audius playlist tracks
  - manages playback queue
  - handles auto-advance + crossfade
- `lib/AudiusContext.tsx`
  - persistent provider
  - stores source + master state
- `components/MiniPlayer.tsx`
  - compact controls shown in play/combat footers
- `components/AudioSettingsSection.tsx`
  - shared settings UI for source selection

### Crossfade Behavior

- **Automatic track transitions:** 500ms crossfade
- **Manual skip (next/prev/select):** immediate switch (no crossfade)

### Death & Sharing Attribution

When a player dies, current track metadata is threaded through:

`death.tsx -> GameContext.recordDeath(...) -> /api/session/death`

Stored fields:
- `nowPlayingTitle`
- `nowPlayingArtist`

Share cards include:
- `♪ Track · Artist` when Audius was active

### Leaderboard Integration

`/leaderboard` includes a `♪ SOUNDTRACK` tab to surface soundtrack context.

---

## Curated Playlist IDs (current)

- `emQa2`
- `DN6Pp`
- `nqZmb`
- `3AA6Z`
- `5ON2AWX`
- `ebd1O`

API base:
- `https://api.audius.co/v1`

---

## Notes

- Integration is mobile-first and tied into existing game audio settings.
- `none` mode must fully silence Audius and prevent stale restarts after source switches.
- Crossfade is intentionally short (500ms) to keep game pacing tight.

---

## Next Phase Candidates

- User search/import of custom playlists
- Track links in share payloads
- Death soundtrack aggregation improvements
- Better per-run soundtrack stats
