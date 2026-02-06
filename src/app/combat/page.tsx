'use client';

import { useState, useEffect } from 'react';
import { getGameState, saveGameState } from '@/lib/gameState';
import { 
  getStrikeNarration, 
  getDodgeNarration, 
  getBraceNarration, 
  getHerbsNarration, 
  getFleeNarration,
  getEnemyIntent,
  IntentType 
} from '@/lib/content';
import { useAudio } from '@/lib/audio';

// Demo mode flag
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

type CombatPhase = 'choose' | 'resolve' | 'enemy-turn' | 'victory' | 'death';

const defaultPlayer = {
  maxHealth: 100,
  maxStamina: 3,
};

const combatOptions = [
  { id: 'strike', text: 'Strike', cost: 1, emoji: '⚔️' },
  { id: 'dodge', text: 'Dodge', cost: 1, emoji: '💨' },
  { id: 'brace', text: 'Brace', cost: 0, emoji: '🛡️' },
  { id: 'herbs', text: 'Herbs', cost: 0, emoji: '🌿' },
  { id: 'flee', text: 'Flee', cost: 1, emoji: '🏃' },
];

// Get dynamic narration based on action and outcome
function getActionNarration(action: string, outcome: 'success' | 'fail' | 'partial'): string {
  switch (action) {
    case 'strike':
      return outcome === 'success' ? getStrikeNarration('success') : 
             outcome === 'partial' ? getStrikeNarration('mutual') : getStrikeNarration('weak');
    case 'dodge':
      return outcome === 'success' ? getDodgeNarration('success') : 
             outcome === 'partial' ? getDodgeNarration('close') : getDodgeNarration('fail');
    case 'brace':
      return outcome === 'success' ? getBraceNarration('success') : 
             outcome === 'partial' ? getBraceNarration('broken') : getBraceNarration('fail');
    case 'herbs':
      return outcome === 'success' ? getHerbsNarration('heal') : getHerbsNarration('interrupted');
    case 'flee':
      return outcome === 'success' ? getFleeNarration('success') : 
             outcome === 'partial' ? getFleeNarration('hurt') : getFleeNarration('fail');
    default:
      return "You act.";
  }
}

// Resolution data structure
interface Resolution {
  narrative: string;
  playerDmg: number;
  enemyDmg: number;
  heal?: number;
  consumeHerbs?: boolean;
}

// Generate dynamic resolution based on action
function getResolution(action: string): Resolution {
  switch (action) {
    case 'strike':
      return {
        narrative: getActionNarration('strike', 'partial'), // Usually mutual exchange
        playerDmg: 10 + Math.floor(Math.random() * 8), // 10-17 damage
        enemyDmg: 20 + Math.floor(Math.random() * 10), // 20-29 damage
      };
    case 'dodge':
      const dodgeSuccess = Math.random() > 0.3; // 70% success
      return {
        narrative: getActionNarration('dodge', dodgeSuccess ? 'success' : 'partial'),
        playerDmg: dodgeSuccess ? 0 : 5 + Math.floor(Math.random() * 5),
        enemyDmg: 0,
      };
    case 'brace':
      return {
        narrative: getActionNarration('brace', 'success'),
        playerDmg: 3 + Math.floor(Math.random() * 5), // Reduced: 3-7
        enemyDmg: 0,
      };
    case 'herbs':
      return {
        narrative: getActionNarration('herbs', 'success'),
        playerDmg: 12 + Math.floor(Math.random() * 6), // Take hit while healing
        enemyDmg: 0,
        heal: 20 + Math.floor(Math.random() * 10), // Heal 20-29
        consumeHerbs: true,
      };
    case 'flee':
      return {
        narrative: getActionNarration('flee', 'partial'), // Usually take some damage
        playerDmg: 8 + Math.floor(Math.random() * 7), // 8-14 damage
        enemyDmg: 0,
      };
    default:
      return { narrative: "Nothing happens.", playerDmg: 0, enemyDmg: 0 };
  }
}

function HealthBar({ current, max, color = 'red' }: { current: number; max: number; color?: string }) {
  const pct = current / max;
  const filled = Math.round(pct * 10);
  const empty = 10 - filled;
  const filledColor = color === 'red' ? 'text-[var(--red)]' : 'text-[var(--purple)]';
  const emptyColor = color === 'red' ? 'text-[var(--red-dim)]' : 'text-[var(--purple-dim)]';
  return (
    <span className="font-mono tracking-tighter">
      <span className={filledColor}>{'█'.repeat(filled)}</span>
      <span className={emptyColor}>{'█'.repeat(empty)}</span>
    </span>
  );
}

function StaminaBar({ current, max }: { current: number; max: number }) {
  return (
    <span className="font-mono">
      <span className="text-[var(--blue-bright)]">{'◆'.repeat(current)}</span>
      <span className="text-[var(--blue-dim)]">{'◇'.repeat(max - current)}</span>
    </span>
  );
}

export default function CombatScreen() {
  const [phase, setPhase] = useState<CombatPhase>('choose');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerStamina, setPlayerStamina] = useState(3);
  const [playerInventory, setPlayerInventory] = useState<{id: string; name: string; emoji: string}[]>([]);
  const [stakeAmount, setStakeAmount] = useState(0.05);
  const [enemyHealth, setEnemyHealth] = useState(65);
  const [enemyName, setEnemyName] = useState('THE DROWNED');
  const [enemyMaxHealth, setEnemyMaxHealth] = useState(100);
  const [narrative, setNarrative] = useState('');
  const [enemyIntent, setEnemyIntent] = useState({ type: "AGGRESSIVE" as IntentType, description: "Preparing to attack" });
  const [lastResolution, setLastResolution] = useState<Resolution | null>(null);
  const [loaded, setLoaded] = useState(false);
  
  // Audio
  const { playAmbient, playSFX } = useAudio();
  
  // Play combat ambient on mount
  useEffect(() => {
    playAmbient('ambient-combat');
  }, [playAmbient]);

  // Load game state on mount
  useEffect(() => {
    const state = getGameState();
    setPlayerHealth(state.health);
    setPlayerStamina(state.stamina);
    setPlayerInventory(state.inventory);
    setStakeAmount(state.stakeAmount);
    
    // Get current room's enemy from dungeon
    if (state.dungeon && state.dungeon[state.currentRoom]) {
      const currentDungeonRoom = state.dungeon[state.currentRoom];
      if (currentDungeonRoom.enemy) {
        setEnemyName(currentDungeonRoom.enemy.toUpperCase());
        // Set narrative from room content
        setNarrative(currentDungeonRoom.narrative || 'A creature blocks your path.');
      }
    } else {
      // Fallback
      setNarrative('A creature rises from the darkness. It blocks your path.');
    }
    
    // Generate initial intent
    const initialIntent = getEnemyIntent('AGGRESSIVE');
    setEnemyIntent(initialIntent);
    
    setLoaded(true);
  }, []);

  const handleExecute = () => {
    if (!selectedOption) return;
    
    const resolution = getResolution(selectedOption);
    const option = combatOptions.find(o => o.id === selectedOption);
    
    // Apply effects
    let newPlayerHealth = playerHealth - resolution.playerDmg + (resolution.heal || 0);
    let newEnemyHealth = enemyHealth - resolution.enemyDmg;
    let newStamina = playerStamina - (option?.cost || 0);
    
    // Clamp values
    newPlayerHealth = Math.max(0, Math.min(defaultPlayer.maxHealth, newPlayerHealth));
    newEnemyHealth = Math.max(0, newEnemyHealth);
    newStamina = Math.max(0, newStamina);
    
    // Play SFX based on action and outcome
    if (selectedOption === 'strike' && resolution.enemyDmg > 0) {
      playSFX('sword-slash');
    } else if (selectedOption === 'herbs') {
      playSFX('heal');
    }
    if (resolution.playerDmg > 0) {
      setTimeout(() => playSFX('damage-taken'), 300);
    }
    
    setPlayerHealth(newPlayerHealth);
    setEnemyHealth(newEnemyHealth);
    setPlayerStamina(newStamina);
    setNarrative(resolution.narrative);
    setLastResolution(resolution);
    
    // Remove herbs if used and save immediately
    if (resolution.consumeHerbs) {
      const herbItem = playerInventory.find(i => i.name === 'Herbs');
      if (herbItem) {
        const newInventory = playerInventory.filter(i => i.id !== herbItem.id);
        setPlayerInventory(newInventory);
        // Save immediately so refresh doesn't restore herbs
        saveGameState({ 
          health: newPlayerHealth, 
          stamina: newStamina,
          inventory: newInventory 
        });
      }
    }
    
    setPhase('resolve');
    setSelectedOption(null);
  };

  const handleContinue = () => {
    if (enemyHealth <= 0) {
      playSFX('enemy-death');
      setPhase('victory');
      setNarrative("The creature collapses. Silence returns to the chamber.\n\nYou catch your breath. The path ahead is clear.");
      return;
    }
    
    if (playerHealth <= 0) {
      playSFX('player-death');
      playAmbient('ambient-death');
      setPhase('death');
      setNarrative("The world grows dark. Cold water rises around you.\n\nYour journey ends here.");
      return;
    }
    
    // Enemy turn - set new intent dynamically
    const intentTypes: IntentType[] = ['AGGRESSIVE', 'DEFENSIVE', 'CHARGING', 'ERRATIC', 'HUNTING'];
    const randomType = intentTypes[Math.floor(Math.random() * intentTypes.length)];
    const newIntent = getEnemyIntent(randomType);
    setEnemyIntent(newIntent);
    
    // Restore 1 stamina
    setPlayerStamina(Math.min(defaultPlayer.maxStamina, playerStamina + 1));
    
    setNarrative(`The ${enemyName} recovers and faces you again.\n\n${newIntent.description}...`);
    setPhase('choose');
  };

  // Show loading until state is loaded
  if (!loaded) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center font-mono">
        <div className="text-[var(--amber)] animate-pulse">◈ Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      {/* Enemy Header */}
      <header className="bg-[var(--bg-base)] border-b border-[var(--red-dim)] px-3 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[var(--red)]">⚔️</span>
            <span className="text-[var(--red-bright)] uppercase tracking-wide text-sm">
              {enemyName}
            </span>
            {DEMO_MODE && (
              <span className="text-[10px] px-1.5 py-0.5 bg-[var(--amber-dim)]/30 border border-[var(--amber-dim)] text-[var(--amber)] tracking-wider">
                DEMO
              </span>
            )}
          </div>
          <span className={`text-xs ${enemyHealth <= 0 ? 'text-[var(--text-dim)]' : 'text-[var(--red-bright)]'}`}>
            {enemyHealth}/{enemyMaxHealth}
          </span>
        </div>
        <HealthBar current={enemyHealth} max={enemyMaxHealth} />
        
        {/* Intent */}
        {phase === 'choose' && enemyHealth > 0 && (
          <div className="mt-2 text-xs">
            <span className="text-[var(--text-muted)]">Intent: </span>
            <span className="text-[var(--amber-bright)]">{enemyIntent.type}</span>
          </div>
        )}
      </header>

      {/* Combat narrative */}
      <main className="flex-1 overflow-y-auto px-3 pt-4 pb-20">
        
        <div className="text-[var(--text-primary)] text-sm leading-relaxed mb-6 whitespace-pre-line">
          {narrative}
        </div>

        {/* Intent callout - only in choose phase */}
        {phase === 'choose' && enemyHealth > 0 && (
          <div className="bg-[var(--amber-dim)]/20 border border-[var(--amber-dim)] p-3 mb-6">
            <div className="text-[var(--amber-bright)] text-xs uppercase tracking-wider mb-1">
              ⚠ Enemy Intent
            </div>
            <div className="text-[var(--amber-bright)] text-sm">
              {enemyIntent.description}
            </div>
          </div>
        )}

        {/* Resolution phase */}
        {phase === 'resolve' && lastResolution && (
          <div className="mb-4">
            {/* Damage summary */}
            <div className="flex justify-center gap-8 mb-4">
              {lastResolution.enemyDmg > 0 && (
                <div className="flex items-center gap-2">
                  <pre className="text-[var(--green)] text-xs leading-none">{`  />
 /> 
/>`}</pre>
                  <div>
                    <span className="text-[var(--green-bright)] text-2xl font-bold">{lastResolution.enemyDmg}</span>
                    <span className="text-[var(--green)] text-sm ml-1">dealt</span>
                  </div>
                </div>
              )}
              {lastResolution.playerDmg > 0 && (
                <div className="flex items-center gap-2">
                  <pre className="text-[var(--red)] text-xs leading-none">{`\\|/
-*-
/|\\`}</pre>
                  <div>
                    <span className="text-[var(--red-bright)] text-2xl font-bold">{lastResolution.playerDmg}</span>
                    <span className="text-[var(--red)] text-sm ml-1">taken</span>
                  </div>
                </div>
              )}
              {lastResolution.heal && lastResolution.heal > 0 && (
                <div className="flex items-center gap-2">
                  <pre className="text-[var(--green)] text-xs leading-none">{` _ 
|+|
 ¯`}</pre>
                  <div>
                    <span className="text-[var(--green-bright)] text-2xl font-bold">{lastResolution.heal}</span>
                    <span className="text-[var(--green)] text-sm ml-1">healed</span>
                  </div>
                </div>
              )}
              {lastResolution.enemyDmg === 0 && lastResolution.playerDmg === 0 && !lastResolution.heal && (
                <div className="flex items-center gap-2">
                  <pre className="text-[var(--blue-bright)] text-xs leading-none">{` ~ 
~*~
 ~`}</pre>
                  <div>
                    <span className="text-[var(--blue-bright)] text-xl font-bold">EVADE</span>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleContinue}
              className="w-full py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              ▶ Continue
            </button>
          </div>
        )}

        {/* Victory phase */}
        {phase === 'victory' && (
          <div className="text-center">
            <div className="text-[var(--green)] text-2xl mb-4">⚔️ VICTORY</div>
            <button 
              onClick={async () => {
                // Advance room on server first (anti-cheat)
                const state = getGameState();
                if (state.sessionToken) {
                  try {
                    const response = await fetch('/api/session/advance', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionToken: state.sessionToken,
                        fromRoom: state.currentRoom + 1, // 1-indexed
                      }),
                    });
                    if (!response.ok) {
                      console.error('Failed to advance room on server');
                    }
                  } catch (err) {
                    console.error('Advance API error:', err);
                  }
                }
                // Save state and return to game
                saveGameState({
                  health: playerHealth,
                  stamina: Math.min(defaultPlayer.maxStamina, playerStamina + 1),
                  currentRoom: state.currentRoom + 1,
                  inventory: playerInventory,
                });
                window.location.href = '/play';
              }}
              className="px-6 py-3 bg-[var(--green)]/20 border border-[var(--green)] text-[var(--green-bright)] hover:bg-[var(--green)]/30 transition-all"
            >
              ▶ Continue to Next Room
            </button>
          </div>
        )}

        {/* Death phase */}
        {phase === 'death' && (
          <div className="text-center">
            <div className="text-[var(--red)] text-2xl mb-4">☠ DEFEATED</div>
            <button 
              onClick={() => window.location.href = '/death'}
              className="px-6 py-3 bg-[var(--red)]/20 border border-[var(--red)] text-[var(--red-bright)] hover:bg-[var(--red)]/30 transition-all"
            >
              ▶ Face Your End
            </button>
          </div>
        )}

        {/* Combat Actions - only in choose phase */}
        {phase === 'choose' && enemyHealth > 0 && (
          <>
            <div className="text-[var(--text-secondary)] text-xs mb-2 uppercase tracking-wider">
              ▼ Choose Your Action
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {combatOptions.map((option) => {
                const canAfford = option.cost <= playerStamina;
                // Hide herbs if not in inventory
                const hasHerbs = playerInventory.some(i => i.name === 'Herbs');
                if (option.id === 'herbs' && !hasHerbs) {
                  return null;
                }
                return (
                  <button
                    key={option.id}
                    onClick={() => canAfford && setSelectedOption(option.id)}
                    disabled={!canAfford}
                    className={`text-left px-3 py-2.5 text-sm transition-all ${
                      selectedOption === option.id
                        ? 'bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)]'
                        : canAfford
                        ? 'bg-[var(--bg-surface)] border border-[var(--border-dim)] text-[var(--text-secondary)] active:bg-[var(--bg-elevated)]'
                        : 'bg-[var(--bg-base)] border border-[var(--border-dim)] text-[var(--text-dim)] opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.emoji} {option.text}</span>
                      {option.cost > 0 && (
                        <span className="text-[var(--blue-bright)] text-xs">⚡{option.cost}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confirm button */}
            {selectedOption && (
              <button 
                onClick={handleExecute}
                className="w-full py-3 bg-[var(--red-dim)]/30 border border-[var(--red)] text-[var(--red-bright)] hover:bg-[var(--red-dim)]/50 transition-all"
              >
                ▶ Execute
              </button>
            )}
          </>
        )}

      </main>

      {/* Player stats footer */}
      <footer className="bg-[var(--bg-base)] border-t border-[var(--border-dim)] px-3 py-2 sticky bottom-0">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[var(--red)]">♥</span>
              <HealthBar current={playerHealth} max={defaultPlayer.maxHealth} />
              <span className={`text-[10px] ${playerHealth < 30 ? 'text-[var(--red-bright)] animate-pulse' : 'text-[var(--red-bright)]'}`}>
                {playerHealth}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--blue)]">⚡</span>
              <StaminaBar current={playerStamina} max={defaultPlayer.maxStamina} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[var(--amber)]">◎</span>
            <span className="text-[var(--amber-bright)]">{stakeAmount} SOL</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-[var(--text-dim)]">🎒</span>
          {playerInventory.map((item) => (
            <span 
              key={item.id} 
              className="text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 whitespace-nowrap"
            >
              {item.emoji} {item.name}
            </span>
          ))}
        </div>
      </footer>

    </div>
  );
}
