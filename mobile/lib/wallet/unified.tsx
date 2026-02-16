/**
 * Unified Wallet Provider
 * 
 * Platform-aware wallet that uses:
 * - Desktop Web: @solana/react-hooks for wallet connection
 * - Mobile Web: Mobile Wallet Adapter (MWA) via deep links
 * - Native Mobile: Mobile Wallet Adapter (MWA)
 */

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import type { Address } from '@solana/kit';

// Detect if we're on mobile web
const isMobileWeb = Platform.OS === 'web' && typeof navigator !== 'undefined' && 
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Use MWA for native OR mobile web
const useMWA = Platform.OS !== 'web' || isMobileWeb;

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
let useSendTransaction: any;

if (Platform.OS === 'web' && !isMobileWeb) {
  // Desktop Web: use framework-kit
  const hooks = require('@solana/react-hooks');
  const provider = require('./provider');
  const web3 = require('@solana/web3.js');
  
  useWalletConnection = hooks.useWalletConnection;
  useBalance = hooks.useBalance;
  useSolTransfer = hooks.useSolTransfer;
  useSendTransaction = hooks.useSendTransaction;
  WebWalletProvider = provider.WebWalletProvider;
  
  // Web3.js for building escrow transactions
  Connection = web3.Connection;
  PublicKey = web3.PublicKey;
  Transaction = web3.Transaction;
  SystemProgram = web3.SystemProgram;
  LAMPORTS_PER_SOL = web3.LAMPORTS_PER_SOL;
}

if (useMWA) {
  // Native or Mobile Web: use MWA boundary
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
  signAndSendTransaction: (transaction: any) => Promise<string>; // For escrow/custom txs
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

// RPC endpoint
const WEB_RPC = process.env.EXPO_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

// Web implementation using framework-kit hooks
function WebWalletConsumer({ children }: { children: ReactNode }) {
  const walletConnection = useWalletConnection();
  const solTransfer = useSolTransfer();
  const txSender = useSendTransaction();
  
  // wallet is the session, which contains account.address
  const walletAddress = walletConnection.wallet?.account?.address ?? null;
  const balanceResult = useBalance(walletAddress ? walletAddress : undefined);
  
  // Send SOL using framework-kit's useSolTransfer (simple transfers)
  const doSendSOL = useCallback(async (to: Address, amount: number): Promise<string> => {
    if (!walletAddress) throw new Error('Wallet not connected');
    if (!walletConnection.wallet) throw new Error('No wallet session');
    
    const lamports = BigInt(Math.floor(amount * 1e9));
    const signature = await solTransfer.send({ to, amount: lamports });
    
    if (!signature) throw new Error('Transaction failed - no signature returned');
    return signature;
  }, [walletAddress, walletConnection.wallet, solTransfer]);
  
  // Sign and send arbitrary transaction (for escrow program)
  // Accepts a web3.js Transaction with instructions already added
  const doSignAndSend = useCallback(async (transaction: any): Promise<string> => {
    if (!walletAddress) throw new Error('Wallet not connected');
    if (!walletConnection.wallet) throw new Error('No wallet session');
    
    // Extract instructions from web3.js Transaction
    const web3Instructions = transaction.instructions;
    if (!web3Instructions || web3Instructions.length === 0) {
      throw new Error('Transaction has no instructions');
    }
    
    // Convert web3.js instructions to Kit format
    // AccountRole: READONLY=0, WRITABLE=1, READONLY_SIGNER=2, WRITABLE_SIGNER=3
    const kitInstructions = web3Instructions.map((ix: any) => ({
      programAddress: ix.programId.toBase58(),
      accounts: ix.keys.map((key: any) => ({
        address: key.pubkey.toBase58(),
        role: (key.isSigner ? 2 : 0) + (key.isWritable ? 1 : 0),
      })),
      data: new Uint8Array(ix.data),
    }));
    
    // useSendTransaction expects { instructions, feePayer }
    try {
      const signature = await txSender.send({
        instructions: kitInstructions,
        feePayer: walletAddress,
      });
      
      if (!signature) throw new Error('Transaction failed - no signature returned');
      return signature;
    } catch (err: any) {
      // Handle user rejection and other wallet errors gracefully
      const message = err?.message || String(err);
      if (message.includes('rejected') || message.includes('cancelled') || message.includes('denied')) {
        throw new Error('Transaction cancelled');
      }
      if (message.includes('transaction plan failed')) {
        // Check for more specific cause
        const cause = err?.cause?.message || err?.transactionPlanResult?.error?.message;
        if (cause?.includes('rejected') || cause?.includes('User rejected')) {
          throw new Error('Transaction cancelled');
        }
        throw new Error(cause || 'Transaction failed');
      }
      throw err;
    }
  }, [walletAddress, walletConnection.wallet, txSender]);
  
  const contextValue = useMemo<UnifiedWalletContextState>(() => ({
    connected: walletConnection.connected,
    connecting: walletConnection.connecting,
    address: walletAddress as Address | null,
    balance: balanceResult.lamports ? Number(balanceResult.lamports) / 1e9 : null,
    connect: async () => {
      if (walletConnection.connectors.length > 0) {
        try {
          await walletConnection.connect(walletConnection.connectors[0].id);
        } catch (e) {
          console.error('Connect failed:', e);
        }
      } else {
        // No wallets found - likely mobile web without wallet extension
        throw new Error('No wallet found. Open this page in your Phantom or Solflare app browser.');
      }
      return walletAddress as Address | null;
    },
    disconnect: async () => {
      await walletConnection.disconnect();
    },
    sendSOL: doSendSOL,
    signAndSendTransaction: doSignAndSend,
    refreshBalance: async () => {
      balanceResult.refresh?.();
    },
  }), [walletConnection, walletAddress, balanceResult, doSendSOL, doSignAndSend]);
  
  return (
    <UnifiedWalletContext.Provider value={contextValue}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}

// Mobile WEB implementation using MWA deep links
function MobileWalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  
  // Restore wallet state from storage on mount (for page refresh after returning from wallet)
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('mwa-wallet-state');
        if (saved) {
          const { address: savedAddr, authToken: savedToken } = JSON.parse(saved);
          if (savedAddr && savedToken) {
            console.log('[MWA] Restoring wallet from storage:', savedAddr);
            setAddress(savedAddr);
            setAuthToken(savedToken);
            setConnected(true);
            // Fetch balance
            getMobileBalance(savedAddr).then(setBalance).catch(console.warn);
          }
        }
      } catch (e) {
        console.warn('[MWA] Failed to restore wallet state:', e);
      }
    }
  }, []);
  
  const connect = useCallback(async (): Promise<Address | null> => {
    console.log('[MWA] Starting connect via transact()...');
    setConnecting(true);
    try {
      const result = await mobileConnect();
      console.log('[MWA] Connect result:', result);
      
      if (result?.address) {
        setAddress(result.address);
        setAuthToken(result.authToken);
        setConnected(true);
        
        // Save to storage for persistence when returning from wallet
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('mwa-wallet-state', JSON.stringify({
            address: result.address,
            authToken: result.authToken,
          }));
        }
        
        // Fetch initial balance
        try {
          const bal = await getMobileBalance(result.address);
          setBalance(bal);
          console.log('[MWA] Balance:', bal);
        } catch (balErr) {
          console.warn('[MWA] Failed to fetch balance:', balErr);
        }
        
        return result.address;
      } else {
        console.warn('[MWA] No address in result');
        return null;
      }
    } catch (e: any) {
      console.error('[MWA] Connect failed:', e?.message || e);
      // Check if it's a "no wallet found" type error
      if (e?.message?.includes('No compatible wallet') || e?.message?.includes('no MWA')) {
        throw new Error('No Solana wallet found. Install Phantom or Solflare on your device.');
      }
      throw new Error(e?.message || 'Wallet connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);
  
  const disconnect = useCallback(async () => {
    setAddress(null);
    setAuthToken(null);
    setConnected(false);
    setBalance(null);
    // Clear storage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mwa-wallet-state');
    }
  }, []);
  
  const sendSOL = useCallback(async (to: Address, amount: number): Promise<string> => {
    if (!authToken || !address) throw new Error('Wallet not connected');
    return await mobileSendSOL(address, to, amount, authToken);
  }, [authToken, address]);
  
  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!authToken || !address) throw new Error('Wallet not connected');
    return await mobileSignAndSend(transaction, authToken);
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
    signAndSendTransaction,
    refreshBalance,
  }), [connected, connecting, address, balance, connect, disconnect, sendSOL, signAndSendTransaction, refreshBalance]);
  
  return (
    <UnifiedWalletContext.Provider value={contextValue}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}

// Import the official MWA provider for native mobile only
let NativeMWAProvider: any;
const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';
if (isNativeMobile) {
  NativeMWAProvider = require('./mwa-provider').MWAWalletProvider;
}

// Main provider - switches based on platform
export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  // Desktop web: use framework-kit
  if (Platform.OS === 'web' && !isMobileWeb) {
    return (
      <WebWalletProvider>
        <WebWalletConsumer>
          {children}
        </WebWalletConsumer>
      </WebWalletProvider>
    );
  }
  
  // Native mobile (iOS/Android app): use official @wallet-ui MWA
  if (isNativeMobile) {
    return (
      <NativeMWAProvider>
        {children}
      </NativeMWAProvider>
    );
  }
  
  // Mobile web browser: use our custom deep link approach
  return (
    <MobileWalletProvider>
      {children}
    </MobileWalletProvider>
  );
}

// Re-export for convenience
export type { Address };
