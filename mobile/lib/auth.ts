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

// API base URL - use web app for API routes
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.dieforward.com';

export interface AuthState {
  isAuthenticated: boolean;
  authId: string | null;
  authType: 'wallet' | 'guest' | null;
  walletAddress: string | null;
  isNewUser: boolean;
}

/**
 * Sign in with a connected wallet
 * 
 * @param walletAddress - The wallet's public address
 * @param signMessage - Optional function to sign a message (for signature verification)
 */
export async function signInWithWallet(
  walletAddress: string,
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>
): Promise<AuthState> {
  let token: string;
  let isNewUser: boolean;

  if (signMessage) {
    // Full signature verification flow
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
  } else {
    // Simple auth without signature (less secure, but works without signMessage support)
    // Backend creates token directly using wallet address as ID
    const response = await fetch(`${API_BASE}/api/auth/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        walletAddress, 
        signature: 'SKIP_VERIFICATION',
        message: `Sign in to Die Forward\nNonce: ${Date.now()}-skip` 
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Wallet authentication failed');
    }

    const data = await response.json();
    token = data.token;
    isNewUser = data.isNewUser;
  }

  // Sign in to InstantDB
  await db.auth.signInWithToken(token);

  // Store auth state
  const authState: AuthState = {
    isAuthenticated: true,
    authId: walletAddress,
    authType: 'wallet',
    walletAddress,
    isNewUser,
  };
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));

  return authState;
}

/**
 * Sign in as a guest (empty handed)
 */
export async function signInAsGuest(): Promise<AuthState> {
  // Check if we have an existing guest ID
  const existingGuestId = await AsyncStorage.getItem(GUEST_ID_KEY);
  
  // Request guest token from backend
  const response = await fetch(`${API_BASE}/api/auth/guest`, {
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

  // Store auth state
  const authState: AuthState = {
    isAuthenticated: true,
    authId: guestId,
    authType: 'guest',
    walletAddress: null,
    isNewUser,
  };
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));

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

  // Create link message with nonce
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const message = `Link wallet to Die Forward\nNonce: ${nonce}`;
  const messageBytes = new TextEncoder().encode(message);

  // Request signature from wallet
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

  // Update auth state
  const authState: AuthState = {
    isAuthenticated: true,
    authId: walletAddress,
    authType: 'wallet',
    walletAddress,
    isNewUser: false,
  };
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));

  // Clear guest ID since we're now a wallet user
  await AsyncStorage.removeItem(GUEST_ID_KEY);

  return { merged };
}

/**
 * Get stored auth state
 */
export async function getStoredAuthState(): Promise<AuthState | null> {
  const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as AuthState;
  } catch {
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
}

/**
 * Check if user is a guest that can upgrade to wallet
 */
export async function canUpgradeToWallet(): Promise<boolean> {
  const authState = await getStoredAuthState();
  return authState?.authType === 'guest';
}
