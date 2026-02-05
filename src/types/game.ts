// Game state types

export interface Item {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  effect?: string;
}

export interface Enemy {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  intent: 'aggressive' | 'defensive' | 'charging' | 'fleeing' | 'unknown';
  weakness?: string;
}

export interface Corpse {
  id: string;
  playerName: string;
  walletAddress: string;
  zone: string;
  room: number;
  diedAt: Date;
  finalMessage: string;
  inventory: Item[];
  timesLooted: number;
}

export interface PlayerState {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  inventory: Item[];
  stakeAmount: number;
}

export interface RoomState {
  zone: string;
  roomNumber: number;
  totalRooms: number;
  narrative: string;
  encounter?: {
    type: 'combat' | 'trap' | 'ghost' | 'cache' | 'mystery';
    enemy?: Enemy;
    corpse?: Corpse;
    loot?: Item[];
  };
  options: GameOption[];
}

export interface GameOption {
  id: string;
  text: string;
  cost?: { stamina?: number };
  disabled?: boolean;
}

export type GamePhase = 
  | 'title'
  | 'connecting'
  | 'staking'
  | 'playing'
  | 'combat'
  | 'death'
  | 'clear';

export interface GameState {
  phase: GamePhase;
  player: PlayerState;
  room: RoomState | null;
  runId: string | null;
  deathCount: number; // zone death count
}
