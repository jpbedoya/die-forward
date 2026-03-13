# Die Forward Mobile — Security Review Findings & Mitigation Plan

Date: 2026-03-09  
Scope: `code/die-forward/mobile` (Expo/React Native app)

## Executive Summary

I reviewed auth flows, Android manifest/build config, local storage usage, and dependency posture.

**Top risks identified:**
1. **Critical auth bypass path** using `SKIP_VERIFICATION` in wallet auth/link flows.
2. **Hardcoded Android release signing secrets** in source/plugin code.
3. **Android backup + broad legacy permissions** that increase data exposure risk.
4. **Known vulnerable transitive dependencies** (1 critical, 2 high, 1 moderate per `npm audit --omit=dev`).

---

## Findings (Prioritized)

## F-01 (Critical): Wallet auth can proceed without signature verification

### Evidence
- `lib/auth.ts:64-74` sends:
  - `signature: 'SKIP_VERIFICATION'`
- `lib/auth.ts:165-167` also uses `SKIP_VERIFICATION` for link-wallet fallback.
- `lib/GameContext.tsx:345-349` explicitly uses skip-verification path.

### Why this matters
If backend accepts this fallback in any production context, a client can authenticate as any wallet address without proving key ownership.

### Impact
- Account takeover / impersonation of wallet-linked identity.
- Fraud or unauthorized progression tied to wallet identity.

### Recommended mitigation
- **Immediate**: backend must reject `SKIP_VERIFICATION` in production.
- Require a valid signed challenge with nonce + expiry.
- Bind nonce to server session and invalidate after one use.
- If wallet adapter can’t sign, fail closed for wallet auth (allow guest mode only).

---

## F-02 (High): Hardcoded release signing secrets in repo/plugin logic

### Evidence
- `android/app/build.gradle:107-112` includes release keystore password and key password in plain text.
- `plugins/with-release-signing.js:39-45` injects same secrets into generated gradle config.

### Why this matters
Anyone with repo access can sign malicious APKs as your app if keystore is ever exposed or reused.

### Impact
- Supply-chain compromise risk.
- Difficulty rotating trust if key is leaked.

### Recommended mitigation
- Move signing credentials to CI secrets / Gradle properties, not source.
- Use `storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")` etc.
- Rotate release keystore if this key has been shared broadly.

---

## F-03 (Medium-High): Android app backup enabled + broad legacy permissions

### Evidence
- `android/app/src/main/AndroidManifest.xml:21` has `android:allowBackup="true"`.
- Manifest includes:
  - `READ_EXTERNAL_STORAGE` (`line 4`)
  - `WRITE_EXTERNAL_STORAGE` (`line 8`)
  - `SYSTEM_ALERT_WINDOW` (`line 6`)

### Why this matters
- `allowBackup=true` can expose app data through adb backup/restore pathways (device/OS dependent).
- Storage + overlay permissions increase attack surface and user trust/privacy concerns.

### Impact
- Higher chance of local data extraction or abuse by malicious overlays.

### Recommended mitigation
- Set `allowBackup="false"` unless strict business need exists.
- Remove legacy storage permissions unless truly required.
- Remove `SYSTEM_ALERT_WINDOW` if not required at runtime.
- Validate effective merged manifest per build type.

---

## F-04 (Medium): Auth/session state stored in AsyncStorage (not secure enclave)

### Evidence
- `lib/auth.ts:97`, `137`, `195` store auth state in `AsyncStorage`.
- `lib/auth.ts:127` stores persistent `guestId` in `AsyncStorage`.

### Why this matters
AsyncStorage is not designed for secure secret storage. Compromised devices or rooted contexts can read/modify data.

### Impact
- Session tampering or replay attempts.
- Increased local token theft exposure.

### Recommended mitigation
- Keep only non-sensitive profile state in AsyncStorage.
- Store sensitive auth tokens in OS-backed secure storage (e.g., SecureStore/Keychain/Keystore).
- Add short token TTL + refresh/rotation server-side.

---

## F-05 (Medium): Dependency vulnerabilities present in production tree

### Evidence
From `npm audit --omit=dev`:
- `fast-xml-parser` (critical)
- `minimatch` (high)
- `tar` (high)
- `bn.js` (moderate)

### Why this matters
Even transitive vulnerabilities can become reachable via tooling/runtime paths.

### Recommended mitigation
- Run `npm audit fix` and re-test app.
- Pin/override vulnerable transitive versions where needed.
- Add CI gate for new high/critical advisories.

---

## Mitigation Plan

## Phase 0 — Immediate Containment (Today)
1. **Disable auth bypass server-side**
   - Reject `SKIP_VERIFICATION` in prod for `/api/auth/wallet` and `/api/auth/link-wallet`.
   - Return explicit error when signature missing/invalid.
2. **Rotate signing secret handling**
   - Remove hardcoded passwords from gradle and plugin.
   - Move to CI/env variables.

## Phase 1 — High-Priority Hardening (1-3 days)
1. **Implement strict wallet challenge flow**
   - Nonce issued by backend, one-time use, short expiry.
   - Signature verifies exact message + chain context.
2. **Manifest minimization**
   - Set `allowBackup=false`.
   - Remove unneeded storage/overlay permissions.
3. **Secure local storage split**
   - Secrets/tokens → secure storage.
   - Public UX prefs only → AsyncStorage.

## Phase 2 — Dependency & Build Integrity (3-7 days)
1. Resolve `npm audit` findings (prioritize critical/high).
2. Add software supply chain checks in CI:
   - `npm audit --omit=dev` (policy threshold)
   - lockfile integrity checks.
3. Add release checklist:
   - merged manifest review
   - secret scanning
   - auth negative tests.

---

## Suggested Backlog (Ticket-Ready)

1. **AUTH-001**: Remove `SKIP_VERIFICATION` acceptance in production backend.
2. **AUTH-002**: Enforce nonce-based challenge-signature wallet auth.
3. **MOBILE-001**: Replace hardcoded Android signing credentials with env/CI secrets.
4. **MOBILE-002**: Set `allowBackup=false` and validate backup behavior.
5. **MOBILE-003**: Remove unnecessary `READ/WRITE_EXTERNAL_STORAGE` and `SYSTEM_ALERT_WINDOW` permissions.
6. **MOBILE-004**: Migrate auth token storage from AsyncStorage to secure OS-backed storage.
7. **SEC-DEP-001**: Patch vulnerable transitive dependencies and add CI policy gate.

---

## Validation Checklist

- [ ] Auth requests without valid signatures fail in production.
- [ ] Replay of old signed nonce fails.
- [ ] APK can’t be signed with credentials from repo alone.
- [ ] `allowBackup=false` confirmed in merged release manifest.
- [ ] Only required Android permissions remain.
- [ ] Tokens no longer stored in plain AsyncStorage.
- [ ] `npm audit --omit=dev` has no critical/high findings (or documented exceptions).

---

## Implementation Update (Applied in mobile repo)

The following mitigations have been implemented in this repo:

- Removed `SKIP_VERIFICATION` fallback paths from mobile auth client (`lib/auth.ts`).
- Removed wallet local-auth fallback in `GameContext` (no implicit insecure bypass).
- Added strict requirement for signature-capable wallet flow in wallet sign-in and guest-link paths.
- Removed hardcoded Android signing secrets from:
  - `android/app/build.gradle`
  - `plugins/with-release-signing.js`
- Switched signing config to env/Gradle property resolution:
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- Android manifest hardening:
  - `allowBackup="false"`
  - removed `READ_EXTERNAL_STORAGE`
  - removed `WRITE_EXTERNAL_STORAGE`
  - removed `SYSTEM_ALERT_WINDOW`
- Added secure secret setup guide: `docs/signing-secrets.md`.

Dependency remediation update:
- Ran `npm audit fix --omit=dev`.
- Remaining unresolved advisory: `tar` (high), still present transitively.

## Notes

- This review focused on app-side code/config in the mobile repo.
- Full closure of auth risks requires backend verification logic review in the corresponding API service.
