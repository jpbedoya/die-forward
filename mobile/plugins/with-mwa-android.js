/**
 * Expo config plugin: adds <queries> block to AndroidManifest.xml
 * required for MWA (Mobile Wallet Adapter) to discover wallet apps
 * on Android 11+ (API level 30+).
 *
 * Without this, transact() / useMobileWallet().connect() silently finds
 * no wallets and the connection dialog never appears.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withMWAAndroid(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure queries array exists
    if (!manifest.queries) {
      manifest.queries = [];
    }

    // Check if MWA intent already added
    const alreadyAdded = manifest.queries.some(
      (q) =>
        q.intent &&
        q.intent.some(
          (i) =>
            i.action &&
            i.action.some(
              (a) =>
                a.$?.['android:name'] ===
                'solana.mobilewalletadapter.walletlib.action.LINK_MWA_REQUEST'
            )
        )
    );

    if (!alreadyAdded) {
      manifest.queries.push({
        intent: [
          {
            action: [
              {
                $: {
                  'android:name':
                    'solana.mobilewalletadapter.walletlib.action.LINK_MWA_REQUEST',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};
