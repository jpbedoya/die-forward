#!/usr/bin/env node
/**
 * Local iOS build → signed .ipa for App Store Connect (no EAS).
 *
 * Mirrors scripts/build-android-local.cjs: single entrypoint, resolves the
 * version from app.config.js, preflights env + signing, then drives Xcode.
 *
 * Pipeline:
 *   1. Sanity: macOS + xcodebuild present.
 *   2. Preflight required EXPO_PUBLIC_* env (same as the Android script).
 *   3. Preflight signing: ExportOptions.plist has a real teamID, and an Apple
 *      Distribution certificate is present in the login keychain. Fail loudly and
 *      actionably if not — never emit an unsigned/broken artifact.
 *   4. `npx expo prebuild --platform ios --clean` — regenerates ios/ applying the
 *      config plugins (expo-notifications, etc.).
 *   5. Discover the workspace (ios/*.xcworkspace) → scheme = its basename (Expo
 *      names the scheme after the sanitized app name, e.g. "DieForward").
 *   6. `xcodebuild ... archive` → ios/build/<scheme>.xcarchive (Release).
 *   7. `xcodebuild -exportArchive` with scripts/ExportOptions.plist (method
 *      app-store-connect) → signed .ipa.
 *   8. Copy the .ipa to mobile/dist/<name>-<version>.ipa.
 *
 * Usage (from `mobile/`):
 *   npm run build:ios:local
 *
 * Then upload the .ipa to App Store Connect via Xcode Organizer, Transporter, or:
 *   xcrun altool --upload-app -f dist/<name>-<version>.ipa -t ios \
 *     --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>
 *   # (or: xcrun notarytool / Transporter.app)
 *
 * One-time Apple setup required (only you can do this — creds are not in the repo):
 *   - Enrolled Apple Developer account; note your 10-char Team ID.
 *   - An "Apple Distribution" certificate + its private key installed in the
 *     login keychain (Xcode → Settings → Accounts → Manage Certificates, or import
 *     a .p12).
 *   - An App Store provisioning profile for bundle id `com.dieforward.app`
 *     (App Store Connect → Certificates, Identifiers & Profiles). With automatic
 *     signing + `-allowProvisioningUpdates` Xcode can create/refresh it for you
 *     once you are signed into the account in Xcode.
 *   - Put your Team ID into scripts/ExportOptions.plist (:teamID).
 */

const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } = require('node:fs');
const { basename, join, resolve } = require('node:path');

const mobileRoot = resolve(__dirname, '..');

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// ── Sanity: platform + toolchain ─────────────────────────────────────────────
if (process.platform !== 'darwin') {
  fail('iOS builds require macOS with Xcode. This is a local, non-EAS build.');
}
try {
  execFileSync('xcodebuild', ['-version'], { stdio: 'ignore' });
} catch {
  fail(
    'xcodebuild not found.\n' +
    '  Install Xcode from the App Store, then run:\n' +
    '    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer\n' +
    '    xcodebuild -runFirstLaunch',
  );
}

// ── Dotenv + env preflight (parity with the Android script) ──────────────────
function readDotenv(filePath) {
  if (!existsSync(filePath)) return {};
  return Object.fromEntries(
    readFileSync(filePath, 'utf8').split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => {
        const i = l.indexOf('=');
        return i < 0 ? null : [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
      .filter(Boolean),
  );
}

const REQUIRED_PUBLIC_ENV = ['EXPO_PUBLIC_INSTANT_APP_ID'];
const dotenvVars = new Set();
for (const name of ['.env.development.local', '.env.local', '.env.development', '.env']) {
  Object.keys(readDotenv(join(mobileRoot, name))).forEach(k => dotenvVars.add(k));
}
const missingEnv = REQUIRED_PUBLIC_ENV.filter(k => !process.env[k] && !dotenvVars.has(k));
if (missingEnv.length) {
  fail(
    `Missing required env vars: ${missingEnv.join(', ')}\n` +
    `  Expo inlines EXPO_PUBLIC_* into the JS bundle at build time. Without\n` +
    `  them the app throws on launch. Create ${join(mobileRoot, '.env.local')} (see .env.example).`,
  );
}

// ── Signing preflight ────────────────────────────────────────────────────────
const exportPlist = join(__dirname, 'ExportOptions.plist');
if (!existsSync(exportPlist)) {
  fail(
    `Missing ${exportPlist}.\n` +
    `  This template drives the App Store export. Restore it from git or the repo.`,
  );
}

// Read the Team ID out of the plist (PlistBuddy ships with macOS).
let teamId = '';
try {
  teamId = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :teamID', exportPlist], { encoding: 'utf8' }).trim();
} catch { /* key missing → handled below */ }
if (!teamId || /REPLACE|XXXX|YOURTEAM/i.test(teamId)) {
  fail(
    `Apple Team ID not set in scripts/ExportOptions.plist (:teamID = "${teamId || 'unset'}").\n` +
    `  Find your 10-character Team ID at https://developer.apple.com/account (Membership),\n` +
    `  then edit scripts/ExportOptions.plist and set <key>teamID</key> to it.`,
  );
}

// Confirm a Distribution signing identity is actually installed. Without this the
// archive/export would fail deep inside Xcode with an opaque error — catch it now.
let identities = '';
try {
  identities = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], { encoding: 'utf8' });
} catch { /* treated as none below */ }
if (!/Apple Distribution|iPhone Distribution/.test(identities)) {
  fail(
    'No Apple Distribution certificate found in your keychain.\n' +
    '  App Store builds must be signed with an "Apple Distribution" certificate.\n' +
    '  Fix (one-time):\n' +
    '    • Xcode → Settings → Accounts → (your Apple ID) → Manage Certificates → + → Apple Distribution\n' +
    '    • or import your team\'s distribution .p12 into the login keychain.\n' +
    `  Then re-run. (Also ensure an App Store provisioning profile exists for com.dieforward.app.)`,
  );
}

// ── Version + name (single source of truth: app.config.js) ───────────────────
const config = require(join(mobileRoot, 'app.config.js'));
const version = config.expo.version;                                  // e.g. "1.4.4.986827f"
const appName = config.expo.name.toLowerCase().replace(/\s+/g, '-');  // "die-forward"
const bundleId = (config.expo.ios && config.expo.ios.bundleIdentifier) || 'com.dieforward.app';

console.log(`\n▶ iOS App Store build — ${appName} ${version} (${bundleId}), team ${teamId}\n`);

// ── Prebuild (regenerate ios/ with config plugins applied) ───────────────────
console.log('▶ npx expo prebuild --platform ios --clean\n');
execFileSync('npx', ['expo', 'prebuild', '--platform', 'ios', '--clean'], {
  cwd: mobileRoot,
  stdio: 'inherit',
});

// ── Discover workspace + scheme ──────────────────────────────────────────────
// Expo prebuild emits ios/<Name>.xcworkspace and a matching scheme named after
// the sanitized app name (spaces/punctuation stripped) — e.g. "Die Forward" →
// "DieForward". We derive the scheme from the workspace basename rather than
// hardcoding, so a rename of expo.name doesn't silently break the build.
const iosDir = join(mobileRoot, 'ios');
const workspace = readdirSync(iosDir).find(f => f.endsWith('.xcworkspace'));
if (!workspace) {
  fail('No .xcworkspace found in ios/ after prebuild — prebuild may have failed.');
}
const workspacePath = join(iosDir, workspace);
const scheme = basename(workspace, '.xcworkspace');
console.log(`\n  ↪ workspace = ios/${workspace}`);
console.log(`  ↪ scheme    = ${scheme}\n`);

// ── Archive ──────────────────────────────────────────────────────────────────
const archivePath = join(iosDir, 'build', `${scheme}.xcarchive`);
console.log(`▶ xcodebuild archive → ${archivePath}\n`);
execFileSync('xcodebuild', [
  '-workspace', workspacePath,
  '-scheme', scheme,
  '-configuration', 'Release',
  '-destination', 'generic/platform=iOS',
  '-archivePath', archivePath,
  'archive',
  '-allowProvisioningUpdates',
  `DEVELOPMENT_TEAM=${teamId}`,
], { cwd: mobileRoot, stdio: 'inherit' });

// ── Export signed .ipa ───────────────────────────────────────────────────────
const exportDir = join(mobileRoot, 'dist', 'ios-export');
mkdirSync(exportDir, { recursive: true });
console.log(`\n▶ xcodebuild -exportArchive (method from ExportOptions.plist)\n`);
execFileSync('xcodebuild', [
  '-exportArchive',
  '-archivePath', archivePath,
  '-exportOptionsPlist', exportPlist,
  '-exportPath', exportDir,
  '-allowProvisioningUpdates',
], { cwd: mobileRoot, stdio: 'inherit' });

// ── Copy the .ipa under a versioned name ─────────────────────────────────────
const ipaName = readdirSync(exportDir).find(f => f.endsWith('.ipa'));
if (!ipaName) {
  fail(`No .ipa produced in ${exportDir} — check the xcodebuild export output above.`);
}
const distDir = join(mobileRoot, 'dist');
mkdirSync(distDir, { recursive: true });
const ipaDest = join(distDir, `${appName}-${version}.ipa`);
copyFileSync(join(exportDir, ipaName), ipaDest);

const ipaMB = (statSync(ipaDest).size / (1024 * 1024)).toFixed(1);
const ipaSha = createHash('sha256').update(readFileSync(ipaDest)).digest('hex');

console.log(`\n✓ ${ipaDest}  (${ipaMB} MB, sha256 ${ipaSha.slice(0, 12)}…)\n`);
console.log(`  ↪ Upload to App Store Connect via one of:`);
console.log(`      • Xcode → Organizer → Distribute App`);
console.log(`      • Transporter.app (drag the .ipa in)`);
console.log(`      • xcrun altool --upload-app -f "${ipaDest}" -t ios --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>\n`);
