/**
 * Jest config — pure-logic unit tests for game rules, combat math, and escrow.
 *
 * Plain Node environment (deliberately not the jest-expo preset): these tests
 * never touch React Native, and Node module resolution picks the CJS builds of
 * @solana/kit and @solana/web3.js. The jest-expo preset's react-native resolver
 * resolves @solana/kit to an ESM-only build that Jest cannot load.
 *
 * Tests live in `lib/__tests__/`. TypeScript is transformed via babel-jest,
 * which picks up the project babel config (babel-preset-expo).
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/lib/__tests__/**/*.test.ts'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/@react-native-community-netinfo.js',
    '^expo-file-system/legacy$': '<rootDir>/__mocks__/expo-file-system-legacy.js',
    '^react-native-css-interop$': '<rootDir>/__mocks__/react-native-css-interop.js',
    '^react-native-css-interop/runtime/api$': '<rootDir>/__mocks__/react-native-css-interop.js',
    '^react-native-css-interop/runtime/wrap-jsx$': '<rootDir>/__mocks__/react-native-css-interop.js',
    '^react-native-css-interop/runtime/jsx-runtime$': '<rootDir>/__mocks__/react-native-css-interop.js',
    '^expo/virtual/env$': '<rootDir>/__mocks__/expo-env.js',
    '^nativewind$': '<rootDir>/__mocks__/nativewind.js',
    '^nativewind/babel$': '<rootDir>/__mocks__/nativewind-babel.js',
    '^nativewind/native$': '<rootDir>/__mocks__/nativewind.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
