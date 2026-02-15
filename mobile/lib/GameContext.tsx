import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import * as api from './api';
import { generateRandomDungeon, DungeonRoom } from './content';
import { useUnifiedWallet, type Address } from './wallet/unified';
import { GAME_POOL_PDA } from './solana/escrow';

interface GameState {
  // Wallet
  walletConnected: boolean;
  walletAddress: string | null;
  balance: number | null;
  
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

interface GameContextType extends GameState {
  // Wallet actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  
  // Game actions
  startGame: (amount: number, demoMode?: boolean) => Promise<void>;
  advance: () => Promise<boolean>;
  recordDeath: (finalMessage: string, killedBy?: string) => Promise<void>;
  claimVictory: () => Promise<void>;
  
  // State helpers
  setHealth: (health: number) => void;
  setStamina: (stamina: number) => void;
  addToInventory: (item: { id: string; name: string; emoji: string }) => void;
  clearError: () => void;
}

const initialState: GameState = {
  walletConnected: false,
  walletAddress: null,
  balance: null,
  sessionToken: null,
  stakeAmount: 0,
  currentRoom: 0,
  health: 100,
  stamina: 3,
  inventory: [],
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
        updateState({ loading: false });
      }
    } catch (err) {
      updateState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to connect wallet',
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
        // Real stake transaction via unified wallet
        const signature = await unifiedWallet.sendSOL(
          GAME_POOL_PDA, // Game pool PDA (typed as Address)
          amount
        );
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
        stakeAmount: amount,
        currentRoom: 0,
        health: 100,
        stamina: 3,
        inventory: [],
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
    
    const nextRoom = state.currentRoom + 1;
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
    
    // Optionally notify backend (fire and forget, don't block on it)
    api.advanceRoom(state.sessionToken, nextRoom).catch(() => {
      // Ignore backend errors - client-side state is authoritative for mobile
    });
    
    return true;
  }, [state.sessionToken, state.currentRoom, state.stamina, state.dungeon?.length, updateState]);

  const recordDeathAction = useCallback(async (finalMessage: string, killedBy?: string) => {
    if (!state.sessionToken) return;
    
    updateState({ loading: true });
    try {
      await api.recordDeath(state.sessionToken, finalMessage, killedBy);
      updateState({ loading: false });
    } catch (err) {
      updateState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to record death',
      });
    }
  }, [state.sessionToken, updateState]);

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

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const value: GameContextType = {
    ...state,
    connect,
    disconnect,
    refreshBalance,
    startGame,
    advance,
    recordDeath: recordDeathAction,
    claimVictory: claimVictoryAction,
    setHealth,
    setStamina,
    addToInventory,
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
