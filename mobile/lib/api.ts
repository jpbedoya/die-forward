// API client for Die Forward backend
// Full dungeon generation is now in lib/content.ts

import { Platform } from 'react-native';

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

const API_BASE = getApiBase();

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
  signature?: string;
  message?: string;
}

// Start a new game session
export async function startSession(
  walletAddress: string,
  stakeAmount: number,
  stakeTxSignature?: string
): Promise<StartSessionResponse> {
  const response = await fetch(`${API_BASE}/api/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress,
      stakeAmount,
      stakeTxSignature,
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
    headers: { 'Content-Type': 'application/json' },
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
): Promise<DeathResponse> {
  const response = await fetch(`${API_BASE}/api/session/death`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      sessionToken, 
      room, 
      finalMessage, 
      inventory,
      killedBy,
      playerName,
      nowPlayingTitle: nowPlaying?.title,
      nowPlayingArtist: nowPlaying?.artist,
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to claim victory');
  }

  return response.json();
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
