/**
 * Mobile Web Wallet Adapter
 * 
 * Uses two approaches:
 * 1. SolanaMobileWalletAdapter for connect (wallet picker)
 * 2. transact() from protocol-web3js for signing (atomic session)
 * 
 * This fixes the "session lost on redirect" issue on mobile Chrome.
 */

import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import base58 from 'bs58';
import type { Address } from '@solana/kit';

const CLUSTER = 'devnet';
const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const AUTH_CACHE_KEY = 'die-forward-mwa-auth';

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: 'https://dieforward.com',
  icon: 'favicon.ico',
};

// Auth cache for reauthorization
interface CachedAuth {
  authToken: string;
  publicKey: string;
}

function getCachedAuth(): CachedAuth | null {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore
  }
  return null;
}

function setCachedAuth(authToken: string, publicKey: string): void {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ authToken, publicKey }));
    console.log('[MWA] Auth cached for', publicKey.slice(0, 8) + '...');
  } catch {
    // Ignore
  }
}

function clearCachedAuth(): void {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
    console.log('[MWA] Auth cache cleared');
  } catch {
    // Ignore
  }
}

// Helper to decode address (handles base64 from MWA)
function decodeAddress(addressRaw: string | Uint8Array): string {
  if (typeof addressRaw === 'object' && addressRaw !== null && 'byteLength' in addressRaw) {
    return new PublicKey(addressRaw as Uint8Array).toBase58();
  } else if (typeof addressRaw === 'string') {
    // Check if base64 encoded
    if (addressRaw.includes('+') || addressRaw.includes('/') || addressRaw.endsWith('=')) {
      const bytes = Uint8Array.from(atob(addressRaw), c => c.charCodeAt(0));
      return new PublicKey(bytes).toBase58();
    }
    return addressRaw;
  }
  throw new Error(`Unknown address format: ${typeof addressRaw}`);
}

// Connection for RPC calls
export const mobileWebConnection = new Connection(RPC_ENDPOINT, 'confirmed');

/**
 * Connect via the mobile wallet adapter (uses OS wallet picker)
 * This caches the auth token for later use with transact()
 */
export async function mobileWebConnect(): Promise<{ address: Address } | null> {
  console.log('[MWA] Starting connect...');
  
  // Use transact() for connect too, to get proper auth token
  const result = await transact(async (wallet) => {
    console.log('[MWA] Connect session started, authorizing...');
    
    const authResult = await wallet.authorize({
      cluster: CLUSTER,
      identity: APP_IDENTITY,
    });
    
    const addressRaw = authResult.accounts[0]?.address;
    const address = decodeAddress(addressRaw as string | Uint8Array);
    
    // Cache the auth token for later signing
    setCachedAuth(authResult.auth_token, address);
    
    console.log('[MWA] Connected:', address.slice(0, 8) + '...');
    return { address: address as Address };
  });
  
  return result;
}

/**
 * Disconnect and clear cached auth
 */
export async function mobileWebDisconnect(): Promise<void> {
  clearCachedAuth();
}

/**
 * Clear all cached wallet state (for error recovery)
 */
export function clearMobileWebCache(): void {
  clearCachedAuth();
}

/**
 * Check if connected (based on cached auth)
 */
export function isMobileWebConnected(): boolean {
  const cached = getCachedAuth();
  return !!cached?.publicKey;
}

/**
 * Get connected address (from cache)
 */
export function getMobileWebAddress(): Address | null {
  const cached = getCachedAuth();
  return cached?.publicKey as Address | null;
}

/**
 * Sign and send a transaction using transact() for atomic session
 * This ensures authorization and signing happen in one wallet interaction
 */
export async function mobileWebSignAndSend(tx: Transaction): Promise<string> {
  const cached = getCachedAuth();
  
  if (!cached?.publicKey) {
    throw new Error('Wallet not connected - please connect your wallet first');
  }
  
  console.log('[MWA] Starting transact() for signing...');
  console.log('[MWA] Cached auth for:', cached.publicKey.slice(0, 8) + '...');
  
  const signature = await transact(async (wallet) => {
    console.log('[MWA] Session started, attempting reauthorize...');
    
    let pubkey: PublicKey;
    let authToken: string;
    
    // Try reauthorize first (uses cached token, no popup if valid)
    if (cached.authToken) {
      try {
        const reAuthResult = await wallet.reauthorize({
          auth_token: cached.authToken,
          identity: APP_IDENTITY,
        });
        authToken = reAuthResult.auth_token;
        const addressRaw = reAuthResult.accounts[0]?.address;
        pubkey = new PublicKey(decodeAddress(addressRaw as string | Uint8Array));
        console.log('[MWA] Reauthorized:', pubkey.toBase58().slice(0, 8) + '...');
        
        // Update cache with new token
        setCachedAuth(authToken, pubkey.toBase58());
      } catch (reAuthErr) {
        console.log('[MWA] Reauthorize failed, trying fresh authorize...');
        
        // Fall back to full authorize
        const authResult = await wallet.authorize({
          cluster: CLUSTER,
          identity: APP_IDENTITY,
        });
        authToken = authResult.auth_token;
        const addressRaw = authResult.accounts[0]?.address;
        pubkey = new PublicKey(decodeAddress(addressRaw as string | Uint8Array));
        console.log('[MWA] Fresh authorize:', pubkey.toBase58().slice(0, 8) + '...');
        
        // Cache the new token
        setCachedAuth(authToken, pubkey.toBase58());
      }
    } else {
      // No cached token, do full authorize
      console.log('[MWA] No cached token, authorizing...');
      const authResult = await wallet.authorize({
        cluster: CLUSTER,
        identity: APP_IDENTITY,
      });
      authToken = authResult.auth_token;
      const addressRaw = authResult.accounts[0]?.address;
      pubkey = new PublicKey(decodeAddress(addressRaw as string | Uint8Array));
      console.log('[MWA] Authorized:', pubkey.toBase58().slice(0, 8) + '...');
      
      setCachedAuth(authToken, pubkey.toBase58());
    }
    
    // Get fresh blockhash and set fee payer
    const { blockhash } = await mobileWebConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = pubkey;
    
    console.log('[MWA] Requesting signature...');
    
    // Sign and send in the same session
    const signatures = await wallet.signAndSendTransactions({
      transactions: [tx],
    });
    
    // Decode signature
    const sigRaw = signatures[0];
    let sigString: string;
    
    if (typeof sigRaw === 'object' && sigRaw !== null && 'byteLength' in sigRaw) {
      sigString = base58.encode(sigRaw as Uint8Array);
    } else {
      sigString = sigRaw as string;
    }
    
    console.log('[MWA] Got signature:', sigString.slice(0, 20) + '...');
    return sigString;
  });
  
  if (!signature) {
    throw new Error('Transaction failed - no signature returned');
  }
  
  return signature;
}

/**
 * Get balance for an address
 */
export async function getMobileWebBalance(address: Address): Promise<number> {
  const pubkey = new PublicKey(address);
  const lamports = await mobileWebConnection.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

// getMobileWebAdapter removed - using transact() directly now
