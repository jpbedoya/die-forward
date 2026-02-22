/**
 * Expo config plugin: configures ABI splits for arm64-v8a only.
 * Drops ~44MB of x86/armeabi-v7a native libs from the APK.
 * Works for sideloading on modern Android devices.
 *
 * Survives `expo prebuild --clean`.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withArm64Only(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Don't add if already present
    if (buildGradle.includes('splits')) {
      return config;
    }

    // Inject ABI splits block inside android { } block, after defaultConfig
    const anchor = 'buildTypes {';
    const splitBlock = `// arm64-v8a only — drops ~44MB of x86/armeabi-v7a native libs
    splits {
        abi {
            enable true
            reset()
            include 'arm64-v8a'
            universalApk false
        }
    }

    `;

    config.modResults.contents = buildGradle.replace(
      anchor,
      splitBlock + anchor
    );

    return config;
  });
};
