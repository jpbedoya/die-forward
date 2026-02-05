'use client';

import { useState } from 'react';

// Mock data
const mockEnemy = {
  name: "DROWNED ONE",
  health: 65,
  maxHealth: 100,
  intent: "AGGRESSIVE",
  intentDesc: "Lunging forward, claws extended",
};

const mockPlayer = {
  health: 73,
  maxHealth: 100,
  stamina: 2,
  maxStamina: 3,
  inventory: [
    { id: '1', name: 'Rusty Blade', emoji: '🗡️' },
    { id: '2', name: 'Herbs', emoji: '🌿' },
  ],
  stakeAmount: 0.05,
};

const mockNarrative = `The creature rises from the murky water, hollow eyes fixed on you. Water streams from its bloated form as it lurches forward.

It lunges, claws extended, aiming for your throat.`;

const combatOptions = [
  { id: '1', text: 'Strike', desc: 'Trade blows', cost: 1, emoji: '⚔️' },
  { id: '2', text: 'Dodge', desc: 'Evade attack', cost: 1, emoji: '💨' },
  { id: '3', text: 'Brace', desc: 'Reduce damage', cost: 0, emoji: '🛡️' },
  { id: '4', text: 'Herbs', desc: 'Heal, take hit', cost: 0, emoji: '🌿' },
  { id: '5', text: 'Flee', desc: 'Try to escape', cost: 1, emoji: '🏃' },
];

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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

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
          <span className="text-[var(--red-bright)] text-xs">
            {mockEnemy.health}/{mockEnemy.maxHealth}
          </span>
        </div>
        <HealthBar current={mockEnemy.health} max={mockEnemy.maxHealth} />
        
        {/* Intent */}
        <div className="mt-2 text-xs">
          <span className="text-[var(--text-muted)]">Intent: </span>
          <span className="text-[var(--amber-bright)]">{mockEnemy.intent}</span>
        </div>
      </header>

      {/* Combat narrative */}
      <main className="flex-1 overflow-y-auto px-3 pt-4 pb-20">
        
        <div className="text-[var(--text-primary)] text-sm leading-relaxed mb-6 whitespace-pre-line">
          {mockNarrative}
        </div>

        {/* Intent callout */}
        <div className="bg-[var(--amber-dim)]/20 border border-[var(--amber-dim)] p-3 mb-6">
          <div className="text-[var(--amber-bright)] text-xs uppercase tracking-wider mb-1">
            ⚠ Enemy Intent
          </div>
          <div className="text-[var(--amber-bright)] text-sm">
            {mockEnemy.intentDesc}
          </div>
        </div>

        {/* Combat Actions */}
        <div className="text-[var(--text-secondary)] text-xs mb-2 uppercase tracking-wider">
          ▼ Choose Your Action
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {combatOptions.map((option) => {
            const canAfford = option.cost <= mockPlayer.stamina;
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
          <button className="w-full py-3 bg-[var(--red-dim)]/30 border border-[var(--red)] text-[var(--red-bright)] hover:bg-[var(--red-dim)]/50 transition-all">
            ▶ Execute
          </button>
        )}

      </main>

      {/* Player stats footer */}
      <footer className="bg-[var(--bg-base)] border-t border-[var(--border-dim)] px-3 py-2 sticky bottom-0">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[var(--red)]">♥</span>
              <HealthBar current={mockPlayer.health} max={mockPlayer.maxHealth} />
              <span className="text-[var(--red-bright)] text-[10px]">{mockPlayer.health}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--blue)]">⚡</span>
              <StaminaBar current={mockPlayer.stamina} max={mockPlayer.maxStamina} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[var(--amber)]">◎</span>
            <span className="text-[var(--amber-bright)]">{mockPlayer.stakeAmount} SOL</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-[var(--text-dim)]">🎒</span>
          {mockPlayer.inventory.map((item) => (
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
