# Mobile Wallet Adapter Integration

## Overview

Die Forward supports Solana Mobile Wallet Adapter (MWA) for Android devices, including the Solana Seeker phone. This document covers the implementation details and lessons learned.

## The Challenge

Mobile wallet integration differs significantly from desktop:

| Desktop | Mobile (MWA) |
|---------|--------------|
| Browser extension injects `window.solana` | Wallet is separate app |
| Persistent connection | Session-based (opens/closes) |
| `signTransaction()` works directly | Requires `transact()` protocol |
| One approval to connect | Each session needs auth |

## Solution Architecture

### 1. Wallet Adapter Setup

```typescript
// src/components/WalletProvider.tsx
import { SolanaMobileWalletAdapter } from '@solana-mobile/wallet-adapter-mobile';

new SolanaMobileWalletAdapter({
  appIdentity: {
    name: 'Die Forward',
    uri: window.location.origin,
    icon: '/favicon.ico',
  },
  addressSelector: createDefaultAddressSelector(),
  authorizationResultCache: createDefaultAuthorizationResultCache(),
  cluster: 'devnet',
  onWalletNotFound: async () => {
    console.log('Mobile wallet not found');
  },
})
```

### 2. Transaction Handling

The standard `sendTransaction()` doesn't work reliably with MWA. We use the native protocol instead:

```typescript
// src/lib/mobileWallet.ts
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

export async function signAndSendWithMWA(transaction, connection, log) {
  return await transact(async (wallet) => {
    // Check for cached auth
    const cached = getCachedAuth(log);
    
    if (cached) {
      // Reauthorize without popup
      await wallet.reauthorize({
        auth_token: cached.authToken,
        identity: APP_IDENTITY,
      });
    } else {
      // Full authorize (shows popup)
      await wallet.authorize({
        cluster: 'devnet',
        identity: APP_IDENTITY,
      });
    }
    
    // Sign and send
    const signatures = await wallet.signAndSendTransactions({
      transactions: [transaction],
    });
    
    return signatures[0];
  });
}
```

### 3. Auth Token Caching

The wallet adapter caches auth tokens in localStorage. We read from its cache:

```typescript
// src/lib/mwaAuthCache.ts
const WALLET_ADAPTER_CACHE_KEY = 'SolanaMobileWalletAdapterDefaultAuthorizationCache';

export function getCachedAuth(log) {
  const adapterCache = localStorage.getItem(WALLET_ADAPTER_CACHE_KEY);
  
  if (adapterCache) {
    const data = JSON.parse(adapterCache);
    // Flat structure: { auth_token, accounts, wallet_icon, ... }
    if (data?.auth_token) {
      return {
        authToken: data.auth_token,
        publicKey: data.accounts?.[0]?.address || '',
      };
    }
  }
  
  return null;
}
```

### 4. Address Encoding

MWA returns addresses as **base64**, not base58:

```typescript
function decodeAddress(addressRaw, log) {
  if (typeof addressRaw === 'string') {
    // Check for base64 indicators
    if (addressRaw.includes('+') || addressRaw.includes('/') || addressRaw.endsWith('=')) {
      const bytes = Uint8Array.from(atob(addressRaw), c => c.charCodeAt(0));
      return new PublicKey(bytes);
    }
    // Otherwise assume base58
    return new PublicKey(addressRaw);
  }
  // Handle Uint8Array
  return new PublicKey(addressRaw);
}
```

## Packages Required

```json
{
  "@solana-mobile/wallet-adapter-mobile": "^2.x",
  "@solana-mobile/mobile-wallet-adapter-protocol": "^2.x",
  "@solana-mobile/mobile-wallet-adapter-protocol-web3js": "^2.x"
}
```

## User Flow

### First Time
1. User taps "Connect Wallet" on title screen
2. MWA opens wallet app → user approves → returns with pubkey
3. Auth token cached in localStorage
4. User goes to stake screen, taps stake
5. MWA detects cached auth → uses `reauthorize()` (no popup)
6. Transaction approval popup only
7. Done

### Subsequent Times
- Auth already cached
- Only transaction approval needed

## Debugging Tips

### Debug Logging

Add visible debug output on the stake screen:

```typescript
const [debugLog, setDebugLog] = useState<string[]>([]);
const log = (msg) => setDebugLog(prev => [...prev, `${time}: ${msg}`]);

// Display in UI
{debugLog.map((msg, i) => <div key={i}>{msg}</div>)}
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Non-base58 character" | MWA returns base64 | Decode with `atob()` |
| "Missing signature" | Using wrong adapter method | Use `transact()` protocol |
| Double popup | Not reading adapter's cache | Check localStorage key |
| Transaction fails silently | `sendTransaction()` doesn't work | Use `signAndSendTransactions()` |

## Testing

1. Deploy to Vercel (localhost won't work with MWA)
2. Open in Chrome on Android device
3. Have Phantom/Solflare installed
4. Test connect → stake → play → die flow
5. Check debug log for issues

## References

- [Solana Mobile Docs](https://docs.solanamobile.com/)
- [Wallet Adapter Mobile](https://github.com/solana-mobile/mobile-wallet-adapter)
- [MWA Protocol](https://github.com/solana-mobile/mobile-wallet-adapter/tree/main/js/packages/mobile-wallet-adapter-protocol)
