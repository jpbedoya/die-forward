# Development Guidelines

## Project Structure

```
die-forward/
├── src/                    # Next.js web app (landing, API routes)
│   ├── app/               # App router pages & API
│   └── lib/               # Shared utilities
├── mobile/                 # Expo/React Native app
│   ├── app/               # Expo Router screens
│   ├── components/        # Reusable UI components
│   └── lib/               # Game logic, API, hooks
├── anchor-program/         # Solana on-chain program
├── docs/                   # Documentation
└── public/                 # Static assets (audio, images)
```

## Tech Stack

- **Mobile**: Expo SDK 54, React Native, NativeWind (Tailwind)
- **Web**: Next.js 15, React 19, Tailwind CSS
- **Database**: InstantDB (real-time sync)
- **Blockchain**: Solana (devnet), Anchor framework
- **Audio**: expo-av (native), HTML5 Audio (web)

## Code Patterns

### Platform-Specific Code

```tsx
import { Platform } from 'react-native';

// Conditional execution
if (Platform.OS !== 'web') {
  // Native-only code (haptics, etc.)
}

// Conditional rendering
{Platform.OS === 'web' ? <WebComponent /> : <NativeComponent />}

// Platform-specific values
const fontSize = Platform.OS === 'web' ? 16 : 14;
```

### Audio (Platform-Split)

Web and native use different audio APIs. See `lib/audio/`:
- `WebAudioManager` — HTML5 Audio API
- `NativeAudioManager` — expo-av

```tsx
const { playSFX, playAmbient } = useAudio();
playSFX('sword-slash');
playAmbient('ambient-combat');
```

### Game State (GameContext)

All game state lives in `lib/GameContext.tsx`:

```tsx
const game = useGame();

// Read state
game.health, game.stamina, game.inventory, game.currentRoom

// Actions
game.setHealth(50);
game.advance();
game.recordDeath(epitaph, killedBy);
game.claimVictory();
```

### InstantDB Hooks

Real-time data from InstantDB:

```tsx
import { useDeathFeed, useLeaderboard, useGameSettings } from '../lib/instant';

const { deaths } = useDeathFeed(10);
const { leaderboard } = useLeaderboard(10);
const { settings } = useGameSettings();
```

## UI Components

### Shared Components

| Component | Purpose |
|-----------|---------|
| `CRTOverlay` | Scanline + vignette effect |
| `AudioToggle` | 🔊/🔇 toggle with inline mode |
| `ProgressBar` | Room progress indicator |
| `GameMenu` | Pause menu overlay |
| `DieForwardLogo` | ASCII art logo (multiple sizes) |

### Styling

Use NativeWind (Tailwind for React Native):

```tsx
<View className="flex-1 bg-crypt-bg p-4">
  <Text className="text-amber text-lg font-mono font-bold">Title</Text>
</View>
```

Custom colors defined in `tailwind.config.js`:
- `crypt-bg`, `crypt-surface`, `crypt-border`
- `bone`, `bone-muted`, `bone-dark`
- `blood`, `blood-dark`
- `amber`, `ethereal`, `victory`

## API Patterns

### Client → Server

Mobile calls Next.js API routes:

```tsx
// lib/api.ts
const response = await fetch(`${API_BASE}/api/session/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress, stakeAmount }),
});
```

### Index Conversion

- **Client**: 0-indexed (`currentRoom` starts at 0)
- **Server**: 1-indexed (`currentRoom` starts at 1)
- **Display**: 1-indexed (Room 1, Room 2, etc.)

```tsx
// When sending to server
const serverRoom = clientRoom + 1;

// When displaying
const displayRoom = clientRoom + 1;
```

## Git Workflow

### Commits

- Commit frequently with descriptive messages
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`

```bash
git commit -m "feat: add haptic feedback for flee outcomes"
git commit -m "fix: advanceRoom sends correct 1-indexed room"
```

### Pushing

**Don't auto-push.** Batch commits locally and push only when:
- Ready to deploy
- Explicit request to push
- End of work session

This prevents CI/CD rate limiting from frequent small deploys.

```bash
# Work locally
git commit -m "fix: thing 1"
git commit -m "fix: thing 2"
# Don't push yet...

# When ready
git push
```

### Branches

- `main` — Production, deploys to Vercel
- Feature branches for larger changes

## Testing

### Local Development

```bash
# Mobile (Expo)
cd mobile && npm run web    # Web browser
cd mobile && npm run ios    # iOS simulator
cd mobile && npm run android # Android emulator

# Web (Next.js)
npm run dev                 # localhost:3000
```

### Mobile Testing

- **Web**: Chrome DevTools mobile emulation
- **iOS**: Simulator or TestFlight
- **Android**: Emulator or direct APK install
- **Seeker**: Test MWA wallet connection

## Documentation

| Doc | Purpose |
|-----|---------|
| `CONTENT_BIBLE.md` | Voice, tone, lore, writing guidelines |
| `GAME_DESIGN.md` | Mechanics, balance, progression |
| `FEEDBACK_PATTERNS.md` | Audio, haptics, screen shake |
| `AUDIO.md` | Sound files and generation workflow |
| `ADMIN_SETTINGS.md` | InstantDB admin configuration |
| `STAKING_FLOWS.md` | Wallet and escrow flows |

## Voice & Tone

From the Content Bible:
- **Sparse, evocative** — Not verbose
- **Dread through understatement** — Horror in what's unsaid
- **No exclamation marks** — Tension, not excitement
- **Second person** — "You descend", not "The player descends"

See [CONTENT_BIBLE.md](./CONTENT_BIBLE.md) for full guidelines.
