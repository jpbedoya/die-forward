/**
 * Jest config for the Next.js web app.
 *
 * Scope: pure-logic unit tests under `src/lib/__tests__/`. Uses next/jest so
 * TypeScript and the `@/*` path alias resolve the same way as the app build.
 */
const nextJest = require('next/jest').default || require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/lib/__tests__/**/*.test.ts'],
});
