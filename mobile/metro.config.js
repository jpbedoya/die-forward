// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for additional extensions if needed
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Add extra node modules polyfills for Solana web3.js and wallet adapters
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('react-native-get-random-values'),
  stream: require.resolve('readable-stream'),
  // Browser shim for Node.js 'ws' module (used by Trezor wallet adapter)
  ws: path.resolve(__dirname, 'shims/ws.js'),
};

module.exports = withNativeWind(config, { input: './global.css' });
