import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';
import { dlog } from './debug-log';

import { generateRandomDungeon, generateDungeon, DungeonRoom, getItemDetails, rollRandomItem } from './content';
import { getMilestonePerks } from './milestones';

// Pending item when inventory is full — includes full item details for the swap UI
export interface PendingInventoryItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  effect: string;
  type: 'consumable' | 'weapon' | 'artifact';
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
  artUrl?: string;
}
import { useUnifiedWallet, type Address } from './wallet/unified';
import { GAME_POOL_PDA, buildStakeInstruction, generateSessionId } from './solana/escrow';
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreatePlayerByAuth, updatePlayerNicknameByAuth, useGameSettings } from './instant';
import { signInWithWallet, signInAsGuest, signOut, linkWalletToGuest, getStoredAuthState, restoreInstantDBSession, type AuthState } from './auth';
import { createRunRng, generateRandomSeed, type SeededRng } from './seeded-random';
import { rollModifier, type RunModifier } from './modifiers';

const INVENTORY_MAX = 4;

const NICKNAME_STORAGE_KEY = 'die-forward-nickname';
const NICKNAME_PROMPTED_KEY = 'die-forward-nickname-prompted';
const GUEST_PROGRESS_KEY = 'die-forward-guest-progress';

const DEFAULT_NAMES = [
  'Wanderer', 'AshenpilgriM', 'HollowSeeker', 'Saltborn', 'Cairnwalker',
  'Unremembered', 'PaleVenture', 'GraveWarden', 'Tidecaller',
  'TheForsaken', 'MurkDelver', 'Bonepath', 'Driftborn',
];
function randomDefaultName(): string {
  return DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
}
const AUTH_STORAGE_KEY = 'die-forward-auth';   // mirrors auth.ts
const GUEST_ID_KEY = 'die-forward-guest-id';   // mirrors auth.ts


interface GameState {
  // Auth
  isAuthenticated: boolean;
  authId: string | null;
  authType: 'wallet' | 'guest' | 'email' | null;
  
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
  zoneId: string;
  currentRoom: number;
  health: number;
  stamina: number;
  inventory: { id: string; name: string; emoji: string }[];
  pendingItem: PendingInventoryItem | null;  // Item waiting to swap when inventory full
  dungeon: DungeonRoom[];
  itemsFound: number;
  seed: string | null;  // RNG seed for verifiable randomness
  currentModifier: RunModifier | null;  // Run modifier rolled at game start
  
  // UI state
  loading: boolean;
  error: string | null;
  authInitialized: boolean;  // retained for internal tracking only
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
  startGame: (amount: number, emptyHanded?: boolean, zoneId?: string, totalDeaths?: number) => Promise<void>;
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

  // Inventory management (4-slot limit)
  pendingItem: PendingInventoryItem | null;
  swapItem: (slotIndex: number) => void;
  dismissPendingItem: () => void;

  // Item effect helpers
  /** Apply Voidblade's per-turn 5 damage if present. Returns damage dealt (0 if not present). */
  applyVoidbladeEffect: () => number;
  /** Check for Death's Mantle death save when HP <= 0. Returns {saved, message}. */
  checkDeathSave: () => { saved: boolean; message: string | null };
  
  // RNG for verifiable randomness
  rng: SeededRng | null;

  // Run modifier (rolled at game start, persists for the run)
  currentModifier: RunModifier | null;

  // Modifier effect helpers — call these instead of raw values in combat/play screens
  /** Additional damage multiplier from the run modifier (e.g. 0.25 = +25%) */
  getModifiedDamageBonus: () => number;
  /** Healing multiplier after modifier penalty (e.g. 0.7 if healingPenalty = 0.3) */
  getModifiedHealMultiplier: () => number;
  /** Total stamina regen for a turn, factoring in modifier bonus */
  getModifiedStaminaRegen: (baseRegen: number) => number;
  /** Brace stamina cost, factoring in modifier (default 0, Iron Will = 1) */
  getModifiedBraceCost: (baseCost: number) => number;
  /** Whether brace should negate all damage (Iron Will) */
  modifierBraceNegatesAll: () => boolean;
  /** Corpse discovery chance with modifier bonus applied */
  getModifiedCorpseChance: (baseChance: number) => number;
  /** Whether enemy intent should be hidden on turn 1 of combat */
  modifierHidesFirstIntent: () => boolean;
  /** Max HP for this run (60 for Glass Cannon, 100 otherwise) */
  getMaxHp: () => number;
  /** Apply healing with modifier penalty and HP cap. Returns actual HP gained. */
  applyHealing: (baseAmount: number) => number;
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
  zoneId: 'sunken-crypt',
  currentRoom: 0,
  health: 100,
  stamina: 3,
  inventory: [],
  pendingItem: null,
  itemsFound: 0,
  dungeon: [],
  seed: null,
  currentModifier: null,
  loading: false,
  error: null,
  authInitialized: false,
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({
  children,
  migrationClearedStorage,
}: {
  children: ReactNode;
  migrationClearedStorage: boolean;
}) {
  const [state, setState] = useState<GameState>(initialState);
  const unifiedWallet = useUnifiedWallet();
  const { settings } = useGameSettings();
  const authRestoreStartedRef = useRef(false);

  const updateState = useCallback((updates: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    dlog('GameProvider', 'mounted');
    return () => dlog('GameProvider', 'UNMOUNTED');
  }, []);

  // Sync wallet state from unified wallet
  useEffect(() => {
    updateState({
      walletConnected: unifiedWallet.connected,
      walletAddress: unifiedWallet.address,
    });
  }, [unifiedWallet.connected, unifiedWallet.address, updateState]);

  // Keep a stable ref to signMessage — avoids including it in effect deps
  // (the MWA wallet object recreates signMessage on every state change, which would
  // cause auth flows to cancel/restart in a loop)
  const signMessageRef = useRef(unifiedWallet.signMessage);
  signMessageRef.current = unifiedWallet.signMessage;

  // Serialize wallet auth (connect/verify) so connect handler and effect fallback
  // can't trigger duplicate signature prompts.
  const walletAuthInFlightRef = useRef(false);

  const runWalletAuth = useCallback(async (address: string, source: 'connect' | 'effect' | 'manual') => {
    if (walletAuthInFlightRef.current) {
      dlog('Auth', `wallet auth already in flight, skipping duplicate (${source})`);
      return;
    }

    walletAuthInFlightRef.current = true;
    try {
      // Already verified for this wallet
      if (state.isAuthenticated && state.authType === 'wallet' && state.authId === address) {
        dlog('Auth', `wallet already verified (${source})`);
        return;
      }

      dlog('Auth', `wallet verify start (${source}) address=${address} authType=${state.authType}`);

      if (state.isAuthenticated && state.authType === 'guest') {
        // Upgrade: link existing guest session to wallet
        dlog('Auth', 'upgrading guest → wallet');
        await linkWalletToGuest(address, signMessageRef.current);
        dlog('Auth', 'guest → wallet upgrade complete');
        updateState({
          isAuthenticated: true,
          authId: address,
          authType: 'wallet' as const,
          walletAddress: address,
        });
      } else {
        // Fresh wallet sign-in (no prior auth)
        dlog('Auth', 'fresh wallet sign-in');
        const authState = await signInWithWallet(address, signMessageRef.current);
        dlog('Auth', 'fresh wallet sign-in complete');
        updateState({
          isAuthenticated: true,
          authId: authState.authId,
          authType: 'wallet' as const,
          walletAddress: authState.walletAddress,
        });
      }
    } catch (err) {
      dlog.error('Auth', `wallet verify failed (${source})`, err);
      throw err;
    } finally {
      walletAuthInFlightRef.current = false;
    }
  }, [state.isAuthenticated, state.authType, state.authId, updateState]);

  // Fallback auto-verify when wallet appears connected but explicit connect flow didn't run.
  useEffect(() => {
    if (!unifiedWallet.connected || !unifiedWallet.address) return;
    if (state.isAuthenticated && state.authType === 'wallet' && state.authId === unifiedWallet.address) return;

    runWalletAuth(unifiedWallet.address as string, 'effect').catch((err) => {
      updateState({ error: `Wallet sign-in failed: ${err instanceof Error ? err.message : String(err)}` });
    });
  }, [unifiedWallet.connected, unifiedWallet.address, state.isAuthenticated, state.authType, state.authId, runWalletAuth, updateState]);

  // Sync balance from unified wallet
  useEffect(() => {
    if (unifiedWallet.balance !== null) {
      updateState({ balance: unifiedWallet.balance });
    }
  }, [unifiedWallet.balance, updateState]);

  // Restore auth state on mount — always re-validate guest token with backend
  useEffect(() => {
    if (authRestoreStartedRef.current) return;
    authRestoreStartedRef.current = true;

    const restoreAuth = async () => {
      dlog('Auth', 'restoreAuth start');
      // Declare outside try so it's accessible in finally
      const stateUpdates: Partial<GameState> = {};
      try {
        const [stored, guestProgressRaw] = await Promise.all([
          getStoredAuthState(),
          AsyncStorage.getItem(GUEST_PROGRESS_KEY),
        ]);

        dlog('Auth', 'stored auth:', { type: stored?.authType, hasToken: !!stored?.customToken, guestProgress: guestProgressRaw });
        stateUpdates.guestProgressExists = guestProgressRaw === 'true';

        if (stored?.isAuthenticated && stored.authType === 'wallet') {
          // Wallet auth — restore game state. Only call signInWithToken when
          // migration cleared storage (fresh install or version change), since
          // InstantDB persists its own session in AsyncStorage on normal restarts.
          // Calling signInWithToken unnecessarily disrupts all queries and causes
          // a re-render cascade that overwhelms the JS thread.
          if (stored.customToken && migrationClearedStorage) {
            dlog('Auth', 'migration cleared storage, restoring wallet session via token');
            const restored = await restoreInstantDBSession(stored.customToken);
            dlog('Auth', 'wallet session restore result:', restored);
            if (!restored) {
              dlog.warn('Auth', 'stored token expired — wallet re-sign required on connect');
            }
          } else {
            dlog('Auth', 'normal restart, skipping signInWithToken (InstantDB session persisted)');
          }
          // Always restore game state from our stored auth
          Object.assign(stateUpdates, {
            isAuthenticated: true,
            authId: stored.authId,
            authType: stored.authType,
            walletAddress: stored.walletAddress,
          });
        } else if (!unifiedWallet.connected) {
          // Guest — always do a fresh sign-in to get a valid token + load player record immediately
          dlog('Auth', 'signing in as guest');
          try {
            const authState = await signInAsGuest();
            dlog('Auth', 'guest sign-in success:', authState.authId);
            Object.assign(stateUpdates, {
              isAuthenticated: true,
              authId: authState.authId,
              authType: 'guest' as const,
              walletAddress: null,
            });
          } catch (err) {
            dlog.warn('Auth', 'guest re-auth failed, falling back to stored', err);
            // Fall back to stored state if backend is unreachable
            if (stored?.isAuthenticated) {
              Object.assign(stateUpdates, {
                isAuthenticated: true,
                authId: stored.authId,
                authType: stored.authType,
                walletAddress: stored.walletAddress,
              });
            }
          }
        } else {
          dlog('Auth', 'wallet already connected, skipping guest sign-in');
        }
      } catch (err) {
        dlog.error('Auth', 'restoreAuth failed — proceeding as unauthenticated', err);
      } finally {
        dlog('Auth', 'restoreAuth complete, applying state:', stateUpdates);
        // ALWAYS mark auth as initialized so the home screen renders
        updateState({ ...stateUpdates, authInitialized: true });
      }
    };
    restoreAuth().catch(err => {
      dlog.error('Auth', 'restoreAuth unexpected rejection', err);
      updateState({ authInitialized: true });
    });
  }, [updateState, migrationClearedStorage, unifiedWallet.connected]);

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
            DEFAULT_NAMES.includes(dbNickname) ||
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
      
      // Sync to Tapestry (creates profile if needed, updates username)
      // This is non-blocking — fire and forget
      if (state.walletAddress) {
        api.syncProfileToTapestry(state.walletAddress, trimmed).catch(err => {
          console.warn('[Tapestry] Profile sync failed (non-fatal):', err);
        });
      }
    } else {
      // Guest: local only (no Tapestry profile for guests)
      await AsyncStorage.setItem(NICKNAME_STORAGE_KEY, trimmed);
    }

    await AsyncStorage.setItem(NICKNAME_PROMPTED_KEY, 'true');
    updateState({ nickname: trimmed, showNicknameModal: false, isNewUser: false });
  }, [state.authId, state.authType, state.walletAddress, updateState]);

  const dismissNicknameModal = useCallback(async () => {
    // Assign a random default name if the player has none
    const name = randomDefaultName();
    await AsyncStorage.setItem(NICKNAME_STORAGE_KEY, name);
    updateState({ showNicknameModal: false, nickname: name });
    await AsyncStorage.setItem(NICKNAME_PROMPTED_KEY, 'true');
  }, [updateState]);

  // Auth actions
  const signInWithWalletAction = useCallback(async () => {
    if (!unifiedWallet.connected || !unifiedWallet.address) {
      throw new Error('Wallet not connected');
    }

    updateState({ loading: true, error: null });
    try {
      await runWalletAuth(unifiedWallet.address, 'manual');
      updateState({ loading: false });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      updateState({ loading: false, error: errMsg });
      throw err;
    }
  }, [unifiedWallet.connected, unifiedWallet.address, runWalletAuth, updateState]);

  const signInEmptyHandedAction = useCallback(async () => {
    // Guard: if already wallet-authenticated, do not downgrade to guest.
    if (state.isAuthenticated && state.authType === 'wallet') {
      dlog('Auth', 'signInEmptyHanded skipped — already wallet-authenticated');
      return;
    }

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
  }, [updateState, state.walletAddress, state.isAuthenticated, state.authType]);

  const linkWalletAction = useCallback(async (): Promise<{ merged: boolean }> => {
    if (!unifiedWallet.connected || !unifiedWallet.address) {
      throw new Error('Wallet not connected');
    }
    if (state.authType !== 'guest') {
      throw new Error('Can only link wallet from guest account');
    }

    updateState({ loading: true, error: null });
    try {
      const result = await linkWalletToGuest(unifiedWallet.address, unifiedWallet.signMessage);

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
  }, [unifiedWallet, state.authType, updateState]);

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
        });

        // Verify immediately after connect (do not wait for effect/rerender)
        await runWalletAuth(address, 'connect');
        updateState({ loading: false });
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
      throw err;
    }
  }, [runWalletAuth, updateState, unifiedWallet]);

  const connectTo = useCallback(async (connectorId: string) => {
    updateState({ loading: true, error: null });
    try {
      const address = await unifiedWallet.connectTo(connectorId);
      if (address) {
        updateState({
          walletConnected: true,
          walletAddress: address,
          balance: unifiedWallet.balance,
        });

        // Verify immediately after connect (do not wait for effect/rerender)
        await runWalletAuth(address, 'connect');
        updateState({ loading: false });
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
      throw err;
    }
  }, [runWalletAuth, updateState, unifiedWallet]);

  const disconnect = useCallback(async () => {
    await unifiedWallet.disconnect();
    // Sign out of InstantDB (clears server session + AUTH_STORAGE_KEY in auth.ts)
    await signOut().catch(err => console.warn('[Auth] signOut error (ignored):', err));
    // Full logout — clear all local auth + nickname state, return to zero
    await AsyncStorage.multiRemove([
      NICKNAME_STORAGE_KEY,
      NICKNAME_PROMPTED_KEY,
      GUEST_PROGRESS_KEY,
      AUTH_STORAGE_KEY,
      GUEST_ID_KEY,
    ]);
    updateState({
      ...initialState,
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
  const startGame = useCallback(async (amount: number, emptyHanded = false, zoneId?: string, totalDeaths?: number) => {
    updateState({ loading: true, error: null });
    try {
      let stakeTxSignature: string | undefined;
      // Prefer live wallet address from provider, then fallback to restored auth state.
      let activeWalletAddress = (unifiedWallet.address || state.walletAddress) as Address | null;
      // Use authId for player identity, fall back to wallet address or generate guest ID
      let playerIdentifier = state.authId || activeWalletAddress || `guest-${Date.now()}`;

      if (!emptyHanded) {
        dlog('Stake', `startGame stake flow: providerConnected=${unifiedWallet.connected}, providerAddress=${unifiedWallet.address}, stateWallet=${state.walletAddress}`);

        // After force-close/reopen, auth state can restore before provider session does.
        // Reconnect here defensively if provider session is not live.
        if (!unifiedWallet.connected) {
          dlog.warn('Stake', 'provider not connected at stake start, attempting reconnect');
          try {
            const reconnected = await unifiedWallet.connect();
            if (reconnected) {
              activeWalletAddress = reconnected as Address;
              dlog('Stake', `reconnect success inside startGame: ${reconnected}`);
            }
          } catch (err) {
            dlog.error('Stake', 'reconnect inside startGame failed', err);
            throw new Error('Connect wallet first');
          }
        }

        activeWalletAddress = (unifiedWallet.address || activeWalletAddress || state.walletAddress) as Address | null;
        if (!activeWalletAddress) {
          throw new Error('Connect wallet first');
        }

        // Build escrow stake transaction
        const { bytes: sessionIdBytes } = generateSessionId();
        const amountLamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));

        const stakeIx = buildStakeInstruction(
          activeWalletAddress,
          sessionIdBytes,
          amountLamports
        );

        const transaction = new Transaction().add(stakeIx);
        dlog('Stake', `about to signAndSend stake tx, activeWallet=${activeWalletAddress}`);
        const signature = await unifiedWallet.signAndSendTransaction(transaction);

        stakeTxSignature = signature;
        playerIdentifier = activeWalletAddress;
        dlog('Stake', `stake tx sent: ${signature}`);
      }

      // Start session with backend
      // Pass authId separately for proper player tracking (guests + wallet users)
      const session = await api.startSession(
        (activeWalletAddress || state.walletAddress || playerIdentifier), // walletAddress for on-chain stuff
        emptyHanded ? 0 : amount,  // Empty handed runs have 0 stake
        stakeTxSignature,
        state.authId || playerIdentifier, // authId for player record lookup
        zoneId,
      );
      
      // Defensive: ensure we got a session token and seed
      if (!session || !session.sessionToken) {
        throw new Error('Invalid session response from server');
      }
      
      // Prefer VRF seed when available, otherwise use legacy/fallback seed
      // Falls back to client-generated seed if server doesn't provide one
      const seed = session.vrfSeed || session.seed || generateRandomSeed();
      console.log('[GameContext] Using run seed:', seed.slice(0, 16) + '...');
      
      // Roll run modifier deterministically from seed.
      // Use a dedicated RNG instance so the modifier roll is always the first
      // value consumed from the sequence — this keeps other rng calls stable.
      const modifierRng = createRunRng(seed);
      const modifier = rollModifier(modifierRng);
      console.log('[GameContext] Run modifier:', modifier.id);
      
      // Apply milestone perks
      const perks = getMilestonePerks(totalDeaths ?? 0);

      // Apply modifier starting overrides, factoring in milestone perks
      const startingHP = modifier.startingHP ?? (perks.bonusHp ? 110 : 100);
      const startingStamina = modifier.startingStamina ?? 3;

      // Starting item perk (250 deaths): give a random item at run start
      let initialInventory: { id: string; name: string; emoji: string }[] = [];
      if (perks.startingItem) {
        const excludes = perks.soulstoneUnlocked ? [] : ['Soulstone'];
        const startItemName = rollRandomItem(() => modifierRng.random(), undefined, excludes);
        const startItemDetails = getItemDetails(startItemName);
        initialInventory = [{
          id: `perk-start-${seed.slice(0, 8)}`,
          name: startItemName,
          emoji: startItemDetails?.emoji || '❓',
        }];
      }

      // BUG 2 FIX: Generate dungeon with the selected zone and a dedicated seeded RNG.
      // Use a separate RNG instance from the same seed so the modifier roll
      // doesn't offset the dungeon generation sequence.
      const mainRng = createRunRng(seed);
      const dungeon = generateDungeon(session.zoneId || zoneId || 'sunken-crypt', mainRng);
      
      updateState({
        sessionToken: session.sessionToken,
        stakeAmount: emptyHanded ? 0 : amount,  // Empty handed stores 0 so isEmptyHanded works correctly
        zoneId: session.zoneId || zoneId || 'sunken-crypt',
        currentRoom: 0,
        health: startingHP,
        stamina: startingStamina,
        inventory: initialInventory,
        itemsFound: 0,
        dungeon,
        seed,
        currentModifier: modifier,
        loading: false,
      });
    } catch (err) {
      dlog.error('Stake', 'startGame failed', err);
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
  }, [state.authId, state.walletAddress, unifiedWallet, updateState]);

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
    // Fix 9: use settings.staminaPool instead of hardcoded 3
    // Fix 3 (Revy): apply modifier staminaRegenBonus so Numbing Cold works between rooms too
    const staminaRegenBonus = state.currentModifier?.staminaRegenBonus ?? 0;
    updateState({
      currentRoom: nextRoom,
      stamina: Math.min(settings.staminaPool, state.stamina + 1 + staminaRegenBonus),
    });
    
    // Notify backend - send CURRENT room (1-indexed for server)
    // Client is 0-indexed, server is 1-indexed
    const serverRoom = currentRoom + 1;
    api.advanceRoom(state.sessionToken, serverRoom).catch((err) => {
      console.warn('[advance] Backend sync failed:', err);
      // Don't block on backend errors - client-side state is authoritative for mobile
    });
    
    return true;
  }, [state.sessionToken, state.currentRoom, state.stamina, state.dungeon?.length, settings.staminaPool, state.currentModifier, updateState]);

  const recordDeathAction = useCallback(async (finalMessage: string, killedBy?: string, nowPlaying?: { title: string; artist: string }) => {
    if (!state.sessionToken) return;
    
    updateState({ loading: true });
    try {
      const room = (state.currentRoom || 0) + 1; // Room is 1-indexed for display
      // Use nickname first, fall back to formatted wallet address, then default
      const playerName = state.nickname || (state.walletAddress 
        ? `${state.walletAddress.slice(0, 4)}...${state.walletAddress.slice(-4)}`
        : randomDefaultName());
      
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
    setState(prev => {
      if (prev.inventory.length >= INVENTORY_MAX) {
        // Inventory full — queue as pendingItem so UI can offer a swap
        const details = getItemDetails(item.name);
        const pending: PendingInventoryItem = details
          ? { ...details, id: item.id }
          : { id: item.id, name: item.name, emoji: item.emoji, description: '', effect: '', type: 'artifact' as const };
        return { ...prev, pendingItem: pending };
      }
      return { ...prev, inventory: [...prev.inventory, item] };
    });
  }, []);

  const removeFromInventory = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.filter(i => i.id !== itemId),
    }));
  }, []);

  const swapItem = useCallback((slotIndex: number) => {
    setState(prev => {
      if (!prev.pendingItem || slotIndex < 0 || slotIndex >= prev.inventory.length) return prev;
      const newInventory = [...prev.inventory];
      const newItem = { id: prev.pendingItem.id, name: prev.pendingItem.name, emoji: prev.pendingItem.emoji };
      newInventory[slotIndex] = newItem;
      return { ...prev, inventory: newInventory, pendingItem: null };
    });
  }, []);

  const dismissPendingItem = useCallback(() => {
    updateState({ pendingItem: null });
  }, [updateState]);

  const applyVoidbladeEffect = useCallback((): number => {
    let dmg = 0;
    setState(prev => {
      if (!prev.inventory.some(item => item.name === 'Voidblade')) return prev;
      dmg = 5;
      return { ...prev, health: Math.max(0, prev.health - 5) };
    });
    return dmg;
  }, []);

  const checkDeathSave = useCallback((): { saved: boolean; message: string | null } => {
    let result = { saved: false, message: null as string | null };
    setState(prev => {
      if (prev.health > 0) return prev;
      const mantleIndex = prev.inventory.findIndex(item => item.name === "Death's Mantle");
      if (mantleIndex === -1) return prev;
      result = { saved: true, message: "Death's Mantle shatters — you survive with 1 HP!" };
      const newInventory = prev.inventory.filter((_, i) => i !== mantleIndex);
      return { ...prev, health: 1, inventory: newInventory };
    });
    return result;
  }, []);

  const incrementItemsFound = useCallback(() => {
    setState(prev => ({ ...prev, itemsFound: (prev.itemsFound || 0) + 1 }));
  }, []);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Create RNG from seed (memoized to avoid recreating on every render)
  // Fix 4 (Revy): derive from sub-seed so gameplay RNG is independent of modifier/dungeon gen sequences
  const rng = useMemo(() => {
    return state.seed ? createRunRng(`${state.seed}-gameplay`) : null;
  }, [state.seed]);

  // ── Modifier helper functions ─────────────────────────────────────────────
  // All modifier effect logic lives here; combat/play screens stay clean.

  const getModifiedDamageBonus = useCallback((): number => {
    return state.currentModifier?.damageBonus ?? 0;
  }, [state.currentModifier]);

  const getModifiedHealMultiplier = useCallback((): number => {
    const penalty = state.currentModifier?.healingPenalty ?? 0;
    return 1 - penalty;
  }, [state.currentModifier]);

  const getModifiedStaminaRegen = useCallback((baseRegen: number): number => {
    const bonus = state.currentModifier?.staminaRegenBonus ?? 0;
    return baseRegen + bonus;
  }, [state.currentModifier]);

  const getModifiedBraceCost = useCallback((baseCost: number): number => {
    return state.currentModifier?.braceCost ?? baseCost;
  }, [state.currentModifier]);

  const modifierBraceNegatesAll = useCallback((): boolean => {
    return state.currentModifier?.braceNegatesAll ?? false;
  }, [state.currentModifier]);

  const getModifiedCorpseChance = useCallback((baseChance: number): number => {
    const bonus = state.currentModifier?.corpseChanceBonus ?? 0;
    return Math.min(1, baseChance + bonus);
  }, [state.currentModifier]);

  const modifierHidesFirstIntent = useCallback((): boolean => {
    return state.currentModifier?.hideFirstIntent ?? false;
  }, [state.currentModifier]);

  // Fix 2 (Revy): centralize healing so modifier penalty and HP cap apply everywhere
  const getMaxHp = useCallback((): number => {
    return state.currentModifier?.id === 'glass-cannon' ? 60 : 100;
  }, [state.currentModifier]);

  const applyHealing = useCallback((baseAmount: number): number => {
    const multiplier = 1 - (state.currentModifier?.healingPenalty ?? 0);
    const modified = Math.round(baseAmount * multiplier);
    const maxHp = state.currentModifier?.id === 'glass-cannon' ? 60 : 100;
    let actual = 0;
    setState(prev => {
      const newHp = Math.min(maxHp, prev.health + modified);
      actual = newHp - prev.health;
      return { ...prev, health: newHp };
    });
    return actual;
  }, [state.currentModifier]);

  // Memoize context value — prevents cascading re-renders to all useGame()
  // consumers when useGameSettings re-evaluates after signInWithToken.
  // Most action callbacks are stable (useCallback), so this memo is effective.
  const value = useMemo<GameContextType>(() => ({
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
    rng,
    // Inventory management
    pendingItem: state.pendingItem,
    swapItem,
    dismissPendingItem,
    // Item effect helpers
    applyVoidbladeEffect,
    checkDeathSave,
    // Modifier
    currentModifier: state.currentModifier,
    getModifiedDamageBonus,
    getModifiedHealMultiplier,
    getModifiedStaminaRegen,
    getModifiedBraceCost,
    modifierBraceNegatesAll,
    getModifiedCorpseChance,
    modifierHidesFirstIntent,
    getMaxHp,
    applyHealing,
  }), [
    state, unifiedWallet.connectors,
    signInWithWalletAction, signInEmptyHandedAction, linkWalletAction,
    connect, connectTo, disconnect, refreshBalance,
    setNicknameAction, dismissNicknameModal,
    startGame, advance, recordDeathAction, claimVictoryAction,
    setHealth, setStamina, addToInventory, removeFromInventory,
    incrementItemsFound, clearError, rng,
    swapItem, dismissPendingItem, applyVoidbladeEffect, checkDeathSave,
    getModifiedDamageBonus, getModifiedHealMultiplier, getModifiedStaminaRegen,
    getModifiedBraceCost, modifierBraceNegatesAll, getModifiedCorpseChance,
    modifierHidesFirstIntent, getMaxHp, applyHealing,
  ]);

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
