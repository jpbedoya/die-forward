// MWA Auth Token Cache
// Stores authorization result for seamless re-authorization

const CACHE_KEY = 'mwa-auth-cache';

interface CachedAuth {
  authToken: string;
  publicKey: string;
  timestamp: number;
}

export function getCachedAuth(): CachedAuth | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedAuth;
    
    // Expire after 24 hours
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

export function setCachedAuth(authToken: string, publicKey: string): void {
  if (typeof window === 'undefined') return;
  
  const data: CachedAuth = {
    authToken,
    publicKey,
    timestamp: Date.now(),
  };
  
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export function clearCachedAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}
