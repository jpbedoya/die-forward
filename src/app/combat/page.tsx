'use client';

import { useState, useEffect } from 'react';
import { getGameState, saveGameState } from '@/lib/gameState';

type CombatPhase = 'choose' | 'resolve' | 'enemy-turn' | 'victory' | 'death';

// Mock data
const mockEnemy = {
  name: "DROWNED ONE",
  maxHealth: 100,
};

const defaultPlayer = {
  maxHealth: 100,
  maxStamina: 3,
};

const combatOptions = [
  { id: 'strike', text: 'Strike', desc: 'Trade blows', cost: 1, emoji: '⚔️' },
  { id: 'dodge', text: 'Dodge', desc: 'Evade attack', cost: 1, emoji: '💨' },
  { id: 'brace', text: 'Brace', desc: 'Reduce damage', cost: 0, emoji: '🛡️' },
  { id: 'herbs', text: 'Herbs', desc: 'Heal, take hit', cost: 0, emoji: '🌿' },
  { id: 'flee', text: 'Flee', desc: 'Try to escape', cost: 1, emoji: '🏃' },
];

const resolutions: Record<string, { narrative: string; playerDmg: number; enemyDmg: number; heal?: number }> = {
  strike: {
    narrative: "You swing your blade in a wide arc. Steel meets rotted flesh with a sickening thud. The creature staggers — but its claws rake across your arm.",
    playerDmg: 12,
    enemyDmg: 25,
  },
  dodge: {
    narrative: "You twist aside at the last moment. Claws slice through empty air. The creature stumbles past, exposed.",
    playerDmg: 0,
    enemyDmg: 0,
  },
  brace: {
    narrative: "You raise your guard. The impact rattles your bones, but you hold firm. Reduced damage.",
    playerDmg: 6,
    enemyDmg: 0,
  },
  herbs: {
    narrative: "You crush the herbs and press them to your wounds. Warmth spreads through you — but the creature strikes while you're distracted.",
    playerDmg: 15,
    enemyDmg: 0,
    heal: 25,
  },
  flee: {
    narrative: "You turn and run. A claw catches your back as you flee, but you escape into the darkness.",
    playerDmg: 10,
    enemyDmg: 0,
  },
};

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
  const [narrative, setNarrative] = useState(`The creature rises from the murky water, hollow eyes fixed on you. Water streams from its bloated form as it lurches forward.

It lunges, claws extended, aiming for your throat.`);
  const [enemyIntent, setEnemyIntent] = useState({ type: "AGGRESSIVE", desc: "Lunging forward, claws extended" });
  const [lastResolution, setLastResolution] = useState<{ playerDmg: number; enemyDmg: number; heal?: number } | null>(null);

  // Load game state on mount
  useEffect(() => {
    const state = getGameState();
    setPlayerHealth(state.health);
    setPlayerStamina(state.stamina);
    setPlayerInventory(state.inventory);
    setStakeAmount(state.stakeAmount);
  }, []);

  const handleExecute = () => {
    if (!selectedOption) return;
    
    const resolution = resolutions[selectedOption];
    const option = combatOptions.find(o => o.id === selectedOption);
    
    // Apply effects
    let newPlayerHealth = playerHealth - resolution.playerDmg + (resolution.heal || 0);
    let newEnemyHealth = enemyHealth - resolution.enemyDmg;
    let newStamina = playerStamina - (option?.cost || 0);
    
    // Clamp values
    newPlayerHealth = Math.max(0, Math.min(mockPlayer.maxHealth, newPlayerHealth));
    newEnemyHealth = Math.max(0, newEnemyHealth);
    newStamina = Math.max(0, newStamina);
    
    setPlayerHealth(newPlayerHealth);
    setEnemyHealth(newEnemyHealth);
    setPlayerStamina(newStamina);
    setNarrative(resolution.narrative);
    setLastResolution(resolution);
    setPhase('resolve');
    setSelectedOption(null);
  };

  const handleContinue = () => {
    if (enemyHealth <= 0) {
      setPhase('victory');
      setNarrative("The creature collapses into the murky water. Silence returns to the chamber.\n\nYou catch your breath. The path ahead is clear.");
      return;
    }
    
    if (playerHealth <= 0) {
      setPhase('death');
      setNarrative("The world grows dark. Cold water rises around you.\n\nYour journey ends here.");
      return;
    }
    
    // Enemy turn - set new intent
    const intents = [
      { type: "AGGRESSIVE", desc: "Preparing to lunge at you" },
      { type: "DEFENSIVE", desc: "Circling warily, watching" },
      { type: "CHARGING", desc: "Gathering dark energy" },
    ];
    const newIntent = intents[Math.floor(Math.random() * intents.length)];
    setEnemyIntent(newIntent);
    
    // Restore 1 stamina
    setPlayerStamina(Math.min(mockPlayer.maxStamina, playerStamina + 1));
    
    setNarrative(`The ${mockEnemy.name} recovers and faces you again.\n\n${newIntent.desc}...`);
    setPhase('choose');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      {/* Enemy Header */}
      <header className="bg-[var(--bg-base)] border-b border-[var(--red-dim)] px-3 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[var(--red)]">⚔️</span>
            <span className="text-[var(--red-bright)] uppercase tracking-wide text-sm">
              {mockEnemy.name}
            </span>
          </div>
          <span className={`text-xs ${enemyHealth <= 0 ? 'text-[var(--text-dim)]' : 'text-[var(--red-bright)]'}`}>
            {enemyHealth}/{mockEnemy.maxHealth}
          </span>
        </div>
        <HealthBar current={enemyHealth} max={mockEnemy.maxHealth} />
        
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
              {enemyIntent.desc}
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
              onClick={() => {
                // Save state and return to game
                const state = getGameState();
                saveGameState({
                  health: playerHealth,
                  stamina: Math.min(defaultPlayer.maxStamina, playerStamina + 1),
                  currentRoom: state.currentRoom + 1,
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
                if (option.id === 'herbs' && !playerInventory.find(i => i.name === 'Herbs')) {
                  return null;
                }
                return (
                  <button
                    key={option.id}
                    onClick={() => canAfford && setSelectedOption(option.id)}
                    disabled={!canAfford}
                    className={`text-left px-3 py-3 text-sm transition-all ${
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
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">{option.desc}</div>
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
              <HealthBar current={playerHealth} max={mockPlayer.maxHealth} />
              <span className={`text-[10px] ${playerHealth < 30 ? 'text-[var(--red-bright)] animate-pulse' : 'text-[var(--red-bright)]'}`}>
                {playerHealth}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--blue)]">⚡</span>
              <StaminaBar current={playerStamina} max={mockPlayer.maxStamina} />
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
