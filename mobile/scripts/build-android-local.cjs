#!/usr/bin/env node
/**
 * Local Android build with versioned, name-stamped APK output.
 *
 * Three build modes (mutually exclusive):
 *   default          → self-contained DEBUG APK (debug-signed, JS bundled,
 *                      unminified). Quickest to build, biggest file. Best for
 *                      iteration and ad-hoc sharing.
 *   --metro          → Metro-served debug APK. Live-reload, needs `expo start`
 *                      running. Use during dev.
 *   --prod           → RELEASE APK (release-signed via mobile/android/keystores, JS
 *                      bundled, R8-minified). Smaller, production-quality.
 *                      Requires mobile/android/keystores/release.keystore + .env.
 *
 * Optional, combinable:
 *   --publish        → after the build, publish a GitHub prerelease at
 *                      `dev-<version>` with the APK attached. Asset is
 *                      re-uploaded with --clobber if the tag already exists.
 *
 * Single source of truth for the version is `mobile/app.config.js`
 * (BASE_VERSION + git short SHA = e.g. "1.4.4.986827f").
 *
 * Usage (from `mobile/`):
 *   npm run build:android:local                        # standalone debug
 *   npm run build:android:local -- --metro             # live-reload (dev)
 *   npm run build:android:local -- --prod              # release APK
 *   npm run build:android:local -- --prod --publish    # release + GH publish
 *
 * Pipeline:
 *   1. Read version + name from app.config.js.
 *   2. Sync Android-native versionName in build.gradle to match.
 *   3. Resolve JAVA_HOME / ANDROID_HOME from known locations if the calling
 *      shell hasn't sourced ~/.zshrc (CI / editor task runners / agent sandboxes).
 *   4. Preflight required EXPO_PUBLIC_* env vars (catches "missing .env" before
 *      it becomes a confusing on-device runtime crash).
 *   5. Inject a one-time `standaloneBuild` toggle into the gradle `react { }`
 *      block (idempotent, marker-guarded) so debug builds can opt into bundling.
 *   6. For --prod: load mobile/android/keystores/.env into the build env so gradle's
 *      release signingConfig finds ANDROID_KEYSTORE_PASSWORD / KEY_PASSWORD.
 *   7. Bust the cached JS bundle outputs (the react gradle plugin doesn't track
 *      .env files as inputs, so an env-only change would otherwise be silent).
 *   8. Run `./gradlew assembleDebug` or `assembleRelease` accordingly.
 *   9. Copy the APK to mobile/dist/<name>-<version>[-release].apk.
 *  10. (--publish) publish to GitHub.
 */

const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const mobileRoot = resolve(__dirname, '..');
const repoRoot = resolve(mobileRoot, '..');

// ── Flags ────────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const PROD = args.has('--prod');
const METRO = args.has('--metro') && !PROD; // --prod always bundles
const STANDALONE = !METRO;                  // self-contained APK is the default
const PUBLISH = args.has('--publish');

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

// ── Dotenv helpers ───────────────────────────────────────────────────────────
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

// ── Env preflight ────────────────────────────────────────────────────────────
// Expo inlines EXPO_PUBLIC_* env vars into the JS bundle at build time. If a
// required one isn't reachable (via process.env or an Expo-loaded dotenv file),
// the runtime guard in lib/instant.ts throws on launch — confusing to debug
// once the APK is already on a phone. Catch it here instead.
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

// ── Release keystore (--prod only) ───────────────────────────────────────────
// build.gradle's release signingConfig reads ANDROID_KEYSTORE_PASSWORD /
// ANDROID_KEY_PASSWORD / ANDROID_KEY_ALIAS from the env. Load them from
// mobile/android/keystores/.env (gitignored) so the build script is the single
// entrypoint — no need to remember to `source` anything first.
if (PROD) {
  const keystorePath = join(mobileRoot, 'android/keystores/release.keystore');
  const keystoreEnvPath = join(mobileRoot, 'android/keystores/.env');
  if (!existsSync(keystorePath)) {
    console.error(
      `✗ Release build needs ${keystorePath}.\n` +
      `  Generate one with:\n` +
      `    keytool -genkeypair -v -keystore mobile/android/keystores/release.keystore \\\n` +
      `      -alias die-forward -keyalg RSA -keysize 2048 -validity 10000\n` +
      `  Then put the storepass / keypass into mobile/android/keystores/.env as\n` +
      `  ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_PASSWORD.`,
    );
    process.exit(1);
  }
  const ksEnv = readDotenv(keystoreEnvPath);
  for (const k of ['ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_PASSWORD']) {
    if (!buildEnv[k] && ksEnv[k]) buildEnv[k] = ksEnv[k];
    if (!buildEnv[k]) {
      console.error(`✗ Release build needs ${k}. Add it to ${keystoreEnvPath} (or export it before running).`);
      process.exit(1);
    }
  }
  if (ksEnv.ANDROID_KEY_ALIAS) buildEnv.ANDROID_KEY_ALIAS = buildEnv.ANDROID_KEY_ALIAS || ksEnv.ANDROID_KEY_ALIAS;
}

// ── Version sync + build.gradle edits ────────────────────────────────────────
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
// idempotently, marker-guarded. With it, `assembleDebug -PstandaloneBuild=true`
// bundles the JS instead of pointing at Metro. (Release variants always bundle.)
const STANDALONE_MARKER = '// [standalone-build-toggle]';
if (!buildGradle.includes(STANDALONE_MARKER)) {
  const snippet =
    `\n    ${STANDALONE_MARKER}\n` +
    `    if (findProperty('standaloneBuild') == 'true') {\n` +
    `        debuggableVariants = []\n` +
    `    }\n`;
  buildGradle = buildGradle.replace(/^react\s*\{/m, `react {${snippet}`);
}

if (buildGradle !== originalBuildGradle) writeFileSync(buildGradlePath, buildGradle);

// ── Build ────────────────────────────────────────────────────────────────────
// EXPO_PUBLIC_* env vars are inlined into the JS bundle at bundle time. Gradle
// doesn't track .env files as inputs to the bundle task, so an env-only change
// would otherwise reuse a stale cached bundle. Wipe the bundle outputs before
// every standalone-or-release build so the value the APK ships with always
// matches the .env on disk. (Tiny cost — ~20s extra on a warm build.)
const buildVariant = PROD ? 'release' : 'debug';
if (STANDALONE || PROD) {
  for (const p of [
    `android/app/build/generated/assets/createBundle${PROD ? 'Release' : 'Debug'}JsAndAssets`,
    `android/app/build/intermediates/assets/${buildVariant}/mergeDebugAssets`,
    `android/app/build/intermediates/merged_assets/${buildVariant}/merge${PROD ? 'Release' : 'Debug'}Assets/out`,
  ]) {
    rmSync(join(mobileRoot, p), { recursive: true, force: true });
  }
}

const mode = PROD ? 'release (signed, minified)' : (STANDALONE ? 'debug standalone' : 'debug Metro-served');
console.log(`\n▶ Building ${appName} ${version} — ${mode}\n`);
const gradleTask = PROD ? 'assembleRelease' : 'assembleDebug';
const gradleArgs = [gradleTask];
if (STANDALONE && !PROD) gradleArgs.push('-PstandaloneBuild=true');
if (PROD) {
  // R8 minification + resource shrinking together cut release APK size
  // substantially. Resource shrinking strips drawables/strings R8 proves
  // unused. RN dynamic-require assets (creature art by name, audio by
  // string ID, etc.) need to be reachable from a static `require()` graph
  // for R8 to see them — verified in mobile/lib/creatureAssets.ts and
  // mobile/lib/audio.ts; both use static maps. If a tester sees missing
  // assets in a --prod APK, that's the first place to look.
  gradleArgs.push('-Pandroid.enableMinifyInReleaseBuilds=true');
  gradleArgs.push('-Pandroid.enableShrinkResourcesInReleaseBuilds=true');
}
// execFileSync (not exec/spawn with shell) — no command-string interpolation.
execFileSync('./gradlew', gradleArgs, {
  cwd: join(mobileRoot, 'android'),
  stdio: 'inherit',
  env: buildEnv,
});

// The arm64-only splits config produces a single APK per variant; copy it
// under a versioned, mode-tagged name so debug + release APKs can coexist.
const apkSrc = join(mobileRoot,
  `android/app/build/outputs/apk/${buildVariant}/app-arm64-v8a-${buildVariant}.apk`);
const distDir = join(mobileRoot, 'dist');
mkdirSync(distDir, { recursive: true });
const apkDest = join(distDir, PROD ? `${appName}-${version}-release.apk` : `${appName}-${version}.apk`);
copyFileSync(apkSrc, apkDest);

const apkBytes = statSync(apkDest).size;
const apkMB = (apkBytes / (1024 * 1024)).toFixed(1);
const apkSha = createHash('sha256').update(readFileSync(apkDest)).digest('hex');

console.log(`\n✓ ${apkDest}  (${apkMB} MB, sha256 ${apkSha.slice(0, 12)}…)\n`);

// ── Publish (optional) ───────────────────────────────────────────────────────
if (PUBLISH) {
  const tag = `dev-${version}`;
  const title = `dev ${version}${PROD ? ' (release)' : ''}`;
  const branch = (() => {
    try { return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(); }
    catch { return 'main'; }
  })();
  const flavor = PROD ? 'RELEASE — signed + R8-minified' : 'DEBUG — JS bundled, no Metro required';
  const notes =
    `Local build off \`${branch}\` @ ${version.split('.').pop()}.\n` +
    `\n` +
    `- arm64-v8a APK, ${apkMB} MB — ${flavor}\n` +
    `- versionName \`${version}\`\n` +
    `- SHA-256: \`${apkSha}\`\n` +
    `\n` +
    `Built with \`npm run build:android:local${PROD ? ' -- --prod --publish' : ' -- --publish'}\`.`;

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
