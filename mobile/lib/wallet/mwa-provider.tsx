/**
 * Mobile Wallet Adapter Provider using @wallet-ui/react-native-web3js
 * This is the official Solana Foundation approach for Expo apps
 */

import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { MobileWalletProvider as WalletUIProvider, useMobileWallet } from '@wallet-ui/react-native-web3js';
import type { Address } from '@solana/kit';
import { LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: 'https://dieforward.com',
  icon: 'favicon.ico',
};

// Unified wallet context interface (same as before)
interface UnifiedWalletContextState {
  connected: boolean;
  connecting: boolean;
  address: Address | null;
  balance: number | null;
  connect: () => Promise<Address | null>;
  disconnect: () => Promise<void>;
  sendSOL: (to: Address, amount: number) => Promise<string>;
  signAndSendTransaction: (transaction: any) => Promise<string>;
  refreshBalance: () => Promise<void>;
}

const UnifiedWalletContext = createContext<UnifiedWalletContextState>({
  connected: false,
  connecting: false,
  address: null,
  balance: null,
  connect: async () => null,
  disconnect: async () => {},
  sendSOL: async () => { throw new Error('Not connected'); },
  signAndSendTransaction: async () => { throw new Error('Not connected'); },
  refreshBalance: async () => {},
});

export function useUnifiedWallet() {
  return useContext(UnifiedWalletContext);
}

// Inner component that uses the wallet hooks
function MobileWalletConsumer({ children }: { children: ReactNode }) {
  const wallet = useMobileWallet();
  const [balance, setBalance] = React.useState<number | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  
  const address = wallet.account?.address?.toBase58() as Address | null;
  const connected = !!wallet.account;
  
  // Fetch balance on connect
  React.useEffect(() => {
    if (address && wallet.connection) {
      wallet.connection.getBalance(new PublicKey(address))
        .then(lamports => setBalance(lamports / LAMPORTS_PER_SOL))
        .catch(console.warn);
    } else {
      setBalance(null);
    }
  }, [address, wallet.connection]);
  
  const connect = useCallback(async (): Promise<Address | null> => {
    setConnecting(true);
    try {
      const account = await wallet.connect();
      return account?.address?.toBase58() as Address | null;
    } catch (e: any) {
      console.error('[MWA] Connect failed:', e?.message || e);
      throw new Error(e?.message || 'Wallet connection failed');
    } finally {
      setConnecting(false);
    }
  }, [wallet]);
  
  const disconnect = useCallback(async () => {
    await wallet.disconnect();
  }, [wallet]);
  
  const sendSOL = useCallback(async (to: Address, amount: number): Promise<string> => {
    if (!wallet.account) throw new Error('Wallet not connected');
    
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.account.publicKey,
        toPubkey: new PublicKey(to),
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
    );
    
    const { blockhash, lastValidBlockHeight } = await wallet.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.account.publicKey;
    
    const minContextSlot = await wallet.connection.getSlot();
    return await wallet.signAndSendTransaction(tx, minContextSlot);
  }, [wallet]);
  
  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!wallet.account) throw new Error('Wallet not connected');
    
    // Ensure blockhash and fee payer are set
    if (!transaction.recentBlockhash) {
      const { blockhash } = await wallet.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
    }
    if (!transaction.feePayer) {
      transaction.feePayer = wallet.account.publicKey;
    }
    
    const minContextSlot = await wallet.connection.getSlot();
    return await wallet.signAndSendTransaction(transaction, minContextSlot);
  }, [wallet]);
  
  const refreshBalance = useCallback(async () => {
    if (address && wallet.connection) {
      const lamports = await wallet.connection.getBalance(new PublicKey(address));
      setBalance(lamports / LAMPORTS_PER_SOL);
    }
  }, [address, wallet.connection]);
  
  const contextValue = useMemo<UnifiedWalletContextState>(() => ({
    connected,
    connecting,
    address,
    balance,
    connect,
    disconnect,
    sendSOL,
    signAndSendTransaction,
    refreshBalance,
  }), [connected, connecting, address, balance, connect, disconnect, sendSOL, signAndSendTransaction, refreshBalance]);
  
  return (
    <UnifiedWalletContext.Provider value={contextValue}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}

// Main provider
export function MWAWalletProvider({ children }: { children: ReactNode }) {
  return (
    <WalletUIProvider
      chain="devnet"
      endpoint={RPC_ENDPOINT}
      identity={APP_IDENTITY}
    >
      <MobileWalletConsumer>
        {children}
      </MobileWalletConsumer>
    </WalletUIProvider>
  );
}

export type { Address };
