/**
 * Mobile Wallet Adapter Provider using @wallet-ui/react-native-web3js
 * This is the official Solana Foundation approach for Expo apps
 */

import React, { useMemo, useCallback, useRef, ReactNode } from 'react';
import { MobileWalletProvider as WalletUIProvider, useMobileWallet } from '@wallet-ui/react-native-web3js';
import { dlog } from '../debug-log';
import type { Address } from '@solana/kit';
import { LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
// Import the shared context from unified — NOT a local duplicate
import { UnifiedWalletContext, UnifiedWalletContextState } from './unified';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

const APP_IDENTITY = {
  name: 'Die Forward',
  uri: 'https://dieforward.com',
  icon: 'favicon.ico',
};

// Inner component that uses the wallet hooks
function MobileWalletConsumer({ children }: { children: ReactNode }) {
  const wallet = useMobileWallet();
  const [balance, setBalance] = React.useState<number | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  
  const address = wallet.account?.address?.toBase58() as Address | null;
  const connected = !!wallet.account;

  // Ref keeps wallet access stable — prevents useCallback recreation on every wallet state change
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

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
      dlog('MWA', 'calling wallet.connect()...');
      const account = await walletRef.current.connect();
      dlog('MWA', 'connect success, account:', account?.address?.toBase58?.());
      return account?.address?.toBase58() as Address | null;
    } catch (e: any) {
      const msg = e?.message || String(e) || 'Wallet connection failed';
      dlog.error('MWA', 'connect failed:', msg);
      throw new Error(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await walletRef.current.disconnect();
  }, []);

  const sendSOL = useCallback(async (to: Address, amount: number): Promise<string> => {
    if (!walletRef.current.account) throw new Error('Wallet not connected');

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletRef.current.account.publicKey,
        toPubkey: new PublicKey(to),
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
    );

    const { blockhash, lastValidBlockHeight } = await walletRef.current.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = walletRef.current.account.publicKey;

    const minContextSlot = await walletRef.current.connection.getSlot();
    return await walletRef.current.signAndSendTransaction(tx, minContextSlot);
  }, []);

  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!walletRef.current.account) throw new Error('Wallet not connected');

    // Ensure blockhash and fee payer are set
    if (!transaction.recentBlockhash) {
      const { blockhash } = await walletRef.current.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
    }
    if (!transaction.feePayer) {
      transaction.feePayer = walletRef.current.account.publicKey;
    }

    try {
      const minContextSlot = await walletRef.current.connection.getSlot();
      return await walletRef.current.signAndSendTransaction(transaction, minContextSlot);
    } catch (e: any) {
      const msg = e?.message || String(e);
      const isCancellation =
        msg.includes('CancellationException') ||
        msg.includes('User rejected') ||
        msg.includes('cancelled') ||
        msg.includes('Cancelled') ||
        msg.includes('ACTION_CANCELLED') ||
        msg.includes('user rejected');
      if (isCancellation) {
        throw Object.assign(new Error('WALLET_CANCELLED'), { isCancellation: true });
      }
      throw e;
    }
  }, []);

  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (!walletRef.current.account) throw new Error('Wallet not connected');
    dlog('MWA', 'signMessage requested');
    const result = await walletRef.current.signMessage(message);
    dlog('MWA', 'signMessage success');
    return result;
  }, []);

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
    connectors: [],      // Native MWA uses OS wallet picker, no connector list needed
    connect,
    connectTo: connect,  // Alias — native doesn't need specific wallet selection
    disconnect,
    sendSOL,
    signAndSendTransaction,
    signMessage,
    refreshBalance,
  }), [connected, connecting, address, balance, connect, disconnect, sendSOL, signAndSendTransaction, signMessage, refreshBalance]);
  
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
      // Wallet UI provider currently behaves most reliably with legacy cluster string.
      // Raw fallback path still supports MWA 2.0 chain semantics.
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
