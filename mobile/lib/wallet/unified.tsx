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

// Native mobile MWA (transact protocol)
let mobileConnect: any;
let mobileSignAndSend: any;
let mobileSendSOL: any;
let getMobileBalance: any;
let mobileConnection: any;

// Mobile web adapter (uses OS wallet picker)
let mobileWebConnect: any;
let mobileWebDisconnect: any;
let mobileWebSignAndSend: any;
let getMobileWebBalance: any;
let mobileWebConnection: any;
let isMobileWebConnected: any;
let getMobileWebAddress: any;

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

// Native mobile: use raw transact protocol
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  const mwa = require('./mobile-adapter');
  mobileConnect = mwa.mobileConnect;
  mobileSignAndSend = mwa.mobileSignAndSend;
  mobileSendSOL = mwa.mobileSendSOL;
  getMobileBalance = mwa.getMobileBalance;
  mobileConnection = mwa.mobileConnection;
}

// Mobile web: use wallet-adapter-mobile (proper OS wallet picker)
let clearMobileWebCache: (() => void) | undefined;
if (isMobileWeb) {
  const mwa = require('./mobile-web-adapter');
  mobileWebConnect = mwa.mobileWebConnect;
  mobileWebDisconnect = mwa.mobileWebDisconnect;
  mobileWebSignAndSend = mwa.mobileWebSignAndSend;
  getMobileWebBalance = mwa.getMobileWebBalance;
  mobileWebConnection = mwa.mobileWebConnection;
  isMobileWebConnected = mwa.isMobileWebConnected;
  getMobileWebAddress = mwa.getMobileWebAddress;
  clearMobileWebCache = mwa.clearMobileWebCache;
}

// Wallet connector info
interface WalletConnector {
  id: string;
  name: string;
  icon?: string;
}

// Unified wallet context interface
interface UnifiedWalletContextState {
  connected: boolean;
  connecting: boolean;
  address: Address | null;
  balance: number | null;
  connectors: WalletConnector[];  // Available wallets
  connect: () => Promise<Address | null>;  // Auto-connect (first wallet or shows picker)
  connectTo: (connectorId: string) => Promise<Address | null>;  // Connect to specific wallet
  disconnect: () => Promise<void>;
  sendSOL: (to: Address, amount: number) => Promise<string>;
  signAndSendTransaction: (transaction: any) => Promise<string>; // For escrow/custom txs
  refreshBalance: () => Promise<void>;
}

export const UnifiedWalletContext = createContext<UnifiedWalletContextState>({
  connected: false,
  connecting: false,
  address: null,
  balance: null,
  connectors: [],
  connect: async () => null,
  connectTo: async () => null,
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
  
  // Map connectors to our interface
  const connectors: WalletConnector[] = useMemo(() => 
    walletConnection.connectors.map((c: any) => ({
      id: c.id,
      name: c.name || c.id,
      icon: c.icon,
    })),
    [walletConnection.connectors]
  );

  const contextValue = useMemo<UnifiedWalletContextState>(() => ({
    connected: walletConnection.connected,
    connecting: walletConnection.connecting,
    address: walletAddress as Address | null,
    balance: balanceResult.lamports ? Number(balanceResult.lamports) / 1e9 : null,
    connectors,
    connect: async () => {
      // If only one wallet, connect directly. Otherwise caller should use connectTo with picker.
      if (walletConnection.connectors.length === 1) {
        try {
          await walletConnection.connect(walletConnection.connectors[0].id);
        } catch (e: any) {
          const msg = e?.message || String(e);
          const isCancellation =
            msg.includes('rejected') || msg.includes('cancelled') ||
            msg.includes('Cancelled') || msg.includes('denied') ||
            msg.includes('CancellationException');
          if (isCancellation) {
            throw Object.assign(new Error('WALLET_CANCELLED'), { isCancellation: true });
          }
          console.error('Connect failed:', e);
        }
      } else if (walletConnection.connectors.length > 1) {
        // Multiple wallets - throw so UI can show picker
        throw new Error('MULTIPLE_WALLETS');
      } else {
        throw new Error('No wallet found. Install Phantom, Backpack, or Solflare extension.');
      }
      return walletAddress as Address | null;
    },
    connectTo: async (connectorId: string) => {
      try {
        await walletConnection.connect(connectorId);
        return walletAddress as Address | null;
      } catch (e: any) {
        const msg = e?.message || String(e);
        const isCancellation =
          msg.includes('rejected') || msg.includes('cancelled') ||
          msg.includes('Cancelled') || msg.includes('denied') ||
          msg.includes('CancellationException');
        if (isCancellation) {
          throw Object.assign(new Error('WALLET_CANCELLED'), { isCancellation: true });
        }
        console.error('Connect failed:', e);
        throw e;
      }
    },
    disconnect: async () => {
      await walletConnection.disconnect();
    },
    sendSOL: doSendSOL,
    signAndSendTransaction: doSignAndSend,
    refreshBalance: async () => {
      balanceResult.refresh?.();
    },
  }), [walletConnection, walletAddress, balanceResult, connectors, doSendSOL, doSignAndSend]);
  
  return (
    <UnifiedWalletContext.Provider value={contextValue}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}

// Mobile WEB implementation using @solana-mobile/wallet-adapter-mobile
// This uses the proper Android intent system for wallet selection
function MobileWalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  
  // Sync state from adapter - handles returning from wallet app
  // Note: We don't auto-trust cached state on initial mount to avoid stale sessions
  const syncAdapterState = useCallback(async (trustCache: boolean = false) => {
    const isConn = isMobileWebConnected?.() ?? false;
    const addr = getMobileWebAddress?.() ?? null;
    
    console.log('[MobileWeb] Syncing state - connected:', isConn, 'address:', addr, 'trustCache:', trustCache);
    
    // Only trust cached connection if explicitly told to (e.g., after returning from wallet app)
    if (isConn && addr && trustCache) {
      setAddress(addr);
      setConnected(true);
      try {
        const bal = await getMobileWebBalance(addr);
        setBalance(bal);
      } catch (e) {
        // If balance fetch fails, session might be stale
        console.warn('[MobileWeb] Failed to fetch balance on sync, clearing state:', e);
        clearMobileWebCache?.();
        setConnected(false);
        setAddress(null);
        setBalance(null);
      }
    } else if (!trustCache) {
      // On initial mount, don't auto-restore - require explicit connect
      setConnected(false);
      setAddress(null);
    }
  }, []);
  
  // Check connection state on mount
  // With transact()-based approach, we trust cache since auth happens atomically
  useEffect(() => {
    syncAdapterState(true);
  }, [syncAdapterState]);
  
  // Also sync when window regains focus (fallback for missed events)
  // Trust cache here since user is likely returning from wallet app
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleFocus = () => {
      console.log('[MobileWeb] Window focus - syncing adapter state');
      syncAdapterState(true);
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncAdapterState]);
  
  const connect = useCallback(async (): Promise<Address | null> => {
    console.log('[MobileWeb] Starting connect via wallet-adapter-mobile...');
    setConnecting(true);
    
    try {
      // On mobile web, the connect() call may redirect to wallet app.
      // The state will be synced via event listeners when returning.
      // We use a Promise that resolves when either:
      // 1. The connect returns immediately (some wallets)
      // 2. A timeout triggers (redirect case - state will sync via events)
      
      const result = await mobileWebConnect();
      
      if (result?.address) {
        console.log('[MobileWeb] Connect result:', result);
        setAddress(result.address);
        setConnected(true);
        
        // Fetch initial balance
        try {
          const bal = await getMobileWebBalance(result.address);
          setBalance(bal);
          console.log('[MobileWeb] Balance:', bal);
        } catch (balErr) {
          console.warn('[MobileWeb] Failed to fetch balance:', balErr);
        }
        
        return result.address;
      } else {
        // Timeout case - redirect is happening
        // State will be synced when user returns via focus/visibility events
        console.log('[MobileWeb] Redirect in progress, state will sync on return');
        return null;
      }
    } catch (e: any) {
      console.error('[MobileWeb] Connect failed:', e?.message || e);
      // Don't throw error for user cancellation
      if (e?.message?.includes('User rejected') || e?.message?.includes('cancelled')) {
        return null;
      }
      throw new Error(e?.message || 'Wallet connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);
  
  const disconnect = useCallback(async () => {
    await mobileWebDisconnect();
    setAddress(null);
    setConnected(false);
    setBalance(null);
  }, []);
  
  const sendSOL = useCallback(async (to: Address, amount: number): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');
    
    // Build transaction
    const { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(address),
        toPubkey: new PublicKey(to),
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
    );
    
    try {
      return await mobileWebSignAndSend(tx);
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      // If signature verification failed or session invalid, clear cache and reset state
      if (errorMsg.includes('Signature verification') || 
          errorMsg.includes('not connected') ||
          errorMsg.includes('session') ||
          errorMsg.includes('authorization')) {
        console.warn('[MobileWeb] Session appears invalid, clearing cache');
        clearMobileWebCache?.();
        setConnected(false);
        setAddress(null);
        setBalance(null);
      }
      throw e;
    }
  }, [address]);
  
  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');
    try {
      return await mobileWebSignAndSend(transaction);
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      // If signature verification failed or session invalid, clear cache and reset state
      if (errorMsg.includes('Signature verification') || 
          errorMsg.includes('not connected') ||
          errorMsg.includes('session') ||
          errorMsg.includes('authorization')) {
        console.warn('[MobileWeb] Session appears invalid, clearing cache');
        clearMobileWebCache?.();
        setConnected(false);
        setAddress(null);
        setBalance(null);
      }
      throw e;
    }
  }, [address]);
  
  const refreshBalance = useCallback(async () => {
    if (address) {
      const bal = await getMobileWebBalance(address);
      setBalance(bal);
    }
  }, [address]);
  
  const contextValue = useMemo<UnifiedWalletContextState>(() => ({
    connected,
    connecting,
    address,
    balance,
    connectors: [],  // Mobile uses OS wallet picker via MWA
    connect,
    connectTo: connect,  // Mobile doesn't need specific wallet selection
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
