# Mobile Wallet — Unified Codebase

## Scope

This document describes the **current unified app wallet architecture** (Expo mobile + web).

If you need the old web-MWA notes, see:
- `docs/archive/MOBILE_WALLET_WEB_LEGACY.md`

---

## Platform Routing

`lib/wallet/unified.tsx` is the single entry point and routes by platform:

- **Desktop web** (`Platform.OS === 'web'` and not mobile web)
  - Uses `@solana/react-hooks` + web wallet flow
- **Native mobile** (iOS/Android)
  - Uses `MWAWalletProvider` from `lib/wallet/mwa-provider.tsx`
  - Backed by `@wallet-ui/react-native-web3js`
- **Mobile web browser**
  - Uses `mobile-web-adapter` deep-link flow

---

## Native Android/iOS (MWA)

### Provider Chain

```
UnifiedWalletProvider
  -> MWAWalletProvider
    -> WalletUIProvider (@wallet-ui/react-native-web3js)
      -> MobileWalletConsumer
        -> UnifiedWalletContext.Provider
```

### Critical Context Rule

`mwa-provider.tsx` **must** provide values to the exported `UnifiedWalletContext` from `unified.tsx`.

A previous bug created a private context in `mwa-provider`, which made `connect` a no-op in game screens. This is fixed.

### Required Context Fields

Native context value must include:
- `connected`
- `connecting`
- `address`
- `balance`
- `connect`
- `connectTo` (alias to `connect`)
- `connectors` (empty array on native)
- `disconnect`
- `sendSOL`
- `signAndSendTransaction`
- `refreshBalance`

---

## Android 11+ Wallet Discovery

MWA requires manifest query entries for wallet app discovery.

Config plugin:
- `mobile/plugins/with-mwa-android.js`

It injects:
```xml
<queries>
  <intent>
    <action android:name="solana.mobilewalletadapter.walletlib.action.LINK_MWA_REQUEST" />
  </intent>
</queries>
```

Without this, wallet apps may not be discoverable on Android 11+.

---

## Seeker / Seed Vault Notes

- Seeker native wallet (Seed Vault) should respond to MWA intents.
- Chain format normalization (`devnet` -> `solana:devnet`) is handled by protocol libs.
- Error propagation in `mwa-provider.tsx` is surfaced to UI for stake/connect debugging.

---

## Integration Points in Game

- `stake.tsx` uses wallet connect + stake start flow
- `GameContext.tsx` consumes `useUnifiedWallet()`
- `startGame(amount, demoMode)`
  - demo/free mode now persists `stakeAmount: 0`
  - staked mode persists real amount and can claim rewards on victory

---

## Quick Smoke Test (Native)

1. Open app on Android (Seeker device)
2. Tap **BIND WALLET** on stake screen
3. Wallet picker/dialog appears
4. Confirm wallet connected in UI
5. Start staked run
6. Verify transaction path + gameplay

If bind does nothing, verify:
- context is shared (`UnifiedWalletContext` import in mwa-provider)
- `connectors: []` exists in native context value
- manifest queries block exists in generated `AndroidManifest.xml`

---

## Related Files

- `mobile/lib/wallet/unified.tsx`
- `mobile/lib/wallet/mwa-provider.tsx`
- `mobile/lib/wallet/mobile-adapter.ts`
- `mobile/plugins/with-mwa-android.js`
- `mobile/app/stake.tsx`
- `mobile/lib/GameContext.tsx`
