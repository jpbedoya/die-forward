// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add support for additional extensions if needed
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Add extra node modules polyfills for Solana web3.js
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('react-native-get-random-values'),
  stream: require.resolve('readable-stream'),
};

module.exports = withNativeWind(config, { input: './global.css' });
