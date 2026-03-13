# Android Signing Secrets (Secure Setup)

Do **not** store signing passwords in source files.

## Secrets to define

- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## 1) EAS (recommended for CI/cloud builds)

Set encrypted EAS secrets for this project:

```bash
eas secret:create --name ANDROID_KEYSTORE_PASSWORD --value "<keystore_password>"
eas secret:create --name ANDROID_KEY_ALIAS --value "die-forward"
eas secret:create --name ANDROID_KEY_PASSWORD --value "<key_password>"
```

Verify:

```bash
eas secret:list
```

## 2) Local release builds (machine-local only)

Put values in `~/.gradle/gradle.properties` (never commit this file):

```properties
ANDROID_KEYSTORE_PASSWORD=<keystore_password>
ANDROID_KEY_ALIAS=die-forward
ANDROID_KEY_PASSWORD=<key_password>
```

## Notes

- `android/app/build.gradle` is wired to read env vars first, then Gradle properties.
- Keystore file path remains `android/keystores/release.keystore` (gitignored).
- If secrets were previously committed in history, rotate keystore/passwords.
