/**
 * Web Wallet Provider using @solana/react-hooks (framework-kit)
 * 
 * Uses Wallet Standard auto-discovery for wallet detection.
 * No need to manually import individual wallet adapters.
 */

'use client';

import React, { ReactNode } from 'react';
import { SolanaProvider } from '@solana/react-hooks';
import { autoDiscover, createClient } from '@solana/client';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const WS_ENDPOINT = RPC_ENDPOINT.replace('https://', 'wss://').replace('http://', 'ws://');

// Create Solana client with auto-discovery
export const solanaClient = createClient({
  endpoint: RPC_ENDPOINT,
  websocketEndpoint: WS_ENDPOINT,
  walletConnectors: autoDiscover(),
});

interface WebWalletProviderProps {
  children: ReactNode;
}

export function WebWalletProvider({ children }: WebWalletProviderProps) {
  return (
    <SolanaProvider 
      client={solanaClient}
      autoConnect={true}
      storageKey="die-forward-wallet"
    >
      {children}
    </SolanaProvider>
  );
}
