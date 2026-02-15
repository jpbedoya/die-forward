/**
 * Unified Wallet Provider
 * 
 * Platform-aware wallet that uses:
 * - Web: @solana/react-hooks with Wallet Standard auto-discovery
 * - Native: Mobile Wallet Adapter (MWA) with web3.js boundary
 */

import React, { createContext, useContext, useMemo, useCallback, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import type { Address } from '@solana/kit';
import { lamports } from '@solana/kit';

// Conditional imports
let useWalletConnection: any;
let useBalance: any;
let useSolTransfer: any;
let WebWalletProvider: any;
let solanaClient: any;

let mobileConnect: any;
let mobileSignAndSend: any;
let mobileSendSOL: any;
let getMobileBalance: any;
let mobileConnection: any;

if (Platform.OS === 'web') {
  // Web: use framework-kit
  const hooks = require('@solana/react-hooks');
  const provider = require('./provider');
  
  useWalletConnection = hooks.useWalletConnection;
  useBalance = hooks.useBalance;
  useSolTransfer = hooks.useSolTransfer;
  WebWalletProvider = provider.WebWalletProvider;
  solanaClient = provider.solanaClient;
} else {
  // Native: use MWA boundary
  const mwa = require('./mobile-adapter');
  mobileConnect = mwa.mobileConnect;
  mobileSignAndSend = mwa.mobileSignAndSend;
  mobileSendSOL = mwa.mobileSendSOL;
  getMobileBalance = mwa.getMobileBalance;
  mobileConnection = mwa.mobileConnection;
}

// Unified wallet context interface
interface UnifiedWalletContextState {
  connected: boolean;
  connecting: boolean;
  address: Address | null;
  balance: number | null;
  connect: () => Promise<Address | null>;
  disconnect: () => Promise<void>;
  sendSOL: (to: Address, amount: number) => Promise<string>;
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
  refreshBalance: async () => {},
});

export function useUnifiedWallet() {
  return useContext(UnifiedWalletContext);
}

// Web implementation using framework-kit hooks
function WebWalletConsumer({ children }: { children: ReactNode }) {
  const wallet = useWalletConnection();
  const balanceResult = useBalance(wallet.address ? { address: wallet.address } : undefined);
  const transfer = useSolTransfer();
  
  const contextValue = useMemo<UnifiedWalletContextState>(() => ({
    connected: wallet.connected,
    connecting: wallet.connecting,
    address: wallet.address as Address | null,
    balance: balanceResult.data ? Number(balanceResult.data) / 1e9 : null,
    connect: async () => {
      await wallet.connect();
      return wallet.address as Address | null;
    },
    disconnect: async () => {
      await wallet.disconnect();
    },
    sendSOL: async (to: Address, amount: number) => {
      if (!wallet.address) throw new Error('Wallet not connected');
      const signature = await transfer.send({
        to,
        amount: lamports(BigInt(Math.floor(amount * 1e9))),
      });
      return signature;
    },
    refreshBalance: async () => {
      balanceResult.refetch();
    },
  }), [wallet, balanceResult, transfer]);
  
  return (
    <UnifiedWalletContext.Provider value={contextValue}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}

// Mobile implementation using MWA
function MobileWalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  
  const connect = useCallback(async (): Promise<Address | null> => {
    setConnecting(true);
    try {
      const result = await mobileConnect();
      setAddress(result.address);
      setAuthToken(result.authToken);
      setConnected(true);
      
      // Fetch initial balance
      const bal = await getMobileBalance(result.address);
      setBalance(bal);
      
      return result.address;
    } catch (e) {
      console.error('Mobile wallet connect failed:', e);
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);
  
  const disconnect = useCallback(async () => {
    setAddress(null);
    setAuthToken(null);
    setConnected(false);
    setBalance(null);
  }, []);
  
  const sendSOL = useCallback(async (to: Address, amount: number): Promise<string> => {
    if (!authToken || !address) throw new Error('Wallet not connected');
    return await mobileSendSOL(address, to, amount, authToken);
  }, [authToken, address]);
  
  const refreshBalance = useCallback(async () => {
    if (address) {
      const bal = await getMobileBalance(address);
      setBalance(bal);
    }
  }, [address]);
  
  const contextValue = useMemo<UnifiedWalletContextState>(() => ({
    connected,
    connecting,
    address,
    balance,
    connect,
    disconnect,
    sendSOL,
    refreshBalance,
  }), [connected, connecting, address, balance, connect, disconnect, sendSOL, refreshBalance]);
  
  return (
    <UnifiedWalletContext.Provider value={contextValue}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}

// Main provider - switches based on platform
export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') {
    return (
      <WebWalletProvider>
        <WebWalletConsumer>
          {children}
        </WebWalletConsumer>
      </WebWalletProvider>
    );
  }
  
  return (
    <MobileWalletProvider>
      {children}
    </MobileWalletProvider>
  );
}

// Re-export for convenience
export type { Address };
