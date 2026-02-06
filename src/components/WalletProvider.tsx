'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { createDefaultAddressSelector, createDefaultAuthorizationResultCache, SolanaMobileWalletAdapter } from '@solana-mobile/wallet-adapter-mobile';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles for wallet modal
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const SolanaWalletProvider: FC<Props> = ({ children }) => {
  // Use devnet for development, mainnet-beta for production
  const endpoint = useMemo(() => 
    process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl('devnet'), 
    []
  );

  const wallets = useMemo(
    () => [
      // Mobile Wallet Adapter for Android/Seeker
      new SolanaMobileWalletAdapter({
        appIdentity: {
          name: 'Die Forward',
          uri: typeof window !== 'undefined' ? window.location.origin : 'https://die-forward.vercel.app',
          icon: '/favicon.ico',
        },
        addressSelector: createDefaultAddressSelector(),
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: 'devnet',
        onWalletNotFound: async () => {
          // Could open app store link here or show a helpful message
          // Silent fail - user will see wallet not available in the modal
        },
      }),
      // Desktop wallets
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
