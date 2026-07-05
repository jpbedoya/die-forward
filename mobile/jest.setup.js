// Set required environment variables for tests
if (!process.env.EXPO_PUBLIC_INSTANT_APP_ID) {
  process.env.EXPO_PUBLIC_INSTANT_APP_ID = '0700b913-585c-4de8-abdf-0bc81a0f5920';
}
if (!process.env.EXPO_PUBLIC_SOLANA_RPC) {
  process.env.EXPO_PUBLIC_SOLANA_RPC = 'https://api.devnet.solana.com';
}
if (!process.env.EXPO_PUBLIC_API_URL) {
  process.env.EXPO_PUBLIC_API_URL = 'https://www.dieforward.com';
}

// Suppress console errors that might occur during module loading
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Only suppress module loading errors
    if (typeof args[0] === 'string' && args[0].includes('Non-serializable values were found')) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
