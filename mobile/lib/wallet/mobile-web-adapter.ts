/**
 * Mobile Web Wallet Adapter
 * 
 * Uses @solana-mobile/wallet-adapter-mobile for proper wallet selection
 * on Android Chrome (uses OS intent picker, not hardcoded Phantom)
 */

import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { Address } from '@solana/kit';

const CLUSTER = 'devnet';
const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: 'https://dieforward.com',
  icon: 'favicon.ico',
};

// Singleton adapter instance
let adapterInstance: SolanaMobileWalletAdapter | null = null;

function getAdapter(): SolanaMobileWalletAdapter {
  if (!adapterInstance) {
    adapterInstance = new SolanaMobileWalletAdapter({
      addressSelector: createDefaultAddressSelector(),
      appIdentity: APP_IDENTITY,
      authorizationResultCache: createDefaultAuthorizationResultCache(),
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
 */
export async function mobileWebConnect(): Promise<{ address: Address }> {
  const adapter = getAdapter();
  
  await adapter.connect();
  
  if (!adapter.publicKey) {
    throw new Error('No wallet connected');
  }
  
  return {
    address: adapter.publicKey.toBase58() as Address,
  };
}

/**
 * Disconnect
 */
export async function mobileWebDisconnect(): Promise<void> {
  const adapter = getAdapter();
  await adapter.disconnect();
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
 */
export async function mobileWebSignAndSend(tx: Transaction): Promise<string> {
  const adapter = getAdapter();
  
  if (!adapter.connected || !adapter.publicKey) {
    throw new Error('Wallet not connected');
  }
  
  // Ensure blockhash and fee payer
  if (!tx.recentBlockhash) {
    const { blockhash } = await mobileWebConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
  }
  tx.feePayer = adapter.publicKey;
  
  const signature = await adapter.sendTransaction(tx, mobileWebConnection);
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

/**
 * Get the adapter instance (for direct access if needed)
 */
export function getMobileWebAdapter(): SolanaMobileWalletAdapter {
  return getAdapter();
}
