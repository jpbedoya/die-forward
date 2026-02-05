import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { 
  Connection, 
  PublicKey, 
  Transaction,
} from '@solana/web3.js';
import base58 from 'bs58';

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: typeof window !== 'undefined' ? window.location.origin : 'https://die-forward.vercel.app',
  icon: '/favicon.ico',
};

export async function signAndSendWithMWA(
  transaction: Transaction,
  connection: Connection,
  onLog?: (msg: string) => void
): Promise<string> {
  const log = onLog || console.log;
  
  log('Using MWA transact()...');
  
  const result = await transact(async (wallet) => {
    log('MWA session started');
    
    // Authorize if needed
    const authResult = await wallet.authorize({
      cluster: 'devnet',
      identity: APP_IDENTITY,
    });
    
    // Address can be Uint8Array or base58 string
    const addressRaw = authResult.accounts[0]?.address as Uint8Array | string;
    let pubkey: PublicKey;
    
    if (typeof addressRaw === 'object' && addressRaw !== null && 'byteLength' in addressRaw) {
      // It's a Uint8Array or similar
      pubkey = new PublicKey(addressRaw as Uint8Array);
      log(`Authorized (bytes): ${pubkey.toBase58().slice(0, 8)}...`);
    } else if (typeof addressRaw === 'string') {
      pubkey = new PublicKey(addressRaw);
      log(`Authorized (string): ${addressRaw.slice(0, 8)}...`);
    } else {
      throw new Error(`Unknown address format: ${typeof addressRaw}`);
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
