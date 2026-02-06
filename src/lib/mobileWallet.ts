import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { 
  Connection, 
  PublicKey, 
  Transaction,
} from '@solana/web3.js';
import base58 from 'bs58';
import { getCachedAuth, setCachedAuth } from './mwaAuthCache';

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: typeof window !== 'undefined' ? window.location.origin : 'https://die-forward.vercel.app',
  icon: '/favicon.ico',
};

// Helper to decode address (handles base64 from MWA)
function decodeAddress(addressRaw: string | Uint8Array, log: (msg: string) => void): PublicKey {
  if (typeof addressRaw === 'object' && addressRaw !== null && 'byteLength' in addressRaw) {
    return new PublicKey(addressRaw as Uint8Array);
  } else if (typeof addressRaw === 'string') {
    if (addressRaw.includes('+') || addressRaw.includes('/') || addressRaw.endsWith('=')) {
      log('Decoding base64 address...');
      const bytes = Uint8Array.from(atob(addressRaw), c => c.charCodeAt(0));
      return new PublicKey(bytes);
    } else {
      return new PublicKey(addressRaw);
    }
  }
  throw new Error(`Unknown address format: ${typeof addressRaw}`);
}

export async function signAndSendWithMWA(
  transaction: Transaction,
  connection: Connection,
  onLog?: (msg: string) => void
): Promise<string> {
  const log = onLog || console.log;
  
  log('Using MWA transact()...');
  
  const result = await transact(async (wallet) => {
    log('MWA session started');
    
    // Check for cached auth token
    log('Checking for cached auth...');
    const cached = getCachedAuth(log);
    let pubkey: PublicKey;
    let authToken: string;
    
    if (cached) {
      // Try to reauthorize with cached token (no user popup)
      log(`Found cached auth, trying reauthorize...`);
      try {
        const reAuthResult = await wallet.reauthorize({
          auth_token: cached.authToken,
          identity: APP_IDENTITY,
        });
        authToken = reAuthResult.auth_token;
        const addressRaw = reAuthResult.accounts[0]?.address as Uint8Array | string;
        pubkey = decodeAddress(addressRaw, log);
        log(`Reauthorized: ${pubkey.toBase58().slice(0, 8)}...`);
        
        // Update cache with new token
        setCachedAuth(authToken, pubkey.toBase58());
      } catch (reAuthErr) {
        const errMsg = reAuthErr instanceof Error ? reAuthErr.message : String(reAuthErr);
        log(`Reauthorize failed: ${errMsg}, falling back to authorize...`);
        
        // Fall back to full authorize
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: APP_IDENTITY,
        });
        authToken = authResult.auth_token;
        const addressRaw = authResult.accounts[0]?.address as Uint8Array | string;
        pubkey = decodeAddress(addressRaw, log);
        log(`Authorized (fresh): ${pubkey.toBase58().slice(0, 8)}...`);
        
        // Cache the new token
        setCachedAuth(authToken, pubkey.toBase58());
      }
    } else {
      // No cache, do full authorize
      log('No cached auth, authorizing...');
      const authResult = await wallet.authorize({
        cluster: 'devnet',
        identity: APP_IDENTITY,
      });
      authToken = authResult.auth_token;
      const addressRaw = authResult.accounts[0]?.address as Uint8Array | string;
      pubkey = decodeAddress(addressRaw, log);
      log(`Authorized: ${pubkey.toBase58().slice(0, 8)}...`);
      
      // Cache the token for next time
      setCachedAuth(authToken, pubkey.toBase58());
    }
    
    // Get fresh blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = pubkey;
    
    log('Requesting signature...');
    
    // Sign and send
    const signatures = await wallet.signAndSendTransactions({
      transactions: [transaction],
    });
    
    // Signature can also be Uint8Array
    const sigRaw = signatures[0] as Uint8Array | string;
    let sigString: string;
    
    if (typeof sigRaw === 'object' && sigRaw !== null && 'byteLength' in sigRaw) {
      sigString = base58.encode(sigRaw as Uint8Array);
    } else {
      sigString = sigRaw as string;
    }
    
    log(`Got signature: ${sigString.slice(0, 20)}...`);
    
    return sigString;
  });
  
  if (!result) {
    throw new Error('MWA transaction failed - no signature returned');
  }
  
  return result;
}

// Detect if we should use MWA (Android Chrome, not in-app browser)
export function shouldUseMWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = ua.includes('android');
  const isChrome = ua.includes('chrome') && !ua.includes('edg');
  
  // Check if we're in a wallet's in-app browser (they inject window.solana)
  const hasInjectedWallet = !!(window as unknown as { solana?: unknown }).solana;
  
  return isAndroid && isChrome && !hasInjectedWallet;
}

// Cache auth token when user connects via MWA (call from title screen)
export async function cacheAuthOnConnect(onLog?: (msg: string) => void): Promise<void> {
  const log = onLog || console.log;
  
  // Skip if already cached
  const existing = getCachedAuth();
  if (existing) {
    log('Auth already cached');
    return;
  }
  
  log('Caching auth for future transactions...');
  
  await transact(async (wallet) => {
    const authResult = await wallet.authorize({
      cluster: 'devnet',
      identity: APP_IDENTITY,
    });
    
    const addressRaw = authResult.accounts[0]?.address as Uint8Array | string;
    const pubkey = decodeAddress(addressRaw, log);
    
    setCachedAuth(authResult.auth_token, pubkey.toBase58());
    log(`Auth cached for ${pubkey.toBase58().slice(0, 8)}...`);
  });
}
