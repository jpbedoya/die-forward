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
- **Audio**: expo-audio (native), HTML5 Audio (web)
- **Blur**: expo-blur (BlurView for sheet backdrops)

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

Web and native use different audio APIs. See `lib/audio.ts`:
- `WebAudioManager` — HTML5 Audio API
- `NativeAudioManager` — expo-audio (NOT expo-av, which has been removed)

See `mobile/BUILD_NOTES.md` for critical expo-audio import details.

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

See [`COMPONENTS.md`](./COMPONENTS.md) for the full component reference.

### Shared Components

| Component | Purpose |
|-----------|---------|
| `AsciiLoader` | Loading indicator — sweep or pulse variants (replaces ActivityIndicator) |
| `CRTOverlay` | Scanline + vignette effect |
| `AudioToggle` | 🔊/🔇 toggle with inline mode |
| `ProgressBar` | Room progress indicator |
| `GameMenu` | Pause menu overlay |
| `DieForwardLogo` | ASCII art logo (multiple sizes) |
| `NicknameModal` | Name entry + editing modal |

### Loading States

**Do not use `ActivityIndicator`.** Use `AsciiLoader` instead:

```tsx
// Button loading state
{loading ? <AsciiLoader variant="pulse" color="#ffffff" /> : <Text>CONFIRM</Text>}

// Full-screen loading
<AsciiLoader width={16} color="#f59e0b" style={{ fontSize: 16 }} />
```

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

### Room Indexing

- `currentRoom` is a canonical **1-based depth projection**, used consistently across GameContext, server routes, and the on-chain `u8` — no client/server index conversion.
- **Display**: 1-indexed (Room 1, Room 2, etc.), matching `currentRoom` directly.

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

### Local Builds

- **Android APK** (no EAS): `cd mobile && npm run build:android:local` — flags `--prod` (release/signed, R8), `--metro` (live-reload), `--publish` (GitHub prerelease). Output in `mobile/dist/`. See `mobile/BUILD_NOTES.md` and `mobile/docs/signing-secrets.md`.
- **iOS**: No local build script yet. `eas-cli` is not installed; the intended path is a local Xcode build like Android (`npx expo prebuild --platform ios --clean` then a Release build in Xcode).

## Documentation

| Doc | Purpose |
|-----|---------|
| `COMPONENTS.md` | Shared component library (AsciiLoader, DieForwardLogo, etc.) |
| `CONTENT_BIBLE.md` | Voice, tone, lore, writing guidelines |
| `GAME_DESIGN.md` | Mechanics, balance, progression |
| `FEEDBACK_PATTERNS.md` | Audio, haptics, screen shake |
| `AUDIO.md` | Sound files and generation workflow |
| `ADMIN_SETTINGS.md` | InstantDB admin configuration |
| `STAKING_FLOWS.md` | Wallet and escrow flows |
| `AUTH_SYSTEM.md` | Auth architecture, status, and remaining work |

## Voice & Tone

From the Content Bible:
- **Sparse, evocative** — Not verbose
- **Dread through understatement** — Horror in what's unsaid
- **No exclamation marks** — Tension, not excitement
- **Second person** — "You descend", not "The player descends"

See [CONTENT_BIBLE.md](./CONTENT_BIBLE.md) for full guidelines.
