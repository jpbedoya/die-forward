const { execSync } = require('child_process');

// Get short commit hash at build time
let commitHash = 'dev';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  // Not a git repo or git not available — fall back to 'dev'
}

const BASE_VERSION = '1.2.0';
const VERSION = `${BASE_VERSION}.${commitHash}`;

module.exports = {
  expo: {
    name: "Die Forward",
    slug: "die-forward",
    version: VERSION,
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    scheme: "dieforward",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0d0d0d",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.dieforward.app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0d0d0d",
      },
      edgeToEdgeEnabled: true,
      package: "com.dieforward.app",
      versionCode: 2,  // Increment manually for store releases only
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png",
      output: "single",
      build: {
        babel: {
          include: ["@wallet-ui/react-native-web3js"],
        },
      },
    },
    plugins: [
      "expo-router",
      "expo-asset",
      "expo-audio",
      "./plugins/with-mwa-android",
    ],
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "14637e61-9e4a-4f2f-98fc-fcdd9e7650f8",
      },
    },
    owner: "jpbedoya",
  },
};
