// API client for Die Forward backend

const API_BASE = 'https://die-forward.vercel.app';

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
  sessionToken: string;
  currentRoom: number;
  health: number;
  stamina: number;
  inventory: { id: string; name: string; emoji: string }[];
  dungeon: DungeonRoom[];
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
  finalMessage: string,
  killedBy?: string
): Promise<DeathResponse> {
  const response = await fetch(`${API_BASE}/api/session/death`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken, finalMessage, killedBy }),
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
