/**
 * Auth module for Die Forward
 * 
 * Handles wallet signature auth and guest sessions via InstantDB.
 */

import { db } from './instant';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bs58 from 'bs58';

const AUTH_STORAGE_KEY = 'die-forward-auth';
const GUEST_ID_KEY = 'die-forward-guest-id';

// Same connectivity-loss timeout used by the API client, so offline guest
// sign-in falls back promptly instead of hanging on a dead connection.
async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Random hex id, mirroring the crypto.getRandomValues pattern in seeded-random.ts.
function randomHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// API base URL - use web app for API routes
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.dieforward.com';

export interface AuthState {
  isAuthenticated: boolean;
  authId: string | null;
  authType: 'wallet' | 'guest' | 'email' | null;
  walletAddress: string | null;
  isNewUser: boolean;
  customToken?: string; // InstantDB custom auth token for session restore
}

// ── In-memory auth token registry ────────────────────────────────────────────
//
// api.ts needs the current InstantDB customToken to attach as an
// `Authorization: Bearer <token>` header on identity-bearing requests.
// auth.ts does not import api.ts (or anything that transitively reaches it),
// so `import { getAuthToken } from './auth'` in api.ts is safe — no import
// cycle. Auth.ts owns the token lifecycle (it's the only module that knows
// when a token is minted, restored, or invalidated), so it exposes a tiny
// synchronous getter/setter pair rather than making api.ts re-derive the
// token from AsyncStorage (async, and would duplicate the "which token is
// current" logic that already lives here).
//
// Every function below that mints or invalidates a session updates this
// registry so `getAuthToken()` always reflects the token belonging to the
// current InstantDB session (or null when there isn't one, e.g. offline-local
// guests or before first sign-in).
let currentAuthToken: string | null = null;

/** Returns the customToken for the current InstantDB session, or null if none. */
export function getAuthToken(): string | null {
  return currentAuthToken;
}

/** Sets (or clears, with null) the customToken for the current InstantDB session. */
export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
}

/**
 * Sign in with a connected wallet
 * 
 * @param walletAddress - The wallet's public address
 * @param signMessage - Function to sign a challenge message
 */
export async function signInWithWallet(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<AuthState> {
  let token: string;
  let isNewUser: boolean;

  // Full signature verification flow (required)
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const message = `Sign in to Die Forward\nNonce: ${nonce}`;
  const messageBytes = new TextEncoder().encode(message);

  // Request signature from wallet
  const signatureBytes = await signMessage(messageBytes);
  const signature = bs58.encode(signatureBytes);

  // Send to backend for verification
  const response = await fetch(`${API_BASE}/api/auth/wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, signature, message }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Wallet authentication failed');
  }

  const data = await response.json();
  token = data.token;
  isNewUser = data.isNewUser;

  // Sign in to InstantDB
  await db.auth.signInWithToken(token);

  // Store auth state (include token for session restore on restart)
  const authState: AuthState = {
    isAuthenticated: true,
    authId: walletAddress,
    authType: 'wallet',
    walletAddress,
    isNewUser,
    customToken: token,
  };
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  setAuthToken(token);

  return authState;
}

/**
 * Sign in as a guest (empty handed)
 */
export async function signInAsGuest(): Promise<AuthState> {
  // Check if we have an existing guest ID
  const existingGuestId = await AsyncStorage.getItem(GUEST_ID_KEY);
  
  // Request guest token from backend
  const response = await fetchWithTimeout(`${API_BASE}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ existingGuestId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create guest session');
  }

  const { token, guestId, isNewUser } = await response.json();

  // Sign in to InstantDB
  await db.auth.signInWithToken(token);

  // Store guest ID for persistence
  await AsyncStorage.setItem(GUEST_ID_KEY, guestId);

  // Store auth state (include token for session restore on restart)
  const authState: AuthState = {
    isAuthenticated: true,
    authId: guestId,
    authType: 'guest',
    walletAddress: null,
    isNewUser,
    customToken: token,
  };
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  setAuthToken(token);

  return authState;
}

/**
 * Sign in as a guest with no network — used as an offline fallback for
 * empty-handed runs when /api/auth/guest is unreachable.
 *
 * Reuses any previously stored guest id; otherwise mints a local one. There is
 * no InstantDB session (no customToken), so backend-synced features are
 * unavailable for the offline session — gameplay is fully client-authoritative.
 */
export async function signInAsGuestLocal(): Promise<AuthState> {
  let guestId = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = `guest-offline-${randomHex()}`;
    await AsyncStorage.setItem(GUEST_ID_KEY, guestId);
  }

  const authState: AuthState = {
    isAuthenticated: true,
    authId: guestId,
    authType: 'guest',
    walletAddress: null,
    isNewUser: true,
    // No customToken — offline, so there is no InstantDB session to restore.
  };
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  // Explicitly clear — an offline-local guest must never send a stale/prior
  // session's token on subsequent requests.
  setAuthToken(null);

  return authState;
}

/**
 * Link a wallet to an existing guest account
 */
export async function linkWalletToGuest(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<{ merged: boolean }> {
  const guestId = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    throw new Error('No guest account to link');
  }

  // Full signature verification flow (required)
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const message = `Link wallet to Die Forward\nNonce: ${nonce}`;
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await signMessage(messageBytes);
  const signature = bs58.encode(signatureBytes);

  // Send to backend
  const response = await fetch(`${API_BASE}/api/auth/link-wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guestAuthId: guestId, walletAddress, signature, message }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to link wallet');
  }

  const { token, merged } = await response.json();

  // Sign in with new wallet token
  await db.auth.signInWithToken(token);

  // Update auth state (include token for session restore on restart)
  const authState: AuthState = {
    isAuthenticated: true,
    authId: walletAddress,
    authType: 'wallet',
    walletAddress,
    isNewUser: false,
    customToken: token,
  };
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  setAuthToken(token);

  // Clear guest ID since we're now a wallet user
  await AsyncStorage.removeItem(GUEST_ID_KEY);

  return { merged };
}

/**
 * Get stored auth state
 *
 * Also re-syncs the in-memory auth token registry (see setAuthToken) to match
 * what's persisted. This matters on a normal app restart: GameContext skips
 * re-calling signInWithToken for wallet sessions (InstantDB already persists
 * its own session), so this is the only place that token would otherwise get
 * loaded back into memory for api.ts to read.
 */
export async function getStoredAuthState(): Promise<AuthState | null> {
  const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) {
    setAuthToken(null);
    return null;
  }

  try {
    const authState = JSON.parse(stored) as AuthState;
    setAuthToken(authState.customToken ?? null);
    return authState;
  } catch {
    setAuthToken(null);
    return null;
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await db.auth.signOut();
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  // Keep guest ID so they can recover their account if they sign back in as guest
  setAuthToken(null);
}

/**
 * Check if user is a guest that can upgrade to wallet
 */
export async function canUpgradeToWallet(): Promise<boolean> {
  const authState = await getStoredAuthState();
  return authState?.authType === 'guest';
}

/**
 * Restore an existing InstantDB session using a stored custom token.
 * Returns true if successful, false if the token is expired or invalid.
 * Used on app restart to avoid requiring wallet re-sign every time.
 */
export async function restoreInstantDBSession(customToken: string): Promise<boolean> {
  try {
    await db.auth.signInWithToken(customToken);
    setAuthToken(customToken);
    return true;
  } catch {
    // Expired/invalid token — do not leave a stale token in the registry.
    setAuthToken(null);
    return false;
  }
}

// ── Email auth stubs (future use) ────────────────────────────────────────────

/**
 * Send a magic code to the given email address.
 */
export async function sendMagicCode(email: string): Promise<void> {
  await db.auth.sendMagicCode({ email });
}

/**
 * Verify a magic code and sign in.
 */
export async function verifyMagicCode(email: string, code: string): Promise<AuthState> {
  await db.auth.signInWithMagicCode({ email, code });
  const authState: AuthState = {
    isAuthenticated: true,
    authId: email,
    authType: 'email',
    walletAddress: null,
    isNewUser: false,
  };
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  return authState;
}
