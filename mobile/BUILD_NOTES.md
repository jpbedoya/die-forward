# Die Forward — Mobile Build Notes

Expo mobile app running on web (React Native Web), iOS, and Android with full feature parity. Build infrastructure last updated 2026-05-23.

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

### One-time toolchain setup

Local builds need a JDK and the Android SDK. On macOS via Homebrew (no sudo required):

```bash
# JDK 17
brew install openjdk@17

# Android command-line tools (sdkmanager, adb, etc.)
brew install --cask android-commandlinetools

# Env vars — append to ~/.zshrc so every new terminal has them
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# Accept licenses + install SDK packages
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" \
  "ndk;27.1.12297006" "cmake;3.22.1"
```

> `openjdk@17` is used instead of the Temurin cask because it installs without sudo. Either works — just point `JAVA_HOME` at whichever JDK 17 you have.

### Building

```bash
cd mobile
npm install                                        # first time / after dependency changes
npx expo prebuild --platform android --clean       # regenerates the gitignored android/ dir
                                                   #   (only when native config / plugins change)
npm run build:android:local                        # → standalone DEBUG APK
```

The build is driven by `mobile/scripts/build-android-local.cjs`. It stamps the version (BASE_VERSION + git short SHA), syncs Android's native `versionName` in `build.gradle`, resolves `JAVA_HOME` / `ANDROID_HOME` automatically, preflights required `EXPO_PUBLIC_*` env vars, and copies the APK to `mobile/dist/<name>-<version>[.suffix].apk`.

Three mutually exclusive build modes:

| Flag | Mode | When to use |
|------|------|-------------|
| _(none)_ | **Standalone debug** — JS bundled, debug-signed, no Metro needed | Ad-hoc sharing, quick iteration on a phone |
| `--metro` | **Metro-served debug** — live-reload (needs `expo start` running) | Local dev iteration |
| `--prod` | **Release APK** — `assembleRelease`, arm64-only, R8-minified, release-keystore signed | Production-quality **sideload** APK to share directly |
| `--aab` | **Release AAB** — `bundleRelease`, all ABIs, R8-minified, release-keystore signed (implies release) | **Google Play Console** upload |

And an independent, combinable flag:

| Flag | Effect |
|------|--------|
| `--publish` | After the build, publish a GitHub prerelease at `dev-<version>` with the artifact attached (uses `gh release create`, or `upload --clobber` if the tag exists) |

```bash
npm run build:android:local                        # debug standalone (default)
npm run build:android:local -- --metro             # live-reload dev build
npm run build:android:local -- --prod              # release APK (sideload)
npm run build:android:local -- --prod --aab        # release AAB (Play Store)  ← store build
npm run build:android:local -- --prod --publish    # release + GH release
```

**Output:**
- Debug: `mobile/dist/<name>-<version>.apk` (~78 MB)
- Release APK: `mobile/dist/<name>-<version>-release.apk` (~40 MB — half the size, R8 stripped debug symbols + minified dex; arm64-only)
- Release AAB: `mobile/dist/<name>-<version>-release.aab` (for Play Console; all ABIs)
- Gradle's raw output: APK at `android/app/build/outputs/apk/{debug,release}/app-arm64-v8a-{debug,release}.apk` (arm64-only via `with-arm64-only`); AAB at `android/app/build/outputs/bundle/release/app-release.aab`.
- Cached debug build: ~30s; warm release build: ~30s; cold/clean build: ~6–7 min.

#### arm64-only APK vs all-ABI AAB (important)

The **sideload APK** path is arm64-only (`splits { abi { include 'arm64-v8a' } }`, `universalApk false`) — it drops ~44 MB of x86/armeabi-v7a libs and installs fine on modern phones.

The **`--aab` path is NOT arm64-only, by design.** AGP ignores the `splits.abi` block when running `bundleRelease` — ABI splitting for app bundles is done by Google Play, not Gradle. The script additionally passes `-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` so the bundle can never be narrowed. The result is a **universal AAB containing all ABIs**, from which Play generates optimized per-device downloads. This is what Play Console expects; do not try to force an arm64-only AAB.

#### Google Play Store upload workflow (Android)

```bash
cd mobile
# Bump android.versionCode in app.config.js if this is a new store release (Play rejects duplicates)
npm run build:android:local -- --prod --aab
# → mobile/dist/die-forward-<version>-release.aab
```

Then in the **Play Console**: your app → Testing/Production track → **Create release** → upload the `.aab` → roll out. Play re-signs the delivered APKs with the **App Signing key** it holds; your upload is signed with the release keystore (the "upload key"). Prerequisite: the existing **release keystore** at `mobile/android/keystores/release.keystore` + `mobile/android/keystores/.env` (see *Release signing* above).

### Release signing (one-time setup)

Release builds (`--prod`) need a keystore. The build script reads credentials from `mobile/android/keystores/.env`, which is gitignored. Generate one:

```bash
keytool -genkeypair -v \
  -keystore mobile/android/keystores/release.keystore \
  -alias die-forward -keyalg RSA -keysize 2048 -validity 10000
```

Then create `mobile/android/keystores/.env`:

```env
ANDROID_KEYSTORE_PASSWORD=<storepass>
ANDROID_KEY_PASSWORD=<storepass>     # must equal the storepass — PKCS12 quirk, see note below
ANDROID_KEY_ALIAS=die-forward
```

**PKCS12 quirk:** modern JDK keystores are PKCS12 by default, which does *not* support separate store and key passwords — `keytool` silently ignores `-keypass` at creation. So `ANDROID_KEY_PASSWORD` in `.env` must be the same value as `ANDROID_KEYSTORE_PASSWORD`. Gradle will fail with "Get Key failed: Given final block not properly padded" if they differ.

> **Back up `release.keystore` + `.env` outside the repo** (1Password, secure cloud storage, etc.). Losing them means you can't ship updates to already-installed users without forcing an uninstall first, and you can't re-sign with the same identity if/when this hits the Play Store.

For the full keystore setup and backup guidance, see [`mobile/docs/signing-secrets.md`](docs/signing-secrets.md). (That doc also documents an EAS path, but **this project does not use EAS** — all builds are local and artifacts are uploaded to the stores manually.)

### Web deploy → `play.dieforward.com`

The same React Native code that ships in the APK also serves `play.dieforward.com`. The `mobile/` directory is its own Vercel project (`mobile/vercel.json`):

```json
{
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

So `npm run build:web` (= `expo export --platform web`) produces `mobile/dist/`, and Vercel serves it as an SPA. Pushes to `main` redeploy both projects automatically — landing on `dieforward.com`, mobile-as-web on `play.dieforward.com`. The mobile redeploy is the slow one (`expo export` takes ~2–3 min).

Practical implication: a JSX change in `mobile/app/play.tsx` ships to both surfaces. Some libraries are native-only and need platform-branching (`Platform.OS === 'web'`) — see the design notes in `mobile/components/TypewriterText.tsx` for the canonical example.

### Build + install to a connected device

```bash
cd mobile && npm run android   # expo run:android — requires a device/emulator
```

---

## Local iOS Build (App Store)

> **We do not use EAS.** iOS store builds are produced locally with Xcode and the
> artifact is uploaded manually to App Store Connect, exactly like the Android AAB
> is uploaded manually to Play. `eas-cli` is not installed.

Driven by `mobile/scripts/build-ios-local.cjs` (mirrors the Android script). It
regenerates `ios/` via prebuild, archives a Release build, and exports a signed
`.ipa` using `mobile/scripts/ExportOptions.plist`.

```bash
cd mobile
npm run build:ios:local
# → mobile/dist/die-forward-<version>.ipa
```

The script fails fast (before touching Xcode) if signing isn't configured:
- not on macOS / `xcodebuild` missing,
- `ExportOptions.plist` `teamID` still the placeholder,
- no **Apple Distribution** certificate in the login keychain.

**Scheme name:** the script does **not** hardcode it — after prebuild it finds
`ios/*.xcworkspace` and uses its basename as the scheme. Expo names both after the
sanitized `expo.name` ("Die Forward" → `DieForward`), so a rename of the app can't
silently break the build.

### One-time Apple setup (only you can do this — creds are not in the repo)

1. **Apple Developer Program** membership. Note your **10-character Team ID**
   (developer.apple.com/account → Membership).
2. **Apple Distribution certificate** + private key in the login keychain:
   Xcode → Settings → Accounts → your Apple ID → Manage Certificates → **+** →
   *Apple Distribution* (or import your team's `.p12`).
3. **App Store provisioning profile** for bundle id **`com.dieforward.app`**
   (App Store Connect → Certificates, Identifiers & Profiles). With automatic
   signing + `-allowProvisioningUpdates` (both set by the script) Xcode can
   create/refresh it once you're signed into the account in Xcode.
4. **App record** in App Store Connect for `com.dieforward.app` (first upload).
5. Put your **Team ID** into `mobile/scripts/ExportOptions.plist` (`:teamID`).

### Upload the .ipa to App Store Connect

Any one of:
- **Xcode → Organizer → Distribute App** (also lets you archive from Xcode directly),
- **Transporter.app** (drag the `.ipa` in),
- CLI: `xcrun altool --upload-app -f dist/<name>-<version>.ipa -t ios --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>`
  (or `xcrun notarytool` / an App Store Connect API key).

> **Signing prerequisites summary** — Android: existing release keystore
> (`android/keystores/release.keystore` + `.env`). iOS: Apple Distribution cert +
> App Store provisioning profile for `com.dieforward.app` + Team ID in
> `scripts/ExportOptions.plist`.

## Environment Variables

The mobile app reads env vars from `mobile/.env.local` (gitignored). Expo inlines anything prefixed `EXPO_PUBLIC_` into the JS bundle at bundle time — there's no runtime injection mechanism. The build script preflights required ones and errors fast if they're missing.

```env
# mobile/.env.local
EXPO_PUBLIC_INSTANT_APP_ID=<your-instantdb-app-id>   # required — same value as root .env.local's NEXT_PUBLIC_INSTANT_APP_ID
EXPO_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com # optional (defaults to devnet)
EXPO_PUBLIC_API_URL=https://www.dieforward.com       # optional (defaults to production URL)
```

See `mobile/.env.example` for the canonical template.

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
| `components/AsciiLoader.tsx` | Loading indicator — sweep + pulse variants (no ActivityIndicator) |
| `components/AudioToggle.tsx` | [SND]/[MUTE] master switch |
| `components/AudioSettingsSection.tsx` | Shared audio settings UI |
| `components/MiniPlayer.tsx` | Audius mini player in footers |
| `components/CryptModal.tsx` | ItemModal + CreatureModal |
| `components/NicknameModal.tsx` | Name entry + edit modal (initialValue prop for editing) |
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
- The react gradle plugin doesn't declare `.env` files as inputs to `createBundle{Debug,Release}JsAndAssets` — an env-only change would otherwise reuse a stale cached JS bundle with the old inlined values. The build script busts the bundle outputs before every non-Metro build so what's in `.env` always matches what's in the APK. (~20s cost on a warm build.)
- `expo-file-system` v19 (SDK 54) dropped `documentDirectory` and most of the legacy function API from its main export. The remaining stubs type-check but throw at runtime ("This method will throw in runtime" per the deprecation notice). Files needing the old API import from `expo-file-system/legacy` instead.

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
