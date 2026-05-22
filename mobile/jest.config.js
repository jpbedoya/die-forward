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
};
