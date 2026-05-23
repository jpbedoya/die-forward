# Android Signing Secrets (Secure Setup)

Do **not** store signing passwords in source files. The Android release `signingConfig` in `mobile/android/app/build.gradle` reads credentials from these env vars:

- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## 1) Local release builds (machine-local, default for `--prod`)

`mobile/scripts/build-android-local.cjs` loads these from `mobile/android/keystores/.env` (gitignored) when you run `npm run build:android:local -- --prod`. Create it next to the keystore:

```env
# mobile/android/keystores/.env
ANDROID_KEYSTORE_PASSWORD=<storepass>
ANDROID_KEY_PASSWORD=<storepass>      # must equal storepass — PKCS12 quirk
ANDROID_KEY_ALIAS=die-forward
```

**PKCS12 quirk:** modern JDK keystores are PKCS12 by default and do *not* support separate store/key passwords. `keytool -keypass` is silently ignored at creation, so the entry password is whatever you set as the storepass. If `ANDROID_KEY_PASSWORD` differs from `ANDROID_KEYSTORE_PASSWORD`, gradle will fail with `Get Key failed: Given final block not properly padded`.

Both `mobile/keystores/` and `mobile/android/keystores/` are gitignored, but `build.gradle` only resolves the keystore relative to `mobile/android/app/` — i.e. **the keystore must live at `mobile/android/keystores/release.keystore`** (not `mobile/keystores/`).

Back up the keystore file and the `.env` to a password manager. Losing them means you can't update the app for already-installed users without forcing an uninstall, and you can't re-sign with the same identity for Play Store updates.

### Alternative: gradle.properties

Gradle reads env vars first, then project properties. If you'd rather not maintain a `.env` file, put the same keys in `~/.gradle/gradle.properties` (never commit this file). The build script's `--prod` mode will still work — it loads `.env` if present, otherwise it relies on whatever the calling shell / gradle already has.

## 2) EAS (recommended for CI / cloud builds)

Set encrypted EAS secrets for this project:

```bash
eas secret:create --name ANDROID_KEYSTORE_PASSWORD --value "<storepass>"
eas secret:create --name ANDROID_KEY_ALIAS --value "die-forward"
eas secret:create --name ANDROID_KEY_PASSWORD --value "<storepass>"
```

Verify:

```bash
eas secret:list
```

EAS injects these into the build env for `eas build`, so the same `build.gradle` signing config works on EAS infrastructure without any code changes.

## Notes

- `android/app/build.gradle` is wired to read env vars first, then Gradle project properties (`findProperty(...)`), then empty-string fallback.
- Keystore path is fixed at `mobile/android/keystores/release.keystore` (relative to `android/app/`: `../keystores/release.keystore`).
- If secrets were ever committed to git history, rotate the keystore and passwords.
