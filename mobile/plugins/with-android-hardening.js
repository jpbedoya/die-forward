/**
 * Expo config plugin: Android hardening defaults
 * - disable adb backup extraction for app data
 * - remove legacy/high-risk permissions not required by app runtime
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const BLOCKED_PERMISSIONS = new Set([
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
]);

module.exports = function withAndroidHardening(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Remove blocked permissions from generated manifest
    manifest['uses-permission'] = (manifest['uses-permission'] || []).filter((perm) => {
      const name = perm?.$?.['android:name'];
      return !BLOCKED_PERMISSIONS.has(name);
    });

    // Ensure app backup is disabled
    const app = manifest.application?.[0];
    if (app?.$) {
      app.$['android:allowBackup'] = 'false';
    }

    return config;
  });
};
