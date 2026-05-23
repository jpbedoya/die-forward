#!/usr/bin/env node
/**
 * Local Android debug build with versioned, name-stamped APK output.
 *
 * Produces a SELF-CONTAINED APK by default — the JS bundle is embedded, so the
 * installed app runs without a Metro dev server. Drop the file in chat / a
 * release / a USB drive and anyone with an arm64 Android phone can install
 * and play. Pass `--metro` for the legacy Metro-served debug build.
 *
 * Usage (from `mobile/`):
 *   npm run build:android:local              # standalone debug APK
 *   npm run build:android:local -- --release # also publish a GitHub prerelease
 *   npm run build:android:local -- --metro   # Metro-served (live-reload) APK
 *
 * Single source of truth for the version is `mobile/app.config.js`
 * (BASE_VERSION + git short SHA = e.g. "1.4.4.986827f"). This script:
 *   1. Reads that computed version + the app name from app.config.js.
 *   2. Syncs Android's native `versionName` in build.gradle to match.
 *   3. Resolves JAVA_HOME / ANDROID_HOME from known locations if the calling
 *      shell didn't set them (so the build works in any shell — CI, an editor
 *      task runner, an agent sandbox — not just an interactive zsh that has
 *      sourced ~/.zshrc; see memory/android-build-setup.md).
 *   4. Injects a one-time `standaloneBuild` toggle into the gradle `react {}`
 *      block (idempotent, marker-guarded) so `assembleDebug -PstandaloneBuild=true`
 *      bundles the JS instead of pointing at Metro.
 *   5. Runs gradle.
 *   6. Copies the APK to `mobile/dist/<name>-<version>.apk`.
 *   7. (with --release) publishes a GitHub prerelease at `dev-<version>` with
 *      the APK attached. If the release already exists, the asset is re-
 *      uploaded with --clobber.
 */

const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const mobileRoot = resolve(__dirname, '..');
const repoRoot = resolve(mobileRoot, '..');

// ── Flags ────────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const STANDALONE = !args.has('--metro'); // self-contained APK is the default
const PUBLISH = args.has('--release');

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

// ── Env preflight ────────────────────────────────────────────────────────────
// Expo inlines EXPO_PUBLIC_* env vars into the JS bundle at build time. If a
// required one isn't reachable (via process.env or an Expo-loaded dotenv file),
// the runtime guard in lib/instant.ts throws on launch — confusing to debug
// once the APK is already on a phone. Catch it here instead.

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
  console.error(
    `✗ Missing required env vars: ${missingEnv.join(', ')}\n` +
    `  Expo inlines EXPO_PUBLIC_* into the JS bundle at build time. Without\n` +
    `  them the app throws on launch ("...is required - check .env file").\n` +
    `  Fix: create ${join(mobileRoot, '.env.local')} (see mobile/.env.example).`,
  );
  process.exit(1);
}

// ── Version sync + build.gradle edits ────────────────────────────────────────
// Pull the version + name from app.config.js — the same values Expo uses.
const config = require(join(mobileRoot, 'app.config.js'));
const version = config.expo.version;                                  // e.g. "1.4.4.986827f"
const appName = config.expo.name.toLowerCase().replace(/\s+/g, '-');  // "die-forward"

// build.gradle is the always-local file (per project convention); editing in
// place here is the project's documented pattern.
const buildGradlePath = join(mobileRoot, 'android/app/build.gradle');
let buildGradle = readFileSync(buildGradlePath, 'utf8');
const originalBuildGradle = buildGradle;

// Sync the native versionName so the installed app's version matches the filename.
buildGradle = buildGradle.replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);

// Inject the standalone-build toggle into the `react { }` block — once,
// idempotently, marker-guarded. Lets us pick standalone vs Metro per build:
//   `./gradlew assembleDebug -PstandaloneBuild=true`  → JS bundled into APK
//   `./gradlew assembleDebug`                          → Metro-served (live-reload)
const STANDALONE_MARKER = '// [standalone-build-toggle]';
if (!buildGradle.includes(STANDALONE_MARKER)) {
  const snippet =
    `\n    ${STANDALONE_MARKER}\n` +
    `    if (findProperty('standaloneBuild') == 'true') {\n` +
    `        debuggableVariants = []\n` +
    `    }\n`;
  buildGradle = buildGradle.replace(/^react\s*\{/m, `react {${snippet}`);
}

if (buildGradle === originalBuildGradle) {
  console.warn(`[build-android-local] No changes needed in ${buildGradlePath}.`);
} else {
  writeFileSync(buildGradlePath, buildGradle);
}

// ── Build ────────────────────────────────────────────────────────────────────
// EXPO_PUBLIC_* env vars are inlined into the JS bundle at bundle time. Gradle
// doesn't track .env files as inputs to the bundle task, so an env-only change
// would otherwise reuse a stale cached bundle. Wipe the bundle outputs before
// every standalone build so the value the APK ships with always matches the
// .env on disk. (Tiny cost — ~20s extra on a warm build.)
if (STANDALONE) {
  for (const p of [
    'android/app/build/generated/assets/createBundleDebugJsAndAssets',
    'android/app/build/intermediates/assets/debug/mergeDebugAssets',
    'android/app/build/intermediates/merged_assets/debug/mergeDebugAssets/out',
  ]) {
    rmSync(join(mobileRoot, p), { recursive: true, force: true });
  }
}

console.log(`\n▶ Building ${appName} ${version} (${STANDALONE ? 'standalone' : 'Metro-served'})\n`);
const gradleArgs = ['assembleDebug'];
if (STANDALONE) gradleArgs.push('-PstandaloneBuild=true');
// execFileSync (not exec/spawn with shell) — no command-string interpolation.
execFileSync('./gradlew', gradleArgs, {
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

const apkBytes = statSync(apkDest).size;
const apkMB = (apkBytes / (1024 * 1024)).toFixed(1);
const apkSha = createHash('sha256').update(readFileSync(apkDest)).digest('hex');

console.log(`\n✓ ${apkDest}  (${apkMB} MB, sha256 ${apkSha.slice(0, 12)}…)\n`);

// ── Publish (optional) ───────────────────────────────────────────────────────
if (PUBLISH) {
  const tag = `dev-${version}`;
  const title = `dev ${version}`;
  const branch = (() => {
    try { return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(); }
    catch { return 'main'; }
  })();
  const notes =
    `Local debug build off \`${branch}\` @ ${version.split('.').pop()}.\n` +
    `\n` +
    `- arm64-v8a APK, ${apkMB} MB${STANDALONE ? ' — self-contained (JS bundled, no Metro required)' : ''}\n` +
    `- versionName \`${version}\`\n` +
    `- SHA-256: \`${apkSha}\`\n` +
    `\n` +
    `Built with \`npm run build:android:local${PUBLISH ? ' -- --release' : ''}\`.`;

  console.log(`▶ Publishing GitHub release ${tag}\n`);
  try {
    execFileSync('gh',
      ['release', 'create', tag, apkDest, '--title', title, '--notes', notes, '--prerelease', '--target', branch],
      { cwd: repoRoot, stdio: 'inherit', env: buildEnv });
  } catch {
    console.log(`  ↪ release ${tag} already exists — re-uploading asset with --clobber`);
    execFileSync('gh',
      ['release', 'upload', tag, apkDest, '--clobber'],
      { cwd: repoRoot, stdio: 'inherit', env: buildEnv });
  }
  console.log(`\n✓ release ${tag} published\n`);
}
