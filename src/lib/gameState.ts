// Simple game state management using localStorage

export interface GameState {
  currentRoom: number;
  health: number;
  stamina: number;
  inventory: { id: string; name: string; emoji: string }[];
  stakeAmount: number;
}

const STORAGE_KEY = 'die-forward-game';

const defaultState: GameState = {
  currentRoom: 0,
  health: 100,
  stamina: 3,
  inventory: [
    { id: '1', name: 'Torch', emoji: '🔦' },
    { id: '2', name: 'Herbs', emoji: '🌿' },
  ],
  stakeAmount: 0.05,
};

export function getGameState(): GameState {
  if (typeof window === 'undefined') return defaultState;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultState;
  
  try {
    return JSON.parse(stored);
  } catch {
    return defaultState;
  }
}

export function saveGameState(state: Partial<GameState>): void {
  if (typeof window === 'undefined') return;
  
  const current = getGameState();
  const updated = { ...current, ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function resetGameState(stakeAmount: number = 0.05): void {
  if (typeof window === 'undefined') return;
  
  const fresh: GameState = {
    ...defaultState,
    stakeAmount,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
}

export function clearGameState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
