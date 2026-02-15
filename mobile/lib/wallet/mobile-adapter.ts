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
