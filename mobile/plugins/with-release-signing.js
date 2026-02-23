/**
 * Expo config plugin: configures release signing with a persistent keystore.
 * Keystore source: mobile/keystores/release.keystore (gitignored)
 * Plugin copies it into android/keystores/ and configures gradle.
 * Survives `expo prebuild --clean`.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // ── Copy keystore ──────────────────────────────────────────────────────
    const keystoresDir = path.join(config.modRequest.platformProjectRoot, 'keystores');
    if (!fs.existsSync(keystoresDir)) {
      fs.mkdirSync(keystoresDir, { recursive: true });
    }
    const srcKeystore = path.join(config.modRequest.projectRoot, 'keystores', 'release.keystore');
    const dstKeystore = path.join(keystoresDir, 'release.keystore');
    if (fs.existsSync(srcKeystore) && !fs.existsSync(dstKeystore)) {
      fs.copyFileSync(srcKeystore, dstKeystore);
    }

    // ── Skip if already configured ─────────────────────────────────────────
    if (buildGradle.includes('signingConfigs.release')) {
      // Check if it's just pointing to debug — if so, replace it
      if (!buildGradle.includes('file("keystores/release.keystore")')) {
        // Replace the release signingConfig line to use our release config
      } else {
        config.modResults.contents = buildGradle;
        return config;
      }
    }

    // ── Add release signing config ─────────────────────────────────────────
    // Insert our release signingConfig inside the existing signingConfigs block
    const releaseConfig = `
        release {
            storeFile file("../keystores/release.keystore")
            storePassword "dieforward2026"
            keyAlias "die-forward"
            keyPassword "dieforward2026"
        }`;

    // Add after the debug signingConfig closing brace
    buildGradle = buildGradle.replace(
      /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\})/,
      `$1${releaseConfig}`
    );

    // ── Point release buildType to our signing config ──────────────────────
    buildGradle = buildGradle.replace(
      /(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release'
    );

    config.modResults.contents = buildGradle;
    return config;
  });
};
