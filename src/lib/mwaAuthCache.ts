// MWA Auth Token Cache
// Reads from wallet adapter's cache for seamless re-authorization

// This is the key used by @solana-mobile/wallet-adapter-mobile
const WALLET_ADAPTER_CACHE_KEY = 'SolanaMobileWalletAdapterDefaultAuthorizationCache';

interface CachedAuth {
  authToken: string;
  publicKey: string;
}

export function getCachedAuth(log?: (msg: string) => void): CachedAuth | null {
  if (typeof window === 'undefined') return null;
  
  const _log = log || console.log;
  
  try {
    // Try to read from wallet adapter's cache first
    const adapterCache = localStorage.getItem(WALLET_ADAPTER_CACHE_KEY);
    _log(`Adapter cache exists: ${!!adapterCache}`);
    
    if (adapterCache) {
      const data = JSON.parse(adapterCache);
      _log(`Cache keys: ${Object.keys(data || {}).join(', ')}`);
      _log(`Has authorizationResult: ${!!data?.authorizationResult}`);
      _log(`Has auth_token: ${!!data?.authorizationResult?.auth_token}`);
      
      // The adapter stores: { authorizationResult: { auth_token, accounts, ... } }
      if (data?.authorizationResult?.auth_token) {
        const authResult = data.authorizationResult;
        return {
          authToken: authResult.auth_token,
          publicKey: authResult.accounts?.[0]?.address || '',
        };
      }
    }
    
    return null;
  } catch (e) {
    _log(`Failed to read MWA cache: ${e}`);
    return null;
  }
}

export function setCachedAuth(authToken: string, publicKey: string): void {
  // We don't need to set - the wallet adapter handles this
  // But we could update its cache if needed
  console.log('Auth token cached by wallet adapter');
}

export function clearCachedAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WALLET_ADAPTER_CACHE_KEY);
}
