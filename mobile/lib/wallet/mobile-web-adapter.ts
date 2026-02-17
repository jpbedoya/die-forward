/**
 * Mobile Web Wallet Adapter
 * 
 * Uses @solana-mobile/wallet-adapter-mobile for proper wallet selection
 * on Android Chrome (uses OS intent picker, not hardcoded Phantom)
 */

import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { Address } from '@solana/kit';

const CLUSTER = 'devnet';
const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const AUTH_CACHE_KEY = 'die-forward-mwa-auth';

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: 'https://dieforward.com',
  icon: 'favicon.ico',
};

// Custom auth cache that we can clear
const authCache = {
  get: async () => {
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      return cached ? JSON.parse(cached) : undefined;
    } catch {
      return undefined;
    }
  },
  set: async (auth: any) => {
    try {
      if (auth) {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(auth));
      } else {
        localStorage.removeItem(AUTH_CACHE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(AUTH_CACHE_KEY);
      console.log('[MWA] Auth cache cleared');
    } catch {
      // Ignore
    }
  },
};

// Singleton adapter instance
let adapterInstance: SolanaMobileWalletAdapter | null = null;

function getAdapter(): SolanaMobileWalletAdapter {
  if (!adapterInstance) {
    adapterInstance = new SolanaMobileWalletAdapter({
      addressSelector: createDefaultAddressSelector(),
      appIdentity: APP_IDENTITY,
      authorizationResultCache: authCache,
      chain: `solana:${CLUSTER}`,
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    });
  }
  return adapterInstance;
}

// Connection for RPC calls
export const mobileWebConnection = new Connection(RPC_ENDPOINT, 'confirmed');

/**
 * Connect via the mobile wallet adapter (uses OS wallet picker)
 * Always forces fresh auth to avoid stale session issues
 */
export async function mobileWebConnect(): Promise<{ address: Address } | null> {
  const adapter = getAdapter();
  
  // If adapter thinks it's connected but we're calling connect,
  // it's likely because of stale cache. Disconnect first.
  if (adapter.connected) {
    console.log('[MWA] Clearing stale connection before fresh connect');
    try {
      await adapter.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    authCache.clear();
  }
  
  console.log('[MWA] Calling adapter.connect()...');
  await adapter.connect();
  console.log('[MWA] adapter.connect() returned, publicKey:', adapter.publicKey?.toBase58());
  
  // On mobile web, if redirect happened, publicKey might not be set yet
  // The state will sync via event handlers when returning
  if (!adapter.publicKey) {
    console.log('[MWA] No publicKey after connect - redirect may have occurred');
    return null;
  }
  
  return {
    address: adapter.publicKey.toBase58() as Address,
  };
}

/**
 * Disconnect and clear cached auth
 */
export async function mobileWebDisconnect(): Promise<void> {
  const adapter = getAdapter();
  await adapter.disconnect();
  authCache.clear();
}

/**
 * Clear all cached wallet state (for error recovery)
 */
export function clearMobileWebCache(): void {
  authCache.clear();
  // Reset adapter instance to force fresh connection
  if (adapterInstance) {
    try {
      adapterInstance.disconnect();
    } catch {
      // Ignore
    }
    adapterInstance = null;
  }
}

/**
 * Check if connected
 */
export function isMobileWebConnected(): boolean {
  const adapter = getAdapter();
  return adapter.connected;
}

/**
 * Get connected address
 */
export function getMobileWebAddress(): Address | null {
  const adapter = getAdapter();
  return adapter.publicKey?.toBase58() as Address | null;
}

/**
 * Sign and send a transaction
 * On mobile web, we may need to reauthorize before signing
 */
export async function mobileWebSignAndSend(tx: Transaction): Promise<string> {
  const adapter = getAdapter();
  
  if (!adapter.publicKey) {
    throw new Error('Wallet not connected - please connect your wallet first');
  }
  
  // On mobile web, the session might be stale even if adapter.connected is true
  // Try to ensure we have a valid session by reconnecting if needed
  if (!adapter.connected) {
    console.log('[MWA] Adapter not connected, attempting reconnect...');
    try {
      await adapter.connect();
    } catch (e) {
      console.error('[MWA] Reconnect failed:', e);
      authCache.clear();
      throw new Error('Wallet session expired - please reconnect your wallet');
    }
  }
  
  // Ensure blockhash and fee payer
  if (!tx.recentBlockhash) {
    const { blockhash } = await mobileWebConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
  }
  tx.feePayer = adapter.publicKey;
  
  console.log('[MWA] Sending transaction with feePayer:', adapter.publicKey.toBase58());
  
  try {
    const signature = await adapter.sendTransaction(tx, mobileWebConnection);
    console.log('[MWA] Transaction sent, signature:', signature);
    return signature;
  } catch (e: any) {
    console.error('[MWA] sendTransaction failed:', e?.message || e);
    
    // If signature verification failed, the session is definitely invalid
    if (e?.message?.includes('Signature verification') || e?.message?.includes('Missing signature')) {
      console.log('[MWA] Session invalid, clearing cache');
      authCache.clear();
      adapterInstance = null;
      throw new Error('Wallet session expired - please reconnect and try again');
    }
    throw e;
  }
}

/**
 * Get balance for an address
 */
export async function getMobileWebBalance(address: Address): Promise<number> {
  const pubkey = new PublicKey(address);
  const lamports = await mobileWebConnection.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Get the adapter instance (for direct access if needed)
 */
export function getMobileWebAdapter(): SolanaMobileWalletAdapter {
  return getAdapter();
}
