import 'react-native-get-random-values';
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import base58 from 'bs58';
import { decode as base64Decode } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: 'https://die-forward.vercel.app',
  icon: 'favicon.ico', // Relative to uri
};

const AUTH_CACHE_KEY = 'mwa_auth_cache';
const CLUSTER = 'devnet';

// Connection to Solana
export const connection = new Connection(
  process.env.EXPO_PUBLIC_SOLANA_RPC || clusterApiUrl(CLUSTER),
  'confirmed'
);

interface CachedAuth {
  authToken: string;
  walletAddress: string;
  timestamp: number;
}

// Cache helpers
async function getCachedAuth(): Promise<CachedAuth | null> {
  try {
    const cached = await AsyncStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedAuth = JSON.parse(cached);
    // Cache expires after 24 hours
    if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function setCachedAuth(authToken: string, walletAddress: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
    authToken,
    walletAddress,
    timestamp: Date.now(),
  }));
}

export async function clearAuthCache(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_CACHE_KEY);
}

// Helper to decode address from MWA response
function decodeAddress(addressRaw: string | Uint8Array): PublicKey {
  if (typeof addressRaw === 'object' && 'length' in addressRaw) {
    return new PublicKey(addressRaw as Uint8Array);
  } else if (typeof addressRaw === 'string') {
    // Check if base64 encoded
    if (addressRaw.includes('+') || addressRaw.includes('/') || addressRaw.endsWith('=')) {
      const bytes = Uint8Array.from(base64Decode(addressRaw), (c: string) => c.charCodeAt(0));
      return new PublicKey(bytes);
    }
    return new PublicKey(addressRaw);
  }
  throw new Error(`Unknown address format: ${typeof addressRaw}`);
}

// Connect wallet and get address
export async function connectWallet(): Promise<{ address: string; authToken: string }> {
  // Check cache first
  const cached = await getCachedAuth();
  
  const result = await transact(async (wallet: Web3MobileWallet) => {
    let authToken: string;
    let pubkey: PublicKey;
    
    if (cached) {
      // Try reauthorize
      try {
        const reAuthResult = await wallet.reauthorize({
          auth_token: cached.authToken,
          identity: APP_IDENTITY,
        });
        authToken = reAuthResult.auth_token;
        pubkey = decodeAddress(reAuthResult.accounts[0]?.address);
      } catch {
        // Fall back to full authorize
        const authResult = await wallet.authorize({
          cluster: CLUSTER,
          identity: APP_IDENTITY,
        });
        authToken = authResult.auth_token;
        pubkey = decodeAddress(authResult.accounts[0]?.address);
      }
    } else {
      // Full authorize
      const authResult = await wallet.authorize({
        cluster: CLUSTER,
        identity: APP_IDENTITY,
      });
      authToken = authResult.auth_token;
      pubkey = decodeAddress(authResult.accounts[0]?.address);
    }
    
    // Update cache
    await setCachedAuth(authToken, pubkey.toBase58());
    
    return {
      address: pubkey.toBase58(),
      authToken,
    };
  });
  
  return result;
}

// Get wallet balance
export async function getBalance(address: string): Promise<number> {
  const pubkey = new PublicKey(address);
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

// Create and sign a stake transaction
export async function stakeSOL(
  amount: number,
  treasuryAddress: string = 'E4LRRyeFXDbFg1WaS1pjKm5DAJzJDWbAs1v5qvqe5xYM' // Game pool PDA
): Promise<{ signature: string; walletAddress: string }> {
  const cached = await getCachedAuth();
  if (!cached) {
    throw new Error('Wallet not connected');
  }
  
  const result = await transact(async (wallet: Web3MobileWallet) => {
    // Reauthorize
    let authToken: string;
    let pubkey: PublicKey;
    
    try {
      const reAuthResult = await wallet.reauthorize({
        auth_token: cached.authToken,
        identity: APP_IDENTITY,
      });
      authToken = reAuthResult.auth_token;
      pubkey = decodeAddress(reAuthResult.accounts[0]?.address);
    } catch {
      const authResult = await wallet.authorize({
        cluster: CLUSTER,
        identity: APP_IDENTITY,
      });
      authToken = authResult.auth_token;
      pubkey = decodeAddress(authResult.accounts[0]?.address);
    }
    
    // Create stake transaction
    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: pubkey,
        toPubkey: new PublicKey(treasuryAddress),
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = pubkey;
    
    // Sign and send
    const signatures = await wallet.signAndSendTransactions({
      transactions: [transaction],
    });
    
    const sigRaw = signatures[0];
    const signature = typeof sigRaw === 'object' && 'length' in sigRaw
      ? base58.encode(sigRaw as Uint8Array) 
      : sigRaw as string;
    
    // Update cache
    await setCachedAuth(authToken, pubkey.toBase58());
    
    return {
      signature,
      walletAddress: pubkey.toBase58(),
    };
  });
  
  return result;
}

// Send a tip to a corpse creator
export async function sendTip(
  recipientAddress: string,
  amountSOL: number
): Promise<{ signature: string; walletAddress: string }> {
  const cached = await getCachedAuth();
  if (!cached) {
    throw new Error('Wallet not connected');
  }
  
  const result = await transact(async (wallet: Web3MobileWallet) => {
    // Reauthorize
    let authToken: string;
    let pubkey: PublicKey;
    
    try {
      const reAuthResult = await wallet.reauthorize({
        auth_token: cached.authToken,
        identity: APP_IDENTITY,
      });
      authToken = reAuthResult.auth_token;
      pubkey = decodeAddress(reAuthResult.accounts[0]?.address);
    } catch {
      const authResult = await wallet.authorize({
        cluster: CLUSTER,
        identity: APP_IDENTITY,
      });
      authToken = authResult.auth_token;
      pubkey = decodeAddress(authResult.accounts[0]?.address);
    }
    
    // Create tip transaction
    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: pubkey,
        toPubkey: new PublicKey(recipientAddress),
        lamports: amountSOL * LAMPORTS_PER_SOL,
      })
    );
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = pubkey;
    
    // Sign and send
    const signatures = await wallet.signAndSendTransactions({
      transactions: [transaction],
    });
    
    const sigRaw = signatures[0];
    const signature = typeof sigRaw === 'object' && 'length' in sigRaw
      ? base58.encode(sigRaw as Uint8Array) 
      : sigRaw as string;
    
    // Update cache
    await setCachedAuth(authToken, pubkey.toBase58());
    
    return {
      signature,
      walletAddress: pubkey.toBase58(),
    };
  });
  
  return result;
}

// Sign a generic transaction
export async function signAndSendTransaction(
  transaction: Transaction
): Promise<string> {
  const cached = await getCachedAuth();
  if (!cached) {
    throw new Error('Wallet not connected');
  }
  
  const result = await transact(async (wallet: Web3MobileWallet) => {
    // Reauthorize
    const reAuthResult = await wallet.reauthorize({
      auth_token: cached.authToken,
      identity: APP_IDENTITY,
    });
    const pubkey = decodeAddress(reAuthResult.accounts[0]?.address);
    
    // Set transaction params
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = pubkey;
    
    // Sign and send
    const signatures = await wallet.signAndSendTransactions({
      transactions: [transaction],
    });
    
    const sigRaw = signatures[0];
    return typeof sigRaw === 'object' && 'length' in sigRaw
      ? base58.encode(sigRaw as Uint8Array) 
      : sigRaw as string;
  });
  
  return result;
}
