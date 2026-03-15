/**
 * Mobile Wallet Adapter Provider using @wallet-ui/react-native-web3js
 * This is the official Solana Foundation approach for Expo apps
 */

import React, { useMemo, useCallback, useRef, ReactNode, useState } from 'react';
import { MobileWalletProvider as WalletUIProvider, useMobileWallet } from '@wallet-ui/react-native-web3js';
import { dlog } from '../debug-log';
import type { Address } from '@solana/kit';
import { mobileConnect, getMobileBalance, mobileSendSOL, mobileSignAndSend, mobileSignMessage } from './mobile-adapter';
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

  // Raw fallback session (used when wallet-ui connect returns without binding account state)
  const [rawAddress, setRawAddress] = useState<Address | null>(null);
  const [rawAuthToken, setRawAuthToken] = useState<string | null>(null);
  const [rawBalance, setRawBalance] = useState<number | null>(null);

  const hookAddress = wallet.account?.address?.toBase58() as Address | null;
  const usingRawFallback = !!rawAddress && !!rawAuthToken;
  const address = (usingRawFallback ? rawAddress : hookAddress) as Address | null;
  const connected = !!address;

  // Ref keeps wallet access stable — prevents useCallback recreation on every wallet state change
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  // Fetch balance from wallet-ui session when active
  React.useEffect(() => {
    if (!usingRawFallback && hookAddress && wallet.connection) {
      wallet.connection.getBalance(new PublicKey(hookAddress))
        .then(lamports => setBalance(lamports / LAMPORTS_PER_SOL))
        .catch(console.warn);
    } else if (!usingRawFallback) {
      setBalance(null);
    }
  }, [hookAddress, wallet.connection, usingRawFallback]);
  
  const connect = useCallback(async (): Promise<Address | null> => {
    setConnecting(true);
    try {
      // Primary path: official wallet-ui session connect
      dlog('MWA', 'calling wallet.connect()...');
      const account = await walletRef.current.connect();
      const accountAddress = account?.address?.toBase58?.() as Address | null;

      if (accountAddress) {
        dlog('MWA', 'connect success, account:', accountAddress);
        // Clear raw fallback if we successfully restored hook session
        setRawAddress(null);
        setRawAuthToken(null);
        setRawBalance(null);
        return accountAddress;
      }

      // Compatibility path: wallet UI returned without binding account state.
      dlog.warn('MWA', 'wallet.connect returned no account, trying raw fallback connect');
      const raw = await mobileConnect();
      setRawAddress(raw.address);
      setRawAuthToken(raw.authToken);
      const bal = await getMobileBalance(raw.address).catch(() => null);
      setRawBalance(bal);
      dlog('MWA', 'raw fallback connect success, account:', raw.address);
      return raw.address;
    } catch (e: any) {
      const msg = e?.message || String(e) || 'Wallet connection failed';
      dlog.error('MWA', 'connect failed:', msg);
      throw new Error(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await walletRef.current.disconnect();
    } catch {
      // ignore native disconnect errors
    }
    setRawAddress(null);
    setRawAuthToken(null);
    setRawBalance(null);
  }, []);

  const sendSOL = useCallback(async (to: Address, amount: number): Promise<string> => {
    if (usingRawFallback) {
      if (!rawAddress || !rawAuthToken) throw new Error('Wallet not connected');
      return await mobileSendSOL(rawAddress, to, amount, rawAuthToken);
    }

    if (!walletRef.current.account) throw new Error('Wallet not connected');

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletRef.current.account.publicKey,
        toPubkey: new PublicKey(to),
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
    );

    const { blockhash } = await walletRef.current.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = walletRef.current.account.publicKey;

    const minContextSlot = await walletRef.current.connection.getSlot();
    return await walletRef.current.signAndSendTransaction(tx, minContextSlot);
  }, [usingRawFallback, rawAddress, rawAuthToken]);

  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (usingRawFallback) {
      if (!rawAuthToken) throw new Error('Wallet not connected');
      return await mobileSignAndSend(transaction, rawAuthToken);
    }

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
  }, [usingRawFallback, rawAuthToken]);

  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (usingRawFallback) {
      if (!rawAuthToken) throw new Error('Wallet not connected');
      dlog('MWA', 'signMessage requested (raw fallback)');
      const result = await mobileSignMessage(message, rawAuthToken);
      dlog('MWA', 'signMessage success (raw fallback)');
      return result;
    }

    if (!walletRef.current.account) throw new Error('Wallet not connected');
    dlog('MWA', 'signMessage requested');
    const result = await walletRef.current.signMessage(message);
    dlog('MWA', 'signMessage success');
    return result;
  }, [usingRawFallback, rawAuthToken]);

  const refreshBalance = useCallback(async () => {
    if (usingRawFallback) {
      if (!rawAddress) return;
      const bal = await getMobileBalance(rawAddress);
      setRawBalance(bal);
      return;
    }

    if (hookAddress && wallet.connection) {
      const lamports = await wallet.connection.getBalance(new PublicKey(hookAddress));
      setBalance(lamports / LAMPORTS_PER_SOL);
    }
  }, [usingRawFallback, rawAddress, hookAddress, wallet.connection]);
  
  const activeBalance = usingRawFallback ? rawBalance : balance;

  const contextValue = useMemo<UnifiedWalletContextState>(() => ({
    connected,
    connecting,
    address,
    balance: activeBalance,
    connectors: [],      // Native MWA uses OS wallet picker, no connector list needed
    connect,
    connectTo: connect,  // Alias — native doesn't need specific wallet selection
    disconnect,
    sendSOL,
    signAndSendTransaction,
    signMessage,
    refreshBalance,
  }), [connected, connecting, address, activeBalance, connect, disconnect, sendSOL, signAndSendTransaction, signMessage, refreshBalance]);
  
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
