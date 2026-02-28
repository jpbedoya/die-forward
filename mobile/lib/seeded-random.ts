/**
 * Seeded Random Number Generator
 * 
 * Creates deterministic random sequences from a seed.
 * Used for verifiable game runs - anyone can replay
 * the same sequence given the same seed.
 * 
 * For staked runs: seed comes from VRF (on-chain verifiable)
 * For free runs: seed is crypto random (stored in InstantDB)
 */

import seedrandom from 'seedrandom';

export interface SeededRng {
  /** Returns random float between 0 (inclusive) and 1 (exclusive) */
  random: () => number;
  
  /** Returns random integer between min and max (inclusive) */
  range: (min: number, max: number) => number;
  
  /** Returns true with given probability (0-1) */
  chance: (probability: number) => boolean;
  
  /** Pick random element from array */
  pick: <T>(array: T[]) => T;
  
  /** Shuffle array (returns new array) */
  shuffle: <T>(array: T[]) => T[];
  
  /** The seed used to create this RNG */
  seed: string;
}

/**
 * Create a seeded RNG for a game run.
 * All random values are deterministic given the same seed.
 */
export function createRunRng(seed: string): SeededRng {
  const rng = seedrandom(seed);
  
  return {
    seed,
    
    random: () => rng(),
    
    range: (min: number, max: number) => {
      return min + Math.floor(rng() * (max - min + 1));
    },
    
    chance: (probability: number) => {
      return rng() < probability;
    },
    
    pick: <T>(array: T[]): T => {
      if (array.length === 0) {
        throw new Error('Cannot pick from empty array');
      }
      return array[Math.floor(rng() * array.length)];
    },
    
    shuffle: <T>(array: T[]): T[] => {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
  };
}

/**
 * Generate a random seed (for free runs or fallback).
 * Uses crypto.getRandomValues for true randomness.
 */
export function generateRandomSeed(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
