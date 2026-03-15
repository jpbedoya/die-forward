/**
 * Mobile Wallet Adapter boundary
 * 
 * Uses @solana-mobile/mobile-wallet-adapter-protocol-web3js for native mobile.
 * This is a web3.js boundary - conversions happen at the edges.
 */

import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey, Transaction, Connection, clusterApiUrl, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import type { Address } from '@solana/kit';
import bs58 from 'bs58';
import { fromUint8Array, toUint8Array } from 'js-base64';

const LEGACY_CLUSTER: 'devnet' = 'devnet';
const CHAIN = 'solana:devnet';
const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC || clusterApiUrl(LEGACY_CLUSTER);

// Connection for mobile (web3.js)
export const mobileConnection = new Connection(RPC_ENDPOINT, 'confirmed');

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: 'https://dieforward.com',
  icon: 'favicon.ico',
};

async function authorizeWithTokenFallback(wallet: Web3MobileWallet, authToken?: string) {
  if (authToken) {
    // Preferred MWA 2.0 path
    try {
      return await wallet.authorize({
        identity: APP_IDENTITY,
        chain: CHAIN,
        auth_token: authToken,
      });
    } catch {
      // Compatibility path for wallets that still prefer explicit reauthorize.
      try {
        return await wallet.reauthorize({
          auth_token: authToken,
          identity: APP_IDENTITY,
        });
      } catch {
        // fall through to fresh auth
      }
    }
  }

  // Fresh auth: try MWA 2.0 chain first, then legacy cluster for compatibility.
  try {
    return await wallet.authorize({
      identity: APP_IDENTITY,
      chain: CHAIN,
    });
  } catch {
    return await wallet.authorize({
      identity: APP_IDENTITY,
      cluster: LEGACY_CLUSTER,
    });
  }
}

export interface MobileWalletState {
  connected: boolean;
  address: Address | null;
  authToken: string | null;
}

/**
 * Connect to mobile wallet via MWA
 */
export async function mobileConnect(): Promise<{ address: Address; authToken: string }> {
  const result = await transact(async (wallet: Web3MobileWallet) => {
    const authResult = await authorizeWithTokenFallback(wallet);
    const pubkey = toPublicKey(authResult.accounts[0]?.address as string | Uint8Array);
    const authToken = authResult.auth_token;
    if (!authToken) {
      throw new Error('MWA authorize returned no auth token');
    }
    return {
      address: pubkey.toBase58() as Address,
      authToken,
    };
  });

  return result;
}

/**
 * Sign and send a transaction via MWA
 */
export async function mobileSignAndSend(
  tx: Transaction,
  authToken: string
): Promise<string> {
  return await transact(async (wallet: Web3MobileWallet) => {
    const authResult = await authorizeWithTokenFallback(wallet, authToken);
    const pubkey = toPublicKey(authResult.accounts[0]?.address as string | Uint8Array);

    const { blockhash } = await mobileConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = pubkey;

    const signatures = await wallet.signAndSendTransactions({
      transactions: [tx],
    });

    const sigRaw = signatures[0];
    return typeof sigRaw === 'object' && 'length' in sigRaw
      ? bs58.encode(sigRaw as Uint8Array)
      : sigRaw as string;
  });
}

function toPublicKey(address: string | Uint8Array): PublicKey {
  if (address instanceof Uint8Array) return new PublicKey(address);

  // MWA accounts[].address is base64 per protocol, but some stacks may hand back base58.
  // Try base64 decode first, then fall back to base58 string parsing.
  try {
    return new PublicKey(toUint8Array(address));
  } catch {
    return new PublicKey(address);
  }
}

function toBase64Address(address: string | Uint8Array): string {
  if (address instanceof Uint8Array) return fromUint8Array(address);

  // If already base64, keep it; otherwise convert base58 -> bytes -> base64.
  try {
    toUint8Array(address);
    return address;
  } catch {
    return fromUint8Array(new PublicKey(address).toBytes());
  }
}

/**
 * Sign arbitrary message via MWA (used for wallet auth challenge signing)
 */
export async function mobileSignMessage(
  message: Uint8Array,
  authToken: string,
): Promise<Uint8Array> {
  return await transact(async (wallet: Web3MobileWallet) => {
    const authResult = await authorizeWithTokenFallback(wallet, authToken);

    const addressRaw = authResult.accounts[0]?.address as string | Uint8Array;
    const addressBase64 = toBase64Address(addressRaw);

    const signed = await wallet.signMessages({
      addresses: [addressBase64],
      payloads: [message],
    });

    if (!signed[0]) throw new Error('No signature returned from wallet');
    return signed[0];
  });
}

/**
 * Send SOL via MWA (convenience wrapper)
 */
export async function mobileSendSOL(
  fromAddress: Address,
  toAddress: Address,
  amountSOL: number,
  authToken: string
): Promise<string> {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(fromAddress),
      toPubkey: new PublicKey(toAddress),
      lamports: amountSOL * LAMPORTS_PER_SOL,
    })
  );
  
  return await mobileSignAndSend(tx, authToken);
}

/**
 * Get balance for an address
 */
export async function getMobileBalance(address: Address): Promise<number> {
  const pubkey = new PublicKey(address);
  const lamports = await mobileConnection.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}
