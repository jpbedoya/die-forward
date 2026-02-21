import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';
import { generateRandomDungeon, DungeonRoom } from './content';
import { useUnifiedWallet, type Address } from './wallet/unified';
import { GAME_POOL_PDA, buildStakeInstruction, generateSessionId } from './solana/escrow';
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreatePlayerByAuth, updatePlayerNicknameByAuth } from './instant';
import { signInWithWallet, signInAsGuest, linkWalletToGuest, getStoredAuthState, type AuthState } from './auth';

const NICKNAME_STORAGE_KEY = 'die-forward-nickname';
const NICKNAME_PROMPTED_KEY = 'die-forward-nickname-prompted';
const GUEST_PROGRESS_KEY = 'die-forward-guest-progress';

interface GameState {
  // Auth
  isAuthenticated: boolean;
  authId: string | null;
  authType: 'wallet' | 'guest' | null;
  
  // Wallet
  walletConnected: boolean;
  walletAddress: string | null;
  balance: number | null;
  
  // Player
  nickname: string | null;
  showNicknameModal: boolean;
  isNewUser: boolean;
  guestProgressExists: boolean;
  
  // Session
  sessionToken: string | null;
  stakeAmount: number;
  currentRoom: number;
  health: number;
  stamina: number;
  inventory: { id: string; name: string; emoji: string }[];
  dungeon: DungeonRoom[];
  itemsFound: number;
  
  // UI state
  loading: boolean;
  error: string | null;
}

interface WalletConnector {
  id: string;
  name: string;
  icon?: string;
}

interface GameContextType extends GameState {
  // Auth actions
  signInWithWallet: () => Promise<void>;
  signInEmptyHanded: () => Promise<void>;
  linkWallet: () => Promise<{ merged: boolean }>;
  
  // Wallet actions
  connect: () => Promise<void>;
  connectTo: (connectorId: string) => Promise<void>;
  connectors: WalletConnector[];
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  
  // Player actions
  setNickname: (name: string) => Promise<void>;
  dismissNicknameModal: () => void;
  
  // Game actions
  startGame: (amount: number, emptyHanded?: boolean) => Promise<void>;
  advance: () => Promise<boolean>;
  recordDeath: (finalMessage: string, killedBy?: string, nowPlaying?: { title: string; artist: string }) => Promise<void>;
  claimVictory: () => Promise<void>;
  
  // State helpers
  setHealth: (health: number) => void;
  setStamina: (stamina: number) => void;
  addToInventory: (item: { id: string; name: string; emoji: string }) => void;
  removeFromInventory: (itemId: string) => void;
  itemsFound: number;
  incrementItemsFound: () => void;
  clearError: () => void;
}

const initialState: GameState = {
  isAuthenticated: false,
  authId: null,
  authType: null,
  walletConnected: false,
  walletAddress: null,
  balance: null,
  nickname: null,
  showNicknameModal: false,
  isNewUser: false,
  guestProgressExists: false,
  sessionToken: null,
  stakeAmount: 0,
  currentRoom: 0,
  health: 100,
  stamina: 3,
  inventory: [],
  itemsFound: 0,
  dungeon: [],
  loading: false,
  error: null,
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const unifiedWallet = useUnifiedWallet();

  const updateState = useCallback((updates: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Sync wallet state from unified wallet
  useEffect(() => {
    updateState({
      walletConnected: unifiedWallet.connected,
      walletAddress: unifiedWallet.address,
    });
  }, [unifiedWallet.connected, unifiedWallet.address, updateState]);

  // Auto sign-in when wallet connects so DB nickname loads immediately
  useEffect(() => {
    if (unifiedWallet.connected && unifiedWallet.address && !state.isAuthenticated) {
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        authId: unifiedWallet.address!,
        authType: 'wallet',
        walletAddress: unifiedWallet.address,
      }));
    }
  }, [unifiedWallet.connected, unifiedWallet.address, state.isAuthenticated]);

  // Sync balance from unified wallet
  useEffect(() => {
    if (unifiedWallet.balance !== null) {
      updateState({ balance: unifiedWallet.balance });
    }
  }, [unifiedWallet.balance, updateState]);

  // Restore auth state on mount
  useEffect(() => {
    const restoreAuth = async () => {
      const [stored, guestProgressRaw] = await Promise.all([
        getStoredAuthState(),
        AsyncStorage.getItem(GUEST_PROGRESS_KEY),
      ]);

      updateState({ guestProgressExists: guestProgressRaw === 'true' });

      if (stored?.isAuthenticated) {
        updateState({
          isAuthenticated: true,
          authId: stored.authId,
          authType: stored.authType,
          walletAddress: stored.walletAddress,
        });
      }
    };
    restoreAuth();
  }, [updateState]);

  // Sync nickname when authenticated
  useEffect(() => {
    let cancelled = false;

    const syncNickname = async () => {
      if (!state.isAuthenticated || !state.authId) {
        return;
      }

      if (state.authType === 'wallet') {
        // ── Wallet auth: DB is the source of truth, always ──
        const result = await getOrCreatePlayerByAuth(
          state.authId,
          'wallet',
          state.walletAddress || undefined,
          // Never pass local nickname — DB wins unconditionally
        );

        if (cancelled) return; // logout may have fired while awaiting DB

        if (result) {
          const { player, isNew } = result;
          const dbNickname = player.nickname;
          const isDefaultNickname =
            dbNickname === 'Wanderer' ||
            (state.walletAddress &&
              dbNickname === `${state.walletAddress.slice(0, 4)}...${state.walletAddress.slice(-4)}`);

          // DB wins — overwrite local cache
          updateState({ nickname: dbNickname, isNewUser: isNew });
          await AsyncStorage.setItem(NICKNAME_STORAGE_KEY, dbNickname);

          // Prompt only for new wallet users with no real name set
          if (!cancelled) {
            const alreadyPrompted = await AsyncStorage.getItem(NICKNAME_PROMPTED_KEY);
            if (!cancelled && !alreadyPrompted && (isNew || isDefaultNickname)) {
              updateState({ showNicknameModal: true });
            }
          }
        }
      } else {
        // ── Guest auth: local storage is the source of truth ──
        const localNickname = await AsyncStorage.getItem(NICKNAME_STORAGE_KEY);
        const alreadyPrompted = await AsyncStorage.getItem(NICKNAME_PROMPTED_KEY);

        if (cancelled) return;

        if (localNickname) {
          updateState({ nickname: localNickname });
        }

        // Sync guest record with DB (no nickname override)
        const result = await getOrCreatePlayerByAuth(
          state.authId,
          'guest',
          undefined,
          localNickname || undefined,
        );

        if (cancelled) return;

        if (result) {
          const { isNew } = result;
          updateState({ isNewUser: isNew });

          // Prompt if new guest with no local name
          if (!alreadyPrompted && !localNickname) {
            updateState({ showNicknameModal: true });
          }
        }
      }
    };

    syncNickname();
    return () => { cancelled = true; };
  }, [state.isAuthenticated, state.authId, state.authType, state.walletAddress, updateState]);

  // Nickname actions
  const setNicknameAction = useCallback(async (name: string) => {
    const trimmed = name.slice(0, 16).trim();
    if (!trimmed) return;

    if (state.authType === 'wallet' && state.authId) {
      // Wallet user: write to DB first, then cache locally
      await updatePlayerNicknameByAuth(state.authId, trimmed);
      await AsyncStorage.setItem(NICKNAME_STORAGE_KEY, trimmed);
    } else {
      // Guest: local only
      await AsyncStorage.setItem(NICKNAME_STORAGE_KEY, trimmed);
    }

    await AsyncStorage.setItem(NICKNAME_PROMPTED_KEY, 'true');
    updateState({ nickname: trimmed, showNicknameModal: false, isNewUser: false });
  }, [state.authId, state.authType, updateState]);

  const dismissNicknameModal = useCallback(async () => {
    updateState({ showNicknameModal: false });
    await AsyncStorage.setItem(NICKNAME_PROMPTED_KEY, 'true');
  }, [updateState]);

  // Auth actions
  const signInWithWalletAction = useCallback(async () => {
    if (!unifiedWallet.connected || !unifiedWallet.address) {
      throw new Error('Wallet not connected');
    }

    updateState({ loading: true, error: null });
    try {
      // Get signMessage function from wallet
      // For now, we'll skip signature verification and just use wallet address as auth
      // TODO: Implement proper signature flow when wallet adapter supports signMessage
      const authState = await signInWithWallet(
        unifiedWallet.address,
        async (message: Uint8Array) => {
          // This would call wallet.signMessage(message)
          // For now, return a dummy signature (backend will need to handle this)
          throw new Error('signMessage not implemented - using direct auth');
        }
      );

      updateState({
        isAuthenticated: true,
        authId: authState.authId,
        authType: 'wallet',
        walletAddress: authState.walletAddress,
        isNewUser: authState.isNewUser,
        loading: false,
        // Don't show nickname modal here - let syncNickname useEffect handle it
        // after auth state is fully settled
      });
    } catch (err) {
      // Fall back to simple auth without signature
      console.log('[Auth] Signature flow failed, using simple auth:', err);
      
      updateState({
        isAuthenticated: true,
        authId: unifiedWallet.address,
        authType: 'wallet',
        walletAddress: unifiedWallet.address,
        loading: false,
      });
    }
  }, [unifiedWallet.connected, unifiedWallet.address, updateState]);

  const signInEmptyHandedAction = useCallback(async () => {
    updateState({ loading: true, error: null });
    try {
      const authState = await signInAsGuest();

      updateState({
        isAuthenticated: true,
        authId: authState.authId,
        authType: 'guest',
        // Keep connected wallet visible if present; guest mode should not hide it
        walletAddress: state.walletAddress,
        isNewUser: authState.isNewUser,
        guestProgressExists: true,
        loading: false,
        // Don't show nickname modal here - let syncNickname useEffect handle it
        // after auth state is fully settled
      });
      await AsyncStorage.setItem(GUEST_PROGRESS_KEY, 'true');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      updateState({ loading: false, error: errMsg });
      throw err;
    }
  }, [updateState, state.walletAddress]);

  const linkWalletAction = useCallback(async (): Promise<{ merged: boolean }> => {
    if (!unifiedWallet.connected || !unifiedWallet.address) {
      throw new Error('Wallet not connected');
    }
    if (state.authType !== 'guest') {
      throw new Error('Can only link wallet from guest account');
    }

    updateState({ loading: true, error: null });
    try {
      const result = await linkWalletToGuest(
        unifiedWallet.address,
        async (message: Uint8Array) => {
          throw new Error('signMessage not implemented');
        }
      );

      updateState({
        authId: unifiedWallet.address,
        authType: 'wallet',
        walletAddress: unifiedWallet.address,
        guestProgressExists: false,
        loading: false,
      });
      await AsyncStorage.removeItem(GUEST_PROGRESS_KEY);

      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      updateState({ loading: false, error: errMsg });
      throw err;
    }
  }, [unifiedWallet.connected, unifiedWallet.address, state.authType, updateState]);

  // Wallet actions (delegate to unified wallet)
  const connect = useCallback(async () => {
    updateState({ loading: true, error: null });
    try {
      const address = await unifiedWallet.connect();
      if (address) {
        updateState({
          walletConnected: true,
          walletAddress: address,
          balance: unifiedWallet.balance,
          loading: false,
        });
      } else {
        // null means redirect in progress or user cancelled - not an error
        // State will sync when returning from wallet app
        updateState({ loading: false });
      }
    } catch (err) {
      // Re-throw MULTIPLE_WALLETS so UI can show picker
      if (err instanceof Error && err.message === 'MULTIPLE_WALLETS') {
        updateState({ loading: false });
        throw err;
      }
      // Don't show error for user rejections / cancellations
      const errMsg = err instanceof Error ? err.message : String(err);
      const isCancellation =
        errMsg === 'WALLET_CANCELLED' ||
        errMsg.includes('User rejected') ||
        errMsg.includes('cancelled') ||
        errMsg.includes('Cancelled') ||
        errMsg.includes('CancellationException') ||
        errMsg.includes('user rejected') ||
        errMsg.includes('ACTION_CANCELLED');
      if (isCancellation) {
        updateState({ loading: false });
        throw Object.assign(new Error('WALLET_CANCELLED'), { isCancellation: true });
      }
      updateState({
        loading: false,
        error: errMsg || 'Failed to connect wallet',
      });
    }
  }, [updateState, unifiedWallet]);

  const connectTo = useCallback(async (connectorId: string) => {
    updateState({ loading: true, error: null });
    try {
      const address = await unifiedWallet.connectTo(connectorId);
      if (address) {
        updateState({
          walletConnected: true,
          walletAddress: address,
          balance: unifiedWallet.balance,
          loading: false,
        });
      } else {
        updateState({ loading: false });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isCancellation =
        errMsg === 'WALLET_CANCELLED' ||
        errMsg.includes('User rejected') ||
        errMsg.includes('cancelled') ||
        errMsg.includes('Cancelled') ||
        errMsg.includes('CancellationException') ||
        errMsg.includes('user rejected') ||
        errMsg.includes('ACTION_CANCELLED');
      if (isCancellation) {
        updateState({ loading: false });
        throw Object.assign(new Error('WALLET_CANCELLED'), { isCancellation: true });
      }
      updateState({
        loading: false,
        error: errMsg || 'Failed to connect wallet',
      });
    }
  }, [updateState, unifiedWallet]);

  const disconnect = useCallback(async () => {
    await unifiedWallet.disconnect();
    // Full logout — clear all auth + nickname state, return to zero
    await AsyncStorage.multiRemove([
      NICKNAME_STORAGE_KEY,
      NICKNAME_PROMPTED_KEY,
      GUEST_PROGRESS_KEY,
    ]);
    updateState({
      ...initialState,
      // Keep wallet hardware state cleared
      walletConnected: false,
      walletAddress: null,
      balance: null,
    });
  }, [updateState, unifiedWallet]);

  const refreshBalance = useCallback(async () => {
    if (!unifiedWallet.address) return;
    try {
      await unifiedWallet.refreshBalance();
      // Balance will sync via useEffect
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [unifiedWallet]);

  // Game actions
  const startGame = useCallback(async (amount: number, emptyHanded = false) => {
    updateState({ loading: true, error: null });
    try {
      let stakeTxSignature: string | undefined;
      // Use authId for player identity, fall back to wallet address or generate guest ID
      let playerIdentifier = state.authId || state.walletAddress || `guest-${Date.now()}`;

      if (!emptyHanded && (!state.walletAddress || !unifiedWallet.connected)) {
        throw new Error('Connect wallet first');
      }

      if (!emptyHanded && state.walletAddress && unifiedWallet.connected) {
        // Build escrow stake transaction
        const { hex: sessionIdHex, bytes: sessionIdBytes } = generateSessionId();
        const amountLamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
        
        // Build stake instruction for escrow program
        const stakeIx = buildStakeInstruction(
          state.walletAddress as Address,
          sessionIdBytes,
          amountLamports
        );
        
        // Create and send transaction
        const transaction = new Transaction().add(stakeIx);
        const signature = await unifiedWallet.signAndSendTransaction(transaction);
        
        stakeTxSignature = signature;
        playerIdentifier = state.walletAddress;
      }

      // Start session with backend (use authId as wallet address for session tracking)
      const session = await api.startSession(playerIdentifier, amount, stakeTxSignature);
      
      // Defensive: ensure we got a session token
      if (!session || !session.sessionToken) {
        throw new Error('Invalid session response from server');
      }
      
      // Generate dungeon client-side with full content system
      const dungeon = generateRandomDungeon();
      
      updateState({
        sessionToken: session.sessionToken,
        stakeAmount: emptyHanded ? 0 : amount,  // Empty handed stores 0 so isEmptyHanded works correctly
        currentRoom: 0,
        health: 100,
        stamina: 3,
        inventory: [],
        itemsFound: 0,
        dungeon,
        loading: false,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isCancellation =
        errMsg === 'WALLET_CANCELLED' ||
        errMsg.includes('CancellationException') ||
        errMsg.includes('User rejected') ||
        errMsg.includes('cancelled') ||
        errMsg.includes('Cancelled') ||
        errMsg.includes('ACTION_CANCELLED') ||
        errMsg.includes('user rejected');
      if (isCancellation) {
        updateState({ loading: false });
        throw Object.assign(new Error('WALLET_CANCELLED'), { isCancellation: true });
      }
      updateState({
        loading: false,
        error: errMsg || 'Failed to start game',
      });
      throw err;
    }
  }, [state.walletAddress, updateState]);

  const advance = useCallback(async (): Promise<boolean> => {
    if (!state.sessionToken) return false;
    
    const currentRoom = state.currentRoom;
    const nextRoom = currentRoom + 1;
    const maxRooms = state.dungeon?.length || 9;
    
    // Check if we've reached the end
    if (nextRoom >= maxRooms) {
      return false; // Can't advance past final room
    }
    
    // Update room client-side (dungeon is generated locally)
    updateState({
      currentRoom: nextRoom,
      stamina: Math.min(3, state.stamina + 1),
    });
    
    // Notify backend - send CURRENT room (1-indexed for server)
    // Client is 0-indexed, server is 1-indexed
    const serverRoom = currentRoom + 1;
    api.advanceRoom(state.sessionToken, serverRoom).catch((err) => {
      console.warn('[advance] Backend sync failed:', err);
      // Don't block on backend errors - client-side state is authoritative for mobile
    });
    
    return true;
  }, [state.sessionToken, state.currentRoom, state.stamina, state.dungeon?.length, updateState]);

  const recordDeathAction = useCallback(async (finalMessage: string, killedBy?: string, nowPlaying?: { title: string; artist: string }) => {
    if (!state.sessionToken) return;
    
    updateState({ loading: true });
    try {
      const room = (state.currentRoom || 0) + 1; // Room is 1-indexed for display
      // Use nickname first, fall back to formatted wallet address, then default
      const playerName = state.nickname || (state.walletAddress 
        ? `${state.walletAddress.slice(0, 4)}...${state.walletAddress.slice(-4)}`
        : 'Wanderer');
      
      await api.recordDeath(
        state.sessionToken, 
        room, 
        finalMessage, 
        state.inventory,
        killedBy,
        playerName,
        nowPlaying,
      );
      updateState({ loading: false });
    } catch (err) {
      updateState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to record death',
      });
    }
  }, [state.sessionToken, state.currentRoom, state.inventory, state.walletAddress, state.nickname, updateState]);

  const claimVictoryAction = useCallback(async () => {
    if (!state.sessionToken) return;
    
    updateState({ loading: true });
    try {
      await api.claimVictory(state.sessionToken);
      updateState({ loading: false });
    } catch (err) {
      updateState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to claim victory',
      });
    }
  }, [state.sessionToken, updateState]);

  // State helpers
  const setHealth = useCallback((health: number) => {
    updateState({ health });
  }, [updateState]);

  const setStamina = useCallback((stamina: number) => {
    updateState({ stamina });
  }, [updateState]);

  const addToInventory = useCallback((item: { id: string; name: string; emoji: string }) => {
    setState(prev => ({
      ...prev,
      inventory: [...prev.inventory, item],
    }));
  }, []);

  const removeFromInventory = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.filter(i => i.id !== itemId),
    }));
  }, []);

  const incrementItemsFound = useCallback(() => {
    setState(prev => ({ ...prev, itemsFound: (prev.itemsFound || 0) + 1 }));
  }, []);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const value: GameContextType = {
    ...state,
    // Auth actions
    signInWithWallet: signInWithWalletAction,
    signInEmptyHanded: signInEmptyHandedAction,
    linkWallet: linkWalletAction,
    // Wallet actions
    connect,
    connectTo,
    connectors: unifiedWallet.connectors,
    disconnect,
    refreshBalance,
    // Player actions
    setNickname: setNicknameAction,
    dismissNicknameModal,
    // Game actions
    startGame,
    advance,
    recordDeath: recordDeathAction as (finalMessage: string, killedBy?: string, nowPlaying?: { title: string; artist: string }) => Promise<void>,
    claimVictory: claimVictoryAction,
    // State helpers
    setHealth,
    setStamina,
    addToInventory,
    removeFromInventory,
    itemsFound: state.itemsFound || 0,
    incrementItemsFound,
    clearError,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
