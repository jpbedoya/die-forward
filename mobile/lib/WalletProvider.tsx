// Platform-aware wallet provider
// Uses standard wallet adapter on web, mobile wallet adapter on native

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';

// Web imports (conditional)
let WalletAdapterNetwork: any;
let ConnectionProvider: any;
let WalletProvider: any;
let WalletModalProvider: any;
let useWallet: any;
let useConnection: any;
let PhantomWalletAdapter: any;
let SolflareWalletAdapter: any;

// Mobile imports
let transact: any;
let Web3MobileWallet: any;

// Conditional imports based on platform
if (Platform.OS === 'web') {
  // Web wallet adapter
  const walletAdapterBase = require('@solana/wallet-adapter-base');
  const walletAdapterReact = require('@solana/wallet-adapter-react');
  const walletAdapterWallets = require('@solana/wallet-adapter-wallets');
  
  WalletAdapterNetwork = walletAdapterBase.WalletAdapterNetwork;
  ConnectionProvider = walletAdapterReact.ConnectionProvider;
  WalletProvider = walletAdapterReact.WalletProvider;
  useWallet = walletAdapterReact.useWallet;
  useConnection = walletAdapterReact.useConnection;
  PhantomWalletAdapter = walletAdapterWallets.PhantomWalletAdapter;
  SolflareWalletAdapter = walletAdapterWallets.SolflareWalletAdapter;
  
  // Dynamic import for modal (has CSS)
  try {
    WalletModalProvider = require('@solana/wallet-adapter-react-ui').WalletModalProvider;
    require('@solana/wallet-adapter-react-ui/styles.css');
  } catch (e) {
    // CSS import may fail in some setups
    WalletModalProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
  }
} else {
  // Mobile wallet adapter
  const mwa = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  transact = mwa.transact;
  Web3MobileWallet = mwa.Web3MobileWallet;
}

const CLUSTER = 'devnet';
const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC || clusterApiUrl(CLUSTER);

// Shared connection
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Wallet context interface
interface WalletContextState {
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  address: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (tx: Transaction) => Promise<string>;
  sendSOL: (to: string, amount: number) => Promise<string>;
}

const WalletContext = createContext<WalletContextState>({
  connected: false,
  connecting: false,
  publicKey: null,
  address: null,
  connect: async () => null,
  disconnect: async () => {},
  signAndSendTransaction: async () => { throw new Error('Not connected'); },
  sendSOL: async () => { throw new Error('Not connected'); },
});

export function useUnifiedWallet() {
  return useContext(WalletContext);
}

// Web wallet hook wrapper
function WebWalletProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected, connecting, connect, disconnect, signTransaction, sendTransaction, select, wallets } = useWallet();
  const { connection } = useConnection();
  
  // Get wallet modal hook (if available)
  let setModalVisible: ((visible: boolean) => void) | null = null;
  try {
    const { useWalletModal } = require('@solana/wallet-adapter-react-ui');
    const modal = useWalletModal();
    setModalVisible = modal.setVisible;
  } catch {
    // Modal not available
  }
  
  const contextValue = useMemo<WalletContextState>(() => ({
    connected,
    connecting,
    publicKey,
    address: publicKey?.toBase58() || null,
    connect: async () => {
      try {
        // On web, open the wallet selection modal
        if (setModalVisible) {
          setModalVisible(true);
        } else if (wallets.length > 0) {
          // Fallback: select first wallet and connect
          select(wallets[0].adapter.name);
          await connect();
        }
        return publicKey?.toBase58() || null;
      } catch (e) {
        console.error('Failed to connect:', e);
        return null;
      }
    },
    disconnect: async () => {
      await disconnect();
    },
    signAndSendTransaction: async (tx: Transaction) => {
      if (!publicKey) throw new Error('Wallet not connected');
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);
      return signature;
    },
    sendSOL: async (to: string, amount: number) => {
      if (!publicKey) throw new Error('Wallet not connected');
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(to),
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);
      return signature;
    },
  }), [publicKey, connected, connecting, connect, disconnect, sendTransaction, connection, setModalVisible, select, wallets]);
  
  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Mobile wallet provider
function MobileWalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  const APP_IDENTITY = {
    name: 'Die Forward',
    uri: 'https://dieforward.com',
    icon: 'favicon.ico',
  };
  
  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await transact(async (wallet: typeof Web3MobileWallet) => {
        const authResult = await wallet.authorize({
          cluster: CLUSTER,
          identity: APP_IDENTITY,
        });
        const pubkey = new PublicKey(authResult.accounts[0]?.address);
        return {
          address: pubkey.toBase58(),
          authToken: authResult.auth_token,
        };
      });
      
      setAddress(result.address);
      setAuthToken(result.authToken);
      setConnected(true);
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
  }, []);
  
  const signAndSendTransaction = useCallback(async (tx: Transaction) => {
    if (!authToken) throw new Error('Wallet not connected');
    
    return await transact(async (wallet: typeof Web3MobileWallet) => {
      const reAuthResult = await wallet.reauthorize({
        auth_token: authToken,
        identity: APP_IDENTITY,
      });
      const pubkey = new PublicKey(reAuthResult.accounts[0]?.address);
      
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = pubkey;
      
      const signatures = await wallet.signAndSendTransactions({
        transactions: [tx],
      });
      
      const sigRaw = signatures[0];
      const base58 = require('bs58');
      return typeof sigRaw === 'object' && 'length' in sigRaw
        ? base58.encode(sigRaw as Uint8Array) 
        : sigRaw as string;
    });
  }, [authToken]);
  
  const sendSOL = useCallback(async (to: string, amount: number) => {
    if (!authToken || !address) throw new Error('Wallet not connected');
    
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(address),
        toPubkey: new PublicKey(to),
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );
    
    return await signAndSendTransaction(tx);
  }, [authToken, address, signAndSendTransaction]);
  
  const contextValue = useMemo<WalletContextState>(() => ({
    connected,
    connecting,
    publicKey: address ? new PublicKey(address) : null,
    address,
    connect,
    disconnect,
    signAndSendTransaction,
    sendSOL,
  }), [connected, connecting, address, connect, disconnect, signAndSendTransaction, sendSOL]);
  
  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Main provider component
export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = RPC_ENDPOINT;
    
    const wallets = useMemo(
      () => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
      ],
      []
    );
    
    return (
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <WebWalletProvider>
              {children}
            </WebWalletProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    );
  }
  
  // Native
  return (
    <MobileWalletProvider>
      {children}
    </MobileWalletProvider>
  );
}

// Web-only: Hook to trigger wallet modal
export function useWalletModal() {
  if (Platform.OS === 'web') {
    try {
      const { useWalletModal: useModal } = require('@solana/wallet-adapter-react-ui');
      return useModal();
    } catch {
      return { visible: false, setVisible: () => {} };
    }
  }
  return { visible: false, setVisible: () => {} };
}
