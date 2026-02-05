import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { 
  Connection, 
  PublicKey, 
  Transaction,
} from '@solana/web3.js';

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
    log(`Authorized: ${authResult.accounts[0]?.address?.slice(0, 8)}...`);
    
    // Get fresh blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(authResult.accounts[0].address);
    
    log('Requesting signature...');
    
    // Sign and send
    const signatures = await wallet.signAndSendTransactions({
      transactions: [transaction],
    });
    
    log(`Got signature: ${signatures[0]?.slice(0, 20)}...`);
    
    return signatures[0];
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
