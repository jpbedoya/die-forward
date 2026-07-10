import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';
import { dlog } from './debug-log';

import { generateDungeonGraph, DungeonRoom, DungeonGraph, getItemDetails, rollRandomItem, getItemEffects } from './content';
import { isSideNode } from './traversal';
import { getMilestonePerks } from './milestones';
import { maxHpForModifier, computeHealAmount, computeDamageAmount, deathSaveOutcome, voidbladeDamage } from './combat-math';
import { initZoneStatus, type ZoneStatusState } from './zone-mechanics';
import { isWalletCancellation } from './wallet-utils';
import { t } from './i18n';

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
import { getOrCreatePlayerByAuth, updatePlayerNicknameByAuth, useGameSettings, updateHighestRoom } from './instant';
import { signInWithWallet, signInAsGuest, signInAsGuestLocal, signOut, linkWalletToGuest, getStoredAuthState, restoreInstantDBSession, type AuthState } from './auth';
import { createRunRng, generateRandomSeed, type SeededRng } from './seeded-random';
import { rollModifier, resolveModifier, type RunModifier } from './modifiers';
import { utcDayKey, getDailyShift, type DailyShift } from './world-shift';

const INVENTORY_MAX = 4;

/** Canon starting/regen-cap stamina. Must match DEFAULT_GAME_SETTINGS.staminaPool. */
export const STARTING_STAMINA = 4;

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
  /**
   * Canonical projection: the 1-based DEPTH of the current node in the run
   * graph, maintained on every move. (Phase 2a: was a 0-based room index.)
   */
  currentRoom: number;
  graph: DungeonGraph | null;        // Run dungeon graph (nodes + edges)
  currentNodeId: string | null;      // Id of the node the player is currently on
  path: string[];                    // Ordered node ids walked from startId
  /**
   * True once the current node's encounter has been resolved (combat won or
   * fled) but the player has NOT yet moved. Lets play.tsx offer the branch
   * choice on a resolved forking combat node instead of re-offering combat.
   * Cleared on every move (advance) and at run start.
   */
  nodeResolved: boolean;
  health: number;
  stamina: number;
  inventory: { id: string; name: string; emoji: string }[];
  pendingItem: PendingInventoryItem | null;  // Item waiting to swap when inventory full
  /**
   * Compat projection of `graph.nodes` flattened by ascending depth. Retained
   * so legacy consumers (play.tsx / combat.tsx / victory.tsx / death.tsx) keep
   * working until Tasks 5-6 migrate them to graph/currentNodeId traversal.
   */
  dungeon: DungeonRoom[];
  itemsFound: number;
  seed: string | null;  // RNG seed for verifiable randomness
  currentModifier: RunModifier | null;  // Run modifier rolled at game start
  dailyShift: DailyShift | null;        // Active daily world shift for this run (null if disabled)
  zoneStatus: ZoneStatusState;          // Per-zone combat status effects (burn/chill/infection/clarity)
  
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
  startGame: (amount: number, emptyHanded?: boolean, zoneId?: string, totalDeaths?: number, chosenModifierId?: string) => Promise<void>;
  advance: (toNodeId?: string) => Promise<boolean>;
  /** Mark the current node's encounter as resolved (combat won/fled) without moving. */
  markNodeResolved: () => void;
  recordDeath: (finalMessage: string, killedBy?: string, nowPlaying?: { title: string; artist: string }) => Promise<void>;
  claimVictory: () => Promise<void>;
  
  // State helpers
  setHealth: (health: number) => void;
  setStamina: (stamina: number) => void;
  /**
   * Adjust stamina relative to the CURRENT value via a functional state
   * update (not the render-closure `stamina`), floored at 0 and capped at
   * `settings.staminaPool`. Use this for regen/drain writes so a same-tick
   * cost applied via `setStamina` earlier in the tick isn't clobbered by a
   * stale-closure absolute write. Returns the resulting stamina.
   */
  adjustStamina: (delta: number) => number;
  setZoneStatus: (status: ZoneStatusState) => void;
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
  /**
   * Check for Death's Mantle death save when HP <= 0. Pass the freshly
   * computed post-damage health explicitly — the provider's `state.health`
   * is the last-render value and, at every call site, the fatal damage was
   * written in the same tick, so reading it here would see pre-damage
   * (positive) health and never fire the save. Returns {saved, message}.
   */
  checkDeathSave: (currentHealth: number) => { saved: boolean; message: string | null };
  
  // RNG for verifiable randomness
  rng: SeededRng | null;

  // Run modifier (rolled at game start, persists for the run)
  currentModifier: RunModifier | null;
  // Active daily world shift for this run (null when disabled or before a run starts)
  dailyShift: DailyShift | null;

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
  /**
   * Apply damage relative to the CURRENT health via a functional state
   * update (not the render-closure `health` value), floored at 0. Returns
   * the resulting health so callers can immediately act on it (e.g. a
   * death check) without waiting for a re-render. Use this instead of
   * `setHealth(health - amount)` any time another functional update (like
   * `applyHealing`) may have landed earlier in the same tick.
   */
  applyDamage: (amount: number) => number;
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
  graph: null,
  currentNodeId: null,
  path: [],
  nodeResolved: false,
  health: 100,
  stamina: STARTING_STAMINA,
  inventory: [],
  pendingItem: null,
  itemsFound: 0,
  dungeon: [],
  seed: null,
  currentModifier: null,
  dailyShift: null,
  zoneStatus: initZoneStatus(),
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

  // Tracks whether the last network attempt revealed the device to be offline.
  // Lets the empty-handed start path skip a redundant second timeout (guest auth
  // already failed → session start will too). Reset on any successful call.
  const offlineRef = useRef(false);

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

        // Show nickname modal immediately based on local state — don't wait for DB.
        // DB write can fail silently on Safari (InstantDB WebSocket issues), so
        // decouple the prompt from the DB sync.
        if (!alreadyPrompted && !localNickname) {
          updateState({ showNicknameModal: true });
        }

        // Sync guest record with DB in background (best-effort, non-blocking)
        getOrCreatePlayerByAuth(
          state.authId!,
          'guest',
          undefined,
          localNickname || undefined,
        ).then((result) => {
          if (cancelled || !result) return;
          updateState({ isNewUser: result.isNew });
        }).catch((err) => {
          console.warn('[syncNickname] DB sync failed (non-fatal):', err);
        });
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
      let authState: AuthState;
      try {
        authState = await signInAsGuest();
        offlineRef.current = false;
      } catch (err) {
        // Offline empty-handed: fall back to a local guest identity so the run
        // can still start. Any non-offline error still surfaces normally.
        if (!api.isOfflineError(err)) throw err;
        dlog.warn('Auth', 'guest sign-in offline — using local guest identity');
        offlineRef.current = true;
        authState = await signInAsGuestLocal();
      }

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
      if (isWalletCancellation(err)) {
        updateState({ loading: false });
        throw Object.assign(new Error('WALLET_CANCELLED'), { isCancellation: true });
      }
      const errMsg = err instanceof Error ? err.message : String(err);
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
      if (isWalletCancellation(err)) {
        updateState({ loading: false });
        throw Object.assign(new Error('WALLET_CANCELLED'), { isCancellation: true });
      }
      const errMsg = err instanceof Error ? err.message : String(err);
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
  const startGame = useCallback(async (amount: number, emptyHanded = false, zoneId?: string, totalDeaths?: number, chosenModifierId?: string) => {
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

      // Start session with backend.
      // Empty-handed runs can start fully offline: if the backend is unreachable
      // we mint a local session and play client-authoritatively (death/score sync
      // is best-effort and simply skipped — see isOfflineSession guards below).
      // Staked runs always require the server, so they keep throwing on failure.
      const buildLocalSession = (): api.StartSessionResponse => ({
        success: true,
        sessionToken: api.OFFLINE_SESSION_PREFIX + generateRandomSeed().slice(0, 32),
        zone: zoneId || 'sunken-crypt',
        zoneId,
        seed: generateRandomSeed(),
        seedSource: 'legacy',
      });

      let session: api.StartSessionResponse;
      if (emptyHanded && offlineRef.current) {
        // Guest auth already detected offline this flow — skip the redundant timeout.
        dlog.warn('Stake', 'starting empty-handed run offline (cached offline state)');
        session = buildLocalSession();
      } else {
        try {
          // Pass authId separately for proper player tracking (guests + wallet users)
          session = await api.startSession(
            (activeWalletAddress || state.walletAddress || playerIdentifier), // walletAddress for on-chain stuff
            emptyHanded ? 0 : amount,  // Empty handed runs have 0 stake
            stakeTxSignature,
            state.authId || playerIdentifier, // authId for player record lookup
            zoneId,
          );
          offlineRef.current = false;
        } catch (err) {
          if (!emptyHanded || !api.isOfflineError(err)) throw err;
          dlog.warn('Stake', 'session start offline — starting empty-handed run locally');
          offlineRef.current = true;
          session = buildLocalSession();
        }
      }

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
      // ALWAYS roll (consumes exactly one pick from modifierRng) so the
      // downstream perk starting-item roll sees an identical stream whether or
      // not the player supplied a choice. Then let a valid chosen id override.
      const rolled = rollModifier(modifierRng);
      const modifier = resolveModifier(chosenModifierId, rolled);
      console.log('[GameContext] Run modifier:', modifier.id);
      
      // Apply milestone perks
      const perks = getMilestonePerks(totalDeaths ?? 0);

      // Apply modifier starting overrides, factoring in milestone perks
      const startingHP = modifier.startingHP ?? (perks.bonusHp ? 110 : 100);
      const startingStamina = modifier.startingStamina ?? STARTING_STAMINA;

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
      // Resolve the zone once and reuse it for both the daily shift lookup and
      // dungeon generation so they can never diverge.
      const resolvedZoneId = session.zoneId || zoneId || 'sunken-crypt';
      const dayKey = utcDayKey();
      const shift = settings.dailyShiftEnabled ? getDailyShift(resolvedZoneId, dayKey) : undefined;
      const graph = generateDungeonGraph(resolvedZoneId, mainRng, shift);
      // Compat projection for legacy consumers: nodes flattened by ascending
      // depth. Tasks 5-6 remove this once screens traverse the graph directly.
      const dungeon: DungeonRoom[] = Object.values(graph.nodes).sort((a, b) => a.depth - b.depth);

      updateState({
        sessionToken: session.sessionToken,
        stakeAmount: emptyHanded ? 0 : amount,  // Empty handed stores 0 so isEmptyHanded works correctly
        zoneId: session.zoneId || zoneId || 'sunken-crypt',
        graph,
        currentNodeId: graph.startId,
        path: [graph.startId],
        nodeResolved: false,
        currentRoom: 1,  // 1-based depth of the start node
        health: startingHP,
        stamina: startingStamina,
        inventory: initialInventory,
        itemsFound: 0,
        dungeon,
        seed,
        currentModifier: modifier,
        dailyShift: shift ?? null,
        zoneStatus: initZoneStatus(),
        loading: false,
      });
    } catch (err) {
      dlog.error('Stake', 'startGame failed', err);
      if (isWalletCancellation(err)) {
        updateState({ loading: false });
        throw Object.assign(new Error('WALLET_CANCELLED'), { isCancellation: true });
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      updateState({
        loading: false,
        error: errMsg || 'Failed to start game',
      });
      throw err;
    }
  }, [state.authId, state.walletAddress, unifiedWallet, updateState, settings.dailyShiftEnabled]);

  const advance = useCallback(async (toNodeId?: string): Promise<boolean> => {
    if (!state.sessionToken) return false;

    const graph = state.graph;
    const currentNodeId = state.currentNodeId;
    if (!graph || !currentNodeId) return false;

    const current = graph.nodes[currentNodeId];
    if (!current) return false;

    // Candidate edges from the current node.
    const candidates = current.next;
    if (candidates.length === 0) return false; // Terminal node — can't advance

    // Default to the first edge; an explicit target must be a valid choice.
    const targetId = toNodeId ?? candidates[0];
    if (!candidates.includes(targetId)) return false;

    const targetNode = graph.nodes[targetId];
    if (!targetNode) return false;

    // Server sync sends the CURRENT (pre-move) room as a 1-based depth — the
    // node's own depth is already 1-based, so this preserves prior semantics.
    const serverRoom = current.depth;

    // Fix 3 (Revy): apply modifier staminaRegenBonus so Numbing Cold works between rooms too.
    const staminaRegenBonus = state.currentModifier?.staminaRegenBonus ?? 0;
    // Functional update: derive stamina from `prev` (not the render-closure
    // `state.stamina`) so a same-tick stamina cost isn't clobbered. currentRoom
    // becomes the target node's 1-based depth (canonical projection).
    setState((prev) => ({
      ...prev,
      currentNodeId: targetId,
      path: [...prev.path, targetId],
      currentRoom: targetNode.depth,
      nodeResolved: false,
      stamina: Math.min(settings.staminaPool, prev.stamina + 1 + staminaRegenBonus),
    }));

    // Side-node detours are invisible to the server: skip BOTH api.advanceRoom
    // AND updateHighestRoom. A side node shares the source's depth and its own
    // outgoing edges are ordinary depth+1 descents, so the sequence
    // A(d) -> S(d, no sync) -> C(d+1) later sends fromRoom=d exactly as a plain
    // A(d) -> C(d+1) would have — the server's room counter never sees the
    // detour and stays consistent. highestRoom likewise never advances on a
    // same-depth side move. The local move above (path/currentNodeId/
    // currentRoom/stamina/nodeResolved) has already applied identically.
    if (isSideNode(targetNode)) {
      return true;
    }

    // Notify backend — send CURRENT (pre-move) room, already 1-based. Offline
    // runs have no server session, so skip the sync entirely.
    if (!api.isOfflineSession(state.sessionToken)) {
      api.advanceRoom(state.sessionToken, serverRoom).catch((err) => {
        console.warn('[advance] Backend sync failed:', err);
        // Don't block on backend errors - client-side state is authoritative for mobile
      });
    }

    // Persist highest room reached for zone unlock progression (fire-and-forget).
    // BUG FIX: write the 1-based depth of the node just reached (previously a
    // 0-based value), unifying with the web routes' 1-based writes.
    // updateHighestRoom only writes if this exceeds the current stored value.
    if (state.authId) {
      updateHighestRoom(state.authId, targetNode.depth).catch((err) => {
        console.warn('[advance] Failed to update highest room:', err);
      });
    }

    return true;
  }, [state.sessionToken, state.graph, state.currentNodeId, settings.staminaPool, state.currentModifier, state.authId]);

  const markNodeResolved = useCallback(() => {
    updateState({ nodeResolved: true });
  }, [updateState]);

  const recordDeathAction = useCallback(async (finalMessage: string, killedBy?: string, nowPlaying?: { title: string; artist: string }) => {
    if (!state.sessionToken) return;
    // Offline empty-handed run: no server session exists to record against.
    // Best-effort sync is skipped so no spurious "Failed to record death" toast.
    if (api.isOfflineSession(state.sessionToken)) return;

    updateState({ loading: true });
    try {
      const room = state.currentRoom || 1; // currentRoom is already the 1-based depth
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
        state.currentNodeId ?? undefined,
      );
      updateState({ loading: false });
    } catch (err) {
      updateState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to record death',
      });
    }
  }, [state.sessionToken, state.currentRoom, state.currentNodeId, state.inventory, state.walletAddress, state.nickname, updateState]);

  const claimVictoryAction = useCallback(async () => {
    if (!state.sessionToken) return;
    // Offline empty-handed run: no server session / no reward to claim.
    if (api.isOfflineSession(state.sessionToken)) return;

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

  const adjustStamina = useCallback((delta: number): number => {
    let result = 0;
    setState(prev => {
      result = Math.max(0, Math.min(settings.staminaPool, prev.stamina + delta));
      return { ...prev, stamina: result };
    });
    return result;
  }, [settings.staminaPool]);

  const setZoneStatus = useCallback((status: ZoneStatusState) => {
    updateState({ zoneStatus: status });
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
    const dmg = voidbladeDamage(state.inventory, getItemEffects(state.inventory));
    if (dmg > 0) {
      setState(prev => ({ ...prev, health: Math.max(0, prev.health - dmg) }));
    }
    return dmg;
  }, [state.inventory]);

  const checkDeathSave = useCallback((currentHealth: number): { saved: boolean; message: string | null } => {
    const outcome = deathSaveOutcome(currentHealth, state.inventory, getItemEffects(state.inventory));
    if (!outcome.saved) return { saved: false, message: null };
    // Heal to `healTo` via a functional update to a fixed value — this does
    // not race with a same-tick damage write (it sets an absolute target).
    setState(prev => ({
      ...prev,
      health: outcome.healTo,
      inventory: prev.inventory.filter((_, i) => i !== outcome.mantleIndex),
    }));
    return {
      saved: true,
      message: outcome.healTo > 1 ? t('item.mantle.saveStrong') : t('item.mantle.save'),
    };
  }, [state.inventory]);

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
    return maxHpForModifier(state.currentModifier);
  }, [state.currentModifier]);

  const applyHealing = useCallback((baseAmount: number): number => {
    let actual = 0;
    setState(prev => {
      const { newHealth, healed } = computeHealAmount(baseAmount, state.currentModifier, prev.health);
      actual = healed;
      return { ...prev, health: newHealth };
    });
    return actual;
  }, [state.currentModifier]);

  // Mirrors applyHealing: functional update against prev.health (not the
  // stale render-closure `state.health`) so damage applied later in the
  // same tick — e.g. pounce's free hit right after a Herbs heal — composes
  // correctly instead of clobbering an earlier same-tick update.
  const applyDamage = useCallback((amount: number): number => {
    let resultHealth = 0;
    setState(prev => {
      const { newHealth } = computeDamageAmount(amount, prev.health);
      resultHealth = newHealth;
      return { ...prev, health: newHealth };
    });
    return resultHealth;
  }, []);

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
    markNodeResolved,
    recordDeath: recordDeathAction as (finalMessage: string, killedBy?: string, nowPlaying?: { title: string; artist: string }) => Promise<void>,
    claimVictory: claimVictoryAction,
    // State helpers
    setHealth,
    setStamina,
    adjustStamina,
    setZoneStatus,
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
    dailyShift: state.dailyShift,
    getModifiedDamageBonus,
    getModifiedHealMultiplier,
    getModifiedStaminaRegen,
    getModifiedBraceCost,
    modifierBraceNegatesAll,
    getModifiedCorpseChance,
    modifierHidesFirstIntent,
    getMaxHp,
    applyHealing,
    applyDamage,
  }), [
    state, unifiedWallet.connectors,
    signInWithWalletAction, signInEmptyHandedAction, linkWalletAction,
    connect, connectTo, disconnect, refreshBalance,
    setNicknameAction, dismissNicknameModal,
    startGame, advance, markNodeResolved, recordDeathAction, claimVictoryAction,
    setHealth, setStamina, adjustStamina, setZoneStatus, addToInventory, removeFromInventory,
    incrementItemsFound, clearError, rng,
    swapItem, dismissPendingItem, applyVoidbladeEffect, checkDeathSave,
    getModifiedDamageBonus, getModifiedHealMultiplier, getModifiedStaminaRegen,
    getModifiedBraceCost, modifierBraceNegatesAll, getModifiedCorpseChance,
    modifierHidesFirstIntent, getMaxHp, applyHealing, applyDamage,
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
