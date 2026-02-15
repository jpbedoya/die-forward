/**
 * Unified Wallet Provider
 * 
 * Platform-aware wallet that uses:
 * - Web: @solana/react-hooks for wallet connection + web3.js for transactions
 * - Native: Mobile Wallet Adapter (MWA) with web3.js boundary
 */

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import type { Address } from '@solana/kit';

// Conditional imports
let useWalletConnection: any;
let useBalance: any;
let WebWalletProvider: any;

// Web3.js imports for transaction building (boundary layer)
let Connection: any;
let PublicKey: any;
let Transaction: any;
let SystemProgram: any;
let LAMPORTS_PER_SOL: any;

let mobileConnect: any;
let mobileSignAndSend: any;
let mobileSendSOL: any;
let getMobileBalance: any;
let mobileConnection: any;

// Additional hooks for web
let useSolTransfer: any;

if (Platform.OS === 'web') {
  // Web: use framework-kit
  const hooks = require('@solana/react-hooks');
  const provider = require('./provider');
  
  useWalletConnection = hooks.useWalletConnection;
  useBalance = hooks.useBalance;
  useSolTransfer = hooks.useSolTransfer;
  WebWalletProvider = provider.WebWalletProvider;
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
  const walletConnection = useWalletConnection();
  const solTransfer = useSolTransfer();
  
  // wallet is the session, which contains account.address
  const walletAddress = walletConnection.wallet?.account?.address ?? null;
  const balanceResult = useBalance(walletAddress ? walletAddress : undefined);
  
  // Send SOL using framework-kit's useSolTransfer
  const doSendSOL = useCallback(async (to: Address, amount: number): Promise<string> => {
    if (!walletAddress) throw new Error('Wallet not connected');
    if (!walletConnection.wallet) throw new Error('No wallet session');
    
    // useSolTransfer.send expects { to: Address, amount: bigint (lamports) }
    const lamports = BigInt(Math.floor(amount * 1e9));
    
    const signature = await solTransfer.send({
      to: to,
      amount: lamports,
    });
    
    if (!signature) throw new Error('Transaction failed - no signature returned');
    return signature;
  }, [walletAddress, walletConnection.wallet, solTransfer]);
  
  const contextValue = useMemo<UnifiedWalletContextState>(() => ({
    connected: walletConnection.connected,
    connecting: walletConnection.connecting,
    address: walletAddress as Address | null,
    balance: balanceResult.lamports ? Number(balanceResult.lamports) / 1e9 : null,
    connect: async () => {
      // Open wallet selection - framework-kit handles the modal
      if (walletConnection.connectors.length > 0) {
        try {
          await walletConnection.connect(walletConnection.connectors[0].id);
        } catch (e) {
          console.error('Connect failed:', e);
        }
      }
      return walletAddress as Address | null;
    },
    disconnect: async () => {
      await walletConnection.disconnect();
    },
    sendSOL: doSendSOL,
    refreshBalance: async () => {
      balanceResult.refresh?.();
    },
  }), [walletConnection, walletAddress, balanceResult, doSendSOL]);
  
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
