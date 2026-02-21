# Die Forward — Mobile Build Notes

## Current Build: Feb 21, 2026

Expo mobile app running on web (React Native Web), iOS, and Android with full feature parity.

---

## Tech Stack

| Layer | Package |
|-------|---------|
| Framework | Expo SDK 54 / React 19 |
| Navigation | expo-router |
| Styling | NativeWind v4 (Tailwind) |
| Database | @instantdb/react-native |
| Audio (native) | expo-audio (NOT expo-av — removed) |
| Audio (web) | HTML Audio API |
| Wallet (Android) | @wallet-ui/react-native-web3js (MWA) |
| Wallet (web) | @solana/react-hooks (framework-kit) |
| Streaming | Audius API (mobile only) |
| Share cards | react-native-view-shot + expo-sharing |
| Blur effects | expo-blur (BlurView for sheet backdrop) |

---

## Local Android Build

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
cd mobile/android
./gradlew assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
# Cached build: ~30s | First build: ~8min
```

## Environment Variables

```env
# mobile/.env
EXPO_PUBLIC_INSTANT_APP_ID=84f04877-bcc3-4b09-89df-f6ef498d21f5
EXPO_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
EXPO_PUBLIC_API_BASE_URL=https://dieforward.com
```

---

## Audio Architecture

**expo-av has been removed.** The audio system is now split by platform:

| Platform | SFX & Ambient | Audius Streaming |
|----------|--------------|-----------------|
| Android/iOS | `expo-audio` (native) | `useAudiusPlayer` hook |
| Web | HTML `<audio>` elements | `useAudiusPlayer` hook |

### expo-audio Critical Notes

`AudioPlayer` is **NOT** exported from the main `expo-audio` package index — that file only re-exports types. Import from the native module directly:

```typescript
import AudioModule from 'expo-audio/build/AudioModule';
// AudioModule.default.AudioPlayer is the class
const player = new AudioModule.default.AudioPlayer(source, 100, false);
```

Correct `setAudioModeAsync` properties:
```typescript
import { setAudioModeAsync } from 'expo-audio'; // named export from main package
await setAudioModeAsync({
  playsInSilentMode: true,          // NOT playsInSilentModeIOS
  interruptionMode: 'duckOthers',   // NOT shouldDuckAndroid
  shouldPlayInBackground: false,    // NOT staysActiveInBackground
});
```

Status listener: use `status.playing` (not `status.isPlaying`).

### Audio Timing (Mobile)

On Android, `playAmbient()` must wait for `audioReady` state from `useAudio()`. Call it in a `useEffect` with `[audioReady]` dependency, not `[]`. The module loads asynchronously after component mount.

---

## Wallet Architecture (Android)

### Provider Chain

```
_layout.tsx
  └─ UnifiedWalletProvider
       └─ [Android] NativeMWAProvider (mwa-provider.tsx)
            └─ WalletUIProvider (@wallet-ui/react-native-web3js)
                 └─ MobileWalletConsumer
                      └─ UnifiedWalletContext.Provider ← writes here
```

**Critical**: `mwa-provider.tsx` must import `UnifiedWalletContext` from `./unified` (exported) and provide to THAT context. Previously it created its own private context — `GameContext` was reading from the wrong one, making `connect` a no-op.

### Context Value (mwa-provider)

Must include ALL fields from `UnifiedWalletContextState`:
```typescript
const contextValue = {
  connected, connecting, address, balance,
  connectors: [],      // required — native has no connector list
  connect,
  connectTo: connect,  // required alias
  disconnect, sendSOL, signAndSendTransaction, refreshBalance,
};
```

### Android Manifest (wallet discovery)

`plugins/with-mwa-android.js` injects the required `<queries>` block for Android 11+ wallet app discovery:
```xml
<queries>
  <intent>
    <action android:name="solana.mobilewalletadapter.walletlib.action.LINK_MWA_REQUEST" />
  </intent>
</queries>
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout, polyfills, providers |
| `app/index.tsx` | Home screen (title, death feed, leaderboard) |
| `app/stake.tsx` | Wallet connection + game start |
| `app/play.tsx` | Main game loop (room navigation) |
| `app/combat.tsx` | Full combat screen |
| `app/death.tsx` | Death screen + share card |
| `app/victory.tsx` | Victory screen + claim + share card |
| `app/leaderboard.tsx` | Rankings + ♪ SOUNDTRACK tab |
| `lib/content.ts` | Bestiary, room generation, item effects |
| `lib/audio.ts` | SFX/ambient manager (platform-split) |
| `lib/useAudiusPlayer.ts` | Audius streaming hook |
| `lib/AudiusContext.tsx` | Audius persistent provider |
| `lib/GameContext.tsx` | Global game state |
| `lib/wallet/unified.tsx` | Cross-platform wallet context |
| `lib/wallet/mwa-provider.tsx` | Android MWA provider |
| `lib/shareCard.tsx` | Share card components + capture hook |
| `components/AudioToggle.tsx` | [SND]/[MUTE] master switch |
| `components/AudioSettingsSection.tsx` | Shared audio settings UI |
| `components/MiniPlayer.tsx` | Audius mini player in footers |
| `components/CryptModal.tsx` | ItemModal + CreatureModal |
| `plugins/with-mwa-android.js` | Android manifest config plugin |

---

## Polyfills (required for Solana web3.js)

Imported in `_layout.tsx` before anything else:
- `react-native-get-random-values` (crypto)
- `react-native-url-polyfill` (URL API)
- `buffer` (Buffer global)

---

## Known Build Issues

- `rpc-websockets` — exports warning (harmless, falls back to file resolution)
- `@noble/hashes/crypto.js` — exports warning (harmless)
- Gradle deprecation warnings for 9.0 compatibility (non-blocking)

---

## Echoes Sheet (Title Screen)

The bottom sheet on the title screen shows recent deaths (Echoes) and top players (Victors).

### Behaviour
- Tapping the echoes preview area opens the sheet
- Sheet slides up with spring animation
- **Swipe down** on the handle bar or tab row to dismiss (PanResponder)
- Tapping the blurred backdrop dismisses

### Styling
- **Backdrop**: `expo-blur` BlurView (intensity 80, tint dark) + `rgba(0,0,0,0.4)` overlay
- **Sheet background**: `rgba(10, 8, 6, 0.55)` — semi-transparent so background shows through
- **Entry format**: `† PLAYERNAME · depth 7` then `"their dying words..."` on next line
- Text is centered; quotes use `boneDark` color (#78716c)

### Component
`EchoSheet` in `app/index.tsx` — self-contained, receives data as props.

---

## Auth & Identity

See `docs/AUTH_PLAN.md` for full details. Summary:

### Identity Row (The Toll screen)
- Always visible **above** action buttons regardless of wallet state
- Shows: `🪦 NICKNAME ✎` — tap opens `NicknameModal`
- When wallet connected, also shows: `addr · X.XXX SOL · [logout]`
- Guest shows `🪦 Wanderer ✎` (or their set name)

### Nickname Rules
| State | Nickname source |
|-------|----------------|
| Wallet auth | DB always wins, overwrites local cache |
| Guest auth | AsyncStorage only |

### Nickname Editing
- `NicknameModal` handles both first-time setup and editing
- Accepts `initialValue` prop — shows `UPDATE` instead of `CONFIRM`
- Wallet users: writes to DB first, then local cache
- Guest users: writes to AsyncStorage only

### Disconnect
Full logout — clears auth state, nickname cache, prompted flag, guest flag.

---

## Testing Checklist

- [x] TypeScript compilation
- [x] Android APK build
- [x] Wallet connect (Seeker/Seed Vault) — context bug fixed Feb 19
- [x] Audio on title screen (audioReady fix)
- [x] Audio on victory screen (audioReady fix)
- [x] Stake screen (connectors crash fix)
- [x] Creature inspect modal (combat + play)
- [x] Item inspect + USE from inventory
- [x] Free mode victory (no claim reward section)
- [x] Audius streaming on device
- [x] Full staked run (devnet)
- [x] Wallet bind → DB nickname loads immediately (Feb 21)
- [x] Logout clears nickname (no stale state) (Feb 21)
- [x] Death echoes show nickname, not wallet address (Feb 21)
- [x] 🪦 identity row visible above action buttons (Feb 21)
- [x] Tap 🪦 → NicknameModal pre-filled, saves to DB (Feb 21)
- [x] Echoes sheet: semi-transparent with blur backdrop (Feb 21)
