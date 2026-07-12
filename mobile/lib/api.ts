// API client for Die Forward backend
// Full dungeon generation is now in lib/content.ts

import { Platform } from 'react-native';
import { getAuthToken } from './auth';

// Determine API base URL:
// - Web production (dieforward.com or www.dieforward.com): relative paths
// - Web dev (localhost): use production API with CORS
// - Native (iOS/Android): use production API
// Note: Must use www.dieforward.com to avoid 307 redirect which breaks CORS
function getApiBase(): string {
  if (Platform.OS !== 'web') {
    return 'https://www.dieforward.com';
  }
  // On web, check if we're on the production domain
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'dieforward.com' || 
       window.location.hostname === 'www.dieforward.com')) {
    return ''; // Use relative paths on production
  }
  // Dev mode on web - use production API (CORS enabled)
  return 'https://www.dieforward.com';
}

export const API_BASE = getApiBase();

// Builds the Authorization header for identity-bearing requests from the
// current InstantDB customToken (see auth.ts's getAuthToken/setAuthToken
// registry). Offline-local guests and pre-login callers have no token — in
// that case the header is omitted entirely (the server degrades to
// free/unbound runs; it never blocks the request for a missing header).
export function authHeaders(token: string | null = getAuthToken()): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Offline support for empty-handed runs.
// When the network is unreachable, an empty-handed run starts with a locally
// minted session token instead of a server-issued one. These helpers let the
// rest of the app detect that situation and skip best-effort backend syncs.
export const OFFLINE_SESSION_PREFIX = 'offline-';

export function isOfflineSession(token: string | null | undefined): boolean {
  return !!token && token.startsWith(OFFLINE_SESSION_PREFIX);
}

// Treat connectivity loss / hung requests as "offline". A non-ok HTTP response
// (server reachable but rejecting) is NOT offline — it still surfaces normally.
export function isOfflineError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  return e.name === 'AbortError' || /network request failed/i.test(e.message || '');
}

// Run a fetch with an abort-based timeout so a hung/captive-portal connection
// rejects (as an offline error) instead of blocking the run start indefinitely.
async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface GameSession {
  sessionToken: string;
  walletAddress: string;
  stakeAmount: number;
  currentRoom: number;
  health: number;
  stamina: number;
  inventory: { id: string; name: string; emoji: string }[];
  dungeon: DungeonRoom[];
}

export interface DungeonRoom {
  type: 'explore' | 'combat' | 'corpse' | 'cache' | 'exit';
  narrative: string;
  enemy?: string;
}

export interface StartSessionResponse {
  success: boolean;
  sessionToken: string;
  zone: string;
  zoneId?: string;
  seed: string;  // Legacy/fallback RNG seed
  vrfSeed?: string; // Optional VRF seed when ER+VRF path is ready
  enableVrf?: boolean;
  seedSource?: 'legacy' | 'vrf' | 'vrf-pending';
  message?: string;
}

export interface AdvanceResponse {
  success: boolean;
  currentRoom: number;
  message?: string;
}

export interface DeathResponse {
  success: boolean;
  deathId?: string;
  message?: string;
}

export interface VictoryResponse {
  success: boolean;
  reward?: number;
  txSignature?: string;
  message?: string;
  /** Server settlement status. `coins_pending` = retryable coin-settlement failure. */
  payoutStatus?: string;
  /** True when the failure is retryable (coin settlement) and the run is NOT finalized. */
  retryable?: boolean;
}

// Start a new game session
export async function startSession(
  walletAddress: string,
  stakeAmount: number,
  stakeTxSignature?: string,
  authId?: string,
  zoneId?: string,
  stakeMode?: 'sol' | 'coins' | 'free',
  coinStake?: number,
  chosenModifierId?: string,
  dailyShiftEnabled?: boolean,
): Promise<StartSessionResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/api/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      walletAddress,
      stakeAmount,
      stakeTxSignature,
      authId, // Unique player identifier (InstantDB auth ID)
      zoneId,
      stakeMode,
      coinStake,
      chosenModifierId,
      dailyShiftEnabled,
      // Demo mode if no signature
      demoMode: !stakeTxSignature,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start session');
  }

  return response.json();
}

// Advance to the next room
export async function advanceRoom(
  sessionToken: string,
  fromRoom: number
): Promise<AdvanceResponse> {
  const response = await fetch(`${API_BASE}/api/session/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ sessionToken, fromRoom }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to advance');
  }

  return response.json();
}

// Record death
export async function recordDeath(
  sessionToken: string,
  room: number,
  finalMessage: string,
  inventory: { id: string; name: string; emoji: string }[],
  killedBy?: string,
  playerName?: string,
  nowPlaying?: { title: string; artist: string },
  nodeId?: string,
): Promise<DeathResponse> {
  const response = await fetch(`${API_BASE}/api/session/death`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      sessionToken,
      room,
      finalMessage,
      inventory,
      killedBy,
      playerName,
      nowPlayingTitle: nowPlaying?.title,
      nowPlayingArtist: nowPlaying?.artist,
      nodeId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to record death');
  }

  return response.json();
}

// Claim victory
export async function claimVictory(
  sessionToken: string
): Promise<VictoryResponse> {
  const response = await fetch(`${API_BASE}/api/session/victory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ sessionToken }),
  });

  const data = await response.json().catch(() => ({} as VictoryResponse));

  if (!response.ok) {
    // A RETRYABLE coin-settlement failure (503 + retryable) is surfaced as a
    // structured result, NOT thrown: the run is still 'active' server-side and
    // the caller must be able to leave it un-finalized and retry rather than
    // treat it as a terminal error.
    if (data?.retryable) {
      return data as VictoryResponse;
    }
    throw new Error((data as { error?: string })?.error || 'Failed to claim victory');
  }

  return data as VictoryResponse;
}

// Get leaderboard
export async function getLeaderboard(): Promise<{
  players: { name: string; wins: number; deaths: number; deepestRoom: number }[];
}> {
  const response = await fetch(`${API_BASE}/api/leaderboard`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return response.json();
}

// Sync player profile to Tapestry (call after nickname change)
export async function syncProfileToTapestry(
  walletAddress: string,
  nickname: string,
): Promise<{ ok: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/api/player/sync-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ walletAddress, nickname }),
    });

    if (!response.ok) {
      console.warn('[Tapestry] sync-profile failed:', response.status);
      return { ok: false };
    }

    return response.json();
  } catch (err) {
    // Non-fatal — Tapestry sync should never break the game
    console.warn('[Tapestry] sync-profile error:', err);
    return { ok: false };
  }
}

// Like a death entry (🕯️)
export async function likeDeath(
  deathId: string,
  walletAddress: string,
): Promise<{ likeCount: number }> {
  const response = await fetch(`${API_BASE}/api/tapestry/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ deathId, walletAddress }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to like');
  }

  return response.json();
}

// Report a death/corpse's UGC (final words) for moderation review. Best-effort:
// never throws — a failed report should never interrupt the run or the UI.
export async function reportUGC(deathId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/moderation/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ deathId }),
    });
  } catch {
    /* best-effort */
  }
}
