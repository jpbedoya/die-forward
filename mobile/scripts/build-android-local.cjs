#!/usr/bin/env node
/**
 * Local Android debug build with versioned, name-stamped APK output.
 *
 * Single source of truth for the version is `mobile/app.config.js`
 * (BASE_VERSION + git short SHA = e.g. "1.4.4.3b259d6"). This script:
 *   1. Reads that computed version + the app name from app.config.js.
 *   2. Syncs Android's native `versionName` in build.gradle to match —
 *      so the installed app reports the same version that's in the filename.
 *   3. Resolves JAVA_HOME / ANDROID_HOME if the calling shell didn't set them
 *      (so the build works from any shell, not just an interactive zsh that
 *      has sourced ~/.zshrc — see android-build-setup notes).
 *   4. Runs `./gradlew assembleDebug`.
 *   5. Copies the resulting APK to `mobile/dist/<name>-<version>.apk`.
 *
 * Invoked via `npm run build:android:local` (from `mobile/`).
 */

const { execFileSync } = require('node:child_process');
const { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const mobileRoot = resolve(__dirname, '..');

// ── Toolchain resolution ─────────────────────────────────────────────────────
// The interactive zsh has JAVA_HOME / ANDROID_HOME via ~/.zshrc. A non-login
// shell (CI, an editor task runner, a Claude sandbox) won't — so we resolve
// each var here from well-known locations and surface a clear error if missing.

function resolveJavaHome() {
  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  // macOS ships a helper that picks the right JDK by version.
  if (process.platform === 'darwin') {
    try {
      const out = execFileSync('/usr/libexec/java_home', ['-v', '17'], { encoding: 'utf8' }).trim();
      if (out && existsSync(out)) return out;
    } catch { /* fall through */ }
  }
  // Common Homebrew openjdk@17 locations (Apple Silicon, then Intel).
  for (const p of [
    '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  ]) {
    if (existsSync(p)) return p;
  }
  return null;
}

function resolveAndroidHome() {
  for (const name of ['ANDROID_HOME', 'ANDROID_SDK_ROOT']) {
    if (process.env[name] && existsSync(process.env[name])) return process.env[name];
  }
  for (const p of [
    '/opt/homebrew/share/android-commandlinetools',          // Homebrew cask, Apple Silicon
    '/usr/local/share/android-commandlinetools',             // Homebrew cask, Intel
    join(process.env.HOME || '', 'Library/Android/sdk'),     // Android Studio default
  ]) {
    if (existsSync(p)) return p;
  }
  return null;
}

const javaHome = resolveJavaHome();
if (!javaHome) {
  console.error(
    '✗ Could not locate a JDK 17.\n' +
    "  Set JAVA_HOME, or install one — e.g. `brew install openjdk@17` — then re-run.\n" +
    '  (See: memory/android-build-setup.md)',
  );
  process.exit(1);
}
const androidHome = resolveAndroidHome();
if (!androidHome) {
  console.error(
    '✗ Could not locate the Android SDK.\n' +
    "  Set ANDROID_HOME (or ANDROID_SDK_ROOT), or install — e.g. `brew install --cask android-commandlinetools`.\n" +
    '  (See: memory/android-build-setup.md)',
  );
  process.exit(1);
}

if (!process.env.JAVA_HOME) console.log(`  ↪ JAVA_HOME = ${javaHome}`);
if (!process.env.ANDROID_HOME) console.log(`  ↪ ANDROID_HOME = ${androidHome}`);

// Build the env passed to gradle: JDK on PATH first, plus the SDK locations.
const buildEnv = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  PATH: `${javaHome}/bin:${process.env.PATH || ''}`,
};

// ── Version sync ─────────────────────────────────────────────────────────────
// Pull the version + name from app.config.js — the same values Expo uses.
const config = require(join(mobileRoot, 'app.config.js'));
const version = config.expo.version;                              // e.g. "1.4.4.3b259d6"
const appName = config.expo.name.toLowerCase().replace(/\s+/g, '-'); // "die-forward"

// Sync the Android-native versionName so the installed app's version matches
// the filename. build.gradle is the always-local file (per project convention);
// editing in place here is the project's documented pattern.
const buildGradlePath = join(mobileRoot, 'android/app/build.gradle');
const original = readFileSync(buildGradlePath, 'utf8');
const updated = original.replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
if (updated === original) {
  console.warn(`[build-android-local] Could not find versionName in ${buildGradlePath} — leaving it untouched.`);
} else {
  writeFileSync(buildGradlePath, updated);
}

// ── Build ────────────────────────────────────────────────────────────────────
console.log(`\n▶ Building ${appName} ${version}\n`);
// execFileSync (not exec/spawn with shell) — no command-string interpolation.
execFileSync('./gradlew', ['assembleDebug'], {
  cwd: join(mobileRoot, 'android'),
  stdio: 'inherit',
  env: buildEnv,
});

// The arm64-only splits config produces a single APK; copy it under the
// versioned name so old builds aren't overwritten and the filename is shareable.
const apkSrc = join(mobileRoot, 'android/app/build/outputs/apk/debug/app-arm64-v8a-debug.apk');
const distDir = join(mobileRoot, 'dist');
mkdirSync(distDir, { recursive: true });
const apkDest = join(distDir, `${appName}-${version}.apk`);
copyFileSync(apkSrc, apkDest);

console.log(`\n✓ ${apkDest}\n`);
