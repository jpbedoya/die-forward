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
import { fromUint8Array } from 'js-base64';

const CLUSTER = 'devnet';
const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC || clusterApiUrl(CLUSTER);

// Connection for mobile (web3.js)
export const mobileConnection = new Connection(RPC_ENDPOINT, 'confirmed');

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: 'https://dieforward.com',
  icon: 'favicon.ico',
};

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
    const authResult = await wallet.authorize({
      cluster: CLUSTER,
      identity: APP_IDENTITY,
    });
    const pubkey = new PublicKey(authResult.accounts[0]?.address);
    return {
      address: pubkey.toBase58() as Address,
      authToken: authResult.auth_token,
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
    const reAuthResult = await wallet.reauthorize({
      auth_token: authToken,
      identity: APP_IDENTITY,
    });
    const pubkey = new PublicKey(reAuthResult.accounts[0]?.address);
    
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

function toBase64Address(address: string | Uint8Array): string {
  if (typeof address === 'string') {
    // If already base64, keep it. Otherwise assume base58 public key string.
    const looksBase64 = address.includes('+') || address.includes('/') || address.endsWith('=');
    if (looksBase64) return address;
    return fromUint8Array(new PublicKey(address).toBytes());
  }
  return fromUint8Array(address);
}

/**
 * Sign arbitrary message via MWA (used for wallet auth challenge signing)
 */
export async function mobileSignMessage(
  message: Uint8Array,
  authToken: string,
): Promise<Uint8Array> {
  return await transact(async (wallet: Web3MobileWallet) => {
    const reAuthResult = await wallet.reauthorize({
      auth_token: authToken,
      identity: APP_IDENTITY,
    });

    const addressRaw = reAuthResult.accounts[0]?.address as string | Uint8Array;
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
