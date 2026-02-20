import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';
import { generateRandomDungeon, DungeonRoom } from './content';
import { useUnifiedWallet, type Address } from './wallet/unified';
import { GAME_POOL_PDA, buildStakeInstruction, generateSessionId } from './solana/escrow';
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreatePlayer, updatePlayerNickname } from './instant';

const NICKNAME_STORAGE_KEY = 'die-forward-nickname';
const NICKNAME_PROMPTED_KEY = 'die-forward-nickname-prompted';

interface GameState {
  // Wallet
  walletConnected: boolean;
  walletAddress: string | null;
  balance: number | null;
  
  // Player
  nickname: string | null;
  showNicknameModal: boolean;
  
  // Session
  sessionToken: string | null;
  stakeAmount: number;
  currentRoom: number;
  health: number;
  stamina: number;
  inventory: { id: string; name: string; emoji: string }[];
  dungeon: DungeonRoom[];
  
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
  startGame: (amount: number, demoMode?: boolean) => Promise<void>;
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
  walletConnected: false,
  walletAddress: null,
  balance: null,
  nickname: null,
  showNicknameModal: false,
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

  // Sync balance from unified wallet
  useEffect(() => {
    if (unifiedWallet.balance !== null) {
      updateState({ balance: unifiedWallet.balance });
    }
  }, [unifiedWallet.balance, updateState]);

  // Sync nickname when wallet connects
  useEffect(() => {
    const syncNickname = async () => {
      if (!unifiedWallet.connected || !unifiedWallet.address) {
        updateState({ nickname: null, showNicknameModal: false });
        return;
      }

      // Check local storage first for fast load
      const localNickname = await AsyncStorage.getItem(NICKNAME_STORAGE_KEY);
      if (localNickname) {
        updateState({ nickname: localNickname });
      }

      // Sync with DB
      const player = await getOrCreatePlayer(unifiedWallet.address, localNickname || undefined);
      if (player) {
        const dbNickname = player.nickname;
        const isDefaultNickname = dbNickname === `${unifiedWallet.address.slice(0, 4)}...${unifiedWallet.address.slice(-4)}`;
        
        updateState({ nickname: dbNickname });
        await AsyncStorage.setItem(NICKNAME_STORAGE_KEY, dbNickname);

        // Check if we should show the nickname prompt (first time only)
        const alreadyPrompted = await AsyncStorage.getItem(NICKNAME_PROMPTED_KEY);
        if (!alreadyPrompted && isDefaultNickname) {
          updateState({ showNicknameModal: true });
        }
      }
    };

    syncNickname();
  }, [unifiedWallet.connected, unifiedWallet.address, updateState]);

  // Nickname actions
  const setNicknameAction = useCallback(async (name: string) => {
    const trimmed = name.slice(0, 16).trim();
    if (!trimmed || !state.walletAddress) return;

    updateState({ nickname: trimmed, showNicknameModal: false });
    await AsyncStorage.setItem(NICKNAME_STORAGE_KEY, trimmed);
    await AsyncStorage.setItem(NICKNAME_PROMPTED_KEY, 'true');
    await updatePlayerNickname(state.walletAddress, trimmed);
  }, [state.walletAddress, updateState]);

  const dismissNicknameModal = useCallback(async () => {
    updateState({ showNicknameModal: false });
    await AsyncStorage.setItem(NICKNAME_PROMPTED_KEY, 'true');
  }, [updateState]);

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
    updateState({
      walletConnected: false,
      walletAddress: null,
      balance: null,
      sessionToken: null,
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
  const startGame = useCallback(async (amount: number, demoMode = false) => {
    updateState({ loading: true, error: null });
    try {
      let stakeTxSignature: string | undefined;
      let walletAddress = state.walletAddress || 'demo-wallet';

      if (!demoMode && state.walletAddress && unifiedWallet.connected) {
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
        walletAddress = state.walletAddress;
      }

      // Start session with backend
      const session = await api.startSession(walletAddress, amount, stakeTxSignature);
      
      // Defensive: ensure we got a session token
      if (!session || !session.sessionToken) {
        throw new Error('Invalid session response from server');
      }
      
      // Generate dungeon client-side with full content system
      const dungeon = generateRandomDungeon();
      
      updateState({
        sessionToken: session.sessionToken,
        stakeAmount: demoMode ? 0 : amount,  // Free mode stores 0 so isEmptyHanded works correctly
        currentRoom: 0,
        health: 100,
        stamina: 3,
        inventory: [],
        itemsFound: 0,
        dungeon,
        loading: false,
      });
    } catch (err) {
      updateState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to start game',
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
      const playerName = state.walletAddress 
        ? `${state.walletAddress.slice(0, 4)}...${state.walletAddress.slice(-4)}`
        : undefined;
      
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
  }, [state.sessionToken, state.currentRoom, state.inventory, state.walletAddress, updateState]);

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
    connect,
    connectTo,
    connectors: unifiedWallet.connectors,
    disconnect,
    refreshBalance,
    setNickname: setNicknameAction,
    dismissNicknameModal,
    startGame,
    advance,
    recordDeath: recordDeathAction as (finalMessage: string, killedBy?: string, nowPlaying?: { title: string; artist: string }) => Promise<void>,
    claimVictory: claimVictoryAction,
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
